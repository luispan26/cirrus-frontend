import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OptionCard } from '../components/OptionCard';
import { SyncBadge } from '../components/SyncBadge';
import { useIntakeSync } from '../hooks/useIntakeSync';
import { QS, shouldSkip, stepIndex, buildFinalIntakeJson, type Answers } from '../lib/questions';

const AUTOMATION_CHOICES = [
  { v: 'yes', l: 'Yes, add an automation station', d: 'Opentrons FLEX or Hamilton liquid handler for eligible protocols' },
  { v: 'no', l: 'No, keep everything manual', d: 'Standard bench workflow' },
];
const STAFF_ROLES = [
  ['PI', 'PI / Lead scientist'],
  ['lab_manager', 'Lab manager'],
  ['technician', 'Technician'],
  ['student_intern', 'Student / intern'],
];

export function QuestionsPage() {
  const navigate = useNavigate();
  const [qi, setQi] = useState(0);
  const { answers, status, setField, toggleMultiField, completeIntake } = useIntakeSync(() => {
    navigate('/generating');
  });

  const q = QS[qi];
  const applicable = QS.filter((sq) => !shouldSkip(sq, answers));
  const posInApplicable = applicable.indexOf(q) + 1;
  const pct = Math.round(((posInApplicable - 1) / applicable.length) * 100);
  const isLast = stepIndex(qi, 1, answers) >= QS.length;

  function prevQ() {
    const pi = stepIndex(qi, -1, answers);
    if (pi >= 0) setQi(pi);
    else navigate('/scenario');
  }

  async function nextQ() {
  const ni = stepIndex(qi, 1, answers);
  if (ni < QS.length) {
    setQi(ni);
  } else {
    const finalJson = buildFinalIntakeJson(answers);
    await completeIntake(finalJson as unknown as Record<string, unknown>);
    navigate('/generating');
  }
}

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault();
        nextQ();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        prevQ();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, answers]);

  return (
    <div className="screen questions-screen">
      <div className="qm-topbar">
        <div className="logo-mark" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>CIRRUS</div>
        <div className="qm-prog-track"><div className="qm-prog-fill" style={{ width: `${pct}%` }} /></div>
        <SyncBadge status={status} />
        <button className="qm-mode-toggle" onClick={() => navigate('/dashboard')}>Dashboard</button>
        <button className="qm-mode-toggle" onClick={() => navigate('/chat')}>Full-screen chat →</button>
      </div>
      <div className="qm-stage">
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="qm-counter">Question {posInApplicable} of {applicable.length}</div>
          <div className="q-body">
            <QuestionBody q={q} answers={answers} setField={setField} toggleMultiField={toggleMultiField} onEnterNav={nextQ} />
          </div>
        </div>
      </div>
      <div className="qm-footer">
        <button className="btn-out" style={{ visibility: qi === 0 ? 'hidden' : 'visible' }} onClick={prevQ}>← Back</button>
        <div className="qm-kbd-hint">Press <kbd>Enter</kbd> to continue</div>
        <button className="btn-teal" style={{ background: isLast ? '#D1316B' : undefined }} onClick={nextQ}>
          {isLast ? 'Generate report →' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

function QuestionBody({
  q,
  answers,
  setField,
  toggleMultiField,
}: {
  q: (typeof QS)[number];
  answers: Answers;
  setField: (k: string, v: unknown) => void;
  toggleMultiField: (k: string, v: string) => void;
  onEnterNav: () => void;
}) {
  return (
    <div className="q-card">
      <div className="q-num">Q{q.n}</div>
      <div className="q-title">{q.t}</div>
      <div className="q-hint">{q.h}</div>

      {q.type === 'multi' && (
        <>
          {q.id === 'operations' && (
            <div className="modality-badge">Open-ended — often faster to just describe in the chat bubble</div>
          )}
          <div className="opt-grid">
            {q.opts!.map((o) => (
              <OptionCard
                key={o.v}
                option={o}
                selected={((answers[q.id] as string[]) || []).includes(o.v)}
                onClick={() => toggleMultiField(q.id, o.v)}
              />
            ))}
          </div>
        </>
      )}

      {q.type === 'radio' && (
        <div className="opt-grid" style={{ gridTemplateColumns: '1fr' }}>
          {q.opts!.map((o) => (
            <OptionCard key={o.v} option={o} showRisk selected={answers[q.id] === o.v} onClick={() => setField(q.id, o.v)} />
          ))}
        </div>
      )}

      {q.type === 'automation' && (
        <AutomationBody answers={answers} setField={setField} />
      )}

      {q.type === 'space' && <SpaceBody answers={answers} setField={setField} />}
      {q.type === 'budget' && <BudgetBody answers={answers} setField={setField} />}
      {q.type === 'staff' && <StaffBody answers={answers} setField={setField} toggleMultiField={toggleMultiField} />}
      {q.type === 'demand' && <DemandBody answers={answers} setField={setField} />}
      {q.type === 'priorities' && <PrioritiesBody answers={answers} setField={setField} />}
    </div>
  );
}

function AutomationBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  return (
    <div className="opt-grid" style={{ gridTemplateColumns: '1fr' }}>
      {AUTOMATION_CHOICES.map((o) => (
        <OptionCard key={o.v} option={o} selected={answers.wants_automation === o.v} onClick={() => setField('wants_automation', o.v)} />
      ))}
    </div>
  );
}

function SpaceBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const w = parseFloat((answers.width_ft as string) || '0') || 0;
  const h = parseFloat((answers.height_ft as string) || '0') || 0;
  return (
    <>
      <div className="grid-2">
        <div className="field-wrap">
          <label className="field-label">Room width</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input className="field-input" type="number" placeholder="e.g. 40" defaultValue={(answers.width_ft as string) || ''} onBlur={(e) => setField('width_ft', e.target.value)} />
            <span className="field-unit">ft</span>
          </div>
        </div>
        <div className="field-wrap">
          <label className="field-label">Room depth</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input className="field-input" type="number" placeholder="e.g. 30" defaultValue={(answers.height_ft as string) || ''} onBlur={(e) => setField('height_ft', e.target.value)} />
            <span className="field-unit">ft</span>
          </div>
        </div>
      </div>
      {w > 0 && h > 0 && (
        <p style={{ fontSize: 12, color: 'var(--td)', fontWeight: 600, margin: '-10px 0 16px' }}>
          = {(w * h).toLocaleString()} sq ft — the floor plan will auto-generate to fit this footprint
        </p>
      )}
      <div className="grid-2">
        <div className="field-wrap">
          <label className="field-label">Ceiling height</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input className="field-input" type="number" placeholder="e.g. 10" defaultValue={(answers.ceiling_ft as string) || ''} onBlur={(e) => setField('ceiling_ft', e.target.value)} />
            <span className="field-unit">ft</span>
          </div>
        </div>
      </div>
      <div className="field-wrap" style={{ marginTop: 4 }}>
        <label className="field-label">Room layout</label>
        <div className="chips">
          <span className={`chip${answers.rooms === 'single_open' ? ' sel' : ''}`} onClick={() => setField('rooms', 'single_open')}>Single open room</span>
          <span className={`chip${answers.rooms === 'multiple_rooms' ? ' sel' : ''}`} onClick={() => setField('rooms', 'multiple_rooms')}>Multiple rooms</span>
        </div>
      </div>
      <div className="field-wrap">
        <label className="field-label">Is this a renovation?</label>
        <div className="chips">
          <span className={`chip${answers.renovation === 'false' ? ' sel' : ''}`} onClick={() => setField('renovation', 'false')}>New build</span>
          <span className={`chip${answers.renovation === 'true' ? ' sel' : ''}`} onClick={() => setField('renovation', 'true')}>Existing space</span>
        </div>
      </div>
    </>
  );
}

function BudgetBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const bt = answers.budget_total as string | undefined;
  return (
    <>
      <div className="field-wrap">
        <label className="field-label">Total budget (USD)</label>
        <input className="field-input" style={{ width: 240 }} type="number" placeholder="e.g. 250000" defaultValue={bt || ''} onBlur={(e) => setField('budget_total', e.target.value)} />
        <div className="preset-row">
          {[50000, 100000, 250000, 500000, 1000000].map((v) => (
            <span key={v} className={`chip${Number(bt) === v ? ' sel' : ''}`} onClick={() => setField('budget_total', String(v))}>
              {v >= 1000000 ? '$1M+' : '$' + v / 1000 + 'k'}
            </span>
          ))}
        </div>
      </div>
      <div className="field-wrap">
        <label className="field-label">What does this cover?</label>
        <div className="chips" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <span className={`chip${answers.budget_scope === 'equipment_only' ? ' sel' : ''}`} onClick={() => setField('budget_scope', 'equipment_only')}>Equipment &amp; consumables only</span>
          <span className={`chip${answers.budget_scope === 'equipment_and_construction' ? ' sel' : ''}`} onClick={() => setField('budget_scope', 'equipment_and_construction')}>Equipment + construction / renovation</span>
        </div>
      </div>
    </>
  );
}

function StaffBody({ answers, setField, toggleMultiField }: { answers: Answers; setField: (k: string, v: unknown) => void; toggleMultiField: (k: string, v: string) => void }) {
  const sr = (answers.staff_roles as string[]) || [];
  const counts = (answers.staff_counts as Record<string, number>) || {};

  function toggleRole(role: string) {
    toggleMultiField('staff_roles', role);
    if (!sr.includes(role) && counts[role] === undefined) {
      setField('staff_counts', { ...counts, [role]: 1 });
    }
  }

  function setCount(role: string, next: number) {
    setField('staff_counts', { ...counts, [role]: Math.max(1, next) });
  }

  return (
    <>
      <div className="field-wrap">
        <label className="field-label">Roles (select all)</label>
        <div className="chips">
          {STAFF_ROLES.map(([v, l]) => (
            <span key={v} className={`chip${sr.includes(v) ? ' sel' : ''}`} onClick={() => toggleRole(v)}>{l}</span>
          ))}
        </div>
      </div>
      {sr.length > 0 && (
        <div className="field-wrap">
          <label className="field-label">How many of each?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sr.map((v) => {
              const label = STAFF_ROLES.find(([rv]) => rv === v)?.[1] ?? v;
              const count = counts[v] ?? 1;
              return (
                <div key={v} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>{label}</span>
                  <div className="stepper">
                    <button type="button" onClick={() => setCount(v, count - 1)}>−</button>
                    <span className="stepper-val" style={{ fontSize: 18, minWidth: 26 }}>{count}</span>
                    <button type="button" onClick={() => setCount(v, count + 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function DemandBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const seasonal = (answers.seasonal_variability as string) || '0';
  return (
    <>
      <div className="grid-2">
        <div className="field-wrap">
          <label className="field-label">Runs per week</label>
          <input className="field-input" type="number" placeholder="e.g. 10" defaultValue={(answers.runs_per_week as string) || ''} onBlur={(e) => setField('runs_per_week', e.target.value)} />
        </div>
        <div className="field-wrap">
          <label className="field-label">Expected batch size</label>
          <input className="field-input" type="number" placeholder="e.g. 8" defaultValue={(answers.batch_size as string) || ''} onBlur={(e) => setField('batch_size', e.target.value)} />
        </div>
      </div>
      <div className="field-wrap">
        <label className="field-label">Seasonal variability (optional)</label>
        <div className="chips">
          <span className={`chip${seasonal === '0' ? ' sel' : ''}`} onClick={() => setField('seasonal_variability', '0')}>Steady year-round</span>
          <span className={`chip${seasonal === '0.5' ? ' sel' : ''}`} onClick={() => setField('seasonal_variability', '0.5')}>Some fluctuation</span>
          <span className={`chip${seasonal === '1' ? ' sel' : ''}`} onClick={() => setField('seasonal_variability', '1')}>Highly seasonal</span>
        </div>
      </div>
    </>
  );
}

const PRIORITY_SLIDERS: [string, string, string][] = [
  ['priority_throughput', 'Throughput', 'Keep high-traffic stations centrally located'],
  ['priority_walking_distance', 'Technician walking distance', 'Minimize steps between consecutive protocol stages'],
  ['priority_flexibility', 'Flexibility for future expansion', 'Leave room to add stations later'],
  ['priority_contamination', 'Contamination minimization', 'Keep sensitive and automation zones apart'],
  ['priority_equipment_utilization', 'Equipment utilization', 'Keep equipment-heavy stations well-integrated'],
];

function PrioritiesBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {PRIORITY_SLIDERS.map(([key, label, hint]) => {
        const raw = answers[key];
        const parsed = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
        const value = Number.isNaN(parsed) ? 50 : parsed;
        return (
          <div key={key} className="field-wrap" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="field-label" style={{ marginBottom: 2 }}>{label}</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--td)' }}>{value}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              defaultValue={value}
              onChange={(e) => setField(key, e.target.value)}
              style={{ width: '100%', accentColor: 'var(--teal)' }}
            />
            <p style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>{hint}</p>
          </div>
        );
      })}
    </div>
  );
}