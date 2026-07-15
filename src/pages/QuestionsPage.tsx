import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OptionCard } from '../components/OptionCard';
import { SyncBadge } from '../components/SyncBadge';
import { useIntakeSync } from '../hooks/useIntakeSync';
import { QS, shouldSkip, stepIndex, buildFinalIntakeJson, type Answers } from '../lib/questions';

const AUTOMATION_MODES = [
  { v: 'manual', l: 'Manual', d: 'Standard bench workflow' },
  { v: 'automated', l: 'Automated', d: 'Opentrons FLEX or Hamilton liquid handler' },
  { v: 'both', l: 'Both', d: 'Run manual now, add automation later — or keep both in parallel' },
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
      navigate('/generating');
      await completeIntake(finalJson as unknown as Record<string, unknown>);
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
    </div>
  );
}

function AutomationBody({ answers, setField }: { answers: Answers; setField: (k: string, v: unknown) => void }) {
  const ops = (answers.operations as string[]) || [];
  const showBca = ops.includes('bca_assay');
  const showMini = ops.includes('miniprep');
  if (!showBca && !showMini) {
    return <p style={{ fontSize: 13, color: 'var(--mid)' }}>No automation-eligible operations selected — this step will be skipped.</p>;
  }
  return (
    <>
      {showBca && (
        <>
          <div className="field-label" style={{ marginBottom: 8 }}>BCA assay</div>
          <div className="opt-grid" style={{ gridTemplateColumns: '1fr' }}>
            {AUTOMATION_MODES.map((o) => (
              <OptionCard key={o.v} option={o} selected={answers.bca_mode === o.v} onClick={() => setField('bca_mode', o.v)} />
            ))}
          </div>
        </>
      )}
      {showMini && (
        <>
          <div className="field-label" style={{ margin: `${showBca ? '18px' : '0'} 0 8px` }}>Plasmid miniprep</div>
          <div className="opt-grid" style={{ gridTemplateColumns: '1fr' }}>
            {AUTOMATION_MODES.map((o) => (
              <OptionCard key={o.v} option={o} selected={answers.miniprep_mode === o.v} onClick={() => setField('miniprep_mode', o.v)} />
            ))}
          </div>
        </>
      )}
    </>
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
  const count = parseInt((answers.staff_count as string) || '1', 10) || 1;
  return (
    <>
      <div className="field-wrap">
        <label className="field-label">Number of workers</label>
        <div className="stepper">
          <button type="button" onClick={() => setField('staff_count', String(Math.max(1, count - 1)))}>−</button>
          <span className="stepper-val">{count}</span>
          <button type="button" onClick={() => setField('staff_count', String(count + 1))}>+</button>
        </div>
      </div>
      <div className="field-wrap">
        <label className="field-label">Roles (select all)</label>
        <div className="chips">
          {STAFF_ROLES.map(([v, l]) => (
            <span key={v} className={`chip${sr.includes(v) ? ' sel' : ''}`} onClick={() => toggleMultiField('staff_roles', v)}>{l}</span>
          ))}
        </div>
      </div>
    </>
  );
}
