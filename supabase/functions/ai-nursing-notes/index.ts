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
    const { residentId, dateFrom, dateTo, shift, isConsolidated, liveEntry, responsibleName, responsibleRole } = body;
    // Determinar tipo de nota: individual | grupal | consolidado
    const isRangeReport = dateFrom !== dateTo;
    const noteType: "individual" | "grupal" | "consolidado" =
      isConsolidated && !residentId ? "grupal"
      : residentId && isRangeReport ? "consolidado"
      : "individual";

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

    if ((!logs || logs.length === 0) && (!vitals || vitals.length === 0) && !liveEntry) {
      return new Response(JSON.stringify({ note: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Medicamentos administrados (contexto)
    let medQuery = serviceClient.from("medication_admin")
      .select("admin_datetime, was_administered, skip_reason, medications(medication_name, dose), residents(full_name)")
      .gte("admin_datetime", `${dateFrom}T00:00:00`).lte("admin_datetime", `${dateTo}T23:59:59`);
    if (residentId && noteType !== "grupal") medQuery = medQuery.eq("resident_id", residentId);
    const { data: medications } = await medQuery;

    // Citas médicas (contexto)
    let apptQuery = serviceClient.from("medical_appointments")
      .select("appointment_date, specialty, location, was_attended, residents(full_name)")
      .gte("appointment_date", dateFrom).lte("appointment_date", dateTo);
    if (residentId && noteType !== "grupal") apptQuery = apptQuery.eq("resident_id", residentId);
    const { data: appointments } = await apptQuery;

    let prevQuery = serviceClient.from("nursing_notes").select("note").order("created_at", { ascending: false }).limit(3);
    if (!isConsolidated && residentId) prevQuery = prevQuery.eq("resident_id", residentId);
    const { data: prevNotes } = await prevQuery;

    // Lookup resident name if needed (case where only liveEntry is provided)
    let residentNameFromDb: string | null = null;
    if (residentId && noteType !== "grupal") {
      const { data: r } = await serviceClient.from("residents").select("full_name").eq("id", residentId).maybeSingle();
      residentNameFromDb = r?.full_name || null;
    }

    const logsText = (logs || []).map((l: any) =>
      `${l.log_date} ${l.shift}: ${l.residents?.full_name || 'Residente'} - Nutrición:${l.nutrition_pct}%, Hidratación:${l.hydration_glasses} vasos, Ánimo:${l.mood}, Eliminación:${l.elimination}, Obs:${l.observations || 'N/A'}`
    ).join("\n");

    const vitalsText = (vitals || []).map((v: any) =>
      `${v.record_date}: ${v.residents?.full_name || 'Residente'} - PA:${v.blood_pressure}, FC:${v.heart_rate}, T:${v.temperature}°C, SpO2:${v.spo2}%, Peso:${v.weight}kg, Glicemia:${v.glucose}`
    ).join("\n");

    // Datos en pantalla (sin guardar) — fuente principal cuando se genera desde el formulario
    const liveEntryText = liveEntry ? `${dateFrom} ${shift}: ${residentNameFromDb || 'Residente'}
- Signos vitales: T.A. ${liveEntry.blood_pressure || 'N/R'}, SpO2 ${liveEntry.spo2 ?? 'N/R'}%, Temp ${liveEntry.temperature ?? 'N/R'}°C, Glucemia ${liveEntry.glucose ?? 'N/R'}, FC ${liveEntry.heart_rate ?? 'N/R'}, Peso ${liveEntry.weight ?? 'N/R'} kg
- Notas SV: ${liveEntry.vital_notes || 'Sin notas'}
- Bienestar: Nutrición ${liveEntry.nutrition_pct ?? 0}%, Hidratación ${liveEntry.hydration_glasses ?? 0} vasos, Eliminación: ${liveEntry.elimination || 'N/R'}
- Estado de ánimo: ${liveEntry.mood || 'N/R'}
- Novedades / observaciones: ${liveEntry.observations || 'Sin novedades'}` : "";

    const incText = (incidents || []).map((i: any) =>
      `${i.incident_datetime}: ${i.residents?.full_name} - Tipo:${i.incident_type}, Desc:${i.description}`
    ).join("\n");

    const medText = (medications || []).slice(0, 50).map((m: any) =>
      `${m.admin_datetime}: ${m.residents?.full_name || ''} - ${m.medications?.medication_name || ''} (${m.medications?.dose || ''}) ${m.was_administered ? '✓ Administrado' : `✗ Omitido${m.skip_reason ? ': '+m.skip_reason : ''}`}`
    ).join("\n");

    const apptText = (appointments || []).map((a: any) =>
      `${a.appointment_date}: ${a.residents?.full_name || ''} - ${a.specialty || ''} en ${a.location || 'N/A'} ${a.was_attended ? '(Asistió)' : '(Pendiente)'}`
    ).join("\n");

    const prevText = (prevNotes || []).map((n: any) => n.note).join("\n---\n");

    const residentName = noteType === "grupal"
      ? "TODOS los residentes del turno"
      : (logs?.[0]?.residents?.full_name || vitals?.[0]?.residents?.full_name || residentNameFromDb || "el/la residente");

    const responsibleLine = responsibleName
      ? `${responsibleName}${responsibleRole ? ' — ' + responsibleRole : ''}`
      : '[responsable del turno]';

    // ===== PROMPTS MAESTROS (según Manual de Implementación Técnica - Belén Gestión) =====
    const baseSystem = `Actúas como enfermera clínica del **Hogar Belén Buesaco S.A.S.** (Buesaco, Nariño), con más de 15 años de experiencia en cuidado del adulto mayor. Lema institucional: *"Juntos, cuidamos mejor"*.

**Estilo obligatorio:** texto fluido, respetuoso, cálido y profesional ("hipnótico" — que transmita calma y confianza). Resalta en **negrita** los hitos clínicos relevantes y en *cursiva* las expresiones de confort y bienestar. Usa Markdown.

**Datos clínicos disponibles** (úsalos con valores EXACTOS, NO inventes):
- **Signos Vitales:** T.A., SpO2, Temp, Glucemia, FC, Peso, Notas SV
- **Bienestar:** Nutrición (%), Hidratación (vasos), Eliminación (Continente/Incontinente/Estreñimiento/Normal/Diarrea)
- **Estado de Ánimo:** 😊 Alegre / 😌 Tranquilo / 😰 Ansioso / 😢 Triste / 😤 Agitado / 😶 Apático
- **Novedades:** medicamentos administrados, terapias, actividades, citas médicas e incidentes (HB-F20)

**Cierre obligatorio** (al final del texto, EXACTAMENTE este formato):
> Nota generada por IA — Hogar Belén Buesaco S.A.S.
> Registrado por: ${responsibleLine} | Fecha: ${dateFrom} | Hora: (usa la hora actual del servidor en formato HH:MM)`;

    let promptByType = "";
    if (noteType === "individual") {
      promptByType = `**TIPO: NOTA INDIVIDUAL**

Redacta una nota para **${residentName}**. Basado en sus signos vitales y su ánimo, narra una jornada de bienestar. Menciona la nutrición al porcentaje EXACTO indicado y la administración de medicamentos con un tono dulce y profesional. Resalta en **negrita** los hitos clínicos y en *cursiva* el confort y la calidez del cuidado.

Estructura sugerida (adáptala con naturalidad, máximo 450 palabras):
1. *Apertura cálida* con valoración general
2. **Signos vitales** del turno (cita los valores exactos)
3. **Nutrición e hidratación** (porcentaje exacto)
4. Patrón de **eliminación** y **estado de ánimo**
5. **Medicamentos**, terapias y actividades realizadas
6. Citas médicas o incidentes (si aplica)
7. *Recomendación* breve para el siguiente turno`;
    } else if (noteType === "grupal") {
      promptByType = `**TIPO: NOTA GRUPAL DE TURNO**

Sintetiza la actividad de la unidad durante el turno **${shift}** del **${dateFrom}**. Describe cómo el grupo de residentes mantuvo la **estabilidad clínica** y participó en las actividades del día. Usa un lenguaje que transmita *paz* y **seguridad clínica**, evitando enumerar residente por residente; en su lugar resalta tendencias colectivas (nutrición promedio, ánimo predominante, eventos relevantes). Máximo 500 palabras.`;
    } else {
      promptByType = `**TIPO: NOTA CONSOLIDADA / EVOLUCIÓN**

Agrupa las novedades de **${residentName}** desde el **${dateFrom}** hasta el **${dateTo}**. Crea un relato coherente de la **evolución del residente**, resaltando su *recuperación*, sus avances y la **constancia del cuidado** brindado por el equipo. Integra signos vitales (tendencias), adherencia a medicamentos, citas médicas asistidas e incidentes. Cierra con una *proyección esperanzadora*. Máximo 600 palabras.`;
    }

    const systemPrompt = `${baseSystem}\n\n${promptByType}`;

    const userPrompt = `Datos del período ${dateFrom} → ${dateTo} | Turno: ${shift || 'N/A'} | Tipo: ${noteType.toUpperCase()}
Paciente: ${residentName}
Responsable del turno: ${responsibleLine}

${liveEntryText ? `DATOS ACTUALES DEL TURNO (fuente principal — diligenciados ahora mismo en HB-F4):\n${liveEntryText}\n` : ''}
DATOS DE BITÁCORA HISTÓRICOS (HB-F4):
${logsText || "Sin datos de bitácora guardados"}

SIGNOS VITALES HISTÓRICOS:
${vitalsText || "Sin signos vitales registrados"}

INCIDENTES (HB-F20):
${incText || "Sin incidentes"}

ADMINISTRACIÓN DE MEDICAMENTOS:
${medText || "Sin administración registrada"}

CITAS MÉDICAS:
${apptText || "Sin citas en el período"}

NOTAS ANTERIORES (no copiar estilo, generar texto 100% original):
${prevText || "Sin notas previas"}

Redacta la nota cumpliendo estrictamente el tipo (${noteType.toUpperCase()}), el formato Markdown con **negritas** y *cursivas*, citando los valores EXACTOS de signos vitales y el porcentaje EXACTO de nutrición, y el cierre obligatorio con "Registrado por: ${responsibleLine}".`;

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
