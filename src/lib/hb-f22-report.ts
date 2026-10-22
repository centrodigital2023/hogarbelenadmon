/**
 * GENERADOR DE INFORME INTELIGENTE HB-F22
 * Informe de Valoración Geriátrica Integral
 * Correlaciona escalas, genera análisis con IA y plan de cuidado
 */

import { TESTS_GERIATRICOS } from "@/data/tests-geriatricos";

export interface ScaleScore {
  name: string;
  score: number;
  maxScore: number;
  category: string;
}

export interface ResidentData {
  id: string;
  fullName: string;
  documentId: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
}

export interface AssessmentResults {
  [key: string]: {
    score: number;
    answers?: Array<{ questionId: string; selectedValue: number }>;
  };
}

export interface RiskAlert {
  level: "HIGH" | "MODERATE" | "LOW";
  category: string;
  message: string;
  scale: string;
  threshold?: number;
  currentValue?: number;
  recommendation?: string;
}

export interface CareRecommendation {
  title: string;
  description: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  scales: string[];
  interventions: string[];
}

export interface HBF22Report {
  resident: ResidentData;
  generatedDate: string;
  professional: {
    name: string;
    role: string;
    nit?: string;
  };
  scales: ScaleScore[];
  summary: string;
  riskAlerts: RiskAlert[];
  carePlan: CareRecommendation[];
  correlations: {
    dependencyProfile: string;
    fragilityStatus: string;
    riskFactors: string[];
  };
  assessmentDetails: {
    [key: string]: any;
  };
}

// ─── ANÁLISIS DE ESCALAS Y CORRELACIONES ───

export const NOT_ASSESSED = "NO EVALUADO";

/**
 * Perfil de dependencia para ABVD según Barthel (mismos cortes que la
 * interpretación de la escala). Lawton, si se evaluó, señala dependencia en AIVD.
 */
export function calculateDependencyProfile(
  barthelScore: number | null | undefined,
  lawtonScore?: number | null,
  lawtonMax = 8
): string {
  if (barthelScore === null || barthelScore === undefined) return NOT_ASSESSED;
  if (barthelScore >= 100) {
    const iadlDependent = lawtonScore !== null && lawtonScore !== undefined && lawtonScore < lawtonMax;
    return iadlDependent ? "INDEPENDIENTE ABVD (DEPENDENCIA EN AIVD)" : "INDEPENDIENTE";
  }
  if (barthelScore >= 60) return "DEPENDENCIA LEVE";
  if (barthelScore >= 40) return "DEPENDENCIA MODERADA";
  if (barthelScore >= 20) return "DEPENDENCIA SEVERA";
  return "DEPENDENCIA TOTAL";
}

/**
 * Determina el estado de fragilidad según criterios de Fried
 */
export function determineFragilityStatus(friedScore: number | null | undefined): string {
  if (friedScore === null || friedScore === undefined) return NOT_ASSESSED;
  if (friedScore === 0) return "ROBUSTO";
  if (friedScore <= 2) return "PRE-FRÁGIL";
  return "FRÁGIL";
}

/**
 * Identifica riesgos según Tinetti (caídas)
 */
export function assessFallRisk(tinettiScore: number): {
  risk: "HIGH" | "MODERATE" | "LOW";
  description: string;
} {
  if (tinettiScore < 19) return { risk: "HIGH", description: "Riesgo alto de caídas" };
  if (tinettiScore < 25) return { risk: "MODERATE", description: "Riesgo moderado de caídas" };
  return { risk: "LOW", description: "Riesgo bajo de caídas" };
}

/**
 * Evalúa estado nutritivo según MNA
 */
export function assessNutritionalStatus(mnaScore: number): {
  status: string;
  interventionNeeded: boolean;
} {
  if (mnaScore >= 24) return { status: "NORMAL", interventionNeeded: false };
  if (mnaScore >= 17) return { status: "RIESGO DE MALNUTRICIÓN", interventionNeeded: true };
  return { status: "MALNUTRICIÓN", interventionNeeded: true };
}

/**
 * Evalúa riesgo de úlceras por presión (Braden)
 */
export function assessPressureUlcerRisk(bradenScore: number): {
  risk: "HIGH" | "MODERATE" | "LOW";
  description: string;
} {
  if (bradenScore <= 12) return { risk: "HIGH", description: "Riesgo alto de UPP" };
  if (bradenScore <= 14) return { risk: "MODERATE", description: "Riesgo moderado de UPP" };
  return { risk: "LOW", description: "Riesgo bajo de UPP" };
}

/**
 * Identifica déficit cognitivo (PFEIFFER/MMSE)
 */
export function assessCognitiveStatus(pfeifferOrMmseScore: number, useMMSE = false): {
  status: string;
  severity: string;
} {
  if (useMMSE) {
    if (pfeifferOrMmseScore >= 27) return { status: "NORMAL", severity: "Sin déficit" };
    if (pfeifferOrMmseScore >= 24) return { status: "SOSPECHA", severity: "Posible deterioro" };
    if (pfeifferOrMmseScore >= 12) return { status: "DETERIORO", severity: "Deterioro cognitivo" };
    return { status: "DEMENCIA", severity: "Demencia severa" };
  }
  // Pfeiffer: puntuación = errores
  if (pfeifferOrMmseScore <= 2) return { status: "NORMAL", severity: "Sin déficit" };
  if (pfeifferOrMmseScore <= 4) return { status: "LIGERO", severity: "Deterioro ligero" };
  if (pfeifferOrMmseScore <= 7) return { status: "MODERADO", severity: "Deterioro moderado" };
  return { status: "SEVERO", severity: "Deterioro severo" };
}

/**
 * Evalúa depresión (Yesavage GDS-15)
 */
export function assessMoodStatus(yesavageScore: number): {
  status: string;
  interventionNeeded: boolean;
} {
  if (yesavageScore <= 5) return { status: "NORMAL", interventionNeeded: false };
  if (yesavageScore <= 9) return { status: "DEPRESIÓN LEVE", interventionNeeded: true };
  return { status: "DEPRESIÓN SEVERA", interventionNeeded: true };
}

/**
 * Evalúa riesgo social (Gijón)
 */
export function assessSocialRisk(gijonScore: number): {
  risk: "LOW" | "MODERATE" | "HIGH";
  description: string;
} {
  if (gijonScore < 10) return { risk: "LOW", description: "Buena situación social" };
  if (gijonScore <= 14) return { risk: "MODERATE", description: "Riesgo social" };
  return { risk: "HIGH", description: "Problema social severo" };
}

// ─── GENERACIÓN DE ALERTAS ───

/**
 * Genera alertas basadas en correlaciones de escalas
 */
export function generateRiskAlerts(
  results: AssessmentResults,
  allScalesScored: boolean
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  try {
    // ALERTA: Riesgo de Caídas (Tinetti + Fried + Gijón)
    const tinetti = results.tinetti?.score ?? null;
    const fried = results.fried?.score ?? null;
    if (tinetti !== null && tinetti < 19) {
      alerts.push({
        level: "HIGH",
        category: "MOVILIDAD",
        message: "🔴 RIESGO ALTO DE CAÍDAS detectado",
        scale: "Tinetti",
        threshold: 19,
        currentValue: tinetti,
        recommendation:
          "Implementar medidas de prevención: dispositivos de ayuda, evaluación del entorno, valoración de medicamentos que aumenten riesgo.",
      });
    }

    // ALERTA: Fragilidad Severa (Fried ≥3)
    if (fried !== null && fried >= 3) {
      alerts.push({
        level: "HIGH",
        category: "FRAGILIDAD",
        message: "🔴 FENOTIPO DE FRAGILIDAD SEVERA",
        scale: "Fried",
        currentValue: fried,
        recommendation:
          "Necesita supervisión constante, programa de ejercicio adaptado, revisión nutricional y medicamentos.",
      });
    }

    // ALERTA: Dependencia Severa (Barthel ≤20)
    const barthel = results.barthel?.score ?? null;
    if (barthel !== null && barthel <= 20) {
      alerts.push({
        level: "HIGH",
        category: "FUNCIONALIDAD",
        message: "🔴 DEPENDENCIA SEVERA PARA ABVD",
        scale: "Barthel",
        currentValue: barthel,
        recommendation: "Requiere asistencia completa. Valorar cuidador permanente o institucionalización.",
      });
    }

    // ALERTA: Riesgo Alto de UPP (Braden ≤12)
    const braden = results.braden?.score ?? null;
    if (braden !== null && braden <= 12) {
      alerts.push({
        level: "HIGH",
        category: "PIEL",
        message: "🔴 RIESGO ALTO DE ÚLCERAS POR PRESIÓN",
        scale: "Braden",
        currentValue: braden,
        recommendation: "Cambios posturales cada 2 horas, superficie anti-decúbito, inspección diaria de piel.",
      });
    }

    // ALERTA MODERADA: Malnutrición (MNA < 17)
    const mna = results.mna?.score ?? null;
    if (mna !== null && mna < 17) {
      alerts.push({
        level: "MODERATE",
        category: "NUTRICIÓN",
        message: "🟡 MALNUTRICIÓN PRESENTE",
        scale: "MNA",
        currentValue: mna,
        recommendation:
          "Consulta con nutricionista, suplementos proteicos, valorar disfagia, aumentar calorías y proteínas en dieta.",
      });
    }

    // ALERTA MODERADA: Depresión (GDS ≥ 10)
    const gds = results.yesavage?.score ?? null;
    if (gds !== null && gds >= 10) {
      alerts.push({
        level: "MODERATE",
        category: "MENTAL",
        message: "🟡 DEPRESIÓN SEVERA",
        scale: "Yesavage GDS-15",
        currentValue: gds,
        recommendation:
          "Derivar a psiquiatría/psicología. Evaluar medicamentos depresogénicos. Actividades recreativas y terapia ocupacional.",
      });
    }

    // ALERTA MODERADA: Deterioro Cognitivo (Pfeiffer ≥ 5)
    const pfeiffer = results.pfeiffer?.score ?? null;
    if (pfeiffer !== null && pfeiffer >= 5) {
      alerts.push({
        level: "MODERATE",
        category: "COGNITIVO",
        message: "🟡 DETERIORO COGNITIVO MODERADO-SEVERO",
        scale: "Pfeiffer",
        currentValue: pfeiffer,
        recommendation:
          "Evaluación neuropsicológica, descartar causas reversibles, estimulación cognitiva, supervisión de seguridad.",
      });
    }

    // ALERTA MODERADA: Deterioro Cognitivo por MMSE (< 24) cuando Pfeiffer no lo detectó
    const mmse = results.mmse?.score ?? null;
    if (mmse !== null && mmse < 24 && !(pfeiffer !== null && pfeiffer >= 5)) {
      alerts.push({
        level: mmse < 12 ? "HIGH" : "MODERATE",
        category: "COGNITIVO",
        message: mmse < 12 ? "🔴 DETERIORO COGNITIVO SEVERO (MMSE)" : "🟡 DETERIORO COGNITIVO (MMSE)",
        scale: "MMSE",
        threshold: 24,
        currentValue: mmse,
        recommendation:
          "Evaluación neuropsicológica, descartar causas reversibles, estimulación cognitiva, supervisión de seguridad.",
      });
    }

    // ALERTA MODERADA: Riesgo Social (Gijón ≥ 15)
    const gijon = results.gijon?.score ?? null;
    if (gijon !== null && gijon >= 15) {
      alerts.push({
        level: "MODERATE",
        category: "SOCIAL",
        message: "🟡 PROBLEMA SOCIAL SEVERO",
        scale: "Gijón",
        currentValue: gijon,
        recommendation: "Contactar trabajador social, evaluar apoyo familiar, recursos de cuidado externo, pensión.",
      });
    }

    // ALERTA BAJA: Riesgo Moderado de Caídas (Tinetti 19-24)
    if (tinetti !== null && tinetti >= 19 && tinetti <= 24) {
      alerts.push({
        level: "LOW",
        category: "MOVILIDAD",
        message: "🟢 Riesgo moderado de caídas",
        scale: "Tinetti",
        recommendation: "Mantener vigilancia, bastón/andador según necesidad, ejercicio de fuerza y equilibrio.",
      });
    }

    // ALERTAS DE COMORBILIDAD
    const charlson = results.charlson?.score ?? null;
    if (charlson !== null && charlson >= 5) {
      alerts.push({
        level: "HIGH",
        category: "COMORBILIDAD",
        message: "🔴 COMORBILIDAD MUY ALTA",
        scale: "Charlson",
        currentValue: charlson,
        recommendation: "Revisión completa de medicamentos, evaluación cardiovascular, control estrecho de condiciones crónicas.",
      });
    }

    // SOBRECARGA DEL CUIDADOR
    const zarit = results.zarit?.score ?? null;
    if (zarit !== null && zarit >= 61) {
      alerts.push({
        level: "HIGH",
        category: "CUIDADOR",
        message: "🔴 SOBRECARGA SEVERA DEL CUIDADOR",
        scale: "Zarit",
        currentValue: zarit,
        recommendation:
          "Soporte psicológico para cuidador, respiro social, apoyo familiar, valorar institucionalización.",
      });
    }

    // RIESGO MODERADO DE CAIDAS (19-24)
    if (braden !== null && braden > 12 && braden <= 14) {
      alerts.push({
        level: "MODERATE",
        category: "PIEL",
        message: "🟡 Riesgo moderado de UPP",
        scale: "Braden",
        recommendation: "Cambios posturales cada 3 horas, colchón de aire, inspección semanalmente, movilización.",
      });
    }

    // MALNUTRICIÓN EN RIESGO (17-23.5)
    if (mna !== null && mna >= 17 && mna < 24) {
      alerts.push({
        level: "LOW",
        category: "NUTRICIÓN",
        message: "🟢 Riesgo de malnutrición - Monitorizar",
        scale: "MNA",
        recommendation: "Evaluación nutricional cada 3 meses, dieta enriquecida, suplementos si es necesario.",
      });
    }
  } catch (error) {
    console.error("Error generando alertas:", error);
  }

  return alerts;
}

// ─── GENERACIÓN DE PLAN DE CUIDADO ───

/**
 * Genera recomendaciones de plan de cuidado basadas en correlaciones
 */
export function generateCareplan(
  results: AssessmentResults,
  alerts: RiskAlert[]
): CareRecommendation[] {
  const recommendations: CareRecommendation[] = [];

  try {
    const barthel = results.barthel?.score ?? null;
    const tinetti = results.tinetti?.score ?? null;
    const fried = results.fried?.score ?? null;
    const mna = results.mna?.score ?? null;
    const braden = results.braden?.score ?? null;
    const pfeiffer = results.pfeiffer?.score ?? null;
    const gds = results.yesavage?.score ?? null;

    // PLAN 1: Prevención de Caídas (si Tinetti < 25 o Fried ≥ 1)
    if ((tinetti !== null && tinetti < 25) || (fried !== null && fried >= 1)) {
      recommendations.push({
        title: "PLAN DE PREVENCIÓN DE CAÍDAS",
        description:
          "Programa integral para reducir riesgo de caídas basado en evaluación de equilibrio y fragilidad.",
        priority: tinetti !== null && tinetti < 19 ? "CRITICAL" : "HIGH",
        scales: ["Tinetti", "Fried"],
        interventions: [
          "Evaluación del entorno (iluminación, escaleras, pisos resbaladizos)",
          "Dispositivos de ayuda: bastón, andador, barras según capacidad",
          "Programa de ejercicio: equilibrio, fuerza (30 min, 3x/semana)",
          "Revisión de medicamentos: sedantes, antihipertensivos",
          "Uso de calzado seguro con buen agarre",
          "Revisión de visión y audición",
          "Educación al residente y cuidador sobre factores de riesgo",
        ],
      });
    }

    // PLAN 2: Cuidado de la Piel (si Braden ≤ 14)
    if (braden !== null && braden <= 14) {
      recommendations.push({
        title: "PLAN DE PREVENCIÓN DE ÚLCERAS POR PRESIÓN",
        description:
          "Programa de cuidado de piel con énfasis en alivio de presión y movilización.",
        priority: braden <= 12 ? "CRITICAL" : "HIGH",
        scales: ["Braden"],
        interventions: [
          `Cambios posturales cada ${braden <= 12 ? "2" : "3"} horas`,
          "Colchón/superficie anti-decúbito según evaluación",
          "Masaje de zonas de presión (NO en enrojecimiento)",
          "Higiene e hidratación de piel diaria",
          "Inspección diaria de zonas de riesgo: glúteos, talones, codos",
          "Ropa sin costuras, sábanas limpias y secas",
          "Nutrición adecuada: proteína ≥ 1.2 g/kg/día",
          "Manejo de incontinencia y humedad",
        ],
      });
    }

    // PLAN 3: Apoyo Nutricional (si MNA < 24)
    if (mna !== null && mna < 24) {
      recommendations.push({
        title: "PLAN NUTRICIONAL PERSONALIZADO",
        description:
          "Intervención nutricional para prevenir malnutrición y mejorar recuperación.",
        priority: mna < 17 ? "CRITICAL" : "HIGH",
        scales: ["MNA"],
        interventions: [
          "Consulta con nutricionista: valorar requerimientos calóricos",
          "Dieta enriquecida en proteína (1.2-1.5 g/kg/día)",
          "Suplementos proteicos entre comidas si ingesta insuficiente",
          "Evaluación de dificultades de deglución",
          "Comidas pequeñas frecuentes (6 comidas/día)",
          "Alimentos preferidos según preferencias personales",
          "Estimular ingesta hídrica: 1.5-2L/día",
          "Revisión de medicamentos que afecten apetito",
          "Control de peso mensual",
        ],
      });
    }

    // PLAN 4: Movilización y Actividad Física (si Barthel ≤ 60 o Fried ≥ 1)
    if ((barthel !== null && barthel <= 60) || (fried !== null && fried >= 1)) {
      recommendations.push({
        title: "PLAN DE REHABILITACIÓN Y MOVILIZACIÓN",
        description:
          "Programa de ejercicio adaptado para mejorar funcionalidad y prevenir deconditioning.",
        priority: barthel !== null && barthel <= 20 ? "CRITICAL" : "HIGH",
        scales: ["Barthel", "Fried", "Tinetti"],
        interventions: [
          "Evaluación con fisioterapia para programa personalizado",
          "Ejercicios pasivos (si inmovilidad completa) 2x/día",
          "Ejercicios activo-asistidos según tolerancia",
          "Movilización articular para prevenir contracturas",
          "Cambios posturales frecuentes",
          "Sedestación progresiva según tolerancia",
          "Deambulación asistida o con dispositivo de ayuda",
          "Hidroterapia o terapia ocupacional según disponibilidad",
        ],
      });
    }

    // PLAN 5: Estimulación Cognitiva (Pfeiffer ≥ 5 o MMSE < 24)
    const mmse = results.mmse?.score ?? null;
    if ((pfeiffer !== null && pfeiffer >= 5) || (mmse !== null && mmse < 24)) {
      recommendations.push({
        title: "PLAN DE ESTIMULACIÓN COGNITIVA",
        description:
          "Intervención para mantener y estimular capacidades cognitivas residuales.",
        priority: (pfeiffer !== null && pfeiffer >= 8) || (mmse !== null && mmse < 12) ? "HIGH" : "MEDIUM",
        scales: ["Pfeiffer", "MMSE"],
        interventions: [
          "Evaluación neuropsicológica completa",
          "Descartar causas reversibles: medicamentos, hipotiroidismo, deficit B12",
          "Actividades de estimulación: juegos de memoria, ajedrez, lectura",
          "Orientación a la realidad: calendario, reloj, fotos familiares",
          "Conexión con familia y seres queridos",
          "Terapia ocupacional: actividades significativas",
          "Control de sueño: mantener rutina, evitar confusión nocturna",
          "Valorar medicamentos cognitivamente beneficiosos",
        ],
      });
    }

    // PLAN 6: Apoyo de Salud Mental (si GDS ≥ 6)
    if (gds !== null && gds >= 6) {
      recommendations.push({
        title: "PLAN DE SALUD MENTAL Y DEPRESIÓN",
        description: "Intervención multidisciplinaria para depresión geriátrica.",
        priority: gds >= 10 ? "CRITICAL" : "HIGH",
        scales: ["Yesavage"],
        interventions: [
          "Referencia a psiquiatría/psicología geriátrica",
          "Evaluación de antidepresivos: ISRS preferidos",
          "Psicoterapia: terapia cognitivo-conductual, reminiscencia",
          "Actividades de recreación e interés personal",
          "Terapia ocupacional",
          "Evaluación de riesgo suicida",
          "Apoyo familiar y psicoeducación",
          "Control de dolor físico (puede contribuir a depresión)",
        ],
      });
    }

    // PLAN 7: Apoyo Social (si Gijón ≥ 10)
    const gijon = results.gijon?.score ?? null;
    if (gijon !== null && gijon >= 10) {
      recommendations.push({
        title: "PLAN DE APOYO SOCIAL Y RECURSOS",
        description:
          "Gestión de recursos y apoyo social para mejorar calidad de vida.",
        priority: gijon >= 15 ? "CRITICAL" : "HIGH",
        scales: ["Gijón"],
        interventions: [
          "Valoración integral de situación familiar y económica",
          "Gestión con trabajador social para recursos públicos",
          "Evaluación de necesidades de cuidado a largo plazo",
          "Coordinación con servicios comunitarios",
          "Transporte asistido para citas médicas",
          "Programas de ocio y actividades comunitarias",
          "Apoyo a cuidador: respiro social, capacitación",
          "Evaluación de pensión y subsidios disponibles",
        ],
      });
    }

    // PLAN 8: Gestión de Comorbilidades
    const charlson = results.charlson?.score ?? null;
    if (charlson !== null && charlson >= 3) {
      recommendations.push({
        title: "PLAN DE GESTIÓN DE COMORBILIDADES",
        description: "Coordinación de cuidado para múltiples condiciones crónicas.",
        priority: charlson >= 5 ? "CRITICAL" : "HIGH",
        scales: ["Charlson"],
        interventions: [
          "Revisión completa de medicamentos: deprescribing si posible",
          "Ajuste de dosis según función renal y hepática",
          "Control de presión arterial, glucosa, colesterol",
          "Evaluación cardiovascular anual",
          "Vacunación: influenza, neumonía, COVID",
          "Cribaje de cáncer según edad y comorbilidades",
          "Seguimiento coordina­do con múltiples especialistas",
          "Asegurarse adherencia a medicamentos",
        ],
      });
    }

    // PLAN 9: Apoyo al Cuidador (si Zarit ≥ 21)
    const zarit = results.zarit?.score ?? null;
    if (zarit !== null && zarit >= 21) {
      recommendations.push({
        title: "PLAN DE APOYO AL CUIDADOR PRINCIPAL",
        description: "Intervención para prevenir síndrome de sobrecarga del cuidador.",
        priority: zarit >= 61 ? "CRITICAL" : zarit >= 41 ? "HIGH" : "MEDIUM",
        scales: ["Zarit"],
        interventions: [
          "Evaluación de necesidades y carga del cuidador",
          "Capacitación del cuidador: técnicas de movilización, higiene",
          "Psicoeducación sobre enfermedad geriátrica",
          "Apoyo psicológico individual o grupal",
          "Recursos de respiro: cuidador temporal, día de descanso",
          "Conexión con grupos de apoyo de cuidadores",
          "Valorar apoyo externo: trabajadora doméstica, cuidador formal",
          "Evaluación de viabilidad de mantener cuidado en casa",
        ],
      });
    }

    // PLAN GENERAL: Actividades de la Vida Diaria
    if (barthel !== null && barthel < 100) {
      recommendations.push({
        title: "PLAN DE ACTIVIDADES DE LA VIDA DIARIA",
        description:
          "Programa para mantener y mejorar independencia en actividades cotidianas.",
        priority: "HIGH",
        scales: ["Barthel", "Lawton"],
        interventions: [
          "Evaluación de desempeño actual en cada ABVD/AIVD",
          "Entrenamiento gradual en actividades: comer, vestirse, aseo",
          "Adaptaciones ambientales: barras, asientos elevados, ducha modificada",
          "Dispositivos de ayuda: vasos adaptados, abridores, bastones",
          "Supervisión para seguridad pero estimulando independencia",
          "Refuerzo positivo y apoyo psicológico",
          "Coordinación con terapeuta ocupacional",
        ],
      });
    }
  } catch (error) {
    console.error("Error generando plan de cuidado:", error);
  }

  return recommendations;
}

// ─── CONSTRUCCIÓN DEL RESUMEN EJECUTIVO ───

/**
 * Genera resumen ejecutivo del informe
 */
export function generateExecutiveSummary(
  resident: ResidentData,
  results: AssessmentResults,
  dependencyProfile: string,
  fragilityStatus: string
): string {
  const barthel = results.barthel?.score ?? null;
  const tinetti = results.tinetti?.score ?? null;
  const fried = results.fried?.score ?? null;
  const mna = results.mna?.score ?? null;
  const pfeiffer = results.pfeiffer?.score ?? null;

  const age = resident.age ? ` de ${resident.age} años` : "";
  const gender =
    resident.gender === "M" ? "Paciente masculino" : resident.gender === "F" ? "Paciente femenina" : "Residente";

  let summary =
    barthel !== null
      ? `${gender}${age} con **${dependencyProfile}** para las ABVD (Barthel: ${barthel}/100). `
      : `${gender}${age}; la funcionalidad para las ABVD (Barthel) aún no ha sido evaluada. `;

  if (fried !== null && fried >= 3) {
    summary += `Presenta **perfil de fragilidad severa** que requiere supervisión constante. `;
  }
  if (tinetti !== null && tinetti < 19) {
    summary += `Presenta **alto riesgo de caídas** (Tinetti: ${tinetti}/28). `;
  }

  if (mna !== null && mna < 17) {
    summary +=
      `Existe **riesgo nutricional importante** (MNA: ${mna}/30) que requiere intervención. `;
  }

  const mmse = results.mmse?.score ?? null;
  if ((pfeiffer !== null && pfeiffer >= 5) || (mmse !== null && mmse < 24)) {
    summary += `Existe **deterioro cognitivo** que requiere supervisión y estimulación. `;
  }

  summary += `El residente requiere un **plan de cuidado integral** centrado en prevención de complicaciones, mantenimiento de funcionalidad y calidad de vida.`;

  return summary;
}

// ─── COMPILACIÓN DEL INFORME COMPLETO ───

export function buildHBF22Report(
  resident: ResidentData,
  assessmentResults: AssessmentResults,
  professional: { name: string; role: string; nit?: string },
  generatedDate: string = new Date().toISOString()
): HBF22Report {
  // Calcular puntuaciones totales
  const scales: ScaleScore[] = [];
  for (const [key, result] of Object.entries(assessmentResults)) {
    const testDef = TESTS_GERIATRICOS[key as keyof typeof TESTS_GERIATRICOS];
    if (testDef && result.score !== undefined) {
      scales.push({
        name: testDef.name,
        score: result.score,
        maxScore: testDef.max,
        category: testDef.cat,
      });
    }
  }

  // Calcular perfil de dependencia
  const dependencyProfile = calculateDependencyProfile(
    assessmentResults.barthel?.score,
    assessmentResults.lawton?.score,
    TESTS_GERIATRICOS.lawton.max
  );

  // Calcular estado de fragilidad
  const fragilityStatus = determineFragilityStatus(assessmentResults.fried?.score);

  // Identificar factores de riesgo
  const riskFactors: string[] = [];
  if (assessmentResults.tinetti && assessmentResults.tinetti.score < 19)
    riskFactors.push("Riesgo alto de caídas");
  if (assessmentResults.braden && assessmentResults.braden.score <= 14)
    riskFactors.push("Riesgo de úlceras por presión");
  if (assessmentResults.mna && assessmentResults.mna.score < 17)
    riskFactors.push("Malnutrición");
  if (
    (assessmentResults.pfeiffer && assessmentResults.pfeiffer.score >= 5) ||
    (assessmentResults.mmse && assessmentResults.mmse.score < 24)
  )
    riskFactors.push("Deterioro cognitivo");
  if (assessmentResults.yesavage && assessmentResults.yesavage.score >= 10)
    riskFactors.push("Depresión severa");

  // Generar alertas
  const riskAlerts = generateRiskAlerts(assessmentResults, true);

  // Generar plan de cuidado
  const carePlan = generateCareplan(assessmentResults, riskAlerts);

  // Generar resumen ejecutivo
  const summary = generateExecutiveSummary(resident, assessmentResults, dependencyProfile, fragilityStatus);

  return {
    resident,
    generatedDate,
    professional,
    scales,
    summary,
    riskAlerts,
    carePlan,
    correlations: {
      dependencyProfile,
      fragilityStatus,
      riskFactors,
    },
    assessmentDetails: assessmentResults,
  };
}
