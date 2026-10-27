import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
// Para ordenar el dictado basta el modelo rápido; si no responde, el más preciso
const DICTATION_MODELS = ["google/gemini-2.5-flash", "google/gemini-2.5-pro"];
const MAX_TRANSCRIPT = 30_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const DICTATION_PROMPT = `Eres un auxiliar de un hogar geriátrico en Colombia (Hogar Belén). El personal conversó con un residente
o con su familia y dictó por voz, todo seguido, su Historia de Vida (formulario HB-F22). El texto viene del reconocimiento
de voz: puede tener errores de transcripción, repeticiones y frases desordenadas.

Tu tarea es REPARTIR lo que se dijo en el campo correcto del formulario:
- preferred_name: cómo le gusta que lo llamen (nombre, apodo, "don", "doña")
- occupation: oficio o profesión de vida, dónde trabajó
- marital_status: estado civil y pareja
- children_info: hijos, nietos, sus nombres y dónde viven
- favorite_food: comidas, bebidas y postres que le gustan
- favorite_music: música, cantantes o canciones que le traen recuerdos
- hobbies: pasatiempos y actividades que disfruta
- morning_or_night: SOLO una de estas palabras: "Madrugador", "Noctámbulo" o "Flexible"
- spiritual_beliefs: religión, prácticas (misa, rosario, oración)
- most_important_person: la persona más importante para el residente hoy
- dislikes: lo que le molesta o le pone de mal humor
- dreams: sueños y deseos en el Hogar

Reglas:
- Usa SOLO información que aparece en el dictado. Nunca inventes ni completes con suposiciones.
- Si de un campo no se habló, omítelo.
- Redacta en primera persona y con tono cálido y digno, como lo cuenta el residente ("Me gusta que me llamen Doña Rosa").
- Conserva nombres propios, lugares, fechas y detalles concretos. Corrige errores evidentes de transcripción y puntuación.
- Una misma frase puede aportar a varios campos si habla de varios temas.
- Lo que no encaja en ningún campo va en "unassigned", tal como se dijo.

Responde SOLO con JSON válido, sin markdown, con esta forma:
{"fields": {"<campo>": {"value": "texto para el formulario", "evidence": "frase corta del dictado de donde sale"}}, "unassigned": "texto"}`;

async function organizeDictation(apiKey: string, transcript: string, currentForm: unknown, residentName: unknown) {
  const text = transcript.slice(0, MAX_TRANSCRIPT).trim();
  if (text.length < 15) return json({ error: "El dictado es muy corto. Cuente un poco más de la vida del residente." }, 400);

  const filled = currentForm && typeof currentForm === "object"
    ? Object.entries(currentForm as Record<string, unknown>).filter(([, v]) => typeof v === "string" && v.trim())
    : [];
  const userContent = `Residente: ${typeof residentName === "string" && residentName ? residentName : "No especificado"}
${filled.length ? `Lo que ya está escrito en el formulario (no lo repitas, solo aporta lo nuevo): ${JSON.stringify(Object.fromEntries(filled)).slice(0, 4000)}` : ""}

DICTADO:
"""
${text}
"""`;

  let lastStatus = 500;
  let lastError = "";
  for (const model of DICTATION_MODELS) {
    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: DICTATION_PROMPT }, { role: "user", content: userContent }],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) {
      lastStatus = response.status;
      lastError = await response.text();
      console.error("AI API error:", model, response.status, lastError);
      if (response.status === 402) return json({ error: "Créditos de IA insuficientes para organizar el dictado." }, 402);
      continue; // 429 / 5xx: se intenta con el siguiente modelo
    }
    const data = await response.json();
    const content = String(data.choices?.[0]?.message?.content ?? "").replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    try {
      const parsed = JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1));
      return json({ success: true, model, data: parsed });
    } catch {
      lastError = "Respuesta no válida de la IA";
      console.error("Invalid JSON from", model, content.slice(0, 500));
    }
  }
  if (lastStatus === 429) return json({ error: "Límite de solicitudes de IA alcanzado. Intente en unos minutos." }, 429);
  return json({ error: `No se pudo organizar el dictado (${lastError.slice(0, 120)})` }, 502);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Acceso denegado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // --- End auth check ---

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { keywords, currentForm, residentName, transcript } = await req.json();

    // Historia dictada por voz: se reparte lo que se dijo en cada campo, sin inventar
    if (typeof transcript === "string") {
      return await organizeDictation(apiKey, transcript, currentForm, residentName);
    }

    if (!keywords || typeof keywords !== "string" || keywords.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Se requieren palabras clave (mínimo 3 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formContext = currentForm
      ? Object.entries(currentForm)
          .filter(([_, v]) => v && String(v).trim())
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      : "";

    const prompt = `Eres un experto en redacción biográfica y psicología geriátrica del contexto cultural colombiano. Tu objetivo es completar el formulario HB-F22 "Historia de Vida" del Hogar Belén de forma coherente, profesional, digna y cálida.

Residente: ${residentName || "No especificado"}
Palabras clave proporcionadas: ${keywords}
${formContext ? `Datos ya registrados: ${formContext}` : ""}

Reglas de redacción:
- Redacta en primera persona (ej: "Me gusta que me llamen...", "Mis hijos son mi mayor orgullo...").
- El tono debe ser digno, cálido y respetuoso con la dignidad del adulto mayor.
- Completa los campos de gustos, entorno espiritual y sueños basándote en el contexto cultural colombiano.
- Si se menciona "Madrugador", ajusta la descripción de su rutina diaria para que sea lógica.
- Genera contenido culturalmente apropiado para Colombia.

Devuelve un JSON con EXACTAMENTE estos campos (todos como strings, no vacíos):
{
  "preferred_name": "Cómo le gusta que lo llamen - narrativa en primera persona",
  "occupation": "Oficio o profesión de vida - narrativa en primera persona",
  "marital_status": "Estado civil con contexto emocional",
  "children_info": "Información sobre hijos con detalles cálidos",
  "favorite_food": "Comida favorita con recuerdos asociados",
  "favorite_music": "Música o canciones que traen recuerdos",
  "hobbies": "Pasatiempos y actividades que disfruta",
  "morning_or_night": "Madrugador o Noctámbulo o Flexible",
  "spiritual_beliefs": "Creencias religiosas y prácticas espirituales",
  "most_important_person": "Persona más importante con contexto emocional",
  "dislikes": "Cosas que le molestan, con respeto",
  "dreams": "Sueños y deseos en el Hogar, esperanzadores"
}

IMPORTANTE: Responde SOLO con el JSON, sin markdown ni texto adicional.`;

    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Eres un especialista en biografías geriátricas para hogares de adultos mayores en Colombia. Respondes SOLO en JSON válido." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de solicitudes alcanzado. Intente en unos minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes para generar la historia de vida." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 401) return new Response(JSON.stringify({ error: "Error de autenticación con el servicio de IA." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 400) return new Response(JSON.stringify({ error: "Datos inválidos enviados al servicio de IA." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: `Error del servicio de IA (${response.status}): ${errorText}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-life-history error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
