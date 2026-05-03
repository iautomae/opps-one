import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, requireAuth } from '@/lib/server-auth';
import { getOrCreateSecuritySettings, hashValue } from '@/lib/security';

const supabaseAdmin = getSupabaseAdminClient();

export async function POST(request: Request) {
    const { context, response } = await requireAuth(request);
    if (response || !context) {
        return response!;
    }

    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string' || pin.length < 4) {
        return NextResponse.json({ error: 'El PIN debe tener al menos 4 dígitos.' }, { status: 400 });
    }

    const settings = await getOrCreateSecuritySettings(context.profile.id);
    
    // Si ya tiene PIN y tiene 2FA activo, podríamos pedir 2FA para cambiarlo, 
    // pero por ahora lo haremos directo si ya está logueado.
    
    const { error } = await supabaseAdmin
        .from('profile_security_settings')
        .update({
            lock_pin_hash: hashValue(pin),
            updated_at: new Date().toISOString()
        })
        .eq('profile_id', context.profile.id);

    if (error) {
        return NextResponse.json({ error: 'No se pudo actualizar el PIN.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
