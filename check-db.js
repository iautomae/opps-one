const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // Check tenant is_active status
    const { data, error } = await supabase.from('tenants').select('nombre, slug, is_active');
    console.log('Tenants:', JSON.stringify(data, null, 2));

    // Check if the user profile exists for iautomae@gmail.com
    const { data: profiles, error: pErr } = await supabase.from('profiles')
        .select('id, email, role, tenant_id')
        .eq('email', 'iautomae@gmail.com');
    console.log('\nProfiles:', JSON.stringify(profiles, null, 2));
}
check();
