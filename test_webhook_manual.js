const crypto = require('crypto');

const SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;
const WEBHOOK_URL = process.env.ELEVENLABS_WEBHOOK_URL || 'https://opps.one/api/webhooks/elevenlabs';
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'agent_8001kmdjn3t0ezft8hqwq1k0bv78';

if (!SECRET) {
    console.error('Error: La variable de entorno ELEVENLABS_WEBHOOK_SECRET no está definida. Por favor, inyéctala usando Doppler.');
    process.exit(1);
}

const payload = {
    type: 'post_call_transcription',
    event_timestamp: Math.floor(Date.now() / 1000),
    data: {
        conversation_id: 'test_conv_' + Date.now(),
        agent_id: AGENT_ID,
        transcript: [
            { role: 'user', message: 'Hola Omar, ¿cómo estás?' },
            { role: 'agent', message: 'Hola, soy Omar. ¿En qué puedo ayudarte?' }
        ],
        analysis: {
            data_collection_results: {
                nombre: { value: 'Test User' },
                resumen_conversacion: { value: 'El usuario saludó a Omar para probar el webhook.' },
                calificacion: { value: 'POTENCIAL' }
            }
        }
    }
};

const bodyText = JSON.stringify(payload);

// ElevenLabs signs: "t=timestamp,v0=hmac_sha256(timestamp.body)"
const timestamp = Math.floor(Date.now() / 1000).toString();
const signedPayload = `${timestamp}.${bodyText}`;
const digest = crypto.createHmac('sha256', SECRET).update(signedPayload).digest('hex');
const signature = `t=${timestamp},v0=${digest}`;

console.log('Enviando petición a:', WEBHOOK_URL);
console.log('Firma generada: [SET]');

fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'elevenlabs-signature': signature
    },
    body: bodyText
})
    .then(async res => {
        console.log('Status:', res.status, res.statusText);
        const data = await res.json(); // Intentar leer JSON de respuesta
        console.log('Respuesta:', data);
    })
    .catch(err => console.error('Error de conexión:', err));
