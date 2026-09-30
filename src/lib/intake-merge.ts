import { INTAKE_FIELD_KEYS, type Answers } from './questions';

// Session subscriptions contain unversioned snapshots, including older echoes.
// Locally authored keys remain authoritative for this editor's lifetime.
export function mergeIntakeFields(current: Answers, incoming: Answers, locallyEdited: ReadonlySet<string>): Answers {
  const next = { ...current };
  let changed = false;
  for (const key of INTAKE_FIELD_KEYS) {
    if (!(key in incoming) || locallyEdited.has(key)) continue;
    if (JSON.stringify(current[key]) !== JSON.stringify(incoming[key])) {
      next[key] = incoming[key];
      changed = true;
    }
  }
  return changed ? next : current;
}
