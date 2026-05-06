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

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey);
    const { data: userRoles } = await serviceClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!userRoles || userRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Acceso restringido al personal" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { dateFrom, dateTo, reportType } = body;

    // Input validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFrom || !dateTo || !dateRegex.test(dateFrom) || !dateRegex.test(dateTo)) {
      return new Response(JSON.stringify({ error: "Fechas inválidas." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes = ["semanal", "mensual", "personalizado"];
    if (reportType && !validTypes.includes(reportType)) {
      return new Response(JSON.stringify({ error: "Tipo de informe inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather comprehensive data
    const { data: residents } = await serviceClient.from("residents").select("id, full_name, status, eps, blood_type, allergies, special_diet")
      .in("status", ["prueba", "permanente"]).order("full_name");

    const { data: logs } = await serviceClient.from("daily_logs").select("*, residents(full_name)")
      .gte("log_date", dateFrom).lte("log_date", dateTo).order("log_date");

    const { data: vitals } = await serviceClient.from("vital_signs").select("*, residents(full_name)")
      .gte("record_date", dateFrom).lte("record_date", dateTo).order("record_date");

    const { data: incidents } = await serviceClient.from("incidents").select("*, residents(full_name)")
      .gte("incident_datetime", `${dateFrom}T00:00:00`).lte("incident_datetime", `${dateTo}T23:59:59`);

    const { data: medications } = await serviceClient.from("medication_admin").select("*, medications(medication_name), residents(full_name)")
      .gte("admin_datetime", `${dateFrom}T00:00:00`).lte("admin_datetime", `${dateTo}T23:59:59`);

    const { data: appointments } = await serviceClient.from("medical_appointments").select("*, residents(full_name)")
      .gte("appointment_date", dateFrom).lte("appointment_date", dateTo);

    const { data: nursingNotes } = await serviceClient.from("nursing_notes").select("note, note_date, shift, is_consolidated")
      .gte("note_date", dateFrom).lte("note_date", dateTo).order("note_date");

    if ((!logs || logs.length === 0) && (!vitals || vitals.length === 0) && (!nursingNotes || nursingNotes.length === 0)) {
      return new Response(JSON.stringify({ report: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build data summaries
    const totalResidents = residents?.length || 0;

    const logsText = (logs || []).map((l: any) =>
      `${l.log_date} ${l.shift}: ${l.residents?.full_name} - Nutrición:${l.nutrition_pct}%, Hidratación:${l.hydration_glasses} vasos, Ánimo:${l.mood}, Eliminación:${l.elimination}, Obs:${l.observations || 'N/A'}`
    ).join("\n");

    const vitalsText = (vitals || []).map((v: any) =>
      `${v.record_date}: ${v.residents?.full_name} - PA:${v.blood_pressure}, FC:${v.heart_rate}, T:${v.temperature}°C, SpO2:${v.spo2}%, Peso:${v.weight}kg, Glicemia:${v.glucose}`
    ).join("\n");

    const incText = (incidents || []).map((i: any) =>
      `${i.incident_datetime}: ${i.residents?.full_name} - Tipo:${i.incident_type}, Desc:${i.description}, Primeros auxilios:${i.first_aid ? 'Sí' : 'No'}, Familia notificada:${i.family_notified ? 'Sí' : 'No'}`
    ).join("\n");

    const medText = (medications || []).slice(0, 100).map((m: any) =>
      `${m.admin_datetime}: ${m.residents?.full_name} - ${m.medications?.medication_name}, Administrado:${m.was_administered ? 'Sí' : 'No'}${m.skip_reason ? `, Motivo omisión:${m.skip_reason}` : ''}`
    ).join("\n");

    const apptText = (appointments || []).map((a: any) =>
      `${a.appointment_date}: ${a.residents?.full_name} - ${a.specialty}, ${a.location || 'N/A'}, Asistió:${a.was_attended ? 'Sí' : 'Pendiente'}`
    ).join("\n");

    const notesText = (nursingNotes || []).map((n: any) =>
      `[${n.note_date} ${n.shift}${n.is_consolidated ? ' CONSOLIDADA' : ''}]: ${n.note.substring(0, 200)}...`
    ).join("\n");

    // Stats
    const totalLogs = logs?.length || 0;
    const totalVitals = vitals?.length || 0;
    const totalIncidents = incidents?.length || 0;
    const totalAppointments = appointments?.length || 0;
    const avgNutrition = totalLogs > 0 ? Math.round((logs || []).reduce((s: number, l: any) => s + (l.nutrition_pct || 0), 0) / totalLogs) : 0;

    const systemPrompt = `Eres la Coordinadora de Enfermería del Hogar Belén, centro geriátrico en Buesaco, Colombia, con más de 20 años de experiencia en gestión de enfermería geriátrica. Redactas informes de enfermería institucionales profesionales, completos y ejecutivos.

**Tu tarea:** Generar un INFORME DE ENFERMERÍA completo para el período indicado, basándote EXCLUSIVAMENTE en los datos proporcionados.

**Estructura obligatoria del informe:**

# INFORME DE ENFERMERÍA - HOGAR BELÉN
## Período: [fechas del período]

### 1. RESUMEN EJECUTIVO
Breve resumen de 3-4 líneas con los hallazgos más relevantes del período.

### 2. INDICADORES GENERALES
- Total de residentes activos
- Total de registros de bitácora
- Total de tomas de signos vitales
- Total de incidentes reportados
- Total de citas médicas
- Promedio de nutrición del período

### 3. ESTADO NUTRICIONAL E HIDRATACIÓN
Análisis del estado nutricional de los residentes, tendencias, residentes con baja ingesta, recomendaciones.

### 4. SIGNOS VITALES Y ESTADO DE SALUD
Análisis de signos vitales, alertas de valores fuera de rango, tendencias observadas.

### 5. PATRÓN DE ELIMINACIÓN
Análisis del patrón de eliminación, residentes con alteraciones, intervenciones realizadas.

### 6. ESTADO EMOCIONAL Y BIENESTAR
Análisis del ánimo de los residentes, patrones observados, actividades de apoyo.

### 7. ADMINISTRACIÓN DE MEDICAMENTOS
Cumplimiento de administración, medicamentos omitidos y razones, ajustes necesarios.

### 8. INCIDENTES Y EVENTOS ADVERSOS
Detalle de incidentes ocurridos, análisis de causas, medidas correctivas implementadas.

### 9. CITAS MÉDICAS Y SEGUIMIENTO
Citas realizadas, especialidades consultadas, seguimientos pendientes.

### 10. NOTAS DE ENFERMERÍA DEL PERÍODO
Resumen de las notas de enfermería más relevantes.

### 11. CONCLUSIONES Y RECOMENDACIONES
Conclusiones generales y recomendaciones para el siguiente período.

### 12. PLAN DE ACCIÓN
Acciones prioritarias para el próximo período.

---
**Informe elaborado por:** Coordinación de Enfermería - IA Hogar Belén
**Fecha de elaboración:** [fecha actual]

**Reglas:**
- Usa SOLO los datos proporcionados, no inventes información.
- Sé objetiva, profesional y detallada.
- Incluye nombres de residentes cuando sea relevante.
- Si una sección no tiene datos, indícalo: "Sin registros para este período".
- Usa lenguaje técnico de enfermería pero comprensible.
- Máximo 2000 palabras.`;

    const userPrompt = `Genera el informe de enfermería para el período del ${dateFrom} al ${dateTo}.
Tipo de informe: ${reportType || 'personalizado'}

ESTADÍSTICAS GENERALES:
- Residentes activos: ${totalResidents}
- Registros de bitácora: ${totalLogs}
- Tomas de signos vitales: ${totalVitals}
- Incidentes: ${totalIncidents}
- Citas médicas: ${totalAppointments}
- Promedio nutrición: ${avgNutrition}%

DATOS DE BITÁCORA (HB-F4):
${logsText || "Sin registros de bitácora"}

SIGNOS VITALES:
${vitalsText || "Sin signos vitales registrados"}

INCIDENTES:
${incText || "Sin incidentes"}

ADMINISTRACIÓN DE MEDICAMENTOS:
${medText || "Sin registros de medicación"}

CITAS MÉDICAS:
${apptText || "Sin citas médicas"}

NOTAS DE ENFERMERÍA PREVIAS:
${notesText || "Sin notas de enfermería"}

Genera el informe completo, profesional y detallado.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de solicitudes alcanzado. Intente en unos minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes para generar el reporte." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 401) return new Response(JSON.stringify({ error: "Error de autenticación con el servicio de IA." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 400) return new Response(JSON.stringify({ error: "Datos inválidos enviados al servicio de IA." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: `Error del servicio de IA (${response.status}): ${errorText}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    const report = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({
      report,
      stats: { totalResidents, totalLogs, totalVitals, totalIncidents, totalAppointments, avgNutrition },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-nursing-report error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
