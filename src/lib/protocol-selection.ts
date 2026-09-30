import type { Answers } from './questions';

// One patch preserves selections outside a filter and each existing frequency.
export function selectProtocols(answers: Answers, protocols: { value: string; operationId?: string }[], selected: boolean): Answers {
  const ids = new Set((answers.operations as string[]) ?? []);
  const runs = { ...((answers.protocol_runs_per_week as Record<string, number>) ?? {}) };
  const operations = { ...((answers.protocol_operation_by_id as Record<string, string>) ?? {}) };
  for (const protocol of protocols) {
    if (selected) {
      ids.add(protocol.value);
      runs[protocol.value] ??= 1;
      if (protocol.operationId) operations[protocol.value] = protocol.operationId;
    } else {
      ids.delete(protocol.value);
      delete runs[protocol.value];
      delete operations[protocol.value];
    }
  }
  return { operations: [...ids], protocol_runs_per_week: runs, protocol_operation_by_id: operations };
}
