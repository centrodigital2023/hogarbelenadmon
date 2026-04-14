import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODULE_PROMPTS: Record<string, string> = {
  ingreso: "Genera un informe profesional de ingreso/admisión del residente, incluyendo documentos recibidos, inventario de pertenencias, y recomendaciones de adaptación.",
  valoracion: "Genera un informe de valoración geriátrica integral, con análisis de escalas aplicadas (Barthel, Lawton, Pfeiffer, Yesavage, etc.), nivel de dependencia e intervenciones sugeridas.",
  alimentacion: "Genera un informe nutricional y de seguridad alimentaria: temperaturas de neveras, control de cocina, ingreso de alimentos, cumplimiento de dietas especiales y recomendaciones.",
  bienestar: "Genera un informe de bienestar integral: terapias realizadas, actividades recreativas, estado emocional, acompañamiento psicosocial y espiritual, logros terapéuticos.",
  salud: "Genera un informe clínico de salud diaria: bitácora de turnos, signos vitales, administración de medicamentos, novedades de enfermería y plan de cuidado.",
  sistema_salud: "Genera un informe del sistema de salud: citas médicas, remisiones a especialistas, resultados de consultas, seguimiento post-hospitalización.",
  higiene: "Genera un informe de higiene y prevención de infecciones: registros de desinfección, kits de aseo, protocolos de limpieza y cumplimiento normativo.",
  seguridad: "Genera un informe de seguridad: incidentes y caídas registrados, análisis de causas, acciones correctivas, recomendaciones de prevención.",
  egreso: "Genera un informe de egreso: motivo de salida, inventario devuelto, estado clínico al egreso, recomendaciones para la familia.",
  personal: "Genera un informe de talento humano: capacitaciones realizadas, evaluaciones de desempeño, cumplimiento de horas de formación, plan de mejora.",
  calidad: "Genera un informe de calidad: PQRSF recibidas, indicadores de gestión, planes de mejora, cumplimiento de estándares y auditoría interna.",
  gerencial: "Genera un informe gerencial: residuos, control de plagas, saneamiento, plan de emergencias, panorama de riesgos y tablero de indicadores.",
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
    const { module, residentId, formData, formTitle } = body;

    if (!module || typeof module !== "string") {
      return new Response(JSON.stringify({ error: "Módulo requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get resident info if provided
    let residentName = "Todos los residentes";
    if (residentId) {
      const { data: resident } = await serviceClient.from("residents").select("full_name, birth_date, status").eq("id", residentId).single();
      if (resident) residentName = resident.full_name;
    }

    // Get profile name of the user generating the report
    const { data: profile } = await serviceClient.from("profiles").select("full_name").eq("user_id", user.id).single();
    const staffName = profile?.full_name || user.email || "Personal";

    const modulePrompt = MODULE_PROMPTS[module] || "Genera un informe profesional completo del módulo solicitado.";

    const today = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const systemPrompt = `Eres un profesional clínico-administrativo con experiencia en centros geriátricos en Colombia. Trabajas en el Hogar Belén, centro de protección al adulto mayor en Buesaco, Nariño.

Generas informes profesionales listos para auditoría según normativas colombianas (Resolución 3280/2018, Ley 1276/2009, Política de Envejecimiento y Vejez).

**Reglas:**
- Lenguaje profesional, claro y objetivo.
- Incluir siempre: encabezado institucional, datos del residente (si aplica), hallazgos, análisis, recomendaciones y conclusiones.
- Formato estructurado con secciones numeradas.
- No inventar datos que no estén en la información proporcionada.
- Incluir referencia normativa cuando sea pertinente.
- Máximo 800 palabras.
- Escribe en español colombiano formal.

**Formato del informe:**
HOGAR BELÉN - JUNTOS CUIDAMOS MEJOR
Centro de Protección al Adulto Mayor
Buesaco, Nariño • Tel: 3117301245

[TÍTULO DEL INFORME]
Fecha: [fecha]
Residente: [nombre] (si aplica)
Responsable: [nombre del profesional]
Formulario: [código del formulario]

1. OBJETIVO
2. DATOS RECOPILADOS
3. ANÁLISIS PROFESIONAL
4. HALLAZGOS RELEVANTES  
5. RECOMENDACIONES
6. CONCLUSIONES
7. REFERENCIAS NORMATIVAS`;

    const userPromptMsg = `${modulePrompt}

Formulario: ${formTitle || module}
Residente: ${residentName}
Fecha: ${today}
Responsable: ${staffName}

DATOS DEL FORMULARIO:
${formData ? JSON.stringify(formData, null, 2) : "Sin datos adicionales proporcionados."}

Genera el informe profesional completo.`;

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
      if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de solicitudes alcanzado." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const report = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ report }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-module-report error:", e);
    return new Response(JSON.stringify({ error: "Error interno. Intente de nuevo." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
