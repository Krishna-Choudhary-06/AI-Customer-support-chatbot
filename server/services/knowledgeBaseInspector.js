import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".md", ".txt", ".json"]);
const UNRESOLVED_PLACEHOLDER = /\[COMPANY INPUT REQUIRED\]/i;
const MARKDOWN_METADATA_FIELDS = [
  "Document ID",
  "Document Title",
  "Title",
  "Module",
  "Submodule",
  "Document Type",
  "Category",
  "Intent",
  "Business",
  "Environment",
  "Approved By",
  "Approval Date",
  "Customer Segment",
  "Applicable Region",
  "Applicable Channel",
  "Version",
  "Effective Date",
  "Business",
  "Industry",
  "Status",
  "Source",
];

function normalizePath(path) {
  return path.split(sep).join("/");
}

async function findFiles(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const descendants = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return findFiles(path, root);
    }

    return entry.isFile() ? [normalizePath(relative(root, path))] : [];
  }));
  return descendants.flat().sort((left, right) => left.localeCompare(right));
}

function parseMarkdownMetadata(contents) {
  const metadata = {};
  for (const field of MARKDOWN_METADATA_FIELDS) {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tableMatch = contents.match(
      new RegExp(`^\\|\\s*${escaped}\\s*\\|\\s*([^|]+)\\|`, "im"),
    );
    const bulletMatch = contents.match(
      new RegExp(`^\\s*[-*]\\s+\\*\\*${escaped}:\\*\\*\\s*(.*?)\\s*$`, "im"),
    );
    const match = tableMatch ?? bulletMatch;
    if (match) {
      const key = field.replace(/\s+/g, "").toLowerCase();
      metadata[key] = match[1].trim().replace(/^`|`$/g, "");
    }
  }
  return metadata;
}

function getMetadata(contents, extension, errors) {
  if (extension === ".json") {
    try {
      const parsed = JSON.parse(contents);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        errors.push("JSON root must be an object.");
        return {};
      }
      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        errors.push("JSON is invalid and could not be inspected.");
        return {};
      }
      throw error;
    }
  }

  if (extension === ".md") {
    return parseMarkdownMetadata(contents);
  }

  const metadata = {};
  for (const [label, key] of [
    ["DOCUMENT ID", "documentid"],
    ["DOCUMENT TITLE", "documenttitle"],
    ["MODULE", "module"],
    ["SUBMODULE", "submodule"],
    ["DOCUMENT TYPE", "documenttype"],
    ["INTENT", "intent"],
    ["CUSTOMER SEGMENT", "customersegment"],
    ["APPLICABLE REGION", "applicableregion"],
    ["APPLICABLE CHANNEL", "applicablechannel"],
    ["INDUSTRY", "industry"],
    ["BUSINESS", "business"],
    ["STATUS", "status"],
    ["VERSION", "version"],
    ["EFFECTIVE DATE", "effectivedate"],
    ["SOURCE", "source"],
  ]) {
    const match = contents.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
    if (match) {
      metadata[key] = match[1].trim();
    }
  }
  return metadata;
}

function getApprovalStatus(metadata) {
  const status = metadata.status ?? metadata.Status ?? metadata.approvalStatus;
  return typeof status === "string" ? status.trim() : null;
}

function isApproved(status) {
  return typeof status === "string" && status.toLowerCase() === "approved";
}

function documentIndexMap(index) {
  const map = new Map();
  for (const document of index?.documents ?? []) {
    if (typeof document?.path === "string") {
      map.set(document.path.replace(/\\/g, "/"), document);
    }
  }
  for (const path of index?.machineReadable ?? []) {
    if (typeof path === "string" && !map.has(path.replace(/\\/g, "/"))) {
      map.set(path.replace(/\\/g, "/"), { path, type: "machine-readable" });
    }
  }
  return map;
}

export async function inspectKnowledgeBase(knowledgeBasePath) {
  const paths = await findFiles(knowledgeBasePath);
  const metadataIndexPath = join(knowledgeBasePath, "21_metadata_and_index", "knowledge-index.json");
  let index = null;
  try {
    index = JSON.parse(await readFile(metadataIndexPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      if (error instanceof SyntaxError) {
        throw new Error(`Knowledge index is invalid JSON: ${metadataIndexPath}`, { cause: error });
      }
      throw error;
    }
  }

  const profilePath = join(knowledgeBasePath, "00_company_profile", "profile.json");
  let profile = {};
  try {
    profile = JSON.parse(await readFile(profilePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      if (error instanceof SyntaxError) {
        throw new Error(`Company profile is invalid JSON: ${profilePath}`, { cause: error });
      }
      throw error;
    }
  }

  const indexedDocuments = documentIndexMap(index);
  const documents = await Promise.all(paths.map(async (path) => {
    const fullPath = join(knowledgeBasePath, path);
    const contents = await readFile(fullPath, "utf8");
    const extension = extname(path).toLowerCase();
    const inspectionErrors = [];
    const supported = SUPPORTED_EXTENSIONS.has(extension);
    const metadata = supported ? getMetadata(contents, extension, inspectionErrors) : {};
    const indexed = indexedDocuments.get(path);
    const status = getApprovalStatus(metadata);
    const hasUnresolvedPlaceholders = UNRESOLVED_PLACEHOLDER.test(contents);
    const empty = contents.trim().length === 0;
    const metadataAvailable = Object.keys(metadata).length > 0;
    const documentId =
      metadata.documentid
      ?? metadata.DocumentID
      ?? metadata.documentId
      ?? indexed?.id
      ?? null;
    const title =
      metadata.documenttitle
      ?? metadata.DocumentTitle
      ?? metadata.title
      ?? metadata.Title
      ?? indexed?.title
      ?? null;
    const business =
      metadata.business
      ?? metadata.companyName
      ?? profile.companyName
      ?? null;
    const industryValue =
      typeof metadata.industry === "string"
        ? metadata.industry
        : metadata.industry?.value ?? profile.industry?.value ?? null;
    const industry = typeof industryValue === "string" ? industryValue : null;
    const complete =
      !empty
      && !hasUnresolvedPlaceholders
      && inspectionErrors.length === 0
      && Boolean(documentId && title && status);
    const eligibleForRetrieval =
      supported
      &&
      !empty
      && inspectionErrors.length === 0
      && isApproved(status)
      && !hasUnresolvedPlaceholders;

    return {
      path,
      format: extension.slice(1),
      supported,
      indexed: Boolean(indexed),
      documentId,
      title,
      type:
        metadata.documenttype
        ?? metadata.documentType
        ?? metadata.type
        ?? indexed?.type
        ?? null,
      business,
      industry,
      status,
      metadataAvailable,
      metadata,
      empty,
      hasUnresolvedPlaceholders,
      complete,
      eligibleForRetrieval,
      inspectionErrors,
      exclusionReasons: [
        ...(!supported ? [`Format "${extension || "(no extension)"}" is not supported.`] : []),
        ...(empty ? ["Document is empty."] : []),
        ...(!status ? ["Approval status is missing; explicit status: approved is required."] : []),
        ...(status && !isApproved(status) ? [`Document status is "${status}", not "approved".`] : []),
        ...(hasUnresolvedPlaceholders ? ["Document contains unresolved [COMPANY INPUT REQUIRED] placeholders."] : []),
        ...(!documentId ? ["Document ID is missing."] : []),
        ...(!title ? ["Document title is missing."] : []),
        ...inspectionErrors,
      ],
    };
  }));

  return {
    generatedAt: new Date().toISOString(),
    knowledgeBasePath,
    supportedFormats: [...SUPPORTED_EXTENSIONS].map((extension) => extension.slice(1)),
    company: profile.companyName ?? null,
    industry: profile.industry?.value ?? null,
    summary: {
      discovered: documents.length,
      supported: documents.filter((document) => document.supported).length,
      unsupported: documents.filter((document) => !document.supported).length,
      indexed: documents.filter((document) => document.indexed).length,
      unregistered: documents.filter((document) => !document.indexed).length,
      empty: documents.filter((document) => document.empty).length,
      incomplete: documents.filter((document) => !document.complete).length,
      eligibleForRetrieval: documents.filter((document) => document.eligibleForRetrieval).length,
      excludedFromRetrieval: documents.filter((document) => !document.eligibleForRetrieval).length,
    },
    documents,
  };
}
