import { TestQuestion } from "./types";

export const TESTS_GERIATRICOS: Record<string, {
  name: string;
  cat: string;
  max: number;
  iconName: string;
  colorClass: string;
  desc: string;
  questions: TestQuestion[];
}> = {
  barthel: {
    name: 'Barthel', cat: 'Funcional (ABVD)', max: 100, iconName: 'Activity', colorClass: 'cat-functional',
    desc: 'Actividades básicas de la vida diaria.',
    questions: [
      { id: 'q1', text: 'Comer', opts: [{ l: 'Independiente', v: 10 }, { l: 'Ayuda', v: 5 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q2', text: 'Lavarse (Baño)', opts: [{ l: 'Independiente', v: 5 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q3', text: 'Vestirse', opts: [{ l: 'Independiente', v: 10 }, { l: 'Ayuda', v: 5 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q4', text: 'Arreglarse', opts: [{ l: 'Independiente', v: 5 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q5', text: 'Deposición', opts: [{ l: 'Continente', v: 10 }, { l: 'Accidente', v: 5 }, { l: 'Incontinente', v: 0 }] },
      { id: 'q6', text: 'Micción', opts: [{ l: 'Continente', v: 10 }, { l: 'Accidente', v: 5 }, { l: 'Incontinente', v: 0 }] },
      { id: 'q7', text: 'Uso del retrete', opts: [{ l: 'Independiente', v: 10 }, { l: 'Ayuda', v: 5 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q8', text: 'Traslado (Silla-Cama)', opts: [{ l: 'Independiente', v: 15 }, { l: 'Mínima ayuda', v: 10 }, { l: 'Gran ayuda', v: 5 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q9', text: 'Deambulación', opts: [{ l: 'Independiente', v: 15 }, { l: 'Ayuda', v: 10 }, { l: 'Silla ruedas', v: 5 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q10', text: 'Escaleras', opts: [{ l: 'Independiente', v: 10 }, { l: 'Ayuda', v: 5 }, { l: 'Dependiente', v: 0 }] }
    ]
  },
  lawton: {
    name: 'Lawton & Brody', cat: 'Instrumental (AIVD)', max: 8, iconName: 'Briefcase', colorClass: 'cat-functional',
    desc: 'Uso de teléfono, compras, transporte.',
    questions: [
      { id: 'q1', text: 'Uso del teléfono', opts: [{ l: 'Autónomo', v: 1 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q2', text: 'Compras', opts: [{ l: 'Autónomo', v: 1 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q3', text: 'Cocina', opts: [{ l: 'Autónomo', v: 1 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q4', text: 'Cuidado casa', opts: [{ l: 'Autónomo', v: 1 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q5', text: 'Lavado ropa', opts: [{ l: 'Autónomo', v: 1 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q6', text: 'Transporte', opts: [{ l: 'Autónomo', v: 1 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q7', text: 'Medicación', opts: [{ l: 'Autónomo', v: 1 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q8', text: 'Finanzas', opts: [{ l: 'Autónomo', v: 1 }, { l: 'Dependiente', v: 0 }] }
    ]
  },
  pfeiffer: {
    name: 'Pfeiffer', cat: 'Cognitivo', max: 10, iconName: 'Brain', colorClass: 'cat-cognitive',
    desc: 'Cribado de deterioro cognitivo.',
    questions: [
      { id: 'q1', text: '¿Qué día es hoy?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q2', text: '¿Día de la semana?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q3', text: '¿Lugar?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q4', text: '¿Teléfono?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q5', text: '¿Edad?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q6', text: '¿Nacimiento?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q7', text: '¿Presidente?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q8', text: '¿Anterior Presidente?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q9', text: '¿Apellido madre?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q10', text: 'Serie 20-3', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] }
    ]
  },
  yesavage: {
    name: 'Yesavage', cat: 'Estado Ánimo', max: 15, iconName: 'Heart', colorClass: 'cat-mood',
    desc: 'Escala de depresión geriátrica.',
    questions: [
      { id: 'q1', text: '¿Está satisfecho con su vida?', opts: [{ l: 'No', v: 1 }, { l: 'Sí', v: 0 }] },
      { id: 'q2', text: '¿Ha abandonado actividades?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q3', text: '¿Siente su vida vacía?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q4', text: '¿Se aburre?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] }
    ]
  },
  tinetti: {
    name: 'Tinetti', cat: 'Movilidad', max: 28, iconName: 'Activity', colorClass: 'cat-mobility',
    desc: 'Riesgo de caídas (Marcha y Equilibrio).',
    questions: [
      { id: 'q1', text: 'Equilibrio al sentarse', opts: [{ l: 'Estable', v: 1 }, { l: 'Inestable', v: 0 }] },
      { id: 'q2', text: 'Levantarse silla', opts: [{ l: 'Sin manos', v: 2 }, { l: 'Con manos', v: 1 }, { l: 'Incapaz', v: 0 }] }
    ]
  },
  mna: {
    name: 'MNA', cat: 'Nutrición', max: 14, iconName: 'Utensils', colorClass: 'cat-nutritional',
    desc: 'Estado nutricional.',
    questions: [
      { id: 'q1', text: '¿Ingesta disminuida?', opts: [{ l: 'No', v: 2 }, { l: 'Moderada', v: 1 }, { l: 'Grave', v: 0 }] },
      { id: 'q2', text: 'Pérdida peso <3 meses', opts: [{ l: 'No', v: 3 }, { l: '1-3kg', v: 2 }, { l: '>3kg', v: 0 }] }
    ]
  },
  fried: {
    name: 'Fried', cat: 'Fragilidad', max: 5, iconName: 'AlertTriangle', colorClass: 'cat-fragility',
    desc: 'Criterios de fragilidad física.',
    questions: [
      { id: 'q1', text: 'Pérdida peso involuntaria', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q2', text: 'Agotamiento', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q3', text: 'Velocidad marcha lenta', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] }
    ]
  },
  gijon: {
    name: 'Gijón', cat: 'Social', max: 25, iconName: 'Users', colorClass: 'cat-social',
    desc: 'Valoración social del anciano.',
    questions: [
      { id: 'q1', text: 'Situación familiar', opts: [{ l: 'Con familia', v: 1 }, { l: 'Pareja', v: 2 }, { l: 'Solo', v: 4 }, { l: 'Sin familia', v: 5 }] }
    ]
  },
  braden: {
    name: 'Braden', cat: 'Piel (UPP)', max: 23, iconName: 'ShieldCheck', colorClass: 'cat-skin',
    desc: 'Riesgo de úlceras por presión.',
    questions: [
      { id: 'q1', text: 'Percepción sensorial', opts: [{ l: 'Sin límites', v: 4 }, { l: 'Limitada', v: 2 }, { l: 'Anulada', v: 1 }] }
    ]
  },
  mmse: {
    name: 'Minimental', cat: 'Cognitivo Profundo', max: 30, iconName: 'Brain', colorClass: 'cat-cognitive',
    desc: 'Miniexamen cognoscitivo de Folstein.',
    questions: [
      { id: 'q1', text: 'Orientación temporal (0-5)', opts: [{ l: '5/5', v: 5 }, { l: '4/5', v: 4 }, { l: '3/5', v: 3 }, { l: '0/5', v: 0 }] }
    ]
  }
};
