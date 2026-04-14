import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey);
    const { data: userRoles } = await serviceClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!userRoles || userRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Acceso restringido al personal" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { residentId, assessments, residentName, residentDocId } = body;

    if (!residentId || !assessments || !Array.isArray(assessments)) {
      return new Response(JSON.stringify({ error: "Datos de valoración requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await serviceClient.from("profiles").select("full_name").eq("user_id", user.id).single();
    const staffName = profile?.full_name || user.email || "Personal";

    const today = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Build assessment summary for the prompt
    const assessmentSummary = assessments.map((a: any) =>
      `- ${a.test_name}: ${a.score}/${a.max_score} → ${a.interpretation} (Fecha: ${a.assessment_date})`
    ).join("\n");

    const systemPrompt = `Actúa como un especialista en Geriatría en Colombia, con experiencia en centros de protección al adulto mayor. Trabajas en el Hogar Belén, centro de larga estancia en Buesaco, Nariño.

**Tu tarea es generar un INFORME DE VALORACIÓN GERIÁTRICA INTEGRAL (HB-F22)** profesional, clínico y humano, listo para auditoría según la normativa colombiana (Resolución 3280/2018, Ley 1276/2009, Política Nacional de Envejecimiento y Vejez).

**REGLAS ESTRICTAS:**
- Lenguaje profesional, clínico y humano.
- NO inventar datos que no estén en la información proporcionada.
- Correlacionar los resultados entre las diferentes escalas (dependencia física + cognición + nutrición + riesgo social + fragilidad).
- Incluir referencias normativas pertinentes.
- Máximo 1200 palabras.
- Escribe en español colombiano formal.
- Usa el lema institucional: "Juntos, Cuidamos Mejor".

**FORMATO OBLIGATORIO DEL INFORME:**

HOGAR BELÉN — JUNTOS, CUIDAMOS MEJOR
Centro de Protección al Adulto Mayor
Buesaco, Nariño • Tel: 3117301245 • hogarbelen2022@gmail.com
═══════════════════════════════════════════

INFORME DE VALORACIÓN GERIÁTRICA INTEGRAL (HB-F22)
Fecha: [fecha]
Residente: [nombre] | Documento: [documento]
Profesional responsable: [nombre]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. RESUMEN EJECUTIVO
(Síntesis clínica de máximo 4 líneas que interconecte los resultados de todas las escalas aplicadas)

2. VALORACIÓN FUNCIONAL
   2.1 Actividades Básicas de la Vida Diaria (ABVD) — Barthel
   2.2 Actividades Instrumentales (AIVD) — Lawton & Brody
   (Análisis de la capacidad funcional global, nivel de autonomía y necesidades de apoyo)

3. VALORACIÓN COGNITIVA Y DEL ÁNIMO
   3.1 Estado cognitivo — Pfeiffer / MMSE Folstein
   3.2 Estado emocional — Yesavage (GDS)
   (Correlación entre deterioro cognitivo y riesgo afectivo)

4. VALORACIÓN NUTRICIONAL
   4.1 Cribado nutricional — MNA
   (Estado nutricional, riesgos identificados y recomendaciones dietéticas)

5. VALORACIÓN DE MOVILIDAD Y RIESGO DE CAÍDAS
   5.1 Equilibrio y marcha — Tinetti
   5.2 Riesgo de úlceras por presión — Braden
   (Riesgos de seguridad detectados y medidas preventivas)

6. VALORACIÓN DE FRAGILIDAD Y COMORBILIDAD
   6.1 Síndrome de fragilidad — Fried
   6.2 Índice de comorbilidad — Charlson
   (Pronóstico funcional y clasificación del nivel de fragilidad)

7. VALORACIÓN SOCIAL
   7.1 Situación sociofamiliar — Gijón
   7.2 Sobrecarga del cuidador — Zarit (si aplica)
   (Red de apoyo, riesgos sociales y necesidades de intervención)

8. RIESGOS Y ALERTAS DETECTADAS
   (Lista priorizada de alertas clínicas con nivel de urgencia: 🔴 Alto, 🟡 Moderado, 🟢 Bajo)

9. PLAN DE CUIDADO PERSONALIZADO
   (Intervenciones específicas basadas en la normativa del Ministerio de Salud de Colombia para centros de larga estancia)
   - Actividades diarias recomendadas
   - Dieta sugerida
   - Terapias y rehabilitación
   - Apoyo psicosocial y espiritual
   - Frecuencia de reevaluación

10. RECOMENDACIONES DE ENFERMERÍA Y CUIDADO
    (Específicas para el nivel de fragilidad detectado, incluyendo cuidados preventivos, signos de alarma y protocolo de seguimiento)

11. CONCLUSIONES
    (Síntesis final con visión integradora del estado del residente)

12. REFERENCIAS NORMATIVAS
    - Resolución 3280 de 2018 (MinSalud)
    - Ley 1276 de 2009
    - Política Nacional de Envejecimiento y Vejez
    - Guías de Práctica Clínica aplicables

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hogar Belén • 3117301245 • hogarbelen2022@gmail.com • www.hogarbelen.org • @hogarbelenbuesaco`;

    const userPromptMsg = `Analiza los resultados de los siguientes tests geriátricos para el residente ${residentName || "N/A"} (Documento: ${residentDocId || "N/A"}):

${assessmentSummary}

Fecha del informe: ${today}
Profesional responsable: ${staffName}

Genera el INFORME DE VALORACIÓN GERIÁTRICA INTEGRAL (HB-F22) completo siguiendo el formato indicado. Correlaciona la dependencia física con el estado cognitivo, nutricional y social. Redacta el Plan de Cuidado Personalizado basado en la normativa técnica del Ministerio de Salud de Colombia. Incluye Recomendaciones de Enfermería específicas para el nivel de fragilidad detectado.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPromptMsg },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de solicitudes alcanzado. Intente en unos minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const report = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ report }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-geriatric-report error:", e);
    return new Response(JSON.stringify({ error: "Error interno. Intente de nuevo." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
