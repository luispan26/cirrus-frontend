# Cirrus optimizer app (vendored)

The `cirrus-optimizer` repo's React app and browser-side engine (branch
`main`, commit `5d4c69a`; engine `cirrus-optimizer-0.4.0`), served at
`/optimizer` (`../pages/OptimizerPage.tsx`, opened from the dashboard's
**Open Optimizer** button). The MiniZinc solve and the database reads run in
cirrus-backend (`src/optimizer/optimizer.controller.ts`, `/optimizer/*`,
signed-in users only); baselines and drawing run here in a Web Worker.

| Here | cirrus-optimizer |
| --- | --- |
| `components/*` | `src/components/` |
| `generatedLab/*` | `src/generatedLab/` |
| `optimizer.css` | `src/optimizer.css` |

Local changes — keep them when copying files over:

- `generatedLab/dbClient.js` calls `${VITE_CIRRUS_API_BASE_URL}/optimizer/*`
  with the user's token instead of the dev server's `/api/*`, and adds
  `optimizeOnServer`.
- `components/OptimizerApp.jsx` solves through `optimizeOnServer` instead of
  `fetch("/api/optimize")`; the database-offline note points at cirrus-backend.
- `optimizer.css` is nested under `.cirrus-optimizer` (`:root` and `body` → `&`)
  so it can't restyle the rest of Cirrus.
- `components/OptimizerApp.d.ts` types the default export for `OptimizerPage.tsx`.

Everything else is unmodified. Fix the engine and app in cirrus-optimizer
first (run its `npm test`), copy the files over, reapply the changes above,
then `npm run build` here.
