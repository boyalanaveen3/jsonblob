async function runTest(label, prompt) {
  const payload = {
    prompt: prompt,
    module: "playground",
    content: "const a = 1; function testFunc() {} class MyClass {} interface MyInterface {}",
    language: "typescript"
  };

  try {
    const res = await fetch("https://c951f094.jsonblob-app.pages.dev/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log(`--- ${label} ---`);
    console.log(data.response.substring(0, 200) + "...\n");
  } catch (err) {
    console.error(`ERROR for ${label}:`, err);
  }
}

async function main() {
  await runTest("Explain Code", "Explain the active editor code in detail");
  await runTest("Find Bugs", "Scan this code for logical, compiler, or syntax bugs, and suggest fixes");
  await runTest("Optimize", "Suggest performance optimizations and refactored code for improved speed");
  await runTest("Explain Errors", "Analyze current compiler diagnostics/runtime errors and explain why they happened and how to fix them");
  await runTest("Generate Tests", "Generate unit tests for this code");
  await runTest("Add Comments", "Add professional inline documentation comments to this code");
}

main();
