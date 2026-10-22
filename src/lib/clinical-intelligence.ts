/**
 * CENTRO DE INTELIGENCIA CLÍNICA
 * Reglas deterministas (sin IA) que convierten los registros diarios en
 * prioridades: semáforo de riesgo por residente, deterioro entre valoraciones,
 * reevaluaciones pendientes y tendencias de peso y signos vitales.
 */

import { TESTS_GERIATRICOS } from "@/data/tests-geriatricos";
import { generateRiskAlerts, type AssessmentResults } from "@/lib/hb-f22-report";
import { vitalIssue } from "@/lib/vital-signs";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AssessmentRecord {
  resident_id: string;
  test_key: string;
  score: number;
  assessment_date: string | null;
  created_at: string;
}

export interface VitalRecord {
  resident_id: string;
  date: string;
  spo2?: number | null;
  temperature?: number | null;
  heart_rate?: number | null;
  glucose?: number | null;
  blood_pressure?: string | null;
  weight?: number | null;
}

export interface IncidentRecord {
  resident_id: string;
  incident_type: string | null;
  incident_datetime: string;
}

export interface ResidentInfo {
  id: string;
  full_name: string;
}

export type RiskLevel = "alto" | "medio" | "bajo";

export interface Deterioration {
  testKey: string;
  testName: string;
  previous: number;
  current: number;
  change: number;
}

export interface PendingAssessment {
  testKey: string;
  testName: string;
  lastDate: string | null;
}

export interface ResidentInsight {
  resident: ResidentInfo;
  score: number;
  level: RiskLevel;
  reasons: string[];
  deteriorations: Deterioration[];
  pending: PendingAssessment[];
  weightLossPct: number | null;
  recentFalls: number;
}

// Direction and minimum clinically meaningful change for each scale
const SCALE_CHANGE: Record<string, { higherIsBetter: boolean; minChange: number }> = {
  barthel: { higherIsBetter: true, minChange: 10 },
  lawton: { higherIsBetter: true, minChange: 1 },
  tinetti: { higherIsBetter: true, minChange: 3 },
  mna: { higherIsBetter: true, minChange: 3 },
  braden: { higherIsBetter: true, minChange: 2 },
  mmse: { higherIsBetter: true, minChange: 3 },
  pfeiffer: { higherIsBetter: false, minChange: 2 },
  yesavage: { higherIsBetter: false, minChange: 3 },
  fried: { higherIsBetter: false, minChange: 1 },
  gijon: { higherIsBetter: false, minChange: 3 },
  charlson: { higherIsBetter: false, minChange: 2 },
  zarit: { higherIsBetter: false, minChange: 10 },
};

/** Scales every resident should have, re-applied at least every 6 months. */
export const CORE_SCALES = ["barthel", "tinetti", "mna", "braden", "pfeiffer", "yesavage"] as const;
export const REASSESSMENT_DAYS = 180;

const scaleName = (key: string) => TESTS_GERIATRICOS[key]?.name ?? key;
const assessmentTime = (a: AssessmentRecord) => new Date(a.assessment_date || a.created_at).getTime();

export const isFall = (incidentType: string | null) => /^ca[ií]da/i.test((incidentType ?? "").trim());

/** Assessments of one resident grouped by scale, newest first. */
const groupByScale = (assessments: AssessmentRecord[]) => {
  const byScale: Record<string, AssessmentRecord[]> = {};
  for (const a of assessments) (byScale[a.test_key] ??= []).push(a);
  for (const list of Object.values(byScale)) list.sort((x, y) => assessmentTime(y) - assessmentTime(x));
  return byScale;
};

export function detectDeterioration(assessments: AssessmentRecord[]): Deterioration[] {
  const result: Deterioration[] = [];
  for (const [key, list] of Object.entries(groupByScale(assessments))) {
    const rule = SCALE_CHANGE[key];
    if (!rule || list.length < 2) continue;
    const current = Number(list[0].score);
    const previous = Number(list[1].score);
    const worsening = rule.higherIsBetter ? previous - current : current - previous;
    if (worsening >= rule.minChange) {
      result.push({ testKey: key, testName: scaleName(key), previous, current, change: current - previous });
    }
  }
  return result;
}

export function pendingAssessments(assessments: AssessmentRecord[], now = new Date()): PendingAssessment[] {
  const byScale = groupByScale(assessments);
  return CORE_SCALES.flatMap((key) => {
    const latest = byScale[key]?.[0];
    if (!latest) return [{ testKey: key, testName: scaleName(key), lastDate: null }];
    const ageDays = (now.getTime() - assessmentTime(latest)) / DAY_MS;
    return ageDays > REASSESSMENT_DAYS
      ? [{ testKey: key, testName: scaleName(key), lastDate: latest.assessment_date || latest.created_at.slice(0, 10) }]
      : [];
  });
}

/** Percentage of weight lost between the first and last weighing of the last 30 days (null if unknown). */
export function weightLossPercent(vitals: VitalRecord[], now = new Date()): number | null {
  const since = now.getTime() - 30 * DAY_MS;
  const weights = vitals
    .filter((v) => v.weight && v.weight > 0 && new Date(v.date).getTime() >= since)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (weights.length < 2) return null;
  const first = Number(weights[0].weight);
  const last = Number(weights[weights.length - 1].weight);
  return Math.round(((first - last) / first) * 1000) / 10;
}

/** Vital-sign problems that repeat in 2+ readings during the last 7 days. */
export function persistentVitalIssues(vitals: VitalRecord[], now = new Date()): string[] {
  const since = now.getTime() - 7 * DAY_MS;
  const counts: Record<string, number> = {};
  const labels: Record<string, string> = {
    spo2: "SpO2 baja",
    temperature: "temperatura alterada",
    heart_rate: "frecuencia cardiaca alterada",
    glucose: "glucemia alterada",
    blood_pressure: "tensión arterial alterada",
  };
  for (const v of vitals) {
    if (new Date(v.date).getTime() < since) continue;
    for (const field of Object.keys(labels)) {
      if (vitalIssue(field, v[field as keyof VitalRecord] as number | string | null)) counts[field] = (counts[field] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .filter(([, n]) => n >= 2)
    .map(([field, n]) => `${labels[field]} en ${n} registros (7 días)`);
}

/** Abnormal vitals in the most recent reading of the last 48 hours. */
const latestVitalIssues = (vitals: VitalRecord[], now: Date) => {
  const recent = vitals
    .filter((v) => now.getTime() - new Date(v.date).getTime() <= 2 * DAY_MS)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  if (!recent) return [];
  return ["spo2", "temperature", "heart_rate", "glucose", "blood_pressure"]
    .map((f) => vitalIssue(f, recent[f as keyof VitalRecord] as number | string | null))
    .filter((x): x is string => x !== null);
};

export const riskLevel = (score: number): RiskLevel => (score >= 8 ? "alto" : score >= 4 ? "medio" : "bajo");

export function buildResidentInsight(
  resident: ResidentInfo,
  data: { assessments: AssessmentRecord[]; vitals: VitalRecord[]; incidents: IncidentRecord[] },
  now = new Date()
): ResidentInsight {
  const reasons: string[] = [];
  let score = 0;

  // 1. Latest scale results through the HB-F22 rules
  const byScale = groupByScale(data.assessments);
  const latest: AssessmentResults = Object.fromEntries(
    Object.entries(byScale).map(([k, list]) => [k, { score: Number(list[0].score) }])
  );
  for (const alert of generateRiskAlerts(latest, true)) {
    if (alert.level === "LOW") continue;
    score += alert.level === "HIGH" ? 3 : 2;
    reasons.push(alert.message.replace(/^[^\p{L}]+/u, ""));
  }

  // 2. Current vital signs
  const vitalsNow = latestVitalIssues(data.vitals, now);
  if (vitalsNow.length) {
    score += 4;
    reasons.push(`Signos vitales fuera de rango: ${vitalsNow.join(", ")}`);
  }
  for (const issue of persistentVitalIssues(data.vitals, now)) {
    score += 1;
    reasons.push(`Persistente: ${issue}`);
  }

  // 3. Falls in the last 30 days
  const recentFalls = data.incidents.filter(
    (i) => isFall(i.incident_type) && now.getTime() - new Date(i.incident_datetime).getTime() <= 30 * DAY_MS
  ).length;
  if (recentFalls) {
    score += 4 * recentFalls;
    reasons.push(`${recentFalls} caída${recentFalls > 1 ? "s" : ""} en los últimos 30 días`);
  }

  // 4. Deterioration between assessments
  const deteriorations = detectDeterioration(data.assessments);
  for (const d of deteriorations) {
    score += 2;
    reasons.push(`${d.testName} empeoró de ${d.previous} a ${d.current}`);
  }

  // 5. Weight loss
  const weightLossPct = weightLossPercent(data.vitals, now);
  if (weightLossPct !== null && weightLossPct >= 5) {
    score += 3;
    reasons.push(`Pérdida de peso de ${weightLossPct}% en 30 días`);
  }

  return {
    resident,
    score,
    level: riskLevel(score),
    reasons,
    deteriorations,
    pending: pendingAssessments(data.assessments, now),
    weightLossPct,
    recentFalls,
  };
}

/** Insights for all residents, highest risk first. */
export function buildClinicalInsights(
  residents: ResidentInfo[],
  data: { assessments: AssessmentRecord[]; vitals: VitalRecord[]; incidents: IncidentRecord[] },
  now = new Date()
): ResidentInsight[] {
  const by = <T extends { resident_id: string }>(rows: T[], id: string) => rows.filter((r) => r.resident_id === id);
  return residents
    .map((r) =>
      buildResidentInsight(
        r,
        { assessments: by(data.assessments, r.id), vitals: by(data.vitals, r.id), incidents: by(data.incidents, r.id) },
        now
      )
    )
    .sort((a, b) => b.score - a.score || a.resident.full_name.localeCompare(b.resident.full_name));
}
