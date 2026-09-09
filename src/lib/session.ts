export function getSessionId(): string {
  let id = localStorage.getItem('cirrus_session_id');
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem('cirrus_session_id', id);
  }
  return id;
}

// Shared with LayoutSandboxPage, which reads/writes the sandbox's working
// layout and guided-flow answers under this key so a "Rebuild in the
// sandbox" round-trip resumes where the user left off.
export const SANDBOX_LAYOUT_STORAGE_KEY = 'cirrus:sandbox:last-layout';

// Drops any in-progress sandbox work — called whenever a brand-new design
// session starts (see resetSessionId and DashboardPage's "Build a layout"
// card), so starting a new lab design never resumes leftover placements
// and dimensions from whatever the user was previously building.
export function clearPersistedSandboxLayout(): void {
  try { localStorage.removeItem(SANDBOX_LAYOUT_STORAGE_KEY); } catch { /* private browsing, etc */ }
}

export function resetSessionId(): string {
  localStorage.removeItem('cirrus_session_id');
  clearPersistedSandboxLayout();
  return getSessionId();
}

// Points the single "active session" pointer at an explicit, already-known
// session — used when opening a report for a session that may not be the
// currently-active one (e.g. from Design History) so /questions and /chat's
// useIntakeSync hook operate on the right session instead of whatever
// happens to already be in localStorage.
export function setSessionId(id: string): void {
  localStorage.setItem('cirrus_session_id', id);
}
