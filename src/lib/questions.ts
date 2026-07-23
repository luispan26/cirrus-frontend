export type QuestionType = 'radio' | 'multi' | 'automation' | 'space' | 'budget' | 'staff' | 'demand' | 'priorities';

export interface QuestionOption {
  v: string;
  l: string;
  d?: string;
  risk?: string;
}

export interface Question {
  id: string;
  n: number;
  t: string;
  h: string;
  type: QuestionType;
  opts?: QuestionOption[];
}

export type Answers = Record<string, unknown>;

export const QS: Question[] = [
  {
    id: 'bsl', n: 1, t: 'What biosafety level does your lab require?', h: 'Choose the level that fits your work', type: 'radio',
    opts: [
      { v: 'BSL-1', l: 'BSL-1', d: 'Minimal risk — teaching labs, non-pathogenic organisms', risk: '#4FB3AC' },
      { v: 'BSL-2', l: 'BSL-2', d: 'Moderate risk — most research, human cell lines', risk: '#C99A4A' },
      { v: 'BSL-3', l: 'BSL-3', d: 'Serious pathogens — TB, anthrax, West Nile', risk: '#D1316B' },
      { v: 'BSL-4', l: 'BSL-4', d: 'Highest risk — Ebola, hemorrhagic fevers', risk: '#7A1740' },
      { v: 'not_sure', l: 'Not sure yet', d: "Describe your work and we'll recommend a level", risk: '#E3E0E6' },
    ],
  },
  {
    id: 'operations', n: 2, t: 'Which operations will your lab run?', h: 'Select all that apply', type: 'multi',
    opts: [
      { v: 'glycerol_stocking', l: 'Glycerol stocking' },
      { v: 'making_overnight_cultures', l: 'Making overnight cultures' },
      { v: 'nanodrop', l: 'Nanodrop (dsDNA quantification)' },
      { v: 'gel_electrophoresis', l: 'Gel electrophoresis' },
      { v: 'bca_assay', l: 'BCA assay' },
      { v: 'miniprep', l: 'Plasmid miniprep (Monarch NEB kit)' },
      { v: 'send_to_sequencing', l: 'Send to sequencing (Plasmidsaurus)' },
      { v: 'other', l: 'Other' },
    ],
  },
  { id: 'automation', n: 3, t: 'Do you want an automation station in your lab?', h: 'Automation adds throughput and reproducibility but needs more equipment budget ($50k–$150k)', type: 'automation' },
  { id: 'space', n: 4, t: 'Tell us about your space', h: 'Used to generate your floor plan', type: 'space' },
  { id: 'budget', n: 5, t: 'What is your budget?', h: 'Drives all financial projections', type: 'budget' },
  { id: 'staff', n: 6, t: 'Who will work in this lab?', h: 'Helps size workflows and staffing plan', type: 'staff' },
  { id: 'demand', n: 7, t: 'How busy will this lab be?', h: 'Used to auto-optimize your floor plan layout', type: 'demand' },
  { id: 'priorities', n: 8, t: 'What matters most in your layout?', h: 'Drag the sliders — your floor plan is optimized around these automatically', type: 'priorities' },
  {
    id: 'business_model', n: 9, t: 'What is your business model?', h: 'Determines revenue projections in your report', type: 'radio',
    opts: [
      { v: 'internal_only', l: 'Internal research only', d: 'Lab serves only our team, no external clients' },
      { v: 'fee_for_service', l: 'Fee-for-service', d: 'Offer services and equipment to outside clients' },
      { v: 'hybrid', l: 'Hybrid', d: 'Mostly internal with some external services' },
      { v: 'marketplace', l: 'Join Cirrus network', d: 'List on the shared cloud lab marketplace' },
    ],
  },
];

export const INTAKE_FIELD_KEYS = [
  'bsl', 'operations', 'wants_automation', 'width_ft', 'height_ft', 'ceiling_ft',
  'rooms', 'renovation', 'budget_total', 'budget_scope', 'staff_counts', 'staff_roles', 'business_model',
  'runs_per_week', 'batch_size', 'seasonal_variability',
  'priority_throughput', 'priority_walking_distance', 'priority_flexibility', 'priority_contamination', 'priority_equipment_utilization',
];

export function shouldSkip(_q: Question, _answers: Answers): boolean {
  return false;
}

export function stepIndex(from: number, dir: 1 | -1, answers: Answers): number {
  let i = from + dir;
  while (i >= 0 && i < QS.length && shouldSkip(QS[i], answers)) i += dir;
  return i;
}

export function resolveOperations(a: Answers): string[] {
  const rawOps = (a.operations as string[]) || [];
  const base = rawOps.filter((v) => v !== 'bca_assay' && v !== 'miniprep');
  const ops = [...base];
  const automated = a.wants_automation === 'yes';
  if (rawOps.includes('bca_assay')) {
    ops.push(automated ? 'bca_assay_automated' : 'bca_assay_manual');
  }
  if (rawOps.includes('miniprep')) {
    ops.push(automated ? 'miniprep_automated' : 'miniprep');
  }
  return ops;
}

export interface FinalIntakeJson {
  scenario: string;
  bsl: string | null;
  operations: string[];
  space: { sqft: number; width_ft: number; height_ft: number; ceiling_ft: number; rooms: string; renovation: boolean };
  budget: { total: number; scope: string };
  allocation: { equipment: number; construction: number; staffing: number; consumables: number; contingency: number };
  staff: { role: string; count: number }[];
  business_model: string;
  demand: { runs_per_week: number; batch_size: number; seasonal_variability: number };
  layout_weights: {
    throughput: number;
    walking_distance: number;
    flexibility: number;
    contamination: number;
    equipment_utilization: number;
  };
}

const DEFAULT_PRIORITY = 50; // midpoint of the 0-100 sliders

export function buildFinalIntakeJson(a: Answers): FinalIntakeJson {
  const roles = (a.staff_roles as string[]) || [];
  const counts = (a.staff_counts as Record<string, number>) || {};
  const staff = roles.length
    ? roles.map((r) => ({ role: r, count: Math.max(1, counts[r] ?? 1) }))
    : [{ role: 'technician', count: 1 }];
  const hasCon = a.budget_scope === 'equipment_and_construction';
  const width_ft = parseFloat((a.width_ft as string) || '0') || 0;
  const height_ft = parseFloat((a.height_ft as string) || '0') || 0;

  const priority = (key: string) => {
  const raw = a[key];
  const parsed = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
  return (Number.isNaN(parsed) ? DEFAULT_PRIORITY : parsed) / 100;
  };

  return {
    scenario: 'lab_design',
    bsl: (a.bsl as string) || null,
    operations: resolveOperations(a),
    space: {
      sqft: Math.round(width_ft * height_ft) || 0,
      width_ft, height_ft,
      ceiling_ft: parseInt((a.ceiling_ft as string) || '0', 10) || 0,
      rooms: (a.rooms as string) || 'single_open',
      renovation: a.renovation === 'true',
    },
    budget: { total: parseInt((a.budget_total as string) || '0', 10) || 0, scope: (a.budget_scope as string) || 'equipment_only' },
    allocation: { equipment: hasCon ? 0.5 : 0.7, construction: hasCon ? 0.25 : 0, staffing: 0.1, consumables: 0.1, contingency: 0.05 },
    staff,
    business_model: (a.business_model as string) || 'internal_only',
    demand: {
      runs_per_week: parseFloat((a.runs_per_week as string) || '0') || 0,
      batch_size: parseFloat((a.batch_size as string) || '0') || 0,
      seasonal_variability: parseFloat((a.seasonal_variability as string) || '0') || 0,
    },
    layout_weights: {
      throughput: priority('priority_throughput'),
      walking_distance: priority('priority_walking_distance'),
      flexibility: priority('priority_flexibility'),
      contamination: priority('priority_contamination'),
      equipment_utilization: priority('priority_equipment_utilization'),
    },
  };
}