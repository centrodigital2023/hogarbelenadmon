const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { keywords, currentForm, residentName } = await req.json();

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
      const errText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Clean markdown fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-life-history error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
