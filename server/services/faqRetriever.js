import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, relative, sep } from "node:path";

const DEFAULT_KNOWLEDGE_BASE_PATH = fileURLToPath(
  new URL("../../knowledge-base/", import.meta.url),
);
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "can", "do", "does", "for", "how", "i", "in", "is",
  "it", "me", "my", "of", "on", "the", "to", "what", "when", "where", "which",
  "who", "why", "you", "your",
]);
const TERM_ALIASES = new Map([
  ["assistance", "support"],
  ["contact", "contact"],
  ["create", "account-action"],
  ["forgot", "reset"],
  ["help", "support"],
  ["item", "product"],
  ["items", "product"],
  ["reach", "contact"],
  ["recover", "reset"],
  ["registration", "account-action"],
  ["register", "account-action"],
  ["registered", "register"],
  ["returns", "return"],
  ["signup", "account-action"],
  ["support", "support"],
  ["talk", "contact"],
  ["update", "change"],
]);
const MINIMUM_QUERY_COVERAGE = 0.5;
const MAX_RETRIEVED_ENTRIES = 3;

function normalizeTerms(value) {
  return value
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.map((term) => TERM_ALIASES.get(term) || term)
    .filter((term) => !STOP_WORDS.has(term)) ?? [];
}

function parseFaqFile(contents, source) {
  const company = contents.match(/^COMPANY:\s*(.+)$/im)?.[1]?.trim() || "Unknown";
  const category = contents.match(/^CATEGORY:\s*(.+)$/im)?.[1]?.trim() || source;
  const blocks = contents.split(/(?=^Q\d+:\s*)/m).slice(1);

  return blocks.flatMap((block) => {
    const match = block.match(/^Q(\d+):\s*([\s\S]*?)^\s*A:\s*([\s\S]*)$/m);
    if (!match) {
      return [];
    }

    const question = match[2].trim().replace(/\s+/g, " ");
    const answer = match[3].trim().replace(/\s+/g, " ");
    if (!question || !answer) {
      return [];
    }

    return [{
      id: `${source}#${match[1]}`,
      company,
      category,
      source,
      question,
      answer,
    }];
  });
}

async function findTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const descendants = await Promise.all(entries.map(async (entry) => {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return findTextFiles(filePath);
    }
    return entry.isFile() && entry.name.toLowerCase().endsWith(".txt") ? [filePath] : [];
  }));
  return descendants.flat().sort((left, right) => left.localeCompare(right));
}

export async function loadFaqEntries(knowledgeBasePath = DEFAULT_KNOWLEDGE_BASE_PATH) {
  const structuredFaqPath = join(knowledgeBasePath, "21_metadata_and_index", "faqs.json");
  let structuredFaqContents;
  try {
    structuredFaqContents = await readFile(structuredFaqPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (structuredFaqContents !== undefined) {
    const structuredFaqDocument = JSON.parse(structuredFaqContents);
    if (!Array.isArray(structuredFaqDocument.faqs)) {
      throw new TypeError(`${structuredFaqPath} must contain a "faqs" array.`);
    }

    return structuredFaqDocument.faqs.map((faq, index) => {
      if (
        typeof faq.id !== "string"
        || typeof faq.question !== "string"
        || typeof faq.answer !== "string"
        || !faq.question.trim()
        || !faq.answer.trim()
      ) {
        throw new TypeError(
          `${structuredFaqPath} contains an invalid FAQ at index ${index}; id, question, and answer are required.`,
        );
      }

      return {
        id: faq.id,
        company: "ShopEase (fictional demo business)",
        category: faq.category || "General",
        source: "21_metadata_and_index/faqs.json",
        question: faq.question.trim(),
        answer: faq.answer.trim(),
      };
    });
  }

  const files = await findTextFiles(knowledgeBasePath);
  const parsedFiles = await Promise.all(files.map(async (filePath) => {
    const contents = await readFile(filePath, "utf8");
    const source = relative(knowledgeBasePath, filePath).split(sep).join("/");
    return parseFaqFile(contents, source);
  }));
  return parsedFiles.flat();
}

export function retrieveRelevantFaqs(query, entries, limit = MAX_RETRIEVED_ENTRIES) {
  const queryTerms = new Set(normalizeTerms(query));
  if (queryTerms.size === 0) {
    return [];
  }

  const rankedEntries = entries.flatMap((entry) => {
    const entryTerms = new Set(normalizeTerms(`${entry.question} ${entry.answer}`));
    const matchedTerms = [...queryTerms].filter((term) => entryTerms.has(term));
    const coverage = matchedTerms.length / queryTerms.size;
    const hasEnoughEvidence =
      matchedTerms.length >= 2
      || (queryTerms.size === 1 && (matchedTerms[0]?.length ?? 0) >= 4);

    if (!hasEnoughEvidence || coverage < MINIMUM_QUERY_COVERAGE) {
      return [];
    }

    return [{ entry, coverage, matchCount: matchedTerms.length }];
  });

  return rankedEntries
    .sort((left, right) =>
      right.coverage - left.coverage
      || right.matchCount - left.matchCount
      || left.entry.id.localeCompare(right.entry.id),
    )
    .slice(0, limit)
    .map(({ entry }) => entry);
}
