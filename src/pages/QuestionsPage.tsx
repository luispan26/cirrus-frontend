import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OptionCard } from '../components/OptionCard';
import { SyncBadge } from '../components/SyncBadge';
import { useIntakeSync } from '../hooks/useIntakeSync';
import { QS, shouldSkip, stepIndex, buildFinalIntakeJson, type Answers, type DoorAnswer, type UtilityAnswer, type WallSide } from '../lib/questions';

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
const FIXED_FEATURES = [['doors', 'Doors / egress'], ['windows', 'Windows'], ['columns', 'Columns'], ['sinks_drains', 'Sinks / drains'], ['electrical', 'Fixed electrical'], ['hvac', 'HVAC supply / returns'], ['gas_vacuum', 'Gas / vacuum'], ['fixed_equipment', 'Immovable equipment']];
const HARD_CONSTRAINTS = [['clean_dirty_separation', 'Separate clean and dirty workflows'], ['pre_post_pcr', 'Separate pre-PCR and post-PCR'], ['clear_egress', 'Preserve clear egress routes'], ['accessible_routes', 'Maintain accessible routes'], ['dedicated_hood', 'Dedicated hood workspace'], ['one_way_flow', 'One-way sample or material flow']];
const WALL_OPTIONS: [WallSide, string][] = [['N', 'North'], ['S', 'South'], ['E', 'East'], ['W', 'West']];
const UTILITY_TYPES = [['water', 'Water'], ['electrical', 'Electrical'], ['gas', 'Gas'], ['vacuum', 'Vacuum']];

function validateQuestion(id: string, answers: Answers) {
  if (id === 'bsl' && !answers.bsl) return 'Select a biosafety level or “Not sure yet.”';
  if (id === 'operations' && ((answers.operations as string[]) || []).length === 0) return 'Select at least one operation.';
  if (id === 'automation' && !answers.wants_automation) return 'Choose whether automation should be included.';
  if (id === 'space') {
    if (!(Number(answers.width_ft) > 0) || !(Number(answers.height_ft) > 0) || !(Number(answers.ceiling_ft) > 0)) return 'Enter positive room width, depth, and ceiling height.';
    if (!answers.rooms || answers.renovation === undefined) return 'Choose the room layout and whether this is a renovation.';
  }
  if (id === 'facilities') {
    const door = answers.door as DoorAnswer | undefined;
    if (!door || !door.wall || !(Number(door.offsetFt) >= 0)) return 'Specify where the main door is located.';
  }
  if (id === 'budget' && !(Number(answers.budget_total) > 0)) return 'Enter a positive budget amount.';
  if (id === 'staff' && ((answers.staff_roles as string[]) || []).length === 0) return 'Select at least one staff role.';
  if (id === 'schedule' && (!(Number(answers.hours_per_shift || 8) > 0) || !(Number(answers.shifts_per_day || 1) > 0))) return 'Enter a valid shift length and number of shifts.';
  if (id === 'demand' && (!(Number(answers.runs_per_week) > 0) || !(Number(answers.batch_size) > 0))) return 'Enter positive weekly runs and batch size.';
  if (id === 'business_model' && !answers.business_model) return 'Select a business model.';
  return '';
}

export function QuestionsPage() {
  const navigate = useNavigate();
  const [qi, setQi] = useState(0);
  const [validationError, setValidationError] = useState('');
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
  const error = validateQuestion(q.id, answers);
  if (error) { setValidationError(error); return; }
  setValidationError('');
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
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
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
            <QuestionBody q={q} displayNumber={posInApplicable} answers={answers} setField={setField} toggleMultiField={toggleMultiField} onEnterNav={nextQ} />
            {validationError && <p className="q-validation-error">{validationError}</p>}
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
  displayNumber,
  answers,
  setField,
  toggleMultiField,
}: {
  q: (typeof QS)[number];
  displayNumber: number;
  answers: Answers;
  setField: (k: string, v: unknown) => void;
  toggleMultiField: (k: string, v: string) => void;
  onEnterNav: () => void;
}) {
  return (
    <div className="q-card">
      <div className="q-num">Q{displayNumber}</div>
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

      {q.type === 'protocols' && <ProtocolsBody answers={answers} setField={setField} />}
      {q.type === 'space' && <SpaceBody answers={answers} setField={setField} />}
      {q.type === 'facilities' && <FacilitiesBody answers={answers} setField={setField} toggleMultiField={toggleMultiField} />}
      {q.type === 'budget' && <BudgetBody answers={answers} setField={setField} />}
      {q.type === 'staff' && <StaffBody answers={answers} setField={setField} toggleMultiField={toggleMultiField} />}
      {q.type === 'schedule' && <ScheduleBody answers={answers} setField={setField} />}
      {q.type === 'demand' && <DemandBody answers={answers} setField={setField} />}
      {q.type === 'constraints' && <ConstraintsBody answers={answers} toggleMultiField={toggleMultiField} />}
      {q.type === 'growth' && <GrowthBody answers={answers} setField={setField} />}
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

function ScheduleBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  return <><div className="grid-2"><div className="field-wrap"><label className="field-label">Hours per shift</label><input className="field-input" type="number" min="1" max="24" defaultValue={String(answers.hours_per_shift || '8')} onBlur={(e) => setField('hours_per_shift', e.target.value)} /></div><div className="field-wrap"><label className="field-label">Shifts per day</label><input className="field-input" type="number" min="1" max="3" defaultValue={String(answers.shifts_per_day || '1')} onBlur={(e) => setField('shifts_per_day', e.target.value)} /></div></div><div className="field-wrap"><label className="field-label">Peak protocols running simultaneously</label><input className="field-input" style={{ width: 180 }} type="number" min="1" defaultValue={String(answers.simultaneous_protocols || '1')} onBlur={(e) => setField('simultaneous_protocols', e.target.value)} /></div><div className="field-wrap"><label className="field-label">Can equipment run unattended?</label><div className="chips"><span className={`chip${answers.unattended_runs === 'true' ? ' sel' : ''}`} onClick={() => setField('unattended_runs', 'true')}>Yes, where permitted</span><span className={`chip${answers.unattended_runs === 'false' ? ' sel' : ''}`} onClick={() => setField('unattended_runs', 'false')}>No</span></div></div></>;
}

function ConstraintsBody({ answers, toggleMultiField }: { answers: Answers; toggleMultiField: (k: string, v: string) => void }) {
  const selected = (answers.hard_constraints as string[]) || [];
  return <><p className="q-inline-help">Selected items will invalidate a generated layout when they are not satisfied.</p><div className="opt-grid">{HARD_CONSTRAINTS.map(([value, label]) => <OptionCard key={value} option={{ v: value, l: label }} selected={selected.includes(value)} onClick={() => toggleMultiField('hard_constraints', value)} />)}</div></>;
}

function GrowthBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  return <><div className="grid-2"><div className="field-wrap"><label className="field-label">Planning horizon (years)</label><input className="field-input" type="number" min="1" defaultValue={String(answers.growth_horizon_years || '3')} onBlur={(e) => setField('growth_horizon_years', e.target.value)} /></div><div className="field-wrap"><label className="field-label">Expected workload growth (%)</label><input className="field-input" type="number" min="0" defaultValue={String(answers.workload_growth_pct || '0')} onBlur={(e) => setField('workload_growth_pct', e.target.value)} /></div><div className="field-wrap"><label className="field-label">Additional staff expected</label><input className="field-input" type="number" min="0" defaultValue={String(answers.headcount_growth || '0')} onBlur={(e) => setField('headcount_growth', e.target.value)} /></div><div className="field-wrap"><label className="field-label">Reserve unused capacity (%)</label><input className="field-input" type="number" min="0" max="80" defaultValue={String(answers.spare_capacity_pct || '20')} onBlur={(e) => setField('spare_capacity_pct', e.target.value)} /></div></div></>;
}

function ProtocolsBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  return <div className="field-wrap"><label className="field-label">Protocols.io IDs (optional)</label><textarea className="field-input q-textarea" placeholder={'Enter one ID per line, or separate IDs with commas'} defaultValue={String(answers.protocol_ids || '')} onBlur={(e) => setField('protocol_ids', e.target.value)} /><p className="q-inline-help">These protocols will later be resolved through the local protocol library and reviewed for step-to-equipment mappings.</p></div>;
}

function FacilitiesBody({ answers, setField, toggleMultiField }: { answers: Answers; setField: (k: string, v: unknown) => void; toggleMultiField: (k: string, v: string) => void }) {
  const selected = (answers.fixed_features as string[]) || [];
  const door: DoorAnswer = (answers.door as DoorAnswer) || { wall: 'S', offsetFt: 0, widthFt: 3 };
  const utilitiesKnown = answers.utility_locations_known === 'true';
  const utilities = (answers.utilities as UtilityAnswer[]) || [];
  const [draftType, setDraftType] = useState(UTILITY_TYPES[0][0]);
  const [draftWall, setDraftWall] = useState<WallSide>('S');
  const [draftOffset, setDraftOffset] = useState('');

  function patchDoor(patch: Partial<DoorAnswer>) {
    setField('door', { ...door, ...patch });
  }

  function addUtility() {
    const offsetFt = parseFloat(draftOffset);
    if (!Number.isFinite(offsetFt) || offsetFt < 0) return;
    setField('utilities', [...utilities, { type: draftType, wall: draftWall, offsetFt }]);
    setDraftOffset('');
  }

  function removeUtility(index: number) {
    setField('utilities', utilities.filter((_, i) => i !== index));
  }

  return (
    <>
      <div className="field-wrap">
        <label className="field-label">Fixed features (select all)</label>
        <div className="chips">{FIXED_FEATURES.map(([value, label]) => <span key={value} className={`chip${selected.includes(value) ? ' sel' : ''}`} onClick={() => toggleMultiField('fixed_features', value)}>{label}</span>)}</div>
      </div>

      <div className="field-wrap">
        <label className="field-label">Where is the main door / exit?</label>
        <div className="chips">
          {WALL_OPTIONS.map(([v, l]) => (
            <span key={v} className={`chip${door.wall === v ? ' sel' : ''}`} onClick={() => patchDoor({ wall: v })}>{l} wall</span>
          ))}
        </div>
        <div className="grid-2" style={{ marginTop: 8 }}>
          <div className="field-wrap">
            <label className="field-label">Offset along that wall</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input className="field-input" type="number" min="0" placeholder="e.g. 10" defaultValue={door.offsetFt || ''} onBlur={(e) => patchDoor({ offsetFt: parseFloat(e.target.value) || 0 })} />
              <span className="field-unit">ft</span>
            </div>
          </div>
          <div className="field-wrap">
            <label className="field-label">Door width</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input className="field-input" type="number" min="1" placeholder="3" defaultValue={door.widthFt || 3} onBlur={(e) => patchDoor({ widthFt: parseFloat(e.target.value) || 3 })} />
              <span className="field-unit">ft</span>
            </div>
          </div>
        </div>
      </div>

      <div className="field-wrap">
        <label className="field-label">Are exact utility and obstruction locations known?</label>
        <div className="chips">
          <span className={`chip${answers.utility_locations_known === 'true' ? ' sel' : ''}`} onClick={() => setField('utility_locations_known', 'true')}>Yes, they can be mapped</span>
          <span className={`chip${answers.utility_locations_known === 'false' ? ' sel' : ''}`} onClick={() => setField('utility_locations_known', 'false')}>Not yet</span>
        </div>
      </div>

      {utilitiesKnown && (
        <div className="field-wrap">
          <label className="field-label">Utility connections (water, gas, electrical, vacuum)</label>
          {utilities.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {utilities.map((u, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13 }}>{UTILITY_TYPES.find(([v]) => v === u.type)?.[1] ?? u.type} — {WALL_OPTIONS.find(([v]) => v === u.wall)?.[1]} wall, {u.offsetFt} ft</span>
                  <button type="button" className="btn-out" style={{ padding: '2px 10px' }} onClick={() => removeUtility(i)}>Remove</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="field-input" style={{ width: 130 }} value={draftType} onChange={(e) => setDraftType(e.target.value)}>
              {UTILITY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div className="chips">
              {WALL_OPTIONS.map(([v, l]) => <span key={v} className={`chip${draftWall === v ? ' sel' : ''}`} onClick={() => setDraftWall(v)}>{l}</span>)}
            </div>
            <input className="field-input" style={{ width: 100 }} type="number" min="0" placeholder="offset ft" value={draftOffset} onChange={(e) => setDraftOffset(e.target.value)} />
            <button type="button" className="btn-teal" style={{ padding: '6px 14px' }} onClick={addUtility}>Add</button>
          </div>
        </div>
      )}

      <div className="field-wrap">
        <label className="field-label">Room notes</label>
        <textarea className="field-input q-textarea" placeholder="Describe immovable objects, unusual geometry, utility limitations, or known HVAC constraints" defaultValue={String(answers.room_notes || '')} onBlur={(e) => setField('room_notes', e.target.value)} />
      </div>
    </>
  );
}
