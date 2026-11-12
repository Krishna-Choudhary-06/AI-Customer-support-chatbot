import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import {
  chunkDocumentContent,
  extractDocumentContent,
  ingestKnowledgeBase,
} from "../../server/services/documentIngestion.js";

const temporaryDirectories = [];

async function createKnowledgeBase() {
  const root = await mkdtemp(join(tmpdir(), "shopease-ingest-test-"));
  temporaryDirectories.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true }),
  ));
});

test("Markdown extraction removes document metadata but preserves the article body", () => {
  const markdown = [
    "# Return policy",
    "",
    "## Document metadata",
    "- **Document ID:** `DOC-1`",
    "- **Status:** `approved`",
    "",
    "## Eligibility",
    "",
    "Products may be returned when they meet the published conditions.",
  ].join("\n");

  const extracted = extractDocumentContent(markdown, "md");

  assert.doesNotMatch(extracted, /Document metadata|DOC-1|Status.*approved/);
  assert.match(extracted, /## Eligibility/);
  assert.match(extracted, /published conditions/);
});

test("JSON extraction turns structured FAQ records into readable content without metadata", () => {
  const json = JSON.stringify({
    documentId: "DOC-FAQ-1",
    status: "approved",
    title: "Account FAQ",
    faqs: [
      {
        id: "FAQ-1",
        question: "How do I reset my password?",
        answer: "Visit the login page and select Forgot Password.",
      },
    ],
  });

  const extracted = extractDocumentContent(json, "json");

  assert.match(extracted, /question: How do I reset my password\?/);
  assert.match(extracted, /answer: Visit the login page and select Forgot Password/);
  assert.doesNotMatch(extracted, /DOC-FAQ-1|approved|FAQ-1/);
});

test("chunking respects size limits and keeps heading context", () => {
  const content = [
    "# Returns",
    "",
    "## Eligibility",
    "",
    "Customers can request a return when the item meets the approved policy.",
    "",
    "## Evidence",
    "",
    `${"Attach a clear photo of the item condition. ".repeat(20)}`,
  ].join("\n");

  const chunks = chunkDocumentContent(content, 180);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 180));
  assert.ok(chunks.some((chunk) => chunk.startsWith("Returns > Eligibility")));
  assert.ok(chunks.some((chunk) => chunk.startsWith("Returns > Evidence")));
  assert.ok(chunks.join("\n").includes("approved policy"));
});

test("ingestion creates metadata-bearing chunks only from approved placeholder-free documents", async () => {
  const root = await createKnowledgeBase();
  await mkdir(join(root, "docs"), { recursive: true });

  await writeFile(join(root, "docs", "approved.md"), [
    "# Approved returns",
    "",
    "## Document metadata",
    "| Document ID | SHO-RET-TEST |",
    "| Document Title | Approved returns |",
    "| Module | Returns |",
    "| Submodule | Eligibility |",
    "| Document Type | policy |",
    "| Intent | return_request |",
    "| Version | 1.0 |",
    "| Status | approved |",
    "| Source | owner-approved test fixture |",
    "",
    "## Eligibility",
    "",
    "Products may be returned within the approved return window.",
    "",
    "## Procedure",
    "",
    "Submit the request using the verified support channel.",
  ].join("\n"));
  await writeFile(join(root, "docs", "draft.md"), [
    "| Document ID | SHO-DRAFT |",
    "| Document Title | Draft |",
    "| Status | needs-owner-approval |",
    "",
    "Do not ingest this draft.",
  ].join("\n"));
  await writeFile(join(root, "docs", "placeholder.txt"), [
    "DOCUMENT ID: SHO-PLACEHOLDER",
    "DOCUMENT TITLE: Incomplete policy",
    "STATUS: approved",
    "",
    "Return window is [COMPANY INPUT REQUIRED].",
  ].join("\n"));

  const result = await ingestKnowledgeBase({
    knowledgeBasePath: root,
    maxChunkCharacters: 180,
  });

  assert.equal(result.summary.discoveredDocuments, 3);
  assert.equal(result.summary.eligibleDocuments, 1);
  assert.equal(result.summary.ingestedDocuments, 1);
  assert.equal(result.summary.skippedDocuments, 2);
  assert.ok(result.chunks.length > 0);
  assert.ok(result.chunks.every((chunk) => chunk.documentId === "SHO-RET-TEST"));
  assert.ok(result.chunks.every((chunk) => chunk.status === "approved"));
  assert.ok(result.chunks.every((chunk) => chunk.text.length <= 180));
  assert.ok(result.chunks.every((chunk) => chunk.industry === null));
  assert.ok(result.chunks.every((chunk) => !chunk.text.includes("[COMPANY INPUT REQUIRED]")));
  assert.equal(new Set(result.chunks.map((chunk) => chunk.chunkId)).size, result.chunks.length);
});

test("ingestion extracts approved text and JSON documents with their metadata", async () => {
  const root = await createKnowledgeBase();
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(join(root, "docs", "shipping.txt"), [
    "DOCUMENT ID: SHO-SHIP-TEST",
    "DOCUMENT TITLE: Shipping support",
    "MODULE: Logistics",
    "BUSINESS: Demo Store",
    "INDUSTRY: Retail",
    "STATUS: approved",
    "VERSION: 2.0",
    "",
    "Contact support if a verified tracking record is unavailable.",
  ].join("\n"));
  await writeFile(join(root, "docs", "product.json"), JSON.stringify({
    documentId: "SHO-PROD-TEST",
    title: "Product support",
    module: "Products",
    documentType: "reference",
    business: "Demo Store",
    industry: "Retail",
    version: "1.1",
    status: "approved",
    content: {
      productInformation: "Check the approved product catalogue for current specifications.",
    },
  }));

  const result = await ingestKnowledgeBase({ knowledgeBasePath: root });

  assert.equal(result.summary.eligibleDocuments, 2);
  assert.equal(result.summary.ingestedDocuments, 2);
  assert.equal(result.chunks.length, 2);
  const textChunk = result.chunks.find((chunk) => chunk.documentId === "SHO-SHIP-TEST");
  assert.equal(textChunk.business, "Demo Store");
  assert.equal(textChunk.industry, "Retail");
  assert.equal(textChunk.version, "2.0");
  assert.match(textChunk.text, /verified tracking record/);
  const jsonChunk = result.chunks.find((chunk) => chunk.documentId === "SHO-PROD-TEST");
  assert.equal(jsonChunk.documentType, "reference");
  assert.equal(jsonChunk.module, "Products");
  assert.match(jsonChunk.text, /approved product catalogue/);
});

test("ingestion skips Markdown documents marked pending_approval", async () => {
  const root = await createKnowledgeBase();
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(join(root, "docs", "pending.md"), [
    "# Password reset",
    "",
    "## Document metadata",
    "- **Document ID:** `SHOPEASE-TEST-001`",
    "- **Title:** Password Reset Instructions",
    "- **Business:** ShopEase",
    "- **Status:** `pending_approval`",
    "- **Source:** Internal fictional test fixture",
    "",
    "Select Forgot Password on the login page.",
  ].join("\n"));

  const result = await ingestKnowledgeBase({ knowledgeBasePath: root });

  assert.equal(result.summary.eligibleDocuments, 0);
  assert.equal(result.summary.chunks, 0);
  assert.deepEqual(result.documentResults, []);
});

test("chunking rejects invalid size configuration", () => {
  assert.throws(() => chunkDocumentContent("A short paragraph.", 20), /at least 100/);
});
