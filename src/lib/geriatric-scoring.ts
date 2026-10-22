import { TESTS_GERIATRICOS } from "@/data/tests-geriatricos";

/** Suma de las respuestas de una escala. */
export const sumAnswers = (answers: Record<string, number>) =>
  Object.values(answers).reduce((total, value) => total + value, 0);

/** Puntaje máximo alcanzable sumando la mejor opción de cada pregunta. */
export const maxPossibleScore = (testKey: string) =>
  TESTS_GERIATRICOS[testKey].questions.reduce(
    (total, q) => total + Math.max(...q.opts.map((o) => o.v)),
    0
  );

/** Interpretación clínica de un puntaje según los cortes de cada escala. */
export function interpretScore(testKey: string | null, score: number): string {
  if (testKey === 'barthel') {
    if (score === 100) return "Independiente";
    if (score >= 60) return "Dependencia Leve";
    if (score >= 40) return "Dependencia Moderada";
    if (score >= 20) return "Dependencia Severa";
    return "Dependencia Total";
  }
  if (testKey === 'lawton') {
    if (score === 8) return "Independencia total";
    if (score >= 6) return "Dependencia leve";
    if (score >= 4) return "Dependencia moderada";
    return "Dependencia severa";
  }
  if (testKey === 'pfeiffer') {
    if (score <= 2) return "Normal";
    if (score <= 4) return "Deterioro cognitivo leve";
    if (score <= 7) return "Deterioro cognitivo moderado";
    return "Deterioro cognitivo severo";
  }
  if (testKey === 'yesavage') {
    if (score <= 5) return "Normal – sin depresión";
    if (score <= 9) return "Depresión leve";
    return "Depresión severa";
  }
  if (testKey === 'tinetti') {
    if (score >= 25) return "Bajo riesgo de caídas";
    if (score >= 19) return "Riesgo moderado de caídas";
    return "Alto riesgo de caídas";
  }
  if (testKey === 'mna') {
    if (score >= 24) return "Estado nutricional normal";
    if (score >= 17) return "Riesgo de malnutrición";
    return "Malnutrición";
  }
  if (testKey === 'fried') {
    if (score === 0) return "Robusto – sin fragilidad";
    if (score <= 2) return "Pre-frágil";
    return "Frágil";
  }
  if (testKey === 'gijon') {
    if (score < 10) return "Buena situación social";
    if (score <= 14) return "Riesgo social";
    return "Problema social severo";
  }
  if (testKey === 'braden') {
    if (score >= 17) return "Sin riesgo de UPP";
    if (score >= 15) return "Riesgo bajo de UPP";
    if (score >= 13) return "Riesgo moderado de UPP";
    return "Alto riesgo de UPP";
  }
  if (testKey === 'mmse') {
    if (score >= 27) return "Normal";
    if (score >= 24) return "Sospecha patológica";
    if (score >= 12) return "Deterioro cognitivo";
    return "Demencia";
  }
  if (testKey === 'charlson') {
    if (score === 0) return "Sin comorbilidad";
    if (score <= 2) return "Comorbilidad baja";
    if (score <= 4) return "Comorbilidad alta";
    return "Comorbilidad muy alta";
  }
  if (testKey === 'zarit') {
    if (score < 21) return "No sobrecarga";
    if (score <= 40) return "Sobrecarga leve";
    if (score <= 60) return "Sobrecarga moderada";
    return "Sobrecarga severa";
  }
  return "Pendiente de interpretación clínica";
}
