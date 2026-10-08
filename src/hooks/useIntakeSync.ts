import { mergeIntakeFields } from '../lib/intake-merge';
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
  // This editor owns locally touched keys until it closes. Subscription snapshots
  // have no field revision, so even acknowledged writes can echo out of order.
  const locallyEdited = useRef(new Set<string>());
  const answersRef = useRef<Answers>({});

  const mergeFields = useCallback((fields: Record<string, unknown> | undefined) => {
    if (!fields) return;
    const next = mergeIntakeFields(answersRef.current, fields, locallyEdited.current);
    answersRef.current = next;
    setAnswers(next);
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
    // A session that's ALREADY complete on this very first load means the
    // caller opened this page to revisit/revise a finished questionnaire
    // (see ReportPage.tsx's "Edit questionnaire" button) — that's not a
    // completion event to react to, so mark it handled without calling
    // onComplete, which would otherwise immediately bounce the user back to
    // /generating before they ever see their answers. A genuine completion
    // (this tab's own completeIntake call, or the chat flow finishing this
    // session server-side) still reaches onComplete below via the
    // subscription, which is unaffected by this branch.
    if (initialQuery.data.intakeSession.complete && !completionHandled.current) {
      completionHandled.current = true;
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

  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWrites = useRef<Record<string, unknown>>({});
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  const flushWrites = useCallback(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = null;
    const patch = pendingWrites.current;
    pendingWrites.current = {};
    if (!Object.keys(patch).length) return writeQueue.current;
    const task = writeQueue.current.catch(() => {}).then(async () => {
      try {
        await runUpdateFields({ variables: { sessionId, patch, updatedBy: 'form' } });
        setStatus('live');
      } catch (error) {
        const stillCurrent = Object.fromEntries(Object.entries(patch).filter(([key, value]) => JSON.stringify(answersRef.current[key]) === JSON.stringify(value)));
        pendingWrites.current = { ...stillCurrent, ...pendingWrites.current };
        setStatus('err');
        throw error;
      }
    });
    writeQueue.current = task;
    return task;
  }, [runUpdateFields, sessionId]);

  const setField = useCallback((key: string, value: unknown) => {
    // Normalize clearing to null: undefined disappears from a JSON patch.
    const nextValue = value === undefined ? null : value;
    answersRef.current = { ...answersRef.current, [key]: nextValue };
    setAnswers(answersRef.current);
    if (!INTAKE_FIELD_KEYS.includes(key)) return;
    locallyEdited.current.add(key);
    pendingWrites.current[key] = nextValue;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => { void flushWrites().catch(() => {}); }, 500);
  }, [flushWrites]);

  const toggleMultiField = useCallback((key: string, value: string) => {
    const current = (answersRef.current[key] as string[]) ?? [];
    setField(key, current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  }, [setField]);

  const completeIntake = useCallback(
    async (finalIntakeJson: Record<string, unknown>) => {
      await flushWrites();
      await runCompleteIntake({ variables: { sessionId, finalIntakeJson } });
      completionHandled.current = true;
      onComplete(finalIntakeJson);
    },
    [runCompleteIntake, sessionId, onComplete, flushWrites],
  );

  useEffect(() => () => { void flushWrites().catch(() => {}); }, [flushWrites]);

  return { sessionId, answers, status, setField, toggleMultiField, completeIntake, apolloClient: client };
}