# Cirrus frontend (React)

A React + TypeScript + Vite port of the Cirrus prototype. Same design system
(colors, layout, floor plan, chat bubbles) as the vanilla-JS version — the
goal here was architecture, not a visual redesign. Talks exclusively to
`cirrus-backend`'s GraphQL API and `/chat/stream` endpoint, same as the
vanilla-JS version before it.

## Stack

- **Vite + React + TypeScript**
- **React Router** — real routes (`/`, `/scenario`, `/questions`, `/chat`,
  `/generating`, `/report`) instead of the old single-page div-toggling.
  This also means the login/dashboard work can slot in as protected routes
  without restructuring anything.
- **Apollo Client v4** — HTTP for queries/mutations, `graphql-ws` for the
  live intake subscription. Note: Apollo Client v4 moved all React hooks
  (`useQuery`, `useMutation`, `useSubscription`, `ApolloProvider`, etc.) to
  the `@apollo/client/react` subpath — only the core client, links, and
  `gql` stay in `@apollo/client` itself. It also dropped the
  `onCompleted`/`onError` callback options from `useQuery` (kept them on
  `useMutation` and `useSubscription`); this codebase watches the returned
  `data`/`error` via `useEffect` instead, in `useIntakeSync.ts` and
  `GeneratingPage.tsx`.

## Setup

```bash
cp .env.example .env   # set VITE_CIRRUS_API_BASE_URL if not localhost:4000
npm install
npm run dev
```

Whatever port Vite prints (typically `5173`) needs to be in
`cirrus-backend`'s `CORS_ORIGINS`.

## Structure

```
src/
  lib/kb.ts            station/equipment knowledge base + floor-plan math
  lib/questions.ts      guided-question definitions + derivation logic
  lib/session.ts         session id helper (a pointer only — state lives in Mongo)
  apollo.ts               Apollo Client setup (HTTP + WS split link)
  graphql/operations.ts   every query/mutation/subscription document
  hooks/useIntakeSync.ts  shared hook: hydrate, subscribe, write, complete
  components/             OptionCard, FloorPlan, DonutChart, ReportView, ChatWidget, SyncBadge
  pages/                  one component per route
```

## What ported 1:1 vs. what's still simplified

Ported faithfully: all six question types, floor-plan drag/drop + regenerate
+ expansion suggestions, the donut chart, the full report renderer, the chat
streaming/brace-freezing trick for hiding the `INTAKE_COMPLETE` JSON handoff.

Still true from the vanilla-JS version, unchanged:
- No auth — `sessionId` is a client-generated string in `localStorage`.
- The manual paste-JSON box on the Report screen is a fallback for testing,
  not the primary path.
- Floor-plan math runs against the hardcoded `KB` object in `lib/kb.ts`, not
  the backend's `stations`/`operations` GraphQL data.

## Next up

Login and a dashboard were explicitly deferred to be tackled after this
conversion — see the open questions from that conversation (auth strategy,
what the dashboard shows) before starting those.
