import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client/react';
import {
  COMPLETE_INTAKE_MUTATION,
  INTAKE_SESSION_QUERY,
  INTAKE_UPDATED_SUBSCRIPTION,
  UPDATE_INTAKE_FIELDS_MUTATION,
} from '../graphql/operations';
import { getSessionId } from '../lib/session';
import { INTAKE_FIELD_KEYS, type Answers } from '../lib/questions';

export type SyncStatus = 'idle' | 'live' | 'err';

interface IntakeSessionData {
  fields: Record<string, unknown>;
  complete: boolean;
  finalIntakeJson: Record<string, unknown> | null;
}

/**
 * Owns the connection to a single IntakeSession on the backend: hydrates
 * initial state, subscribes to live updates (replacing the old dual
 * setInterval polling loops), and exposes debounced field writes. Used by
 * both the guided-questions flow and the chat page, since either can
 * complete the same underlying session.
 */
export function useIntakeSync(onComplete: (finalIntakeJson: Record<string, unknown>) => void) {
  const sessionId = getSessionId();
  const client = useApolloClient();
  const [answers, setAnswers] = useState<Answers>({});
  const [status, setStatus] = useState<SyncStatus>('idle');
  const completionHandled = useRef(false);

  const mergeFields = useCallback((fields: Record<string, unknown> | undefined) => {
    if (!fields) return;
    setAnswers((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of INTAKE_FIELD_KEYS) {
        if (!(key in fields)) continue;
        const v = fields[key];
        if (v == null || v === '') continue;
        if (JSON.stringify(prev[key]) !== JSON.stringify(v)) {
          next[key] = v;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  // Initial hydrate — picks up anything already on the session (e.g. from a
  // chat conversation that ran before Guided Mode was opened, or a refresh).
  const initialQuery = useQuery<{ intakeSession: IntakeSessionData }>(INTAKE_SESSION_QUERY, {
    variables: { sessionId },
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (initialQuery.error) {
      setStatus('err');
      return;
    }
    if (!initialQuery.data) return;
    setStatus('live');
    mergeFields(initialQuery.data.intakeSession.fields);
    if (
      initialQuery.data.intakeSession.complete &&
      initialQuery.data.intakeSession.finalIntakeJson &&
      !completionHandled.current
    ) {
      completionHandled.current = true;
      onComplete(initialQuery.data.intakeSession.finalIntakeJson);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery.data, initialQuery.error]);

  // Live updates — replaces the old setInterval(4000)/setInterval(5000) polling.
  useSubscription<{ intakeUpdated: IntakeSessionData }>(INTAKE_UPDATED_SUBSCRIPTION, {
    variables: { sessionId },
    onData: ({ data }: { data: { data?: { intakeUpdated: IntakeSessionData } } }) => {
      const updated = data.data?.intakeUpdated;
      if (!updated) return;
      setStatus('live');
      mergeFields(updated.fields);
      if (updated.complete && updated.finalIntakeJson && !completionHandled.current) {
        completionHandled.current = true;
        onComplete(updated.finalIntakeJson);
      }
    },
    onError: () => setStatus('err'),
  });

  const [runUpdateFields] = useMutation(UPDATE_INTAKE_FIELDS_MUTATION);
  const [runCompleteIntake] = useMutation(COMPLETE_INTAKE_MUTATION);

  const writeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Mirrors what each pending timer above is about to write — lets the
  // unmount cleanup below flush real values instead of just cancelling the
  // timers and losing whatever hadn't been saved yet.
  const pendingWrites = useRef<Record<string, unknown>>({});

  const scheduleWrite = useCallback(
    (key: string, value: unknown) => {
      if (writeTimers.current[key]) clearTimeout(writeTimers.current[key]);
      pendingWrites.current[key] = value;
      writeTimers.current[key] = setTimeout(() => {
        delete pendingWrites.current[key];
        runUpdateFields({ variables: { sessionId, patch: { [key]: value }, updatedBy: 'form' } })
          .then(() => setStatus('live'))
          .catch(() => setStatus('err'));
      }, 500);
    },
    [runUpdateFields, sessionId],
  );

  const setField = useCallback(
    (key: string, value: unknown) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
      if (!INTAKE_FIELD_KEYS.includes(key)) return;
      scheduleWrite(key, value);
    },
    [scheduleWrite],
  );

  const toggleMultiField = useCallback(
    (key: string, value: string) => {
      setAnswers((prev) => {
        const current = (prev[key] as string[]) || [];
        const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
        // Debounced the same way setField is — rapid clicks (checking several
        // operations quickly) now collapse into one save of the final array,
        // instead of firing a separate concurrent mutation per click that can
        // land out of order and get pushed back down via the subscription,
        // silently overwriting freshly-selected local state.
        if (INTAKE_FIELD_KEYS.includes(key)) scheduleWrite(key, next);
        return { ...prev, [key]: next };
      });
    },
    [scheduleWrite],
  );

  const completeIntake = useCallback(
    async (finalIntakeJson: Record<string, unknown>) => {
      await runCompleteIntake({ variables: { sessionId, finalIntakeJson } });
      completionHandled.current = true;
      onComplete(finalIntakeJson);
    },
    [runCompleteIntake, sessionId, onComplete],
  );

  // Debounced writes are cancelled-and-rescheduled on every keystroke/click
  // (see scheduleWrite) so a still-pending one hasn't reached the server
  // yet. Without this, navigating away (or just closing the tab) inside the
  // 500ms window silently drops that edit — the timer is torn down along
  // with the component before it ever fires, and the next time this session
  // loads it hydrates from the server's last-saved value, which looks
  // exactly like the edit "reverted". Flushing every still-pending write in
  // one patch on unmount (instead of only clearing the timers) closes that
  // gap.
  useEffect(() => {
    return () => {
      Object.values(writeTimers.current).forEach(clearTimeout);
      const pending = pendingWrites.current;
      if (Object.keys(pending).length > 0) {
        runUpdateFields({ variables: { sessionId, patch: pending, updatedBy: 'form' } }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sessionId, answers, status, setField, toggleMultiField, completeIntake, apolloClient: client };
}