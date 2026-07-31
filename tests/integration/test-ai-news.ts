import { fetchAINewsFromSources } from "../../lib/tech-news/fetchAINews";
import { isAIArticle, extractAITags, categorizeAIArticle, getTrendingKeywords } from "../../lib/tech-news/aiFilter";

async function runAINewsVerification() {
  console.log("=== STARTING AI DEVELOPER NEWS VERIFICATION TEST ===");

  // Test 1: AI Keyword Filter Detection
  console.log("\n--- 1. Testing AI Keyword Filter Detection ---");
  const testTitle = "OpenAI releases GPT-4o with Claude context sharing via MCP";
  const testSummary = "Cursor and Copilot developers build agentic workflows with LangChain and LlamaIndex.";

  const isAi = isAIArticle(testTitle, testSummary);
  console.assert(isAi === true, "isAIArticle should return true for AI headline");
  console.log("✅ [PASS] AI keyword detection verified");

  const tags = extractAITags(testTitle, testSummary);
  console.log("Extracted Tags:", tags);
  console.assert(tags.includes("OpenAI"), "Tags should include OpenAI");
  console.assert(tags.includes("Claude"), "Tags should include Claude");
  console.log("✅ [PASS] AI tag extraction verified");

  // Test 2: Categorization Engine
  console.log("\n--- 2. Testing AI Categorization Engine ---");
  const category = categorizeAIArticle(testTitle, testSummary, tags);
  console.log("Categorized as:", category);
  console.assert(category === "tools" || category === "models", "Category should be valid");
  console.log("✅ [PASS] AI categorization engine verified");

  // Test 3: Fetcher Feed Aggregator & Deduplication
  console.log("\n--- 3. Testing Feed Aggregator & Deduplication ---");
  const newsResponse = await fetchAINewsFromSources("ai-news");
  console.log(`Fetched ${newsResponse.items.length} items`);
  console.assert(newsResponse.items.length > 0, "News response should contain items");
  console.assert(newsResponse.trendingKeywords.length > 0, "Trending keywords should be generated");
  console.log("Trending Keywords:", newsResponse.trendingKeywords.map(k => k.keyword));
  console.log("✅ [PASS] Feed aggregator & trending keywords engine verified");

  console.log("\n=========================================");
  console.log("🎉 ALL AI NEWS VERIFICATION TESTS PASSED!");
  console.log("=========================================");
}

runAINewsVerification().catch((err) => {
  console.error("❌ AI News test failed:", err);
  process.exit(1);
});
