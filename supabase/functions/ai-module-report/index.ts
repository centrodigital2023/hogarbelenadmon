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

// Modules that benefit from cross-resident clinical context
const CLINICAL_MODULES = new Set(["salud", "bienestar", "seguridad", "sistema_salud"]);

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
    const allowedRoles = ["super_admin", "coordinador", "enfermera", "administrativo", "terapeuta", "psicologo"];
    const hasAccess = !!userRoles?.some((r: any) => allowedRoles.includes(r.role));
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Acceso restringido a personal autorizado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { module, residentId, formData, formTitle, dateFrom, dateTo, reportType: reportTypeRaw } = body;

    if (!module || typeof module !== "string") {
      return new Response(JSON.stringify({ error: "Módulo requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Determine report type: individual | grupal | consolidado
    let reportType: "individual" | "grupal" | "consolidado" = "individual";
    if (reportTypeRaw === "grupal" || reportTypeRaw === "consolidado") {
      reportType = reportTypeRaw;
    } else if (!residentId) {
      reportType = "grupal";
    }

    // Get resident info if provided
    let residentName = "Todos los residentes de la unidad";
    if (residentId && reportType === "individual") {
      const { data: resident } = await serviceClient.from("residents").select("full_name, birth_date, status").eq("id", residentId).single();
      if (resident) residentName = resident.full_name;
    }

    // Get profile name of the user generating the report
    const { data: profile } = await serviceClient.from("profiles").select("full_name").eq("user_id", user.id).single();
    const generatorName = profile?.full_name || user.email || "Personal";

    // Responsible person from form (if provided), else the generator
    const responsibleName = (formData?.responsible_name as string) || (formData?.responsibleName as string) || generatorName;
    const responsibleRole = (formData?.responsible_role as string) || (formData?.responsibleRole as string) || "";

    // ─── Cross-data enrichment for clinical modules ───
    let crossContext = "";
    if (CLINICAL_MODULES.has(module)) {
      const today = new Date().toISOString().split("T")[0];
      const from = dateFrom || today;
      const to = dateTo || today;

      // Medications active for resident(s)
      let medQ = serviceClient.from("medications")
        .select("medication_name, dose, route, schedule, residents(full_name)")
        .eq("is_active", true).limit(30);
      if (residentId && reportType === "individual") medQ = medQ.eq("resident_id", residentId);
      const { data: meds } = await medQ;

      // Medication admin in date range
      let admQ = serviceClient.from("medication_admin")
        .select("admin_datetime, was_administered, dose_given, skip_reason, medications(medication_name), residents(full_name)")
        .gte("admin_datetime", `${from}T00:00:00`).lte("admin_datetime", `${to}T23:59:59`).limit(30);
      if (residentId && reportType === "individual") admQ = admQ.eq("resident_id", residentId);
      const { data: adms } = await admQ;

      // Medical appointments
      let aptQ = serviceClient.from("medical_appointments")
        .select("appointment_date, specialty, location, was_attended, notes, residents(full_name)")
        .gte("appointment_date", from).lte("appointment_date", to).limit(20);
      if (residentId && reportType === "individual") aptQ = aptQ.eq("resident_id", residentId);
      const { data: apts } = await aptQ;

      // Incidents HB-F20
      let incQ = serviceClient.from("incidents")
        .select("incident_datetime, incident_type, description, first_aid, transferred_to_er, residents(full_name)")
        .gte("incident_datetime", `${from}T00:00:00`).lte("incident_datetime", `${to}T23:59:59`).limit(20);
      if (residentId && reportType === "individual") incQ = incQ.eq("resident_id", residentId);
      const { data: incs } = await incQ;

      const fmt = (rows: any[] | null, mapper: (r: any) => string) =>
        rows && rows.length ? rows.map(mapper).join("\n") : "Sin registros en el período.";

      crossContext = `
─── CONTEXTO CLÍNICO COMPLEMENTARIO (${from} a ${to}) ───

MEDICAMENTOS ACTIVOS:
${fmt(meds, (m: any) => `- ${m.residents?.full_name || "Residente"}: ${m.medication_name} ${m.dose || ""} ${m.route || ""} (${m.schedule || "según protocolo"})`)}

ADMINISTRACIÓN DE MEDICAMENTOS:
${fmt(adms, (a: any) => `- ${a.admin_datetime?.substring(0, 16)}: ${a.residents?.full_name || "Residente"} - ${a.medications?.medication_name || "med"} ${a.was_administered ? `✓ ${a.dose_given || ""}` : `✗ Omitido (${a.skip_reason || "n/a"})`}`)}

CITAS MÉDICAS:
${fmt(apts, (a: any) => `- ${a.appointment_date} ${a.residents?.full_name || ""}: ${a.specialty || "consulta"} en ${a.location || "n/a"} ${a.was_attended === false ? "(NO asistida)" : a.was_attended ? "(asistida)" : ""}`)}

INCIDENTES Y CAÍDAS (HB-F20):
${fmt(incs, (i: any) => `- ${i.incident_datetime?.substring(0, 16)} ${i.residents?.full_name || ""}: ${i.incident_type} - ${i.description || ""} ${i.first_aid ? "[Primeros auxilios]" : ""} ${i.transferred_to_er ? "[Trasladado a urgencias]" : ""}`)}
`;
    }

    const modulePrompt = MODULE_PROMPTS[module] || "Genera un informe profesional completo del módulo solicitado.";

    const today = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const nowTime = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

    // ─── PROMPTS MAESTROS por tipo de informe ───
    const TYPE_PROMPTS: Record<string, string> = {
      individual: `Redacta una nota individual para **${residentName}**. Basándote en sus signos vitales, bienestar (nutrición, hidratación, eliminación) y estado de ánimo, narra una jornada de bienestar con tono profesional, dulce y respetuoso. Menciona la administración de medicamentos, citas médicas e incidentes (HB-F20) si los hay. Resalta en **negrita** los hitos clínicos relevantes y en *cursiva* las observaciones de confort y calidez humana.`,
      grupal: `Sintetiza la actividad de la unidad para este turno/jornada. Describe cómo el grupo de residentes mantuvo la estabilidad, participó en actividades y recibió cuidados consistentes. Resalta en **negrita** los indicadores grupales clave y en *cursiva* el clima emocional. Usa un lenguaje que transmita paz, seguridad clínica y trabajo en equipo.`,
      consolidado: `Agrupa las novedades del período ${dateFrom || ""} al ${dateTo || ""}. Crea un relato coherente de la evolución, resaltando recuperación, constancia del cuidado brindado, tendencias en signos vitales, adherencia a medicamentos y eventos relevantes. Usa **negrita** para hitos y *cursiva* para matices humanos.`,
    };

    const systemPrompt = `Eres una enfermera profesional clínico-administrativa con más de 15 años de experiencia en centros geriátricos en Colombia. Trabajas en el **Hogar Belén Buesaco S.A.S.**, centro de protección al adulto mayor en Buesaco, Nariño.

Generas notas e informes profesionales listos para auditoría según normativas colombianas (Resolución 3280/2018, Ley 1276/2009, Política Colombiana de Envejecimiento y Vejez).

**REGLAS DE REDACCIÓN ESTRICTAS:**

- Lenguaje profesional, fluido, hipnótico, respetuoso y cálido — nunca robótico.
- Usa **negritas** (markdown \`**texto**\`) para hitos clínicos, valores fuera de rango, decisiones importantes.
- Usa *cursivas* (markdown \`*texto*\`) para observaciones de confort, calidez, matices emocionales.
- Cada nota debe ser **100% original y completamente diferente** a notas anteriores (varía estructura, vocabulario, orden).
- Incluye SIEMPRE los datos exactos proporcionados — NO inventes información.
- Indicadores con valores literales:
  - Nutrición: porcentaje (0%/25%/50%/75%/100%)
  - Hidratación: vasos o descripción (buena/regular/deficiente)
  - Eliminación: Continente / Incontinente / Estreñimiento / Normal / Diarrea
  - Ánimo: 😊 Alegre / 😌 Tranquilo / 😰 Ansioso / 😢 Triste / 😤 Agitado / 😶 Apático
- Si los signos vitales están fuera de rango, márcalos en **negrita** y comenta brevemente.
- Menciona explícitamente medicamentos administrados, citas médicas e incidentes HB-F20 si están en el contexto.
- Máximo 600 palabras.
- Español colombiano formal pero humano.

**ESTRUCTURA DE SALIDA OBLIGATORIA:**

# [TÍTULO DEL INFORME]

## Estado General y Signos Vitales
[Narrativa con datos exactos, hitos en **negrita**]

## Nutrición y Bienestar
[Cumplimiento nutricional, hidratación, ánimo]

## Administración y Terapias
[Medicamentos, terapias, actividades]

## Citas Médicas e Incidentes
[Citas del período e incidentes HB-F20 — si no hay, indicarlo]

## Recomendaciones para el Siguiente Turno
[Plan claro y accionable]

---

**Firmado por:** ${responsibleName}${responsibleRole ? ` (${responsibleRole})` : ""}
**Fecha:** ${today} | **Hora:** ${nowTime}`;

    const userPromptMsg = `${modulePrompt}

**TIPO DE INFORME:** ${reportType.toUpperCase()}
${TYPE_PROMPTS[reportType]}

**Formulario:** ${formTitle || module}
**Residente(s):** ${residentName}
**Fecha de generación:** ${today} ${nowTime}
**Profesional responsable:** ${responsibleName}${responsibleRole ? ` — ${responsibleRole}` : ""}

═══════════════════════════════════════════
DATOS DEL FORMULARIO ACTUAL:
═══════════════════════════════════════════
${formData ? JSON.stringify(formData, null, 2) : "Sin datos adicionales proporcionados."}
${crossContext}

Genera el informe profesional completo siguiendo la estructura obligatoria con markdown (negritas, cursivas, encabezados ##).`;

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
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de solicitudes alcanzado. Intente en unos minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes para generar el reporte del módulo." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 401) return new Response(JSON.stringify({ error: "Error de autenticación con el servicio de IA." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 400) return new Response(JSON.stringify({ error: "Datos inválidos enviados al servicio de IA." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: `Error del servicio de IA (${response.status}): ${errorText}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    const report = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ report, responsibleName, generatedAt: `${today} ${nowTime}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-module-report error:", e);
    return new Response(JSON.stringify({ error: "Error interno. Intente de nuevo." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
