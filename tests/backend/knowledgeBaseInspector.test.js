import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { inspectKnowledgeBase } from "../../server/services/knowledgeBaseInspector.js";

const temporaryDirectories = [];

async function createKnowledgeBase() {
  const root = await mkdtemp(join(tmpdir(), "shopease-kb-test-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "docs"), { recursive: true });
  await mkdir(join(root, "21_metadata_and_index"), { recursive: true });
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true }),
  ));
});

test("inspection discovers supported formats and excludes unapproved or unresolved documents", async () => {
  const root = await createKnowledgeBase();
  await mkdir(join(root, "00_company_profile"), { recursive: true });
  await writeFile(join(root, "00_company_profile", "profile.json"), JSON.stringify({
    companyName: "Demo",
    industry: { value: "Retail" },
  }));
  await writeFile(join(root, "docs", "approved.md"), [
    "| Document ID | DOC-1 |",
    "| Document Title | Approved policy |",
    "| Module | Returns |",
    "| Document Type | policy |",
    "| Status | approved |",
    "| Source | owner |",
    "",
    "A confirmed answer.",
  ].join("\n"));
  await writeFile(join(root, "docs", "draft.txt"), "STATUS: needs-owner-approval\nQ: draft\nA: not approved\n");
  await writeFile(join(root, "docs", "placeholder.md"), "STATUS: approved\nUnknown: [COMPANY INPUT REQUIRED]\n");
  await writeFile(join(root, "docs", "empty.txt"), "");
  await writeFile(join(root, "docs", "unsupported.pdf"), "not inspected");
  await writeFile(join(root, "21_metadata_and_index", "knowledge-index.json"), JSON.stringify({
    documents: [{ id: "DOC-1", path: "docs/approved.md", type: "policy" }],
    machineReadable: ["00_company_profile/profile.json"],
  }));

  const report = await inspectKnowledgeBase(root);

  assert.equal(report.summary.discovered, 7);
  assert.equal(report.summary.supported, 6);
  assert.equal(report.summary.unsupported, 1);
  assert.equal(report.summary.eligibleForRetrieval, 1);
  assert.equal(report.summary.empty, 1);
  assert.equal(report.summary.unregistered, 5);
  const approved = report.documents.find((document) => document.path === "docs/approved.md");
  assert.equal(approved.eligibleForRetrieval, true);
  assert.equal(approved.documentId, "DOC-1");
  assert.equal(approved.industry, "Retail");
  assert.equal(approved.complete, true);

  const profile = report.documents.find((document) => document.path === "00_company_profile/profile.json");
  assert.equal(profile.indexed, true);
  assert.equal(profile.business, "Demo");
  assert.equal(profile.industry, "Retail");

  const placeholder = report.documents.find((document) => document.path === "docs/placeholder.md");
  assert.equal(placeholder.eligibleForRetrieval, false);
  assert.equal(placeholder.hasUnresolvedPlaceholders, true);

  const empty = report.documents.find((document) => document.path === "docs/empty.txt");
  assert.equal(empty.eligibleForRetrieval, false);
  assert.equal(empty.empty, true);

  const unsupported = report.documents.find((document) => document.path === "docs/unsupported.pdf");
  assert.equal(unsupported.supported, false);
  assert.equal(unsupported.eligibleForRetrieval, false);
});

test("invalid JSON documents are reported and excluded", async () => {
  const root = await createKnowledgeBase();
  await writeFile(join(root, "docs", "invalid.json"), "{not json");

  const report = await inspectKnowledgeBase(root);
  const invalid = report.documents[0];

  assert.equal(invalid.eligibleForRetrieval, false);
  assert.match(invalid.inspectionErrors[0], /JSON is invalid/);
});

test("reads bullet-style Markdown metadata but excludes a pending-approval test fixture", async () => {
  const root = await createKnowledgeBase();
  await writeFile(join(root, "docs", "pending.md"), [
    "# Password reset",
    "",
    "## Document metadata",
    "- **Document ID:** `SHOPEASE-TEST-001`",
    "- **Title:** Password Reset Instructions",
    "- **Business:** ShopEase",
    "- **Category:** Account Support",
    "- **Document type:** Customer Support Procedure",
    "- **Version:** 1.0",
    "- **Status:** `pending_approval`",
    "- **Effective date:** Not applicable",
    "- **Source:** Internal fictional test fixture",
    "",
    "Test-only password reset instructions.",
  ].join("\n"));

  const report = await inspectKnowledgeBase(root);
  const document = report.documents[0];

  assert.equal(document.documentId, "SHOPEASE-TEST-001");
  assert.equal(document.title, "Password Reset Instructions");
  assert.equal(document.business, "ShopEase");
  assert.equal(document.type, "Customer Support Procedure");
  assert.equal(document.status, "pending_approval");
  assert.equal(document.eligibleForRetrieval, false);
  assert.ok(document.exclusionReasons.some((reason) => reason.includes("not \"approved\"")));
});
