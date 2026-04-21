const crypto = require('crypto');

// --- CONFIGURA AQUÍ TUS DATOS ---
const SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;

if (!SECRET) {
    console.error('Error: La variable de entorno ELEVENLABS_WEBHOOK_SECRET no está definida. Por favor, inyéctala usando Doppler.');
    process.exit(1);
}

const WEBHOOK_URL = 'https://opps.one/api/webhooks/elevenlabs';
// OJO: Asegúrate de que esta URL es la correcta de tu proyecto (la que copiaste antes)

const payload = {
    type: 'post_call_transcription',
    data: {
        conversation_id: 'test_conv_' + Date.now(),
        agent_id: 'agent_8001kmdjn3t0ezft8hqwq1k0bv78', // ID de Omar
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

// Calcular la firma HMAC (Igual que hace ElevenLabs)
const hmac = crypto.createHmac('sha256', SECRET);
const signature = hmac.update(bodyText).digest('hex');

console.log('Enviando petición a:', WEBHOOK_URL);
console.log('Firma generada:', signature);

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
