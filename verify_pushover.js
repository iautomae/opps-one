const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Las variables de entorno de Supabase no están definidas. Por favor, inyéctalas usando Doppler.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Querying Supabase...');
    const { data, error } = await supabase
        .from('agentes')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Agents found:', data.length);
        console.log(JSON.stringify(data.map(a => ({
            nombre: a.nombre,
            pushover_user_key: a.pushover_user_key,
            pushover_api_token: a.pushover_api_token,
            make_webhook_url: a.make_webhook_url
        })), null, 2));
    }
}

check();
