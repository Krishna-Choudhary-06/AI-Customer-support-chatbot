import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { inspectKnowledgeBase } from "./knowledgeBaseInspector.js";

const DEFAULT_MAX_CHUNK_CHARACTERS = 1000;
const DOCUMENT_METADATA_KEYS = new Set([
  "documentid",
  "title",
  "documenttitle",
  "module",
  "submodule",
  "documenttype",
  "intent",
  "id",
  "customersegment",
  "applicableregion",
  "applicablechannel",
  "version",
  "lastupdated",
  "effectivedate",
  "status",
  "source",
  "relateddocuments",
  "fictionaldemo",
]);
const UNRESOLVED_PLACEHOLDER = /\[COMPANY INPUT REQUIRED\]/i;

function stableChunkId(documentId, source, index, text) {
  const digest = createHash("sha256")
    .update(`${documentId}\n${source}\n${index}\n${text}`)
    .digest("hex")
    .slice(0, 20);
  return `${documentId}:chunk:${index + 1}:${digest}`;
}

function removeMarkdownMetadataTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const retainedLines = [];
  let skippingMetadata = false;
  let metadataStarted = false;

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (skippingMetadata) {
      if (heading && heading[1].length <= 2) {
        skippingMetadata = false;
        metadataStarted = false;
        retainedLines.push(line);
      } else if (/^\s*(?:\|.*\|\s*|[-*]\s+\*\*[^*]+:\*\*\s*.*)$/.test(line)) {
        metadataStarted = true;
      } else if (!line.trim() && !metadataStarted) {
        continue;
      } else if (metadataStarted) {
        skippingMetadata = false;
        metadataStarted = false;
        retainedLines.push(line);
      }
      continue;
    }

    if (heading?.[1].length === 2 && heading[2].trim().toLowerCase() === "document metadata") {
      skippingMetadata = true;
      metadataStarted = false;
      continue;
    }
    retainedLines.push(line);
  }

  return retainedLines.join("\n").trim();
}

function formatJsonValue(value, path = []) {
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") {
    return [];
  }

  if (typeof value === "string") {
    const text = value.trim();
    return text ? [`${path.length ? `${path.join(" / ")}: ` : ""}${text}`] : [];
  }

  if (Array.isArray(value)) {
    if (path.at(-1)?.toLowerCase() === "faqs") {
      return value.flatMap((faq) => {
        if (!faq || typeof faq !== "object" || Array.isArray(faq)) {
          return formatJsonValue(faq, path);
        }
        return formatJsonValue(faq, []);
      });
    }

    return value.flatMap((item) => formatJsonValue(item, path));
  }

  return Object.entries(value).flatMap(([key, child]) => {
    if (DOCUMENT_METADATA_KEYS.has(key.toLowerCase())) {
      return [];
    }
    return formatJsonValue(child, [...path, key]);
  });
}

export function extractDocumentContent(contents, format) {
  if (format === "md") {
    return removeMarkdownMetadataTables(contents).trim();
  }

  if (format === "txt") {
    return contents
      .replace(/^(?:COMPANY|CATEGORY|DOCUMENT ID|DOCUMENT TITLE|MODULE|INDUSTRY|BUSINESS|STATUS|VERSION|SOURCE):.*(?:\r?\n|$)/gim, "")
      .trim();
  }

  if (format === "json") {
    const parsed = JSON.parse(contents);
    const content = parsed?.content ?? parsed?.faqs ?? parsed;
    return formatJsonValue(content).join("\n").trim();
  }

  throw new TypeError(`Unsupported document format for extraction: ${format}`);
}

function splitLongParagraph(paragraph, maxCharacters) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [paragraph];
  const pieces = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) {
      continue;
    }

    if (trimmedSentence.length > maxCharacters) {
      if (current) {
        pieces.push(current);
        current = "";
      }
      let wordChunk = "";
      for (const word of trimmedSentence.split(/\s+/)) {
        if (word.length > maxCharacters) {
          if (wordChunk) {
            pieces.push(wordChunk);
            wordChunk = "";
          }
          for (let offset = 0; offset < word.length; offset += maxCharacters) {
            pieces.push(word.slice(offset, offset + maxCharacters));
          }
          continue;
        }
        const candidate = wordChunk ? `${wordChunk} ${word}` : word;
        if (candidate.length > maxCharacters) {
          pieces.push(wordChunk);
          wordChunk = word;
        } else {
          wordChunk = candidate;
        }
      }
      if (wordChunk) {
        pieces.push(wordChunk);
      }
      continue;
    }

    const candidate = current ? `${current} ${trimmedSentence}` : trimmedSentence;
    if (candidate.length > maxCharacters) {
      if (current) {
        pieces.push(current);
      }
      current = trimmedSentence;
    } else {
      current = candidate;
    }
  }

  if (current) {
    pieces.push(current);
  }
  return pieces;
}

export function chunkDocumentContent(content, maxCharacters = DEFAULT_MAX_CHUNK_CHARACTERS) {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 100) {
    throw new RangeError("maxCharacters must be an integer of at least 100.");
  }

  const paragraphs = content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks = [];
  let headings = [];
  let currentBody = "";
  let currentPrefix = "";

  const flush = () => {
    const text = `${currentPrefix}${currentBody}`.trim();
    if (text) {
      chunks.push(text);
    }
    currentBody = "";
    currentPrefix = "";
  };

  for (const paragraph of paragraphs) {
    if (/^#{1,6}\s/.test(paragraph)) {
      flush();
      const level = paragraph.match(/^#+/)[0].length;
      headings = headings.slice(0, level - 1);
      headings[level - 1] = paragraph.replace(/^#{1,6}\s+/, "").trim();
      continue;
    }

    const headingContext = headings.filter(Boolean).join(" > ");
    const boundedHeading = headingContext.length > maxCharacters - 10
      ? `${headingContext.slice(0, maxCharacters - 13)}...`
      : headingContext;
    const prefix = boundedHeading ? `${boundedHeading}\n` : "";
    const maxBodyCharacters = Math.max(1, maxCharacters - prefix.length);
    const pieces = splitLongParagraph(paragraph.replace(/\s+/g, " "), maxBodyCharacters);

    for (const piece of pieces) {
      const candidateBody = currentBody ? `${currentBody}\n\n${piece}` : piece;
      if (
        (currentPrefix !== prefix || `${prefix}${candidateBody}`.length > maxCharacters)
        && currentBody
      ) {
        flush();
      }
      if (!currentBody) {
        currentPrefix = prefix;
      }
      currentBody = currentBody ? `${currentBody}\n\n${piece}` : piece;
      if (`${currentPrefix}${currentBody}`.length > maxCharacters) {
        flush();
      }
    }
  }

  flush();
  return chunks;
}

function createChunkRecords(document, content, maxCharacters) {
  const chunks = chunkDocumentContent(content, maxCharacters);
  return chunks.map((text, index) => ({
    chunkId: stableChunkId(document.documentId, document.path, index, text),
    documentId: document.documentId,
    title: document.title,
    source: document.path,
    sourceReference: document.metadata.source ?? document.metadata.Source ?? null,
    format: document.format,
    business: document.business,
    industry: document.industry,
    module:
      document.metadata.module
      ?? document.metadata.Module
      ?? document.metadata.category
      ?? document.type,
    submodule: document.metadata.submodule ?? document.metadata.Submodule ?? null,
    documentType: document.type,
    intent: document.metadata.intent ?? document.metadata.Intent ?? null,
    customerSegment: document.metadata.customersegment ?? document.metadata.customerSegment ?? null,
    applicableRegion: document.metadata.applicableregion ?? document.metadata.applicableRegion ?? null,
    applicableChannel: document.metadata.applicablechannel ?? document.metadata.applicableChannel ?? null,
    version: document.metadata.version ?? document.metadata.Version ?? null,
    effectiveDate: document.metadata.effectivedate ?? document.metadata.effectiveDate ?? null,
    status: document.status,
    chunkIndex: index,
    chunkCount: chunks.length,
    text,
  }));
}

export async function ingestKnowledgeBase({
  knowledgeBasePath,
  maxChunkCharacters = DEFAULT_MAX_CHUNK_CHARACTERS,
} = {}) {
  if (!knowledgeBasePath) {
    throw new TypeError("knowledgeBasePath is required.");
  }
  if (!Number.isInteger(maxChunkCharacters) || maxChunkCharacters < 100) {
    throw new RangeError("maxChunkCharacters must be an integer of at least 100.");
  }

  const inspection = await inspectKnowledgeBase(knowledgeBasePath);
  const eligibleDocuments = inspection.documents.filter(
    (document) => document.eligibleForRetrieval,
  );
  const documentResults = [];
  const chunks = [];

  for (const document of eligibleDocuments) {
    const contents = await readFile(join(knowledgeBasePath, document.path), "utf8");
    const extractedText = extractDocumentContent(contents, document.format);
    if (!extractedText) {
      documentResults.push({
        documentId: document.documentId,
        source: document.path,
        extractedCharacters: 0,
        chunkCount: 0,
        status: "empty-after-extraction",
      });
      continue;
    }

    if (UNRESOLVED_PLACEHOLDER.test(extractedText)) {
      documentResults.push({
        documentId: document.documentId,
        source: document.path,
        extractedCharacters: extractedText.length,
        chunkCount: 0,
        status: "excluded-unresolved-placeholder",
      });
      continue;
    }

    const documentChunks = createChunkRecords(document, extractedText, maxChunkCharacters);
    chunks.push(...documentChunks);
    documentResults.push({
      documentId: document.documentId,
      source: document.path,
      extractedCharacters: extractedText.length,
      chunkCount: documentChunks.length,
      status: "ingested",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    knowledgeBasePath,
    maxChunkCharacters,
    summary: {
      discoveredDocuments: inspection.summary.discovered,
      eligibleDocuments: eligibleDocuments.length,
      ingestedDocuments: documentResults.filter((document) => document.status === "ingested").length,
      skippedDocuments: inspection.summary.discovered - eligibleDocuments.length,
      chunks: chunks.length,
      largestChunkCharacters: chunks.reduce(
        (largest, chunk) => Math.max(largest, chunk.text.length),
        0,
      ),
    },
    documentResults,
    chunks,
  };
}
