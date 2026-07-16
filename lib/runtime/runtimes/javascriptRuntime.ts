import { ExecutionResult } from "@/types/playground";
import { LanguageRuntime } from "../runtimeManager";

export const javascriptRuntime: LanguageRuntime = {
  language: "javascript",

  async execute(code: string): Promise<ExecutionResult> {
    const startTime = performance.now();

    return new Promise((resolve) => {
      // Build Worker source code that intercepts console APIs and handles evaluation
      const workerCode = `
        self.onmessage = function(e) {
          const code = e.data;
          const logs = [];

          // Custom console logging interceptors
          const customConsole = {
            log: (...args) => {
              logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "));
            },
            warn: (...args) => {
              logs.push("[WARN] " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "));
            },
            error: (...args) => {
              logs.push("[ERROR] " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "));
            }
          };

          try {
            // Run inside a function to avoid polluting the worker global namespace
            const executor = new Function("console", code);
            executor(customConsole);
            self.postMessage({ success: true, logs });
          } catch (err) {
            self.postMessage({ success: false, error: err.message, logs });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      // Set timeout of 3 seconds to protect against infinite loops
      const timeout = setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        const timeMs = Math.round(performance.now() - startTime);
        resolve({
          logs: ["Execution timed out after 3.0 seconds (Possible infinite loop detected)."],
          error: "TimeoutError",
          timeMs,
        });
      }, 3000);

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);

        const timeMs = Math.round(performance.now() - startTime);
        const { success, logs, error } = e.data;

        resolve({
          logs,
          error: success ? undefined : error || "Unknown runtime error",
          timeMs,
        });
      };

      worker.onerror = (err) => {
        clearTimeout(timeout);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);

        const timeMs = Math.round(performance.now() - startTime);
        resolve({
          logs: [],
          error: err.message || "Worker initialization error",
          timeMs,
        });
      };

      // Start execution
      worker.postMessage(code);
    });
  },
};
