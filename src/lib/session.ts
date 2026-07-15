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
