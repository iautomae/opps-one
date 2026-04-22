/**
 * Script: Configure ElevenLabs Post-Call Webhook for agent "Omar"
 * Run with: doppler run --project escolta_doppler --config dev -- node scripts/_el_webhook_setup.mjs
 */

const apiKey = process.env.ELEVEN_LABS_API_KEY;
const AGENT_ID = 'agent_8001kmdjn3t0ezft8hqwq1k0bv78'; // Omar — único agente activo
const WEBHOOK_URL = process.env.ELEVENLABS_WEBHOOK_URL || 'https://opps.one/api/webhooks/elevenlabs';
const WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;

if (!apiKey) { console.error('❌ ELEVEN_LABS_API_KEY missing'); process.exit(1); }
if (!WEBHOOK_SECRET) { console.error('❌ ELEVENLABS_WEBHOOK_SECRET missing'); process.exit(1); }

async function getAgent(agentId) {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        headers: { 'xi-api-key': apiKey }
    });
    if (!res.ok) throw new Error(`GET agent failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function patchAgentWebhook(agentId, agentName) {
    console.log(`\n🔧 Configuring webhook for agent: ${agentName} (${agentId})`);

    // Read current config first
    const current = await getAgent(agentId);
    const currentWebhook = current?.conversation_config?.platform_settings?.post_call_webhook;
    console.log(`   Current webhook URL: ${currentWebhook?.url || '(none)'}`);

    // PATCH with the webhook config
    const body = JSON.stringify({
        conversation_config: {
            platform_settings: {
                post_call_webhook: {
                    url: WEBHOOK_URL,
                    secret: WEBHOOK_SECRET
                }
            }
        }
    });

    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error(`   ❌ PATCH failed (${res.status}): ${errText}`);
        return false;
    }

    // Verify
    const updated = await getAgent(agentId);
    const newWebhook = updated?.conversation_config?.platform_settings?.post_call_webhook;
    const newUrl = newWebhook?.url;
    const hasSecret = !!newWebhook?.secret;

    if (newUrl === WEBHOOK_URL) {
        console.log(`   ✅ Webhook configured successfully!`);
        console.log(`   URL: ${newUrl}`);
        console.log(`   Secret: ${hasSecret ? '[SET]' : '❌ NOT SET'}`);
        return true;
    } else {
        console.error(`   ❌ Webhook URL mismatch after PATCH. Got: "${newUrl}"`);
        return false;
    }
}

async function testWebhookEndpoint() {
    console.log('\n🧪 Testing webhook endpoint reachability...');
    try {
        const res = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        // We expect 401 (unauthorized) now that HMAC is active — that's CORRECT behavior
        if (res.status === 401) {
            console.log(`   ✅ Endpoint reachable. Returns 401 (signature required) — CORRECT!`);
            return true;
        } else if (res.status === 200 || res.status === 404) {
            console.warn(`   ⚠️  Endpoint returned ${res.status}. Expected 401. Check HMAC deployment.`);
            return false;
        } else {
            console.log(`   Status: ${res.status}`);
            return true;
        }
    } catch (e) {
        console.error(`   ❌ Endpoint unreachable: ${e.message}`);
        return false;
    }
}

async function listAgents() {
    const res = await fetch('https://api.elevenlabs.io/v1/convai/agents?page_size=50', {
        headers: { 'xi-api-key': apiKey }
    });
    const data = await res.json();
    console.log('\n📋 All agents in ElevenLabs account:');
    for (const a of data.agents || []) {
        console.log(`   - ${a.name} | ID: ${a.agent_id} | Last 7d calls: ${a.last_7_day_call_count}`);
    }
}

async function main() {
    console.log('=== ElevenLabs Webhook Setup & QA ===\n');
    console.log(`Target URL: ${WEBHOOK_URL}`);
    console.log('Secret: [SET]');

    await listAgents();

    const omarOk = await patchAgentWebhook(AGENT_ID, 'Omar');

    await testWebhookEndpoint();

    console.log('\n=== SUMMARY ===');
    console.log(`Omar webhook: ${omarOk ? '✅ OK' : '❌ FAILED'}`);
    console.log('\nNext step: Deploy the code change to Vercel (git push) to activate HMAC validation.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
