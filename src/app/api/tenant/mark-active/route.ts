import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server-auth';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        // Verify the user is authenticated
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabaseAuth = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { slug, tenant_id } = await request.json();
        if (!slug && !tenant_id) {
            return NextResponse.json({ error: 'slug o tenant_id requerido' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdminClient();
        let query = supabaseAdmin
            .from('tenants')
            .update({ branding_complete: true });

        if (slug) {
            query = query.eq('slug', slug);
        } else {
            query = query.eq('id', tenant_id);
        }

        const { error } = await query;

        if (error) {
            console.error('Error marking tenant active:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Unexpected error in mark-active:', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
