import { useRef, useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { CIRRUS_API_BASE_URL } from '../apollo';
import { CONFIRM_FLOOR_PLAN_MUTATION, FLOOR_PLAN_PARSE_QUERY } from '../graphql/operations';

// Mirrors cirrus-backend/src/floor-plan-parser/floor-plan-ir.types.ts — the
// two repos don't share a types package (same as SandboxLayout vs the
// backend's own layout.types.ts), so this is a manually-kept-in-sync copy.
interface Point { x: number; y: number; }
interface ParsedElement<T> { confidence: number; source: string; value: T; }
interface WallSegmentValue { a: Point; b: Point; thickness: number; }
type WallSegment = ParsedElement<WallSegmentValue> & { id: string };
interface RoomPolygon { polygon: Point[]; confidence: number; fitRect: { width: number; height: number; originOffset: Point; fitError: number } }
interface ScaleReferenceValue { a: Point; b: Point; distanceFt: number; }
interface FixtureValue { kind: string; footprint: Point[]; orientation: number; label?: string; }
type Fixture = ParsedElement<FixtureValue> & { id: string };
interface ParsedFloorPlan {
  schemaVersion: number;
  sourceFile: { fileId: string; format: string; pageIndex?: number };
  scale: ParsedElement<ScaleReferenceValue>;
  room: ParsedElement<RoomPolygon>;
  walls: WallSegment[];
  fixtures: Fixture[];
}
interface LockedWall { a: Point; b: Point; thicknessFt: number; }
interface LockedFloorPlan {
  schemaVersion: number;
  room: { widthFt: number; heightFt: number };
  walls: LockedWall[];
  fixtures: (FixtureValue & { id: string })[];
}
interface FloorPlanParseRecord {
  parseId: string;
  status: 'parsed' | 'confirmed' | 'failed';
  originalFilename: string;
  format: string;
  parsed: ParsedFloorPlan;
  locked?: LockedFloorPlan | null;
  failureReason?: string | null;
}

// Matches CONFIDENCE_REVIEW_THRESHOLD in the backend's floor-plan-ir.types.ts.
const CONFIDENCE_REVIEW_THRESHOLD = 0.75;

type Disposition = 'confirmed' | 'corrected' | 'rejected';
interface CorrectionDraft { elementType: string; elementId: string; disposition: Disposition; correctedValue?: unknown; }

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

function needsReview(confidence: number): boolean {
  return confidence < CONFIDENCE_REVIEW_THRESHOLD;
}

// Draws whatever room polygon + walls are on hand, in whatever units they're
// in (raw page-space units for the parsed preview, feet once locked) — the
// SVG viewBox is fit to the data, so the same component works for either.
// Source coordinates grow upward in y (pdf-lib/PDF convention); SVG grows
// downward, so y is flipped to read right-side-up.
function FloorPlanSvg({ room, walls }: { room?: { polygon: Point[]; confidence: number }; walls: { a: Point; b: Point; thickness: number; confidence: number }[] }) {
  const allPoints = [...(room?.polygon ?? []), ...walls.flatMap((w) => [w.a, w.b])];
  if (allPoints.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--mid)', padding: 20 }}>Nothing to draw yet.</div>;
  }
  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const pad = span * 0.12;
  const flipY = (y: number) => minY + maxY - y;

  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`}
      style={{ width: '100%', maxHeight: 420, background: '#fbfbfa', border: '1px solid var(--br)', borderRadius: 10 }}
    >
      {room && room.polygon.length > 2 && (
        <polygon
          points={room.polygon.map((p) => `${p.x},${flipY(p.y)}`).join(' ')}
          fill={needsReview(room.confidence) ? 'rgba(255,63,164,0.12)' : 'rgba(0,213,213,0.14)'}
        />
      )}
      {walls.map((w, i) => (
        <line
          key={i}
          x1={w.a.x} y1={flipY(w.a.y)} x2={w.b.x} y2={flipY(w.b.y)}
          stroke={needsReview(w.confidence) ? '#C41678' : '#049295'}
          strokeWidth={Math.max(w.thickness, span * 0.006)}
          strokeLinecap="square"
        />
      ))}
    </svg>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const flagged = needsReview(confidence);
  return (
    <span
      style={{
        fontFamily: 'var(--mono)', fontSize: 11, padding: '2px 8px', borderRadius: 999,
        background: flagged ? '#FFEAF5' : 'var(--tl)', color: flagged ? '#C41678' : 'var(--td)',
        border: `1px solid ${flagged ? '#FFD1E9' : 'var(--tline)'}`,
      }}
    >
      {flagged ? 'NEEDS REVIEW' : 'ACCEPTED'} · {confidence.toFixed(2)}
    </span>
  );
}

// Generic review card for any flagged element (room, a wall, a fixture) —
// deliberately not bespoke per element type: "Accept as-is" logs a
// 'confirmed' disposition with no correctedValue (the original value is
// still what gets locked in), and the JSON textarea lets you supply a real
// correctedValue for anything the parser got wrong, without needing a
// dedicated form per element shape.
function FlaggedElementCard({
  elementType, elementId, confidence, value, draft, onChange,
}: {
  elementType: string; elementId: string; confidence: number; value: unknown;
  draft: CorrectionDraft | undefined; onChange: (draft: CorrectionDraft) => void;
}) {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(value, null, 2));
  const [jsonError, setJsonError] = useState('');

  function acceptAsIs() {
    onChange({ elementType, elementId, disposition: 'confirmed' });
  }
  function saveCorrection() {
    try {
      const correctedValue = JSON.parse(jsonText);
      setJsonError('');
      onChange({ elementType, elementId, disposition: 'corrected', correctedValue });
    } catch {
      setJsonError('Not valid JSON.');
    }
  }

  return (
    <div style={{ border: '1px solid var(--br)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>{elementType} · {elementId}</span>
        <ConfidenceBadge confidence={confidence} />
      </div>
      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        rows={4}
        style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 11, padding: 8, borderRadius: 8, border: '1px solid var(--br)', boxSizing: 'border-box' }}
      />
      {jsonError && <div style={{ color: '#a33', fontSize: 11, marginTop: 4 }}>{jsonError}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <button className="btn-out" style={{ padding: '4px 12px', fontSize: 12 }} onClick={acceptAsIs}>Accept as-is</button>
        <button className="btn-out" style={{ padding: '4px 12px', fontSize: 12 }} onClick={saveCorrection}>Save correction</button>
        {draft && <span style={{ fontSize: 11, color: 'var(--mid)' }}>→ drafted: {draft.disposition}</span>}
      </div>
    </div>
  );
}

export function FloorPlanParserTestPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [parseResult, setParseResult] = useState<FloorPlanParseRecord | null>(null);
  const [corrections, setCorrections] = useState<Record<string, CorrectionDraft>>({});

  const [scaleForm, setScaleForm] = useState({ ax: '0', ay: '0', bx: '100', by: '0', distanceFt: '10' });

  const [confirmFloorPlan, { loading: confirming, error: confirmErrorObj }] = useMutation<{ confirmFloorPlan: { locked: LockedFloorPlan; corrections: unknown[] } }>(CONFIRM_FLOOR_PLAN_MUTATION);
  const [confirmData, setConfirmData] = useState<{ locked: LockedFloorPlan; corrections: unknown[] } | null>(null);

  const [runFloorPlanParseQuery, { loading: refetching }] = useLazyQuery<{ floorPlanParse: FloorPlanParseRecord }>(FLOOR_PLAN_PARSE_QUERY, {
    fetchPolicy: 'network-only',
  });

  async function reloadViaGraphQL(parseId: string) {
    const result = await runFloorPlanParseQuery({ variables: { parseId } });
    if (result.data) setParseResult(result.data.floorPlanParse);
  }

  function updateCorrection(draft: CorrectionDraft) {
    setCorrections((prev) => ({ ...prev, [draft.elementId]: draft }));
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setParseResult(null);
    setConfirmData(null);
    setCorrections({});
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', 'test-page');
      const res = await fetch(`${CIRRUS_API_BASE_URL}/floor-plan-parser/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Upload failed with HTTP ${res.status}`);
      const data = (await res.json()) as FloorPlanParseRecord;
      setParseResult(data);
    } catch (e) {
      setUploadError(errMsg(e));
    } finally {
      setUploading(false);
    }
  }

  function saveScaleCorrection() {
    updateCorrection({
      elementType: 'scale',
      elementId: 'scale',
      disposition: 'corrected',
      correctedValue: {
        a: { x: Number(scaleForm.ax), y: Number(scaleForm.ay) },
        b: { x: Number(scaleForm.bx), y: Number(scaleForm.by) },
        distanceFt: Number(scaleForm.distanceFt),
      },
    });
  }

  async function handleConfirm() {
    if (!parseResult) return;
    try {
      const result = await confirmFloorPlan({
        variables: { input: { parseId: parseResult.parseId, corrections: Object.values(corrections) } },
      });
      if (result.data) setConfirmData(result.data.confirmFloorPlan);
    } catch {
      // surfaced via confirmErrorObj below
    }
  }

  const parsed = parseResult?.parsed;
  const flaggedRoom = parsed && needsReview(parsed.room.confidence);
  const flaggedWalls = parsed?.walls.filter((w) => needsReview(w.confidence)) ?? [];
  const scaleDrafted = !!corrections['scale'];
  const stillFlagged = (flaggedRoom ? 1 : 0) + flaggedWalls.length + (parsed && !scaleDrafted ? 1 : 0);

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid var(--br)' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, letterSpacing: '.08em', color: 'var(--dark)' }}>
            FLOOR PLAN PARSER TEST PAGE
          </div>
          <div style={{ fontSize: 12, color: 'var(--mid)' }}>Upload a floor plan, resolve only what's flagged, confirm</div>
        </div>
        <button className="btn-out" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <input ref={fileInputRef} type="file" accept=".pdf,image/*" />
          <button className="btn-teal" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>

        {uploadError && (
          <div style={{ padding: 12, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 13, marginBottom: 20 }}>{uploadError}</div>
        )}

        {parseResult && (
          <div>
            <div className="sec-head">
              {parseResult.originalFilename}
              <div className="sec-line" />
              <span
                style={{
                  fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 10px', borderRadius: 999,
                  background: parseResult.status === 'failed' ? '#FFEAF5' : 'var(--tl)',
                  color: parseResult.status === 'failed' ? '#C41678' : 'var(--td)',
                }}
              >
                {parseResult.status.toUpperCase()}
              </span>
            </div>

            {parseResult.status === 'failed' && (
              <div style={{ padding: 12, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 13, marginBottom: 16 }}>
                {parseResult.failureReason}
              </div>
            )}

            {parsed && (
              <>
                <FloorPlanSvg
                  room={{ polygon: parsed.room.value.polygon, confidence: parsed.room.confidence }}
                  walls={parsed.walls.map((w) => ({ a: w.value.a, b: w.value.b, thickness: w.value.thickness, confidence: w.confidence }))}
                />
                <div style={{ fontSize: 11, color: 'var(--mid)', margin: '6px 0 20px' }}>
                  Preview in raw page-space units (not feet yet) — teal = auto-accepted, pink = flagged for review.
                </div>

                <div className="sec-head">Scale calibration <div className="sec-line" /></div>
                <div style={{ border: '1px solid var(--br)', borderRadius: 10, padding: 12, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 10 }}>
                    A PDF has no reliable real-world scale metadata, so this is always flagged (confidence {parsed.scale.confidence.toFixed(2)}).
                    Pick two points from the walls above (in the raw units shown there) and the real distance between them, in feet.
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {(['ax', 'ay', 'bx', 'by', 'distanceFt'] as const).map((key) => (
                      <div key={key}>
                        <label className="field-label">{key}</label>
                        <input
                          className="field-input" style={{ width: 90 }}
                          value={scaleForm[key]}
                          onChange={(e) => setScaleForm((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <button className="btn-out" style={{ padding: '4px 12px', fontSize: 12 }} onClick={saveScaleCorrection}>
                    Save scale correction
                  </button>
                  {scaleDrafted && <span style={{ fontSize: 11, color: 'var(--mid)', marginLeft: 10 }}>✓ drafted</span>}
                </div>

                {(flaggedRoom || flaggedWalls.length > 0) && (
                  <>
                    <div className="sec-head">Flagged elements <div className="sec-line" /></div>
                    {flaggedRoom && (
                      <FlaggedElementCard
                        elementType="room" elementId="room" confidence={parsed.room.confidence}
                        value={parsed.room.value} draft={corrections['room']} onChange={updateCorrection}
                      />
                    )}
                    {flaggedWalls.map((w) => (
                      <FlaggedElementCard
                        key={w.id} elementType="wall" elementId={w.id} confidence={w.confidence}
                        value={w.value} draft={corrections[w.id]} onChange={updateCorrection}
                      />
                    ))}
                  </>
                )}

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 20 }}>
                  <button className="btn-teal" onClick={handleConfirm} disabled={confirming || parseResult.status === 'failed'}>
                    {confirming ? 'Confirming…' : 'Confirm'}
                  </button>
                  <button className="btn-out" onClick={() => reloadViaGraphQL(parseResult.parseId)} disabled={refetching}>
                    {refetching ? 'Reloading…' : 'Reload via GraphQL'}
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--mid)' }}>
                    {stillFlagged > 0 ? `${stillFlagged} item(s) still need a correction before this will succeed` : 'Everything flagged has a draft — ready to confirm'}
                  </span>
                </div>
                {confirmErrorObj && (
                  <div style={{ padding: 12, borderRadius: 8, background: '#fdecea', color: '#a33', fontSize: 13, marginTop: 12 }}>{confirmErrorObj.message}</div>
                )}
              </>
            )}
          </div>
        )}

        {confirmData && (
          <div style={{ marginTop: 28 }}>
            <div className="sec-head">Locked floor plan <div className="sec-line" /></div>
            <FloorPlanSvg
              room={undefined}
              walls={confirmData.locked.walls.map((w) => ({ a: w.a, b: w.b, thickness: w.thicknessFt, confidence: 1 }))}
            />
            <div style={{ fontSize: 13, marginTop: 10 }}>
              Room: {confirmData.locked.room.widthFt.toFixed(1)}ft × {confirmData.locked.room.heightFt.toFixed(1)}ft
            </div>
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--mid)' }}>Correction log ({confirmData.corrections.length})</summary>
              <pre style={{ fontSize: 11, background: '#fbfbfa', border: '1px solid var(--br)', borderRadius: 8, padding: 12, overflowX: 'auto' }}>
                {JSON.stringify(confirmData.corrections, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
