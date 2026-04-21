const crypto = require('crypto');

// --- CONFIGURA AQUÍ TUS DATOS ---
const SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;

if (!SECRET) {
    console.error('Error: La variable de entorno ELEVENLABS_WEBHOOK_SECRET no está definida. Por favor, inyéctala usando Doppler.');
    process.exit(1);
}

const WEBHOOK_URL = 'https://iautomae-platform.vercel.app/api/webhooks/elevenlabs';
// OJO: Asegúrate de que esta URL es la correcta de tu proyecto (la que copiaste antes)

const payload = {
    conversation_id: 'test_conv_123',
    agent_id: 'test_agent_id', // Si pones uno real, intentará guardar el lead.
    transcript: [
        { role: 'user', message: 'Hola, quiero información' },
        { role: 'agent', message: 'Claro, ¿cómo te llamas?' }
    ],
    analysis: {
        data_collection_results: {
            nombre: { value: 'Tester' },
            telefono: { value: '555-0000' }
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
