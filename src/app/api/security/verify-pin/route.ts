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

    if (!pin) {
        return NextResponse.json({ error: 'PIN requerido.' }, { status: 400 });
    }

    const settings = await getOrCreateSecuritySettings(context.profile.id);

    if (!settings.lock_pin_hash) {
        return NextResponse.json({ error: 'No se ha configurado un PIN de bloqueo.' }, { status: 400 });
    }

    if (hashValue(pin) !== settings.lock_pin_hash) {
        return NextResponse.json({ error: 'PIN incorrecto.', valid: false }, { status: 401 });
    }

    return NextResponse.json({ success: true, valid: true });
}
