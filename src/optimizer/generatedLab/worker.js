import { inspectGeometry, runOptimizer } from "./engine.js";

self.onmessage = async ({ data }) => {
  try {
    if (data.inspectOnly) {
      const model = inspectGeometry(data.input);
      self.postMessage({ type: "geometry", layout: model.layout, source: model.source });
      return;
    }
    const result = await runOptimizer(data.input, data.scenario, {
      optimize: data.optimize,
      onProgress: progress => self.postMessage({ type: "progress", progress }),
    });
    self.postMessage({ type: "result", result, optimized: data.optimize });
  } catch (error) {
    self.postMessage({ type: "error", diagnostics: error.diagnostics ?? [{ path: "input", message: error.message }] });
  }
};
