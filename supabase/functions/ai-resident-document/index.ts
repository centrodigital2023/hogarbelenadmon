import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
// El modelo más preciso primero; si no responde, el rápido
const MODELS = ["google/gemini-2.5-pro", "google/gemini-2.5-flash"];
const MAX_IMAGES = 4;
const MAX_TEXT = 60_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM_PROMPT = `Eres un auxiliar clínico-administrativo experto de un hogar geriátrico en Colombia (Hogar Belén).
Lees documentos de residentes (cédulas, carnés o certificados de EPS, historias clínicas, epicrisis, fórmulas médicas,
laboratorios, carnés de vacunación, contratos, informes de psicología, nutrición o valoraciones geriátricas) y extraes
SOLO información que aparece en el documento. Nunca inventes ni supongas datos. Si un dato no aparece, omítelo.
Respondes ÚNICAMENTE con JSON válido, sin markdown.`;

const OUTPUT_SPEC = `Devuelve un JSON con esta forma (omite las claves sin información; "confidence" entre 0 y 1;
"evidence" es la frase textual corta del documento donde aparece el dato):
{
  "document_kind": "cedula|carne_eps|historia_clinica|epicrisis|formula_medica|laboratorios|vacunacion|contrato|reglamento|valoracion_geriatrica|psicologia|nutricion|otro",
  "document_title": "título corto en español",
  "document_date": "YYYY-MM-DD",
  "name_on_document": "nombre completo del paciente tal como aparece",
  "summary": "resumen clínico-administrativo de 2 a 4 frases, útil para el equipo de cuidado",
  "alerts": [{"severity": "alta|media|baja", "message": "hallazgo que requiere atención: alergias, riesgo de caída, cambios de medicación, controles pendientes, valores críticos"}],
  "resident": {
    "<campo>": {"value": "...", "confidence": 0.9, "evidence": "..."}
    // campos posibles: full_name, document_id (solo dígitos), birth_date (YYYY-MM-DD), birth_place, gender (M|F), eps,
    // blood_type (ej. O+), allergies (lista separada por comas, o "Niega alergias conocidas" si el documento lo dice),
    // special_diet (dieta y consistencia indicadas), spiritual_preference, treating_doctor_name, treating_doctor_phone,
    // emergency_contact_1_name, emergency_contact_1_phone, emergency_contact_1_relation, emergency_contact_2_name,
    // emergency_contact_2_phone, emergency_contact_2_relation, responsible_family_name, responsible_family_document,
    // responsible_family_phone
  },
  "life_history": {
    "<campo>": {"value": "...", "confidence": 0.8, "evidence": "..."}
    // campos posibles: preferred_name, occupation, marital_status, children_info, favorite_food, favorite_music,
    // hobbies, morning_or_night, spiritual_beliefs, most_important_person, dislikes, dreams
  },
  "diagnoses": ["diagnóstico activo con código CIE-10 si aparece"],
  "medications": [{"medication_name": "", "concentration": "", "dose": "", "route": "Oral|Subcutánea|...", "schedule": "frecuencia u horario", "prescription_date": "YYYY-MM-DD", "confidence": 0.9, "evidence": ""}],
  "appointments": [{"appointment_date": "YYYY-MM-DD", "appointment_time": "HH:MM", "specialty": "", "location": "", "notes": "", "confidence": 0.9, "evidence": ""}],
  "scales": [{"test_key": "barthel|lawton|pfeiffer|yesavage|tinetti|mna|fried|gijon|braden|mmse|charlson|zarit", "score": 0, "assessment_date": "YYYY-MM-DD", "confidence": 0.9, "evidence": ""}],
  "hospitalization": {"hospital_admission_date": "YYYY-MM-DD", "hospital_discharge_date": "YYYY-MM-DD", "diagnosis": "", "new_instructions": "", "followup_date": "YYYY-MM-DD", "confidence": 0.9, "evidence": ""},
  "wellbeing": {"reason": "", "evolution": "", "recommendations": "", "confidence": 0.8, "evidence": ""},
  "hygiene_needs": ["necesidades de higiene o cuidado de piel: pañal, incontinencia, baño asistido, cuidado de úlceras..."],
  "safety": {"fall_risk": true, "notes": ["riesgos: caídas, deambulación errática, disfagia, anticoagulación, oxígeno..."], "falls": [{"date": "YYYY-MM-DD", "description": "", "evidence": ""}]}
}
Reglas:
- Fechas colombianas DD/MM/AAAA → YYYY-MM-DD.
- "scales" solo si el documento reporta un puntaje numérico explícito de esa escala.
- "appointments" solo citas o controles con fecha concreta.
- "hospitalization" solo para epicrisis o egresos hospitalarios.
- "wellbeing" solo para informes de psicología, trabajo social o bienestar.
- Los contactos de familiares van como emergency_contact_* y responsible_family_*.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Token inválido" }, 401);

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles || roles.length === 0) return json({ error: "Acceso denegado" }, 403);
    // --- End auth check ---

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { residentName, residentContext, fileName, text, images } = await req.json();
    const cleanText = typeof text === "string" ? text.slice(0, MAX_TEXT) : "";
    const cleanImages = Array.isArray(images)
      ? images.filter((i: unknown) => typeof i === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(i)).slice(0, MAX_IMAGES)
      : [];
    if (cleanText.trim().length < 20 && cleanImages.length === 0) {
      return json({ error: "El documento no tiene texto legible ni imágenes." }, 400);
    }

    const userContent: unknown[] = [{
      type: "text",
      text: `Residente al que se adjunta el documento: ${residentName || "No especificado"}
Datos ya registrados (para no repetir y detectar diferencias): ${JSON.stringify(residentContext ?? {}).slice(0, 4000)}
Archivo: ${fileName || "sin nombre"}

${OUTPUT_SPEC}

${cleanText ? `TEXTO DEL DOCUMENTO:\n"""\n${cleanText}\n"""` : "El documento viene como imagen(es) adjunta(s). Léelas con cuidado (OCR), incluida escritura a mano legible."}`,
    }, ...cleanImages.map((url: string) => ({ type: "image_url", image_url: { url } }))];

    let lastStatus = 500;
    let lastError = "";
    for (const model of MODELS) {
      const response = await fetch(LOVABLE_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userContent }],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        lastStatus = response.status;
        lastError = await response.text();
        console.error("AI API error:", model, response.status, lastError);
        if (response.status === 402) return json({ error: "Créditos de IA insuficientes. Recargue créditos para analizar documentos." }, 402);
        continue; // 429 / 5xx: se intenta con el siguiente modelo
      }

      const data = await response.json();
      const content = String(data.choices?.[0]?.message?.content ?? "")
        .replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      try {
        const parsed = JSON.parse(content.slice(start, end + 1));
        return json({ success: true, model, data: parsed });
      } catch {
        lastError = "Respuesta no válida de la IA";
        console.error("Invalid JSON from", model, content.slice(0, 500));
      }
    }

    if (lastStatus === 429) return json({ error: "Límite de solicitudes de IA alcanzado. Intente en unos minutos." }, 429);
    return json({ error: `No se pudo analizar el documento (${lastError.slice(0, 120)})` }, 502);
  } catch (error) {
    console.error("ai-resident-document error:", error);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
