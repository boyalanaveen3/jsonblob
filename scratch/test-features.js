const DEPLOYED_URL = "https://2e4f009d.jsonblob-app.pages.dev/api/ai";

const actions = [
  { name: "Explain Code", prompt: "Explain the active editor code in detail" },
  { name: "Find Bugs", prompt: "Scan this code for logical, compiler, or syntax bugs, and suggest fixes" },
  { name: "Optimize", prompt: "Suggest performance optimizations and refactored code for improved speed" },
  { name: "Explain Errors", prompt: "Analyze current compiler diagnostics/runtime errors and explain why they happened and how to fix them" },
  { name: "Generate Tests", prompt: "Generate unit tests for this code" },
  { name: "Add Comments", prompt: "Add professional inline documentation comments to this code" }
];

async function testAction(action) {
  const payload = {
    prompt: action.prompt,
    module: "playground",
    content: "const a = 1; function calculate(x) { return x * 2; }",
    language: "javascript"
  };

  try {
    const res = await fetch(DEPLOYED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      return { name: action.name, passed: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const text = data.response || "";

    // Validation checks
    const hasDetailsTag = text.includes("<details>") && text.includes("</details>");
    const hasSummaryTag = text.includes("<summary>") && text.includes("</summary>");
    
    // AI Assistant should not start with polite conversational greetings
    const hasGreeting = /^(hello|hi|hey|i am your|sure|here is|ok|gladly)/i.test(text.trim());

    if (!hasDetailsTag && action.name !== "Explain Errors" && action.name !== "Add Comments") {
      return { name: action.name, passed: false, error: "Missing collapsible details tag structure" };
    }

    if (hasGreeting) {
      return { name: action.name, passed: false, error: "Response contains conversational greetings" };
    }

    return { name: action.name, passed: true, snippet: text.substring(0, 120).replace(/\n/g, " ") };
  } catch (err) {
    return { name: action.name, passed: false, error: err.message };
  }
}

async function runAll() {
  console.log("=========================================");
  console.log("STARTING AI ASSISTANT CONTEXTUAL TOOLS TESTS");
  console.log(`Target URL: ${DEPLOYED_URL}`);
  console.log("=========================================");

  let passedCount = 0;
  for (const action of actions) {
    process.stdout.write(`Testing: ${action.name}... `);
    const result = await testAction(action);
    if (result.passed) {
      console.log(`\n✅ PASS: ${action.name} (Format check passed. Preview: "${result.snippet}...")`);
      passedCount++;
    } else {
      console.log(`\n❌ FAIL: ${action.name} (${result.error})`);
    }
  }

  console.log("\n=========================================");
  console.log("TEST SUITE COMPLETED");
  console.log(`Passed: ${passedCount}/${actions.length}`);
  console.log("=========================================");
}

runAll();
