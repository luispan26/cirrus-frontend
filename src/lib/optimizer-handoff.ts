// Hands a layout straight to the standalone Optimizer page (src/pages/OptimizerPage.tsx)
// the same way its own file/database loaders do, by writing into the
// sessionStorage keys OptimizerApp.jsx persists its inputs under
// (see src/optimizer/README.md) — that vendored component takes no props,
// so this is the only way to seed it without editing vendored code.
export function sendLayoutToOptimizer(data: unknown, label: string): void {
  try {
    // usePersisted stores JSON.stringify(value); the value it holds for the
    // layout (layoutText) is itself the plan's raw JSON text, not the parsed
    // object — so this key needs that text stringified once, then stored
    // stringified again, or OptimizerApp's JSON.parse hands back an object
    // where it expects a string and crashes on `.trim()`.
    sessionStorage.setItem('co.layout', JSON.stringify(JSON.stringify(data)));
    sessionStorage.setItem('co.layoutLabel', JSON.stringify(label));
    sessionStorage.setItem('co.overrides', JSON.stringify({}));
    sessionStorage.setItem('co.extraProtocols', JSON.stringify([]));
    const constraints = data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).constraints)
      ? (data as Record<string, unknown>).constraints
      : [];
    sessionStorage.setItem('co.rules', JSON.stringify(constraints));
  } catch {
    // Storage full or blocked — the optimizer page just opens without a
    // preloaded layout instead of failing the navigation.
  }
}
