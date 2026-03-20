import { TestQuestion } from "./types";

export const TESTS_GERIATRICOS: Record<string, {
  name: string;
  cat: string;
  max: number;
  iconName: string;
  colorClass: string;
  desc: string;
  instructions?: string;
  questions: TestQuestion[];
}> = {
  barthel: {
    name: 'Barthel', cat: 'Funcional (ABVD)', max: 100, iconName: 'Activity', colorClass: 'cat-functional',
    desc: 'Actividades básicas de la vida diaria.',
    instructions: 'Evalúe cada actividad según el nivel de independencia actual del residente. Observe directamente o pregunte al cuidador principal. Puntúe el nivel más bajo que aplique de forma consistente.',
    questions: [
      { id: 'q1', text: 'Comer', opts: [{ l: 'Independiente: capaz de usar cualquier instrumento, come en tiempo razonable', v: 10 }, { l: 'Necesita ayuda: para cortar, extender mantequilla, o dieta modificada', v: 5 }, { l: 'Dependiente: necesita ser alimentado', v: 0 }] },
      { id: 'q2', text: 'Lavarse (Baño)', opts: [{ l: 'Independiente: entra y sale solo del baño, se lava completo', v: 5 }, { l: 'Dependiente: necesita algún tipo de ayuda', v: 0 }] },
      { id: 'q3', text: 'Vestirse', opts: [{ l: 'Independiente: se viste, desabrocha y abrocha, se ata zapatos', v: 10 }, { l: 'Necesita ayuda: al menos la mitad de tareas en tiempo razonable', v: 5 }, { l: 'Dependiente', v: 0 }] },
      { id: 'q4', text: 'Arreglarse', opts: [{ l: 'Independiente: se lava cara, manos, dientes, se afeita/peina', v: 5 }, { l: 'Dependiente: necesita ayuda', v: 0 }] },
      { id: 'q5', text: 'Deposición (Control de heces)', opts: [{ l: 'Continente: control total', v: 10 }, { l: 'Accidente ocasional: menos de una vez por semana, necesita ayuda con enemas/supositorios', v: 5 }, { l: 'Incontinente: incluye administración de enemas', v: 0 }] },
      { id: 'q6', text: 'Micción (Control de orina)', opts: [{ l: 'Continente: control completo día y noche', v: 10 }, { l: 'Accidente ocasional: máximo uno en 24h, necesita ayuda con dispositivos', v: 5 }, { l: 'Incontinente: o sondado incapaz de manejarse', v: 0 }] },
      { id: 'q7', text: 'Uso del retrete', opts: [{ l: 'Independiente: entra, sale, se limpia, se pone ropa', v: 10 }, { l: 'Necesita ayuda: capaz de manejarse con pequeña ayuda, equilibrio, ropa', v: 5 }, { l: 'Dependiente: incapaz de manejarse sin asistencia', v: 0 }] },
      { id: 'q8', text: 'Traslado (Silla-Cama)', opts: [{ l: 'Independiente: no necesita ayuda, si usa silla de ruedas lo hace independientemente', v: 15 }, { l: 'Mínima ayuda: incluye supervisión verbal o pequeña ayuda física', v: 10 }, { l: 'Gran ayuda: capaz de sentarse pero necesita mucha asistencia para el traslado', v: 5 }, { l: 'Dependiente: necesita grúa o alzamiento completo, incapaz de permanecer sentado', v: 0 }] },
      { id: 'q9', text: 'Deambulación', opts: [{ l: 'Independiente: camina al menos 50m sin ayuda/supervisión, puede usar bastón', v: 15 }, { l: 'Necesita ayuda: supervisión o pequeña ayuda física, camina 50m', v: 10 }, { l: 'Independiente en silla de ruedas: propulsa su silla al menos 50m, gira esquinas', v: 5 }, { l: 'Dependiente: requiere gran ayuda o es incapaz', v: 0 }] },
      { id: 'q10', text: 'Escaleras', opts: [{ l: 'Independiente: sube y baja sin supervisión, puede usar bastón o barandilla', v: 10 }, { l: 'Necesita ayuda: supervisión física o verbal', v: 5 }, { l: 'Dependiente: incapaz de subir/bajar escaleras', v: 0 }] }
    ]
  },
  lawton: {
    name: 'Lawton & Brody', cat: 'Instrumental (AIVD)', max: 8, iconName: 'Briefcase', colorClass: 'cat-functional',
    desc: 'Actividades instrumentales de la vida diaria.',
    instructions: 'Evalúe la capacidad actual del residente para realizar actividades instrumentales. Considere lo que realmente hace, no lo que podría hacer. En hombres, excluir ítems 2, 3, 4, 5 (cocina, casa, lavado) y ajustar máximo a 5.',
    questions: [
      { id: 'q1', text: 'Capacidad para usar el teléfono', opts: [{ l: 'Utiliza el teléfono por iniciativa propia, busca y marca números', v: 1 }, { l: 'Marca algunos números bien conocidos', v: 1 }, { l: 'Contesta el teléfono pero no marca', v: 1 }, { l: 'No utiliza el teléfono en absoluto', v: 0 }] },
      { id: 'q2', text: 'Hacer compras', opts: [{ l: 'Realiza todas las compras necesarias con independencia', v: 1 }, { l: 'Realiza independientemente pequeñas compras', v: 0 }, { l: 'Necesita ir acompañado para cualquier compra', v: 0 }, { l: 'Totalmente incapaz de comprar', v: 0 }] },
      { id: 'q3', text: 'Preparación de la comida', opts: [{ l: 'Organiza, prepara y sirve las comidas por sí solo/a adecuadamente', v: 1 }, { l: 'Prepara adecuadamente las comidas si se le proporcionan los ingredientes', v: 0 }, { l: 'Calienta, sirve y prepara las comidas pero no lleva dieta adecuada', v: 0 }, { l: 'Necesita que le preparen y le sirvan las comidas', v: 0 }] },
      { id: 'q4', text: 'Cuidado de la casa', opts: [{ l: 'Mantiene la casa solo/a o con ayuda ocasional (trabajos pesados)', v: 1 }, { l: 'Realiza tareas ligeras como lavar platos, hacer camas', v: 1 }, { l: 'Realiza tareas ligeras pero no puede mantener nivel adecuado de limpieza', v: 1 }, { l: 'Necesita ayuda en todas las labores de la casa', v: 0 }, { l: 'No participa en ninguna labor de la casa', v: 0 }] },
      { id: 'q5', text: 'Lavado de la ropa', opts: [{ l: 'Lava por sí solo/a toda su ropa', v: 1 }, { l: 'Lava por sí solo/a pequeñas prendas', v: 1 }, { l: 'Todo el lavado de ropa debe ser realizado por otro', v: 0 }] },
      { id: 'q6', text: 'Uso de medios de transporte', opts: [{ l: 'Viaja solo/a en transporte público o conduce su coche', v: 1 }, { l: 'Es capaz de coger un taxi pero no usa otro medio de transporte', v: 1 }, { l: 'Viaja en transporte público cuando va acompañado', v: 1 }, { l: 'Solo utiliza taxi o automóvil con ayuda de otros', v: 0 }, { l: 'No viaja en absoluto', v: 0 }] },
      { id: 'q7', text: 'Responsabilidad respecto a su medicación', opts: [{ l: 'Es capaz de tomar su medicación a la hora y dosis correcta', v: 1 }, { l: 'Toma su medicación si la dosis es preparada previamente', v: 0 }, { l: 'No es capaz de administrarse su medicación', v: 0 }] },
      { id: 'q8', text: 'Manejo de sus asuntos económicos', opts: [{ l: 'Se encarga de sus asuntos económicos por sí solo/a', v: 1 }, { l: 'Realiza las compras de cada día pero necesita ayuda en grandes compras', v: 1 }, { l: 'Incapaz de manejar dinero', v: 0 }] }
    ]
  },
  pfeiffer: {
    name: 'Pfeiffer (SPMSQ)', cat: 'Cognitivo', max: 10, iconName: 'Brain', colorClass: 'cat-cognitive',
    desc: 'Cribado rápido de deterioro cognitivo (Short Portable Mental Status Questionnaire).',
    instructions: 'Formule las preguntas tal como están escritas. Registre el número total de errores. Se permite 1 error más en personas sin estudios primarios y 1 error menos en personas con estudios universitarios. Puntuación = número de errores.',
    questions: [
      { id: 'q1', text: '¿Qué día es hoy? (día, mes y año)', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q2', text: '¿Qué día de la semana es hoy?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q3', text: '¿Dónde estamos ahora? (lugar o edificio)', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q4', text: '¿Cuál es su número de teléfono? (o dirección si no tiene)', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q5', text: '¿Cuántos años tiene?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q6', text: '¿Cuál es su fecha de nacimiento? (día, mes y año)', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q7', text: '¿Quién es el actual presidente de Colombia?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q8', text: '¿Quién fue el anterior presidente?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q9', text: '¿Cuáles son los dos apellidos de su madre?', opts: [{ l: 'Correcto', v: 0 }, { l: 'Error', v: 1 }] },
      { id: 'q10', text: 'Reste de 3 en 3 desde 20 (20, 17, 14, 11, 8, 5, 2)', opts: [{ l: 'Correcto (0-1 fallos)', v: 0 }, { l: 'Error (2+ fallos)', v: 1 }] }
    ]
  },
  yesavage: {
    name: 'Yesavage (GDS-15)', cat: 'Estado de Ánimo', max: 15, iconName: 'Heart', colorClass: 'cat-mood',
    desc: 'Escala de depresión geriátrica abreviada (15 ítems).',
    instructions: 'Pida al residente que responda pensando en cómo se ha sentido durante la ÚLTIMA SEMANA. Las respuestas en negrita suman 1 punto (indican depresión). 0-5: Normal. 6-9: Depresión leve. 10-15: Depresión severa.',
    questions: [
      { id: 'q1', text: '¿Está básicamente satisfecho/a con su vida?', opts: [{ l: 'Sí', v: 0 }, { l: 'No', v: 1 }] },
      { id: 'q2', text: '¿Ha renunciado a muchas de sus actividades e intereses?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q3', text: '¿Siente que su vida está vacía?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q4', text: '¿Se encuentra a menudo aburrido/a?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q5', text: '¿Tiene esperanza en el futuro?', opts: [{ l: 'Sí', v: 0 }, { l: 'No', v: 1 }] },
      { id: 'q6', text: '¿Tiene pensamientos que le molestan y no puede quitarse de la cabeza?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q7', text: '¿Está de buen humor la mayor parte del tiempo?', opts: [{ l: 'Sí', v: 0 }, { l: 'No', v: 1 }] },
      { id: 'q8', text: '¿Tiene miedo de que le vaya a pasar algo malo?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q9', text: '¿Se siente feliz la mayor parte del tiempo?', opts: [{ l: 'Sí', v: 0 }, { l: 'No', v: 1 }] },
      { id: 'q10', text: '¿Se siente a menudo desamparado/a o desprotegido/a?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q11', text: '¿Se siente a menudo intranquilo/a o nervioso/a?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q12', text: '¿Prefiere quedarse en casa en lugar de salir y hacer cosas nuevas?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q13', text: '¿Se preocupa frecuentemente por el futuro?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q14', text: '¿Siente que tiene más problemas de memoria que la mayoría?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q15', text: '¿Piensa que es maravilloso estar vivo/a ahora?', opts: [{ l: 'Sí', v: 0 }, { l: 'No', v: 1 }] }
    ]
  },
  tinetti: {
    name: 'Tinetti', cat: 'Movilidad (Marcha y Equilibrio)', max: 28, iconName: 'Activity', colorClass: 'cat-mobility',
    desc: 'Evaluación de marcha y equilibrio para riesgo de caídas.',
    instructions: 'EQUILIBRIO (16 pts): El paciente sentado en silla dura sin brazos. MARCHA (12 pts): El paciente de pie, camina por pasillo 8m, primero a paso habitual, luego rápido. <19: alto riesgo caídas. 19-24: riesgo moderado. 25-28: bajo riesgo.',
    questions: [
      { id: 'q1', text: 'Equilibrio sentado', opts: [{ l: 'Se inclina o desliza en la silla', v: 0 }, { l: 'Se mantiene seguro, estable', v: 1 }] },
      { id: 'q2', text: 'Levantarse de la silla', opts: [{ l: 'Incapaz sin ayuda', v: 0 }, { l: 'Capaz usando los brazos como ayuda', v: 1 }, { l: 'Capaz sin usar los brazos', v: 2 }] },
      { id: 'q3', text: 'Intentos para levantarse', opts: [{ l: 'Incapaz sin ayuda', v: 0 }, { l: 'Capaz pero necesita más de un intento', v: 1 }, { l: 'Capaz en un solo intento', v: 2 }] },
      { id: 'q4', text: 'Equilibrio en bipedestación inmediata (primeros 5 seg)', opts: [{ l: 'Inestable (tambalea, mueve pies, oscila tronco)', v: 0 }, { l: 'Estable pero usa andador/bastón o se agarra', v: 1 }, { l: 'Estable sin andador, bastón ni agarre', v: 2 }] },
      { id: 'q5', text: 'Equilibrio en bipedestación', opts: [{ l: 'Inestable', v: 0 }, { l: 'Estable con bastón o base de sustentación amplia (>12cm)', v: 1 }, { l: 'Base de sustentación estrecha sin apoyo', v: 2 }] },
      { id: 'q6', text: 'Empujón (examinador empuja suavemente el esternón 3 veces)', opts: [{ l: 'Empieza a caer', v: 0 }, { l: 'Tambalea, se agarra pero se mantiene', v: 1 }, { l: 'Estable', v: 2 }] },
      { id: 'q7', text: 'Ojos cerrados (en bipedestación)', opts: [{ l: 'Inestable', v: 0 }, { l: 'Estable', v: 1 }] },
      { id: 'q8', text: 'Giro 360°', opts: [{ l: 'Pasos discontinuos', v: 0 }, { l: 'Pasos continuos', v: 1 }, { l: 'Inestable (se agarra)', v: 0 }, { l: 'Estable', v: 1 }] },
      { id: 'q9', text: 'Sentarse', opts: [{ l: 'Inseguro, calcula mal distancia, cae en la silla', v: 0 }, { l: 'Usa los brazos o el movimiento es brusco', v: 1 }, { l: 'Seguro, movimiento suave', v: 2 }] },
      { id: 'q10', text: 'MARCHA: Inicio de la marcha (inmediatamente después de decir "camine")', opts: [{ l: 'Cualquier vacilación o múltiples intentos', v: 0 }, { l: 'Sin vacilación', v: 1 }] },
      { id: 'q11', text: 'Longitud y altura del paso (pie derecho)', opts: [{ l: 'No sobrepasa el pie izquierdo', v: 0 }, { l: 'Sobrepasa el pie izquierdo', v: 1 }, { l: 'El pie derecho no se separa completamente del suelo', v: 0 }, { l: 'El pie derecho se separa completamente del suelo', v: 1 }] },
      { id: 'q12', text: 'Longitud y altura del paso (pie izquierdo)', opts: [{ l: 'No sobrepasa el pie derecho', v: 0 }, { l: 'Sobrepasa el pie derecho', v: 1 }, { l: 'El pie izquierdo no se separa completamente del suelo', v: 0 }, { l: 'El pie izquierdo se separa completamente del suelo', v: 1 }] },
      { id: 'q13', text: 'Simetría del paso', opts: [{ l: 'La longitud del paso derecho e izquierdo es diferente (estimación)', v: 0 }, { l: 'Los pasos son iguales en longitud', v: 1 }] },
      { id: 'q14', text: 'Continuidad del paso', opts: [{ l: 'Parada entre los pasos', v: 0 }, { l: 'Los pasos son continuos', v: 1 }] },
      { id: 'q15', text: 'Trayectoria (observar sobre distancia 3m)', opts: [{ l: 'Desviación marcada', v: 0 }, { l: 'Desviación leve o usa ayuda técnica', v: 1 }, { l: 'Sin desviación ni ayuda', v: 2 }] },
      { id: 'q16', text: 'Tronco', opts: [{ l: 'Balanceo marcado o usa ayuda técnica', v: 0 }, { l: 'Sin balanceo pero flexión de rodillas/espalda o separa brazos', v: 1 }, { l: 'Sin balanceo, sin flexión, no usa brazos ni ayudas', v: 2 }] }
    ]
  },
  mna: {
    name: 'MNA (Mini Nutritional Assessment)', cat: 'Nutrición', max: 30, iconName: 'Utensils', colorClass: 'cat-nutritional',
    desc: 'Evaluación completa del estado nutricional.',
    instructions: 'CRIBAJE (máx 14 pts): Si ≥12 normal, no necesita continuar. Si ≤11, continuar evaluación completa. EVALUACIÓN (máx 16 pts). Total MNA: 24-30 normal; 17-23.5 riesgo malnutrición; <17 malnutrición.',
    questions: [
      { id: 'q1', text: '¿Ha disminuido la ingesta de alimentos en los últimos 3 meses por pérdida de apetito, problemas digestivos o dificultad para masticar/tragar?', opts: [{ l: 'Anorexia grave o disminución severa de la ingesta', v: 0 }, { l: 'Anorexia moderada o disminución moderada', v: 1 }, { l: 'Sin anorexia ni disminución de la ingesta', v: 2 }] },
      { id: 'q2', text: 'Pérdida de peso en los últimos 3 meses', opts: [{ l: 'Pérdida de peso >3 kg', v: 0 }, { l: 'No sabe', v: 1 }, { l: 'Pérdida de peso entre 1 y 3 kg', v: 2 }, { l: 'Sin pérdida de peso', v: 3 }] },
      { id: 'q3', text: 'Movilidad', opts: [{ l: 'De la cama al sillón', v: 0 }, { l: 'Autonomía en el interior', v: 1 }, { l: 'Sale del domicilio', v: 2 }] },
      { id: 'q4', text: '¿Ha tenido enfermedad aguda o estrés psicológico en los últimos 3 meses?', opts: [{ l: 'Sí', v: 0 }, { l: 'No', v: 2 }] },
      { id: 'q5', text: 'Problemas neuropsicológicos', opts: [{ l: 'Demencia o depresión grave', v: 0 }, { l: 'Demencia o depresión moderada', v: 1 }, { l: 'Sin problemas psicológicos', v: 2 }] },
      { id: 'q6', text: 'Índice de Masa Corporal (IMC = peso/talla²)', opts: [{ l: 'IMC <19', v: 0 }, { l: 'IMC 19 a <21', v: 1 }, { l: 'IMC 21 a <23', v: 2 }, { l: 'IMC ≥23', v: 3 }] },
      { id: 'q7', text: '¿Vive de forma independiente? (no en residencia ni hospital)', opts: [{ l: 'No', v: 0 }, { l: 'Sí', v: 1 }] },
      { id: 'q8', text: '¿Toma más de 3 medicamentos al día?', opts: [{ l: 'Sí', v: 0 }, { l: 'No', v: 1 }] },
      { id: 'q9', text: '¿Tiene úlceras por presión o escaras?', opts: [{ l: 'Sí', v: 0 }, { l: 'No', v: 1 }] },
      { id: 'q10', text: '¿Cuántas comidas completas toma al día?', opts: [{ l: '1 comida', v: 0 }, { l: '2 comidas', v: 1 }, { l: '3 comidas', v: 2 }] },
      { id: 'q11', text: 'Indicadores de ingesta proteica: ¿Consume al menos una porción de lácteos, legumbres/huevos, carne/pescado al día?', opts: [{ l: '0 o 1 sí', v: 0 }, { l: '2 sí', v: 0.5 }, { l: '3 sí', v: 1 }] },
      { id: 'q12', text: '¿Consume al menos 2 porciones de frutas o verduras al día?', opts: [{ l: 'No', v: 0 }, { l: 'Sí', v: 1 }] },
      { id: 'q13', text: '¿Cuántos vasos de líquidos consume al día? (agua, zumo, café, leche, etc.)', opts: [{ l: 'Menos de 3 vasos', v: 0 }, { l: '3 a 5 vasos', v: 0.5 }, { l: 'Más de 5 vasos', v: 1 }] },
      { id: 'q14', text: 'Forma de alimentarse', opts: [{ l: 'Necesita ayuda', v: 0 }, { l: 'Se alimenta solo con dificultad', v: 1 }, { l: 'Se alimenta solo sin dificultad', v: 2 }] },
      { id: 'q15', text: '¿Considera el residente que está bien nutrido?', opts: [{ l: 'Malnutrición grave', v: 0 }, { l: 'No sabe o malnutrición moderada', v: 1 }, { l: 'Sin problemas de nutrición', v: 2 }] },
      { id: 'q16', text: 'Comparándose con personas de su edad, ¿cómo valora su estado de salud?', opts: [{ l: 'Peor', v: 0 }, { l: 'No sabe', v: 0.5 }, { l: 'Igual', v: 1 }, { l: 'Mejor', v: 2 }] },
      { id: 'q17', text: 'Circunferencia braquial (CB) en cm', opts: [{ l: 'CB <21', v: 0 }, { l: 'CB 21-22', v: 0.5 }, { l: 'CB >22', v: 1 }] },
      { id: 'q18', text: 'Circunferencia de la pantorrilla (CP) en cm', opts: [{ l: 'CP <31', v: 0 }, { l: 'CP ≥31', v: 1 }] }
    ]
  },
  fried: {
    name: 'Fried (Criterios de Fragilidad)', cat: 'Fragilidad', max: 5, iconName: 'AlertTriangle', colorClass: 'cat-fragility',
    desc: 'Fenotipo de fragilidad de Fried. 0: Robusto. 1-2: Pre-frágil. 3+: Frágil.',
    instructions: 'Evalúe los 5 criterios. Cada criterio positivo suma 1 punto. 0 criterios = robusto; 1-2 = pre-frágil; ≥3 = frágil. Para fuerza prensil y velocidad marcha, usar tablas de referencia ajustadas por sexo e IMC.',
    questions: [
      { id: 'q1', text: 'Pérdida de peso involuntaria: ¿Ha perdido >4.5 kg o >5% del peso corporal en el último año sin intención?', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q2', text: 'Agotamiento subjetivo: ¿Siente que todo lo que hace es un esfuerzo? ¿No puede ponerse en marcha? (≥3-4 días/semana)', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q3', text: 'Debilidad: Fuerza prensil medida con dinamómetro. Hombre: <30 kg ajustado por IMC. Mujer: <18 kg ajustado por IMC.', opts: [{ l: 'Debilidad presente (bajo punto de corte)', v: 1 }, { l: 'Fuerza normal', v: 0 }] },
      { id: 'q4', text: 'Velocidad de marcha lenta: Tiempo para caminar 4.6 metros. Hombre ≤173cm: >7seg. Hombre >173cm: >6seg. Mujer ≤159cm: >7seg. Mujer >159cm: >6seg.', opts: [{ l: 'Lentitud presente (supera punto de corte)', v: 1 }, { l: 'Velocidad normal', v: 0 }] },
      { id: 'q5', text: 'Baja actividad física: Kilocalorías gastadas por semana. Hombre: <383 kcal/sem. Mujer: <270 kcal/sem. (MLTA questionnaire)', opts: [{ l: 'Baja actividad', v: 1 }, { l: 'Actividad suficiente', v: 0 }] }
    ]
  },
  gijon: {
    name: 'Gijón (Escala Sociofamiliar)', cat: 'Social', max: 25, iconName: 'Users', colorClass: 'cat-social',
    desc: 'Valoración del riesgo social del anciano.',
    instructions: 'Seleccione la opción que mejor describe la situación actual del residente en cada área. <10: Buena situación social. 10-14: Riesgo social. ≥15: Problema social severo.',
    questions: [
      { id: 'q1', text: 'Situación familiar', opts: [{ l: 'Vive con familia sin conflicto', v: 1 }, { l: 'Vive con cónyuge de similar edad', v: 2 }, { l: 'Vive con familia y/o cónyuge con algún grado de dependencia', v: 3 }, { l: 'Vive solo, hijos/familiares cercanos que no cubren necesidades', v: 4 }, { l: 'Vive solo, familiares lejanos, desatendido, sin familia', v: 5 }] },
      { id: 'q2', text: 'Situación económica', opts: [{ l: 'Cubre necesidades básicas con holgura', v: 1 }, { l: 'Cubre necesidades básicas', v: 2 }, { l: 'Ingresos insuficientes (pensión mínima)', v: 3 }, { l: 'Sin ingresos o inferiores al mínimo', v: 4 }, { l: 'Sin ingresos, no recibe pensión, sin otros recursos', v: 5 }] },
      { id: 'q3', text: 'Vivienda', opts: [{ l: 'Adecuada a necesidades', v: 1 }, { l: 'Barreras arquitectónicas (escaleras sin ascensor, puertas estrechas, bañera)', v: 2 }, { l: 'Humedades, mala higiene, equipamiento inadecuado', v: 3 }, { l: 'Ausencia de ascensor, teléfono, calefacción', v: 4 }, { l: 'Vivienda inadecuada (chabola, ruina, hacinamiento, sin baño)', v: 5 }] },
      { id: 'q4', text: 'Relaciones sociales', opts: [{ l: 'Relaciones sociales mantenidas', v: 1 }, { l: 'Relaciones sociales casi exclusivamente con familia y vecinos', v: 2 }, { l: 'Relaciones sociales solo con familia o vecinos', v: 3 }, { l: 'No sale del domicilio, recibe visitas', v: 4 }, { l: 'No sale, no recibe visitas', v: 5 }] },
      { id: 'q5', text: 'Apoyo de la red social', opts: [{ l: 'Con apoyo familiar y vecinal', v: 1 }, { l: 'Voluntariado social, ayuda domiciliaria', v: 2 }, { l: 'No tiene apoyo', v: 3 }, { l: 'Pendiente de valoración de ayudas', v: 4 }, { l: 'Tiene cuidador pero necesita más apoyo', v: 5 }] }
    ]
  },
  braden: {
    name: 'Braden', cat: 'Piel (Riesgo UPP)', max: 23, iconName: 'ShieldCheck', colorClass: 'cat-skin',
    desc: 'Riesgo de úlceras por presión. ≤12: Alto riesgo. 13-14: Riesgo moderado. 15-16 (si <75 años): Riesgo bajo. 17-23: Sin riesgo.',
    instructions: 'Evalúe cada subescala de forma independiente. La puntuación total indica el riesgo: a menor puntuación, mayor riesgo.',
    questions: [
      { id: 'q1', text: 'Percepción sensorial: Capacidad para responder significativamente a la presión', opts: [{ l: 'Completamente limitada: no responde a estímulos dolorosos', v: 1 }, { l: 'Muy limitada: solo responde a estímulos dolorosos, no puede comunicar malestar', v: 2 }, { l: 'Ligeramente limitada: responde a órdenes verbales pero no siempre comunica malestar', v: 3 }, { l: 'Sin limitaciones: responde a órdenes verbales, no tiene déficit sensorial', v: 4 }] },
      { id: 'q2', text: 'Exposición a la humedad: Nivel de exposición de la piel a la humedad', opts: [{ l: 'Constantemente húmeda: la piel se mantiene húmeda casi constantemente', v: 1 }, { l: 'Muy húmeda: la piel está frecuentemente pero no siempre húmeda', v: 2 }, { l: 'Ocasionalmente húmeda: la piel está ocasionalmente húmeda, requiere cambio extra 1 vez/día', v: 3 }, { l: 'Raramente húmeda: la piel está generalmente seca', v: 4 }] },
      { id: 'q3', text: 'Actividad: Grado de actividad física', opts: [{ l: 'Encamado: confinado en cama', v: 1 }, { l: 'En silla: capacidad de caminar severamente limitada o nula', v: 2 }, { l: 'Camina ocasionalmente: con o sin ayuda, distancias muy cortas', v: 3 }, { l: 'Camina frecuentemente: fuera de la habitación al menos 2 veces/día', v: 4 }] },
      { id: 'q4', text: 'Movilidad: Capacidad para cambiar y controlar la posición del cuerpo', opts: [{ l: 'Completamente inmóvil: no realiza ni ligeros cambios de posición', v: 1 }, { l: 'Muy limitada: realiza cambios mínimos, infrecuentes', v: 2 }, { l: 'Ligeramente limitada: realiza cambios frecuentes pero pequeños', v: 3 }, { l: 'Sin limitaciones: realiza cambios frecuentes y significativos', v: 4 }] },
      { id: 'q5', text: 'Nutrición: Patrón habitual de ingesta alimentaria', opts: [{ l: 'Muy pobre: nunca come completa, rara vez más de 1/3 de comida, 2+ porciones proteína/día, sin suplementos', v: 1 }, { l: 'Probablemente inadecuada: rara vez come completa, generalmente come solo la mitad', v: 2 }, { l: 'Adecuada: come más de la mitad de las comidas, 4+ porciones proteína, a veces rechaza', v: 3 }, { l: 'Excelente: come la mayor parte de cada comida, nunca rechaza, 4+ porciones proteína', v: 4 }] },
      { id: 'q6', text: 'Fricción y deslizamiento', opts: [{ l: 'Problema: requiere asistencia máxima para moverse, deslizamiento frecuente, espasticidad/contracturas', v: 1 }, { l: 'Problema potencial: se mueve con dificultad pero mantiene posición, deslizamiento mínimo', v: 2 }, { l: 'Sin problema aparente: se mueve independientemente, tiene suficiente fuerza muscular', v: 3 }] }
    ]
  },
  mmse: {
    name: 'Minimental (MMSE)', cat: 'Cognitivo Profundo', max: 30, iconName: 'Brain', colorClass: 'cat-cognitive',
    desc: 'Miniexamen del Estado Mental de Folstein.',
    instructions: 'Aplique cada ítem según las instrucciones. Ajuste por escolaridad: +2 si ≤4 años, +1 si 5-8 años. 27-30: Normal. 24-26: Sospecha patológica. 12-23: Deterioro. 9-11: Demencia.',
    questions: [
      { id: 'q1', text: 'Orientación temporal: ¿En qué año estamos?', opts: [{ l: 'Correcto', v: 1 }, { l: 'Incorrecto', v: 0 }] },
      { id: 'q2', text: 'Orientación temporal: ¿En qué estación del año estamos?', opts: [{ l: 'Correcto', v: 1 }, { l: 'Incorrecto', v: 0 }] },
      { id: 'q3', text: 'Orientación temporal: ¿Qué día del mes es hoy?', opts: [{ l: 'Correcto', v: 1 }, { l: 'Incorrecto', v: 0 }] },
      { id: 'q4', text: 'Orientación temporal: ¿Qué día de la semana es hoy?', opts: [{ l: 'Correcto', v: 1 }, { l: 'Incorrecto', v: 0 }] },
      { id: 'q5', text: 'Orientación temporal: ¿En qué mes estamos?', opts: [{ l: 'Correcto', v: 1 }, { l: 'Incorrecto', v: 0 }] },
      { id: 'q6', text: 'Orientación espacial: ¿Dónde estamos? (país)', opts: [{ l: 'Correcto', v: 1 }, { l: 'Incorrecto', v: 0 }] },
      { id: 'q7', text: 'Orientación espacial: ¿En qué departamento/provincia estamos?', opts: [{ l: 'Correcto', v: 1 }, { l: 'Incorrecto', v: 0 }] },
      { id: 'q8', text: 'Orientación espacial: ¿En qué ciudad/pueblo estamos?', opts: [{ l: 'Correcto', v: 1 }, { l: 'Incorrecto', v: 0 }] },
      { id: 'q9', text: 'Orientación espacial: ¿En qué lugar estamos ahora?', opts: [{ l: 'Correcto', v: 1 }, { l: 'Incorrecto', v: 0 }] },
      { id: 'q10', text: 'Orientación espacial: ¿En qué piso/planta estamos?', opts: [{ l: 'Correcto', v: 1 }, { l: 'Incorrecto', v: 0 }] },
      { id: 'q11', text: 'Fijación: Diga 3 palabras (peseta-caballo-manzana). Repita. ¿Cuántas recuerda?', opts: [{ l: '3 palabras', v: 3 }, { l: '2 palabras', v: 2 }, { l: '1 palabra', v: 1 }, { l: '0 palabras', v: 0 }] },
      { id: 'q12', text: 'Atención y cálculo: Reste de 7 en 7 desde 100 (93,86,79,72,65). ¿Cuántos aciertos?', opts: [{ l: '5 aciertos', v: 5 }, { l: '4 aciertos', v: 4 }, { l: '3 aciertos', v: 3 }, { l: '2 aciertos', v: 2 }, { l: '1 acierto', v: 1 }, { l: '0 aciertos', v: 0 }] },
      { id: 'q13', text: 'Recuerdo diferido: ¿Recuerda las 3 palabras anteriores?', opts: [{ l: '3 palabras', v: 3 }, { l: '2 palabras', v: 2 }, { l: '1 palabra', v: 1 }, { l: '0 palabras', v: 0 }] },
      { id: 'q14', text: 'Lenguaje - Denominación: Muestre un reloj y un lápiz. ¿Qué es esto?', opts: [{ l: 'Nombra ambos', v: 2 }, { l: 'Nombra uno', v: 1 }, { l: 'No nombra ninguno', v: 0 }] },
      { id: 'q15', text: 'Lenguaje - Repetición: Repita "ni sí, ni no, ni pero"', opts: [{ l: 'Correcto', v: 1 }, { l: 'Incorrecto', v: 0 }] },
      { id: 'q16', text: 'Lenguaje - Comprensión: Coja este papel con la mano derecha, dóblelo por la mitad y póngalo en el suelo (3 órdenes)', opts: [{ l: '3 órdenes', v: 3 }, { l: '2 órdenes', v: 2 }, { l: '1 orden', v: 1 }, { l: '0 órdenes', v: 0 }] },
      { id: 'q17', text: 'Lectura: Lea y haga lo que dice aquí: "CIERRE LOS OJOS"', opts: [{ l: 'Lo hace', v: 1 }, { l: 'No lo hace', v: 0 }] },
      { id: 'q18', text: 'Escritura: Escriba una frase con sujeto y verbo (con sentido)', opts: [{ l: 'Frase correcta', v: 1 }, { l: 'No logra', v: 0 }] },
      { id: 'q19', text: 'Dibujo: Copie dos pentágonos entrelazados', opts: [{ l: 'Correcto (10 ángulos, 2 en intersección)', v: 1 }, { l: 'Incorrecto', v: 0 }] }
    ]
  },
  charlson: {
    name: 'Charlson', cat: 'Comorbilidad', max: 37, iconName: 'Activity', colorClass: 'cat-functional',
    desc: 'Índice de comorbilidad de Charlson. Predice mortalidad a 10 años.',
    instructions: 'Marque las condiciones que presenta el paciente. Se suman los pesos. Agregar 1 punto por cada década >40 años. 0: Sin comorbilidad. 1-2: Comorbilidad baja. 3-4: Alta. ≥5: Muy alta.',
    questions: [
      { id: 'q1', text: 'Infarto de miocardio (antecedente, no solo cambios ECG)', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q2', text: 'Insuficiencia cardíaca congestiva', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q3', text: 'Enfermedad vascular periférica (incluye aneurisma aórtico ≥6cm)', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q4', text: 'Enfermedad cerebrovascular (ACV con secuelas mínimas o AIT)', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q5', text: 'Demencia', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q6', text: 'Enfermedad pulmonar crónica (EPOC)', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q7', text: 'Enfermedad del tejido conectivo (lupus, polimiositis, AR, polimialgia)', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q8', text: 'Úlcera gastroduodenal', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q9', text: 'Hepatopatía leve (sin hipertensión portal, incluye hepatitis crónica)', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q10', text: 'Diabetes mellitus sin afectación de órganos diana', opts: [{ l: 'Sí', v: 1 }, { l: 'No', v: 0 }] },
      { id: 'q11', text: 'Hemiplejía', opts: [{ l: 'Sí', v: 2 }, { l: 'No', v: 0 }] },
      { id: 'q12', text: 'Insuficiencia renal crónica moderada-severa (creatinina >3mg/dl o en diálisis)', opts: [{ l: 'Sí', v: 2 }, { l: 'No', v: 0 }] },
      { id: 'q13', text: 'Diabetes con afectación de órganos diana (retinopatía, nefropatía, neuropatía)', opts: [{ l: 'Sí', v: 2 }, { l: 'No', v: 0 }] },
      { id: 'q14', text: 'Tumor sin metástasis (diagnosticado en los últimos 5 años)', opts: [{ l: 'Sí', v: 2 }, { l: 'No', v: 0 }] },
      { id: 'q15', text: 'Leucemia (aguda o crónica)', opts: [{ l: 'Sí', v: 2 }, { l: 'No', v: 0 }] },
      { id: 'q16', text: 'Linfoma', opts: [{ l: 'Sí', v: 2 }, { l: 'No', v: 0 }] },
      { id: 'q17', text: 'Hepatopatía moderada-severa (con hipertensión portal)', opts: [{ l: 'Sí', v: 3 }, { l: 'No', v: 0 }] },
      { id: 'q18', text: 'Tumor sólido con metástasis', opts: [{ l: 'Sí', v: 6 }, { l: 'No', v: 0 }] },
      { id: 'q19', text: 'SIDA (no solo VIH positivo)', opts: [{ l: 'Sí', v: 6 }, { l: 'No', v: 0 }] },
      { id: 'q20', text: 'Ajuste por edad', opts: [{ l: '≤40 años', v: 0 }, { l: '41-50 años', v: 1 }, { l: '51-60 años', v: 2 }, { l: '61-70 años', v: 3 }, { l: '71-80 años', v: 4 }, { l: '>80 años', v: 5 }] }
    ]
  },
  zarit: {
    name: 'Zarit (Sobrecarga del Cuidador)', cat: 'Cuidador', max: 88, iconName: 'Users', colorClass: 'cat-social',
    desc: 'Evalúa la sobrecarga del cuidador principal. Se aplica al FAMILIAR/CUIDADOR, no al residente.',
    instructions: 'Entrevistar al cuidador principal. Cada pregunta se puntúa de 0 (nunca) a 4 (casi siempre). <21: No sobrecarga. 21-40: Sobrecarga leve. 41-60: Sobrecarga moderada. 61-88: Sobrecarga severa.',
    questions: [
      { id: 'q1', text: '¿Siente que su familiar le pide más ayuda de la que realmente necesita?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q2', text: '¿Siente que no tiene suficiente tiempo para usted por el tiempo que dedica a su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q3', text: '¿Se siente agobiado/a por intentar compatibilizar el cuidado de su familiar con otras responsabilidades?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q4', text: '¿Se siente avergonzado/a por el comportamiento de su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q5', text: '¿Se siente enfadado/a cuando está cerca de su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q6', text: '¿Cree que el cuidado de su familiar afecta negativamente a la relación que usted tiene con otros miembros de la familia?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q7', text: '¿Tiene miedo de lo que el futuro depare a su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q8', text: '¿Siente que su familiar depende de usted?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q9', text: '¿Se siente agotado/a cuando tiene que estar junto a su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q10', text: '¿Siente que su salud se ha resentido por cuidar a su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q11', text: '¿Siente que no tiene tanta intimidad como le gustaría por cuidar a su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q12', text: '¿Siente que su vida social se ha resentido por cuidar a su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q13', text: '¿Se siente incómodo/a por distanciarse de sus amistades por cuidar a su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q14', text: '¿Cree que su familiar espera que usted le cuide como si fuera la única persona con la que puede contar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q15', text: '¿Cree que no dispone de dinero suficiente para cuidar a su familiar, además de sus otros gastos?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q16', text: '¿Siente que no va a ser capaz de cuidar a su familiar durante mucho más tiempo?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q17', text: '¿Siente que ha perdido el control de su vida desde que su familiar enfermó?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q18', text: '¿Desearía poder dejar el cuidado de su familiar a otra persona?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q19', text: '¿Se siente indeciso/a sobre qué hacer con su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q20', text: '¿Siente que debería hacer más de lo que hace por su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q21', text: '¿Cree que podría cuidar mejor a su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] },
      { id: 'q22', text: 'En general, ¿se siente muy sobrecargado/a al tener que cuidar de su familiar?', opts: [{ l: 'Nunca', v: 0 }, { l: 'Casi nunca', v: 1 }, { l: 'A veces', v: 2 }, { l: 'Frecuentemente', v: 3 }, { l: 'Casi siempre', v: 4 }] }
    ]
  }
};
