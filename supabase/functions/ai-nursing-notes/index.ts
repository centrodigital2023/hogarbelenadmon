import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { residentId, dateFrom, dateTo, shift, isConsolidated } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather data
    let logsQuery = supabase.from("daily_logs").select("*, residents(full_name)")
      .gte("log_date", dateFrom).lte("log_date", dateTo);
    if (!isConsolidated && residentId) logsQuery = logsQuery.eq("resident_id", residentId);
    if (shift && shift !== "todos") logsQuery = logsQuery.eq("shift", shift);
    const { data: logs } = await logsQuery.order("log_date");

    // Get vital signs if available
    let vitalsQuery = supabase.from("vital_signs").select("*, residents(full_name)")
      .gte("record_date", dateFrom).lte("record_date", dateTo);
    if (!isConsolidated && residentId) vitalsQuery = vitalsQuery.eq("resident_id", residentId);
    const { data: vitals } = await vitalsQuery;

    // Get incidents
    let incQuery = supabase.from("incidents").select("*, residents(full_name)")
      .gte("incident_datetime", `${dateFrom}T00:00:00`).lte("incident_datetime", `${dateTo}T23:59:59`);
    if (!isConsolidated && residentId) incQuery = incQuery.eq("resident_id", residentId);
    const { data: incidents } = await incQuery;

    if ((!logs || logs.length === 0) && (!vitals || vitals.length === 0)) {
      return new Response(JSON.stringify({ note: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get previous notes to avoid repetition
    let prevQuery = supabase.from("nursing_notes").select("note").order("created_at", { ascending: false }).limit(3);
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

    const systemPrompt = `Eres una enfermera jefe experimentada del Hogar Belén, un centro geriátrico en Buesaco, Colombia. Redactas notas de evolución de enfermería profesionales, cálidas pero técnicas. Usa vocabulario clínico apropiado. La nota debe ser diferente a las anteriores. No inventes información. Incluye: valoración del estado general, hallazgos relevantes, intervenciones realizadas y plan. Escribe en primera persona profesional. Máximo 400 palabras.`;

    const userPrompt = `Genera una nota de enfermería para el período ${dateFrom} al ${dateTo}, turno ${shift}.

DATOS DE BITÁCORA:
${logsText || "Sin datos de bitácora"}

SIGNOS VITALES:
${vitalsText || "Sin signos vitales registrados"}

INCIDENTES:
${incText || "Sin incidentes"}

NOTAS ANTERIORES (evitar repetir estilo):
${prevText || "Sin notas previas"}

${isConsolidated ? "NOTA: Esta es una nota consolidada de TODOS los residentes del turno." : ""}`;

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
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
