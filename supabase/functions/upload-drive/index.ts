import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOLDER_ID = "1JqJIAUFcx9uAuKI1Kz_SPlfqf83NGOeQ";

// Max file size: 20 MB in base64 (~27 MB base64 string)
const MAX_BASE64_LENGTH = 27 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 255;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get service account credentials
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      return new Response(JSON.stringify({ error: "Google Drive no está configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const credentials = JSON.parse(serviceAccountJson);

    // Parse body
    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Uint8Array;
    let fileName: string;
    let mimeType: string;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body.fileBase64 || !body.fileName || !body.mimeType) {
        return new Response(JSON.stringify({ error: "Faltan campos requeridos: fileBase64, fileName, mimeType" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // --- Input validation ---
      if (typeof body.fileBase64 !== "string" || body.fileBase64.length > MAX_BASE64_LENGTH) {
        return new Response(JSON.stringify({ error: "El archivo excede el tamaño máximo permitido (20 MB)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!ALLOWED_MIME_TYPES.includes(body.mimeType)) {
        return new Response(JSON.stringify({ error: `Tipo de archivo no permitido. Tipos aceptados: ${ALLOWED_MIME_TYPES.join(", ")}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Sanitize filename
      fileName = String(body.fileName)
        .replace(/[^\w.\-() ]/g, "_")
        .slice(0, MAX_FILENAME_LENGTH);
      mimeType = body.mimeType;

      // Decode base64
      const binaryString = atob(body.fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileBuffer = bytes;
    } else {
      return new Response(JSON.stringify({ error: "Tipo de contenido no soportado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get access token via JWT
    const accessToken = await getGoogleAccessToken(credentials);

    // Upload to Google Drive using multipart upload
    const metadata = JSON.stringify({
      name: fileName,
      parents: [FOLDER_ID],
    });

    const boundary = "----LovableBoundary" + Date.now();
    const bodyParts = [
      `--${boundary}\r\n`,
      `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
      metadata,
      `\r\n--${boundary}\r\n`,
      `Content-Type: ${mimeType}\r\n\r\n`,
    ];

    const encoder = new TextEncoder();
    const prefix = encoder.encode(bodyParts.join(""));
    const suffix = encoder.encode(`\r\n--${boundary}--`);
    const fullBody = new Uint8Array(prefix.length + fileBuffer.length + suffix.length);
    fullBody.set(prefix, 0);
    fullBody.set(fileBuffer, prefix.length);
    fullBody.set(suffix, prefix.length + fileBuffer.length);

    const driveResp = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: fullBody,
      }
    );

    if (!driveResp.ok) {
      const errText = await driveResp.text();
      console.error("Drive upload failed:", errText);
      return new Response(JSON.stringify({ error: "Error al subir el archivo a Google Drive. Intente de nuevo." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const driveData = await driveResp.json();

    return new Response(JSON.stringify({ success: true, file: driveData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("upload-drive error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Generate Google OAuth2 access token from service account JWT
async function getGoogleAccessToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signInput = `${encodedHeader}.${encodedPayload}`;

  const pemContent = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const keyBuffer = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signInput)
  );

  const encodedSignature = base64urlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  const jwt = `${signInput}.${encodedSignature}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    console.error("Google token error:", errText);
    throw new Error("Failed to authenticate with Google");
  }

  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
