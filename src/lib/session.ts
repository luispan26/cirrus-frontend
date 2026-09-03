export function getSessionId(): string {
  let id = localStorage.getItem('cirrus_session_id');
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem('cirrus_session_id', id);
  }
  return id;
}

export function resetSessionId(): string {
  localStorage.removeItem('cirrus_session_id');
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
