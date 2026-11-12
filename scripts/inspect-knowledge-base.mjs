import { fileURLToPath } from "node:url";
import { inspectKnowledgeBase } from "../server/services/knowledgeBaseInspector.js";

const knowledgeBasePath = fileURLToPath(new URL("../knowledge-base/", import.meta.url));

try {
  const report = await inspectKnowledgeBase(knowledgeBasePath);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error("Knowledge-base inspection failed:", error);
  process.exitCode = 1;
}
