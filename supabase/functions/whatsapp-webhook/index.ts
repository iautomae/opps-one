// import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "https://graph.facebook.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Obtenemos los secretos desde el entorno
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || ""; // Tu key de AI Studio

if (!VERIFY_TOKEN) {
    throw new Error("WHATSAPP_VERIFY_TOKEN is missing in environment");
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    // 1. VERIFICACIÓN DEL WEBHOOK DE META (GET)
    if (req.method === "GET") {
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("Meta Webhook verificado.");
            return new Response(challenge, { status: 200 });
        } else {
            console.warn("Fallo de verificación de token.");
            return new Response("Forbidden", { status: 403 });
        }
    }

    // 2. RECEPCIÓN DE MENSAJES DE WHATSAPP (POST)
    if (req.method === "POST") {
        try {
            const body = await req.json();

            // Ignorar actualizaciones de estado (entregado, leído)
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const value = body.entry[0].changes[0].value;
                const msg = value.messages[0];

                // Número que envió el mensaje (el postulante)
                const fromNumber = msg.from;
                // ID del teléfono en nuestro sistema de Meta (330015... que te dio Meta)
                const phoneNumberId = value.metadata.phone_number_id;

                if (msg.type === "text") {
                    const textMessage = msg.text.body;
                    console.log(`Mensaje recibido de ${fromNumber} en bot ${phoneNumberId}: ${textMessage}`);

                    // AQUI VA LA LOGICA:
                    // 1. Conectar a Supabase
                    // 2. Buscar `numeros_whatsapp` por phoneNumberId para saber de qué empresa es
                    // 3. Buscar `postulantes` por fromNumber
                    // 4. Buscar `conversaciones` activa
                    // 5. Enviar a Gemini API
                    // 6. Responder usando la WhatsApp Cloud API y el access_token del número

                    await processMessageAndRespond(fromNumber, phoneNumberId, textMessage);
                }
            }

            // Siempre responder 200 OK inmediatamente para que Meta no reintente
            return new Response("OK", { status: 200, headers: CORS_HEADERS });
        } catch (error) {
            console.error("Error al procesar el mensaje POST:", error);
            return new Response("Internal Server Error", { status: 500, headers: CORS_HEADERS });
        }
    }

    return new Response("Method Not Allowed", { status: 405 });
});

// Función parcial para el procesamiento asíncrono y llamada a Gemini
async function processMessageAndRespond(from: string, phoneId: string, message: string) {
    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Obtener la info del número y su token
        const { data: numeroData, error: numeroError } = await supabase
            .from("numeros_whatsapp")
            .select("id, empresa_id, access_token")
            .eq("phone_number_id", phoneId)
            .single();

        if (numeroError || !numeroData) {
            console.error("Número no configurado en la BD:", numeroError);
            return;
        }

        // 2. Buscar asistente vinculado al número
        const { data: asistenteData } = await supabase
            .from("asistentes")
            .select("id, prompt_sistema, modo, modelo")
            .eq("numero_whatsapp_id", numeroData.id)
            .single();

        const systemPrompt = asistenteData?.prompt_sistema || "Eres un asistente de reclutamiento útil y amable. Responde de forma concisa.";
        const asistenteId = asistenteData?.id || null;

        // 3. Buscar o crear postulante por wa_id
        let { data: postulante } = await supabase
            .from("postulantes")
            .select("id")
            .eq("wa_id", from)
            .maybeSingle();

        if (!postulante) {
            const { data: nuevoPostulante, error: postError } = await supabase
                .from("postulantes")
                .insert({ wa_id: from, nombre: `WhatsApp ${from}`, empresa_id: numeroData.empresa_id })
                .select("id")
                .single();
            if (postError) { console.error("Error creando postulante:", postError); return; }
            postulante = nuevoPostulante;
        }

        // 4. Buscar o crear conversación activa
        let { data: conversacion } = await supabase
            .from("conversaciones")
            .select("id")
            .eq("postulante_id", postulante!.id)
            .eq("numero_whatsapp_id", numeroData.id)
            .eq("estado", "activa")
            .maybeSingle();

        if (!conversacion) {
            const { data: nuevaConv, error: convError } = await supabase
                .from("conversaciones")
                .insert({
                    postulante_id: postulante!.id,
                    numero_whatsapp_id: numeroData.id,
                    asistente_id: asistenteId,
                    empresa_id: numeroData.empresa_id,
                    estado: "activa"
                })
                .select("id")
                .single();
            if (convError) { console.error("Error creando conversación:", convError); return; }
            conversacion = nuevaConv;
        }

        // 5. Guardar mensaje del postulante
        await supabase.from("mensajes").insert({
            conversacion_id: conversacion!.id,
            rol: "postulante",
            contenido: message
        });

        // 6. Cargar historial de conversación para enviar contexto a Gemini
        const { data: historial } = await supabase
            .from("mensajes")
            .select("rol, contenido")
            .eq("conversacion_id", conversacion!.id)
            .order("created_at", { ascending: true })
            .limit(20); // Últimos 20 mensajes como contexto

        const geminiContents = [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Entendido. Seguiré esas instrucciones como asistente de reclutamiento." }] },
        ];

        for (const h of (historial || [])) {
            geminiContents.push({
                role: h.rol === "postulante" ? "user" : "model",
                parts: [{ text: h.contenido }]
            });
        }

        // 7. Llamar a Gemini
        const resGemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: geminiContents,
                generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
            })
        });

        if (!resGemini.ok) {
            console.error("Error de Gemini:", await resGemini.text());
            return;
        }

        const geminiData = await resGemini.json();
        const aiResponseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, tuve un problema interno.";

        // 8. Guardar respuesta del asistente en BD
        await supabase.from("mensajes").insert({
            conversacion_id: conversacion!.id,
            rol: "asistente",
            contenido: aiResponseText
        });

        // Actualizar timestamp de conversación
        await supabase.from("conversaciones")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversacion!.id);

        // 9. Enviar mensaje de vuelta usando WhatsApp Cloud API
        const accessToken = numeroData.access_token;

        const waRes = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: from,
                type: "text",
                text: { preview_url: false, body: aiResponseText }
            })
        });

        if (!waRes.ok) {
            console.error("Error enviando respuesta WA:", await waRes.text());
        } else {
            console.log(`Respuesta enviada a ${from}`);
        }

    } catch (err) {
        console.error("Error procesando mensaje:", err);
    }
}
