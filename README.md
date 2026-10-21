# Cirrus frontend (React)

The web app for Cirrus, the lab design platform. Users answer a guided
questionnaire, build their room in the layout sandbox, and get a lab design
report. The report contains a bill of materials, a generated floor plan with
workflow zones, and the optimized equipment placement. All data comes from
`cirrus-backend`'s GraphQL API. This app never calls n8n or Canvas directly.

## Stack

- **Vite + React 19 + TypeScript**
- **React Router**: public routes (`/`, `/login`, `/register`) plus
  protected routes behind `ProtectedRoute`.
- **Apollo Client v4**: HTTP for queries and mutations, `graphql-ws` for
  the live intake subscription. React hooks are imported from
  `@apollo/client/react`. Because `useQuery` has no
  `onCompleted`/`onError` callbacks, the code watches `data`/`error` in
  `useEffect` instead.
- **Vitest** for unit tests, **oxlint** for linting.

## Setup

```bash
cp .env.example .env   # VITE_CIRRUS_API_BASE_URL (default http://localhost:4000), VITE_CANVAS_URL
npm install
npm run dev
```

Add Vite's port (typically `5173`) to `cirrus-backend`'s `CORS_ORIGINS`.

```bash
npm test         # vitest
npm run lint     # oxlint
npm run build    # type-check + production build
```

## Routes

| Route | Page |
|---|---|
| `/`, `/login`, `/register` | Splash, login, sign-up |
| `/dashboard` | Stats and entry points (new design, sandbox, Canvas) |
| `/scenario` → `/questions` → `/generating` → `/report` | The design flow: scenario, questionnaire, generation, report |
| `/history` | Past designs and reports |
| `/layout-sandbox` | Room builder: walls, doors, columns, fixtures, floor equipment, guided placement flow |
| `/protocols`, `/validated-protocols` | Protocol admin and validated protocols (cell types, essential flag) |
| `/inventory`, `/equipment-lists` | Equipment database and biomaterial equipment lists |
| `/chat` | Chat intake (streams `POST /chat/stream`) |
| `/settings`, `/profile`, `/disclaimer` | Account and app pages |
| `/floor-plan-parser-test`, `/zone-bench-maximizer-test` | Developer test pages |

### Questionnaire steps

The steps are budget, biosafety level, biomaterials, protocols, equipment
plan, space, and layout preferences. The equipment plan groups equipment by
workflow zone (General, Bacterial, Yeast, Mammalian). Each selected
protocol's equipment goes into its zone. The space step uploads a floor plan
or opens the layout sandbox.

### Report

The report contains:
- The bill of materials.
- The protocols section.
- The generated floor plan, with zones, aisles, door clearances, safety
  fixtures, floor equipment and benches replaced by equipment. You can edit
  the zones; clicking a bench moves its whole working aisle.
- Layout settings.
- Layout optimization results: before/after walking, per-protocol totals,
  moves, and the equipment placement rules met or broken.

The Protocol Standardization Guide PDF (`public/`) is offered on the
Protocols page and in every report.

## Structure

```
src/
  App.tsx, main.tsx        routes and providers
  apollo.ts                Apollo Client (HTTP + WS split link, auth header)
  context/AuthContext.tsx  login state (token in localStorage)
  graphql/operations.ts    every query/mutation/subscription document
  hooks/useIntakeSync.ts   hydrate, subscribe, write, complete the intake
  lib/
    questions.ts           questionnaire step definitions and derivation logic
    lab-plan.ts            types for the backend's generated plan (layout.plan)
    layout-sandbox.ts      sandbox room model
    placement-grid.tsx     shared grid renderer for zones and benches
    zone-equipment.ts      equipment-by-zone logic for the equipment step
    protocol-selection.ts  protocol selection helpers
    intake-merge.ts        merging intake updates
    session.ts             session id pointer (state lives in Mongo)
  components/              ReportView, GeneratedLayoutPlan, LayoutFloorPlan,
                           LayoutOptimization, ChatWidget, …
  components/sandbox/      layout sandbox palette, inspector, guided flow
  pages/                   one component per route
```

The `*.test.ts` files sit next to the code they test, in `src/lib/` and
`src/components/sandbox/`.

## Notes

- Layout generation, zoning and equipment optimization all run on the
  backend. The frontend draws `layout.plan` and sends edits. See
  `cirrus-backend/AGENTS.md` and `docs/optimizer-handoff.md` for how the
  plan is built.
- The session id and the sandbox's in-progress layout are stored in
  `localStorage`. The intake itself is stored in Mongo.
- The Report page's paste-JSON box is a testing fallback, not the
  main path.

# Cirrus Rules

- do not change configuration files
