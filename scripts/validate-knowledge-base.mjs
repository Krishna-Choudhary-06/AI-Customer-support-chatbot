import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../knowledge-base/", import.meta.url));

async function loadJson(relativePath) {
  const contents = await readFile(join(root, relativePath), "utf8");
  return JSON.parse(contents);
}

const index = await loadJson("21_metadata_and_index/knowledge-index.json");
const structuredFaqs = await loadJson("21_metadata_and_index/faqs.json");
const intentDocument = await loadJson("16_intent_taxonomy/intent-taxonomy.json");
const requiredFaqFields = [
  "id",
  "category",
  "question",
  "alternativeQueries",
  "answer",
  "detailedExplanation",
  "conditions",
  "relatedPolicy",
  "resolutionSteps",
  "relatedQuestions",
  "relatedDocuments",
  "escalation",
  "source",
];
const documentIds = new Set();
const faqIds = new Set();
const canonicalQuestions = new Set();

for (const document of index.documents) {
  assert.ok(!documentIds.has(document.id), `Duplicate document ID: ${document.id}`);
  documentIds.add(document.id);
  await readFile(join(root, document.path), "utf8");
}

for (const relativePath of index.machineReadable) {
  await loadJson(relativePath);
}

for (const faq of structuredFaqs.faqs) {
  for (const field of requiredFaqFields) {
    assert.ok(Object.hasOwn(faq, field), `FAQ ${faq.id} is missing ${field}`);
  }
  assert.ok(!faqIds.has(faq.id), `Duplicate FAQ ID: ${faq.id}`);
  faqIds.add(faq.id);

  const canonicalQuestion = faq.question.trim().toLowerCase().replace(/\s+/g, " ");
  assert.ok(!canonicalQuestions.has(canonicalQuestion), `Duplicate FAQ question: ${faq.question}`);
  canonicalQuestions.add(canonicalQuestion);

  assert.ok(faq.answer.trim().length > 0, `FAQ ${faq.id} has an empty answer`);
  assert.ok(faq.source.trim().length > 0, `FAQ ${faq.id} is missing its source`);
}

const requiredIntentFields = [
  "name",
  "description",
  "exampleQueries",
  "requiredEntities",
  "knowledgeDocuments",
  "strategy",
  "escalationConditions",
  "requiresLiveSystem",
];
const intentNames = new Set();

for (const intent of intentDocument.intents) {
  for (const field of requiredIntentFields) {
    assert.ok(Object.hasOwn(intent, field), `Intent ${intent.name} is missing ${field}`);
  }
  assert.ok(!intentNames.has(intent.name), `Duplicate intent name: ${intent.name}`);
  intentNames.add(intent.name);
}

const requiredFiles = [
  "21_metadata_and_index/knowledge-document.schema.json",
  "21_metadata_and_index/knowledge-document.template.json",
  "21_metadata_and_index/faq.schema.json",
  "16_intent_taxonomy/entity-schema.json",
];
for (const relativePath of requiredFiles) {
  if (relativePath.endsWith(".json")) {
    await loadJson(relativePath);
  } else {
    await readFile(join(root, relativePath), "utf8");
  }
}

console.log("Knowledge base validation passed.");
console.log(`- Indexed documents: ${index.documents.length}`);
console.log(`- Structured FAQ entries: ${structuredFaqs.faqs.length}`);
console.log(`- Unique intents: ${intentNames.size}`);
console.log("- Duplicate document IDs, FAQ IDs, and canonical FAQ questions: none");
console.log("- Company-specific approval and unknown-policy gaps: see 21_metadata_and_index/validation-report.md");
