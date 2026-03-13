import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

// crypto is available in Node.js environment
import crypto from 'crypto';

export async function POST(request: Request) {
    // Determine which key to use
    // Using service role key allows bypassing RLS policies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Create a new client instance for this request
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Define strict type for AgentData to avoid 'any'
    type AgentData = {
        id: string;
        user_id: string;
        pushover_user_1_name: string | null;
        pushover_user_1_key: string | null;
        pushover_user_1_token: string | null;
        pushover_user_1_active: boolean | null;
        pushover_user_1_template: string | null;
        pushover_user_1_title: string | null;
        pushover_user_1_notification_filter: 'ALL' | 'POTENTIAL_ONLY' | 'NO_POTENTIAL_ONLY' | null;
        pushover_user_1_profile_id: string | null;
        pushover_user_2_name: string | null;
        pushover_user_2_key: string | null;
        pushover_user_2_token: string | null;
        pushover_user_2_active: boolean | null;
        pushover_user_2_template: string | null;
        pushover_user_2_title: string | null;
        pushover_user_2_notification_filter: 'ALL' | 'POTENTIAL_ONLY' | 'NO_POTENTIAL_ONLY' | null;
        pushover_user_2_profile_id: string | null;
        pushover_user_3_name: string | null;
        pushover_user_3_key: string | null;
        pushover_user_3_token: string | null;
        pushover_user_3_active: boolean | null;
        pushover_user_3_template: string | null;
        pushover_user_3_title: string | null;
        pushover_user_3_notification_filter: 'ALL' | 'POTENTIAL_ONLY' | 'NO_POTENTIAL_ONLY' | null;
        pushover_user_3_profile_id: string | null;
        pushover_template: string | null;
        pushover_title: string | null;
        pushover_notification_filter: 'ALL' | 'POTENTIAL_ONLY' | 'NO_POTENTIAL_ONLY' | null;
        pushover_reply_message: string | null;
        make_webhook_url: string | null;
        token_multiplier: number | null;
        status: string | null;
    };

    try {
        const bodyText = await request.text();
        const payload = JSON.parse(bodyText);



        // --- SECURITY: Verify ElevenLabs Signature ---
        const signature = request.headers.get('elevenlabs-signature');
        const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
        const allowDebugFallback = process.env.ELEVENLABS_DEBUG_FALLBACK === 'true';

        if (secret && signature) {
            // Log signature format to understand ElevenLabs' format
            console.log(`ElevenLabs Signature received: ${signature.substring(0, 80)}...`);
            const digest = crypto.createHmac('sha256', secret).update(bodyText).digest('hex');
            if (signature === digest) {
                console.log('✅ ElevenLabs Signature Verified (direct HMAC)');
            } else {
                // ElevenLabs may use t=timestamp,v0=hash format - try parsing
                const parts = signature.split(',').reduce((acc: Record<string, string>, part: string) => {
                    const [k, v] = part.split('=', 2);
                    if (k && v) acc[k.trim()] = v.trim();
                    return acc;
                }, {} as Record<string, string>);

                if (parts['t'] && (parts['v0'] || parts['v1'])) {
                    const timestamp = parts['t'];
                    const sigHash = parts['v0'] || parts['v1'];
                    const signedPayload = `${timestamp}.${bodyText}`;
                    const expectedDigest = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
                    if (sigHash === expectedDigest) {
                        console.log('✅ ElevenLabs Signature Verified (timestamp+payload)');
                    } else {
                        console.warn('⚠️ ElevenLabs Signature mismatch - allowing request (logging only)');
                    }
                } else {
                    console.warn('⚠️ Unknown signature format - allowing request (logging only)');
                }
            }
        } else if (secret && !signature) {
            console.warn('⚠️ No signature header received from ElevenLabs');
        } else {
            console.warn('⚠️ ELEVENLABS_WEBHOOK_SECRET not set');
        }

        console.log('Received ElevenLabs Webhook Type:', payload.type);

        // --- ENHANCED EXTRACTION (Support for new nested format) ---
        // ElevenLabs Unified Payload: data { agent_id, conversation_id, analysis, ... }
        const webData = payload.data || {};
        const conversationId = webData.conversation_id || payload.conversation_id;
        const elAgentId = webData.agent_id || payload.agent_id;
        const transcript = webData.transcript || payload.transcript || [];
        const analysis = webData.analysis || payload.analysis || {};
        const dataCollection = analysis.data_collection_results || {};
        // ------------------------------------------------------------

        // --- DEBUG: LOG KEY FIELDS ---
        console.log(`Debug Mapping - AgentID: ${elAgentId}, ConvID: ${conversationId}`);
        // -----------------------------

        // 1. Find the local agent ID and notification settings
        const { data: agentData, error: agentError } = await supabase
            .from('agentes')
            .select(`
                id,
                user_id,
                pushover_user_1_name, pushover_user_1_key, pushover_user_1_token, pushover_user_1_active, pushover_user_1_template, pushover_user_1_title, pushover_user_1_notification_filter, pushover_user_1_profile_id,
                pushover_user_2_name, pushover_user_2_key, pushover_user_2_token, pushover_user_2_active, pushover_user_2_template, pushover_user_2_title, pushover_user_2_notification_filter, pushover_user_2_profile_id,
                pushover_user_3_name, pushover_user_3_key, pushover_user_3_token, pushover_user_3_active, pushover_user_3_template, pushover_user_3_title, pushover_user_3_notification_filter, pushover_user_3_profile_id,
                pushover_template, pushover_title, pushover_notification_filter, pushover_reply_message, make_webhook_url, token_multiplier, status
            `)
            .eq('eleven_labs_agent_id', elAgentId)
            .single();

        let finalAgent: AgentData | null = agentData;
        let summaryPrefix = '';

        if (agentError || !finalAgent) {
            console.error('Agent not found for ElevenLabs ID:', elAgentId, agentError);

            // --- DEBUG FALLBACK ---
            if (!allowDebugFallback) {
                return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
            }
            console.log('Using debug fallback for ID:', elAgentId);
            const { data: debugAgent, error: debugError } = await supabase
                .from('agentes')
                .select('id, user_id')
                .eq('nombre', 'DEBUG_Fallback')
                .single();

            if (debugAgent && !debugError) {
                console.log('✅ Fallback successful to DEBUG_Fallback.');
                finalAgent = {
                    id: debugAgent.id,
                    user_id: debugAgent.user_id,
                    pushover_user_1_name: 'Asesor 1',
                    pushover_user_1_key: null,
                    pushover_user_1_token: null,
                    pushover_user_1_active: true,
                    pushover_user_1_template: null,
                    pushover_user_1_title: null,
                    pushover_user_1_notification_filter: 'ALL',
                    pushover_user_2_name: null,
                    pushover_user_2_key: null,
                    pushover_user_2_token: null,
                    pushover_user_2_active: true,
                    pushover_user_2_template: null,
                    pushover_user_2_title: null,
                    pushover_user_2_notification_filter: 'ALL',
                    pushover_user_3_name: null,
                    pushover_user_3_key: null,
                    pushover_user_3_token: null,
                    pushover_user_3_active: true,
                    pushover_user_3_template: null,
                    pushover_user_3_title: null,
                    pushover_user_3_notification_filter: 'ALL',
                    pushover_template: null,
                    pushover_title: null,
                    pushover_notification_filter: null,
                    pushover_reply_message: null,
                    make_webhook_url: null,
                    token_multiplier: 1.0,
                    status: 'active'
                };
                summaryPrefix = `[MISSING AGENT ID: ${elAgentId}] `;
            } else {
                return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
            }
        }

        // Ensure finalAgent is not null for TypeScript
        if (!finalAgent) {
            return NextResponse.json({ error: 'Agent not found (Final check)' }, { status: 404 });
        }

        // 2. Extract specific data points
        let nombreVal = dataCollection.nombre?.value ||
            dataCollection.Nombre?.value ||
            dataCollection.nombre_cliente?.value ||
            'SIN_NOMBRE';

        // Helper to format name to Title Case (e.g. "LUISIN" -> "Luisin", "juan perez" -> "Juan Perez")
        if (nombreVal && nombreVal !== 'Desconocido' && nombreVal !== 'SIN_NOMBRE') {
            nombreVal = nombreVal.toLowerCase().replace(/(?:^|\s)\S/g, function (a: string) { return a.toUpperCase(); });
        }

        const phoneVal =
            // 1. WhatsApp ID (Verified from payload: metadata.whatsapp.whatsapp_user_id)
            payload.metadata?.whatsapp?.whatsapp_user_id ||
            webData.metadata?.whatsapp?.whatsapp_user_id ||
            payload.whatsapp?.whatsapp_user_id ||
            webData.whatsapp?.whatsapp_user_id ||

            // 2. System Caller ID (Verified from payload: dynamic_variables.system__caller_id - DOUBLE UNDERSCORE)
            payload.conversation_initiation_client_data?.dynamic_variables?.system__caller_id ||
            webData.conversation_initiation_client_data?.dynamic_variables?.system__caller_id ||

            // 3. Additional System Paths
            payload.conversation_initiation_client_data?.dynamic_variables?.system_caller_id || // Keep single underscore as fallback
            webData.conversation_initiation_client_data?.dynamic_variables?.system_caller_id ||

            // 4. Standard Metadata
            payload.metadata?.caller_id ||
            webData.metadata?.caller_id ||
            payload.metadata?.phone_number ||
            webData.metadata?.phone_number ||

            // 5. Fallbacks
            payload.conversation_initiation_metadata?.caller_id ||
            webData.conversation_initiation_metadata?.caller_id ||
            payload.conversation_initiation_client_data?.phone_number ||
            webData.conversation_initiation_client_data?.phone_number ||
            payload.caller_id ||
            payload.phone_number ||
            webData.caller_id ||
            webData.phone_number ||
            dataCollection.telefono?.value ||
            dataCollection.teléfono?.value ||
            dataCollection.phone?.value ||
            'No proveído';

        // Prioritize data_collection (which is often in the prompt's language, e.g., Spanish)
        let rawSummary = 'Sin resumen';

        // 1. Standard key defined by user
        if (dataCollection.resumen_conversacion?.value) {
            rawSummary = dataCollection.resumen_conversacion.value;
        }
        // 2. Dynamic search for other Spanish keys
        else {
            const summaryKeys = Object.keys(dataCollection);
            const foundSummaryKey = summaryKeys.find(key =>
                key.toLowerCase().includes('resumen') ||
                key.toLowerCase().includes('summary') ||
                key.toLowerCase().includes('conclusion') ||
                key.toLowerCase().includes('analisis')
            );
            if (foundSummaryKey && dataCollection[foundSummaryKey]?.value) {
                rawSummary = dataCollection[foundSummaryKey].value;
            } else {
                // 3. Fallback to ElevenLabs generated summary (often English)
                rawSummary = analysis.transcript_summary || 'Sin resumen';
            }
        }

        const resumenVal = summaryPrefix + rawSummary;

        const calificacionVal = dataCollection.calificacion?.value ||
            dataCollection.Calificación?.value ||
            dataCollection.calificación?.value ||
            'PENDIENTE';

        // Determine lead status: only POTENCIAL if explicitly qualified as such
        let status: 'POTENCIAL' | 'NO_POTENCIAL' = 'NO_POTENCIAL';
        const calUpper = calificacionVal.toUpperCase();
        if (calUpper === 'PENDIENTE') {
            // No qualification from ElevenLabs — check summary for interest signals
            const sumLower = (rawSummary || '').toLowerCase();
            const hasPositiveSignal = sumLower.includes('aceptó ser contactado') ||
                sumLower.includes('aceptó') ||
                sumLower.includes('proporcionó su nombre') ||
                sumLower.includes('dejó sus datos') ||
                sumLower.includes('interesado en') ||
                sumLower.includes('quiere inscribirse') ||
                sumLower.includes('quiere contratar');
            if (hasPositiveSignal) {
                status = 'POTENCIAL';
            }
        } else if (
            calUpper.includes('POTENCIAL') &&
            !calUpper.includes('NO POTENCIAL') &&
            !calUpper.includes('NO_POTENCIAL')
        ) {
            status = 'POTENCIAL';
        } else if (calUpper.includes('SI') || calUpper.includes('SÍ') || calUpper.includes('INTERESADO')) {
            status = 'POTENCIAL';
        }
        console.log(`Lead classification: calificacion="${calificacionVal}" -> status=${status}`);

        // 3. Bridge to Make.com
        if (finalAgent.make_webhook_url) {
            fetch(finalAgent.make_webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(err => console.error('Make.com error:', err));
        }

        // 4. Randomized Pushover Notification & Advisor Selection
        let selectedAdvisorName: string | null = null;
        let selectedProfileId: string | null = null;

        if (finalAgent.status === 'active' && (finalAgent.pushover_user_1_key || finalAgent.pushover_user_2_key || finalAgent.pushover_user_3_key)) {
            // Collect eligible users based on their INDEPENDENT filters
            const eligibleUsers = [
                {
                    name: finalAgent.pushover_user_1_name,
                    key: finalAgent.pushover_user_1_key,
                    token: finalAgent.pushover_user_1_token,
                    active: finalAgent.pushover_user_1_active ?? true,
                    template: finalAgent.pushover_user_1_template,
                    title: finalAgent.pushover_user_1_title,
                    filter: finalAgent.pushover_user_1_notification_filter || finalAgent.pushover_notification_filter || 'ALL',
                    profile_id: finalAgent.pushover_user_1_profile_id
                },
                {
                    name: finalAgent.pushover_user_2_name,
                    key: finalAgent.pushover_user_2_key,
                    token: finalAgent.pushover_user_2_token,
                    active: finalAgent.pushover_user_2_active ?? true,
                    template: finalAgent.pushover_user_2_template,
                    title: finalAgent.pushover_user_2_title,
                    filter: finalAgent.pushover_user_2_notification_filter || finalAgent.pushover_notification_filter || 'ALL',
                    profile_id: finalAgent.pushover_user_2_profile_id
                },
                {
                    name: finalAgent.pushover_user_3_name,
                    key: finalAgent.pushover_user_3_key,
                    token: finalAgent.pushover_user_3_token,
                    active: finalAgent.pushover_user_3_active ?? true,
                    template: finalAgent.pushover_user_3_template,
                    title: finalAgent.pushover_user_3_title,
                    filter: finalAgent.pushover_user_3_notification_filter || finalAgent.pushover_notification_filter || 'ALL',
                    profile_id: finalAgent.pushover_user_3_profile_id
                }
            ].filter(u => {
                const hasCreds = u.key && u.key.trim() !== '' && u.token && u.token.trim() !== '';
                if (!hasCreds || !u.active) return false;

                // Check independent filter
                if (u.filter === 'ALL') return true;
                if (u.filter === 'POTENTIAL_ONLY' && status === 'POTENCIAL') return true;
                if (u.filter === 'NO_POTENTIAL_ONLY' && status === 'NO_POTENCIAL') return true;

                return false;
            });

            console.log(`Eligible Advisors Count: ${eligibleUsers.length} for status: ${status}`);

            if (eligibleUsers.length > 0) {
                // Select random advisor from eligible ones
                const luckyUser = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
                selectedAdvisorName = luckyUser.name || 'Asesor Asignado';
                selectedProfileId = luckyUser.profile_id || null;

                // Use advisor specific title if available, fallback to agent title, fallback to default
                const messageTitle = luckyUser.title || finalAgent.pushover_title || 'Nuevo Lead Detectado';

                // Construct WhatsApp Link
                const cleanPhone = phoneVal.replace(/\D/g, '');
                const waBase = `https://wa.me/${cleanPhone}`;
                // Priority: Advisor Template -> Global Reply Message -> Global Legacy Template -> Default
                const rawReply = luckyUser.template || finalAgent.pushover_reply_message || finalAgent.pushover_template || '';
                const personalizedReply = rawReply.replace(/{nombre}/g, nombreVal);

                const waLink = personalizedReply.trim()
                    ? `${waBase}?text=${encodeURIComponent(personalizedReply)}`
                    : waBase;

                // Construct the actual Push Notification Body
                const message = `Nombre: <b>${nombreVal}</b><br>Teléfono: <b>${phoneVal}</b><br>Resumen: <b>${resumenVal || 'Sin resumen'}</b><br><br>👉 Responder:<br><a href="${waLink}">${waLink}</a>`;

                console.log(`Sending Pushover to ${luckyUser.name} (${luckyUser.key?.substring(0, 5)}...) - Title: ${messageTitle}`);

                try {
                    const pushoverRes = await fetch('https://api.pushover.net/1/messages.json', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: luckyUser.token,
                            user: luckyUser.key,
                            message: message,
                            title: messageTitle,
                            html: 1
                        })
                    });

                    const pushoverData = await pushoverRes.json();
                    if (!pushoverRes.ok) {
                        console.error('❌ Pushover API Error:', pushoverData);
                    } else {
                        console.log('✅ Pushover Sent Successfully:', pushoverData);
                    }
                } catch (pushoverErr) {
                    console.error('❌ Pushover Fetch Error:', pushoverErr);
                    Sentry.captureException(pushoverErr);
                }
            } else {
                console.log('⏭️ No eligible advisors for this notification (Filters or Active status).');
            }
        } else if (finalAgent.status !== 'active') {
            console.log(`⏭️ Agent ${finalAgent.id} is INACTIVE. Skipping advisor assignment and Pushover notifications.`);
        }

        // 5. Extract Token Usage -> NOW CREDITS (Cost)
        // User wants "Credits" based on Cost ($22/100k).
        // Logic: 
        // 1. Try to find explicit cost in USD from transcript (most accurate).
        // 2. Fallback to metadata.cost (checking if it's USD or Credits).

        const COST_PER_CREDIT = 0.00022;
        let totalCostUSD = 0;

        // A. Calculate from Transcript (Preferred for accuracy)
        if (Array.isArray(transcript)) {
            transcript.forEach((turn: { llm_usage?: { model_usage?: Record<string, { input?: { price: number }; output_total?: { price: number }; input_cache_read?: { price: number }; input_cache_write?: { price: number } }> } }) => {
                const llm = turn.llm_usage || {};
                const mu = llm.model_usage;
                if (mu) {
                    Object.values(mu).forEach((modelStats) => {
                        totalCostUSD += (modelStats.input?.price || 0) +
                            (modelStats.output_total?.price || 0) +
                            (modelStats.input_cache_read?.price || 0) +
                            (modelStats.input_cache_write?.price || 0);
                    });
                }
            });
        }

        let tokensRaw = 0;

        if (totalCostUSD > 0) {
            tokensRaw = totalCostUSD / COST_PER_CREDIT;
            console.log(`💰 Usage Tracking (Transcript): $${totalCostUSD.toFixed(6)} USD -> ${tokensRaw.toFixed(2)} Credits`);
        } else {
            // B. Fallback to metadata.cost
            const metaCost = payload.metadata?.cost || webData.metadata?.cost;
            if (metaCost !== undefined && metaCost !== null) {
                // Heuristic: If cost is very low (< 0.5), it's likely USD. If high, likely Credits.
                if (metaCost < 0.5) {
                    tokensRaw = metaCost / COST_PER_CREDIT;
                    console.log(`💰 Usage Tracking (Metadata USD): $${metaCost} -> ${tokensRaw.toFixed(2)} Credits`);
                } else {
                    tokensRaw = metaCost;
                    console.log(`💰 Usage Tracking (Metadata Credits): ${tokensRaw} Credits`);
                }
            } else {
                console.log(`⚠️ Usage Tracking: No cost data found. Defaulting to 0.`);
                tokensRaw = 0;
            }
        }


        // 6. Calculate Billed Amount
        // If we are tracking Credits (Cost), the multiplier might be 1.0 (pass-through) or a markup.
        const multiplier = finalAgent.token_multiplier || 1.0;
        const tokensBilled = Math.ceil(tokensRaw * multiplier);

        console.log(`💎 usage Tracking - Base: ${tokensRaw}, Multiplier: ${multiplier}, Final Billed: ${tokensBilled}`);

        // 7. Save Lead to Supabase with Token Data
        const { error: insertError } = await supabase
            .from('leads')
            .insert({
                agent_id: finalAgent.id,
                user_id: finalAgent.user_id,
                eleven_labs_conversation_id: conversationId,
                nombre: nombreVal,
                status: status,
                summary: resumenVal,
                transcript: transcript,
                phone: phoneVal,
                tokens_raw: Math.round(tokensRaw),
                tokens_billed: tokensBilled,
                advisor_name: selectedAdvisorName,
                assigned_profile_id: selectedProfileId
            });

        if (insertError) {
            console.error('Error saving lead:', insertError);
            Sentry.captureException(new Error(`Lead insert failed: ${insertError.message}`), {
                extra: { insertError, elAgentId, conversationId, nombreVal, phoneVal }
            });

            await supabase
                .from('agentes')
                .update({
                    prompt: `ERROR LOG [${new Date().toISOString()}]: ${JSON.stringify(insertError)}. Payload Agent ID: ${elAgentId}. Conv ID: ${conversationId}`
                })
                .eq('nombre', 'DEBUG_Fallback');

            return NextResponse.json({ error: 'Error saving lead', details: insertError }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Webhook Error:', error);
        Sentry.captureException(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
