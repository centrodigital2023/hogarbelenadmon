/**
 * Limpieza del texto dictado por voz: comandos de puntuación en español
 * ("punto", "coma", "nueva línea"...), mayúsculas y abreviaturas clínicas.
 */

const COMMANDS: [RegExp, string][] = [
  [/\s*\b(punto y aparte|nuevo párrafo|nueva línea|siguiente línea)\b\s*/gi, ".\n"],
  [/\s*\bpunto y coma\b\s*/gi, "; "],
  [/\s*\bdos puntos\b\s*/gi, ": "],
  [/\s*\bpunto seguido\b\s*/gi, ". "],
  [/\s*\bpunto\b(?!\s+de\b)\s*/gi, ". "],
  [/\s*\bcoma\b\s*/gi, ", "],
  [/\s*\b(signo de )?interrogación\b\s*/gi, "? "],
  [/\s*\bguion\b\s*/gi, " - "],
];

/** Spoken clinical terms → the way they are written in a chart. */
const TERMS: [RegExp, string][] = [
  [/\b(\d{2,3})\s+(sobre|con)\s+(\d{2,3})\b/gi, "$1/$3"],
  [/\b(\d+)\s+grados\b/gi, "$1 °C"],
  [/\b(\d+)\s+por\s*ciento\b/gi, "$1%"],
  [/\bmiligramos\b/gi, "mg"],
  [/\bmililitros\b/gi, "ml"],
  [/\bsaturación\b/gi, "SpO2"],
  [/\btensión arterial\b/gi, "T.A."],
  [/\bfrecuencia cardiaca\b/gi, "FC"],
];

const capitalizeSentences = (s: string) =>
  s.replace(/(^|[.!?]\s+|\n\s*)([a-záéíóúñ])/g, (_m, pre: string, ch: string) => pre + ch.toUpperCase());

/** Turns a raw speech transcript into a clean sentence ready to add to the record. */
export const cleanTranscript = (raw: string) => {
  let s = ` ${raw.trim()} `;
  for (const [re, rep] of COMMANDS) s = s.replace(re, rep);
  s = s
    .replace(/[ \t]+/g, " ")
    .replace(/ +([.,;:?])/g, "$1")
    .replace(/([.,;:?])(?=[^\s\d])/g, "$1 ")
    .replace(/\.(\s*\.)+/g, ".")
    .replace(/,\s*\./g, ".")
    .replace(/^[\s.,;:]+/, "")
    .replace(/ *\n */g, "\n")
    .trim();
  for (const [re, rep] of TERMS) s = s.replace(re, rep);
  if (!s) return "";
  s = capitalizeSentences(s);
  return /[.!?:]$/.test(s) ? s : `${s}.`;
};

/** Joins dictated text to what is already written, as a new sentence. */
export const appendDictation = (current: string, addition: string) => {
  if (!addition) return current;
  const base = current.trimEnd();
  if (!base) return addition;
  const sep = base.endsWith("\n") ? "" : /[.!?:]$/.test(base) ? " " : ". ";
  return `${base}${sep}${addition}`;
};

export const dictationErrorMessage = (code: string) => {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Permite el uso del micrófono en el navegador (candado junto a la dirección) y vuelve a intentar.";
    case "audio-capture":
      return "No se encontró un micrófono en este equipo.";
    case "network":
      return "El dictado necesita internet. Revisa la conexión o usa el micrófono del teclado.";
    case "no-speech":
      return "No te escuchamos. Acerca el celular y habla de nuevo.";
    default:
      return "No se pudo usar el dictado. Intenta de nuevo.";
  }
};
