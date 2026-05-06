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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ===== AUTH CHECK =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
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

    // Verify user has a staff role (coordinador or super_admin)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userRoles } = await serviceClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!userRoles || userRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Acceso restringido al personal autorizado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // ===== END AUTH CHECK =====

    const body = await req.json();
    const { content, courseId } = body;

    // ===== INPUT VALIDATION =====
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "El contenido es requerido." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (content.length > 20000) {
      return new Response(JSON.stringify({ error: "El contenido excede el límite de 20.000 caracteres." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // ===== END INPUT VALIDATION =====
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Eres un experto en educación y evaluación. Genera exámenes de opción múltiple profesionales en español." },
          { role: "user", content: `Genera un examen de 10 preguntas de opción múltiple sobre el siguiente contenido. Cada pregunta debe tener 4 opciones, indicar cuál es la correcta (índice 0-3) y una breve explicación. Devuelve SOLO un JSON array con este formato exacto: [{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]\n\nContenido:\n${content}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_quiz",
            description: "Genera un examen de opción múltiple",
            parameters: {
              type: "object",
              properties: {
                quiz: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correct: { type: "integer" },
                      explanation: { type: "string" },
                    },
                    required: ["question", "options", "correct", "explanation"],
                  },
                },
              },
              required: ["quiz"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_quiz" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de solicitudes alcanzado. Intente en unos minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes para generar el quiz." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 401) return new Response(JSON.stringify({ error: "Error de autenticación con el servicio de IA." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 400) return new Response(JSON.stringify({ error: "Datos inválidos enviados al servicio de IA." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: `Error del servicio de IA (${response.status}): ${errorText}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    let quiz: any[] = [];

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      quiz = args.quiz || [];
    } else {
      const fallbackContent = aiData.choices?.[0]?.message?.content || "";
      const match = fallbackContent.match(/\[[\s\S]*\]/);
      if (match) quiz = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify({ quiz }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-quiz-generator error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor. Intente de nuevo." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
