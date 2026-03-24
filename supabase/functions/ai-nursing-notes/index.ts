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

    // ===== AUTH CHECK: Verify caller is authenticated staff =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is staff (has at least one role)
    const serviceClient = createClient(supabaseUrl, supabaseKey);
    const { data: userRoles } = await serviceClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!userRoles || userRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Acceso restringido al personal" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // ===== END AUTH CHECK =====

    const body = await req.json();
    const { residentId, dateFrom, dateTo, shift, isConsolidated } = body;

    // ===== INPUT VALIDATION =====
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFrom || !dateTo || !dateRegex.test(dateFrom) || !dateRegex.test(dateTo)) {
      return new Response(JSON.stringify({ error: "Fechas inválidas. Use formato YYYY-MM-DD." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const validShifts = ["mañana", "tarde", "noche", "todos"];
    if (shift && !validShifts.includes(shift)) {
      return new Response(JSON.stringify({ error: "Turno inválido." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (residentId && !uuidRegex.test(residentId)) {
      return new Response(JSON.stringify({ error: "ID de residente inválido." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // ===== END INPUT VALIDATION =====

    // Gather data using service client
    let logsQuery = serviceClient.from("daily_logs").select("*, residents(full_name)")
      .gte("log_date", dateFrom).lte("log_date", dateTo);
    if (!isConsolidated && residentId) logsQuery = logsQuery.eq("resident_id", residentId);
    if (shift && shift !== "todos") logsQuery = logsQuery.eq("shift", shift);
    const { data: logs } = await logsQuery.order("log_date");

    let vitalsQuery = serviceClient.from("vital_signs").select("*, residents(full_name)")
      .gte("record_date", dateFrom).lte("record_date", dateTo);
    if (!isConsolidated && residentId) vitalsQuery = vitalsQuery.eq("resident_id", residentId);
    const { data: vitals } = await vitalsQuery;

    let incQuery = serviceClient.from("incidents").select("*, residents(full_name)")
      .gte("incident_datetime", `${dateFrom}T00:00:00`).lte("incident_datetime", `${dateTo}T23:59:59`);
    if (!isConsolidated && residentId) incQuery = incQuery.eq("resident_id", residentId);
    const { data: incidents } = await incQuery;

    if ((!logs || logs.length === 0) && (!vitals || vitals.length === 0)) {
      return new Response(JSON.stringify({ note: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let prevQuery = serviceClient.from("nursing_notes").select("note").order("created_at", { ascending: false }).limit(3);
    if (!isConsolidated && residentId) prevQuery = prevQuery.eq("resident_id", residentId);
    const { data: prevNotes } = await prevQuery;

    const logsText = (logs || []).map((l: any) =>
      `${l.log_date} ${l.shift}: ${l.residents?.full_name || 'Residente'} - Nutrición:${l.nutrition_pct}%, Hidratación:${l.hydration_glasses} vasos, Ánimo:${l.mood}, Eliminación:${l.elimination}, Obs:${l.observations || 'N/A'}`
    ).join("\n");

    const vitalsText = (vitals || []).map((v: any) =>
      `${v.record_date}: ${v.residents?.full_name || 'Residente'} - PA:${v.blood_pressure}, FC:${v.heart_rate}, T:${v.temperature}°C, SpO2:${v.spo2}%, Peso:${v.weight}kg, Glicemia:${v.glucose}`
    ).join("\n");

    const incText = (incidents || []).map((i: any) =>
      `${i.incident_datetime}: ${i.residents?.full_name} - Tipo:${i.incident_type}, Desc:${i.description}`
    ).join("\n");

    const prevText = (prevNotes || []).map((n: any) => n.note).join("\n---\n");

    const residentName = isConsolidated ? "TODOS los residentes" : (logs?.[0]?.residents?.full_name || vitals?.[0]?.residents?.full_name || "el/la residente");

    const systemPrompt = `Eres una enfermera clínica con más de 15 años de experiencia en cuidado de pacientes adultos mayores en el Hogar Belén, centro geriátrico en Buesaco, Colombia. Redactas notas de enfermería profesionales, objetivas, claras y detalladas, siguiendo estándares de documentación clínica.

La bitácora se llama **HB-F4: Bitácora Diaria - Registro por turnos de indicadores de salud y bienestar**.

Debes generar **solo la Nota de Enfermería** (nunca el formato completo de la bitácora), pero la nota debe estar lista para copiarse directamente en la sección "Nota de Enfermería" de la bitácora.

**Reglas estrictas para cada generación:**

- La nota debe ser **100% original y completamente diferente** a cualquier nota anterior (cambia estructura, orden de ideas, vocabulario y enfoque).
- Usa lenguaje profesional de enfermería, preciso y fluido.
- Incluye siempre los indicadores proporcionados con los valores EXACTOS de los datos:
  - Nutrición: expresar como porcentaje (0%/25%/50%/75%/100%)
  - Hidratación: número de vasos o descripción (buena/regular/deficiente)
  - Eliminación: Continente / Incontinente / Estreñimiento / Normal / Diarrea
  - Ánimo: 😊 Alegre / 😌 Tranquilo / 😰 Ansioso / 😢 Triste / 😤 Agitado / 😶 Apático
- Describe las novedades del turno de forma realista y coherente basándote en los datos proporcionados.
- Incluye observaciones clínicas relevantes, intervenciones realizadas, respuesta del paciente, signos vitales si están disponibles, y nivel de colaboración.

- Estructura sugerida (pero varíala cada vez):
  1. Valoración general al inicio del turno
  2. Estado nutricional e hidratación
  3. Patrón de eliminación
  4. Estado emocional y ánimo
  5. Novedades relevantes y actividades realizadas
  6. Intervenciones de enfermería y respuesta
  7. Plan o recomendaciones para el siguiente turno

- No inventes información que no esté en los datos proporcionados.
- Escribe en primera persona profesional.
- Máximo 500 palabras.
- Si hay notas anteriores proporcionadas, asegúrate de que tu nota sea completamente diferente en estructura, vocabulario y estilo.

**Formato de salida:**
Comienza directamente con la nota. Al final escribe:

Nota de Enfermería - [Nombre del paciente]
[Fecha y Turno: Mañana (7-12) / Día (7-18) / Noche (18-7)]
Enfermera: Generada por IA - Hogar Belén`;

    const userPrompt = `Genera una nota de enfermería para el período ${dateFrom} al ${dateTo}.

Paciente: ${residentName}
Turno: ${shift}
Fecha: ${dateFrom}

DATOS DE BITÁCORA (HB-F4):
${logsText || "Sin datos de bitácora"}

SIGNOS VITALES:
${vitalsText || "Sin signos vitales registrados"}

INCIDENTES:
${incText || "Sin incidentes"}

NOTAS ANTERIORES (evitar repetir estilo y estructura):
${prevText || "Sin notas previas"}

${isConsolidated ? "NOTA: Esta es una nota consolidada de TODOS los residentes del turno. Genera un informe general que cubra a todos." : ""}

Redacta la nota de forma fresca, profesional y completamente original.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de solicitudes alcanzado. Intente en unos minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const note = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ note }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-nursing-notes error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor. Intente de nuevo." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
