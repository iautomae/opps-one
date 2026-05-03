import { NextResponse } from 'next/server';
import { getProfileById, getSupabaseAdminClient, requireAuth } from '@/lib/server-auth';
import { getOrCreateSecuritySettings, maskEmail } from '@/lib/security';

const supabaseAdmin = getSupabaseAdminClient();

export async function GET(request: Request) {
    const { context, response } = await requireAuth(request);
    if (response || !context) {
        return response!;
    }

    const profileLookup = await getProfileById(context.profile.id);
    const settings = await getOrCreateSecuritySettings(context.profile.id, profileLookup.data?.email || context.profile.email);

    return NextResponse.json({
        settings: {
            twoFactorEmail: settings.two_factor_email,
            twoFactorEnabled: settings.two_factor_enabled,
            allowedCountries: settings.allowed_countries || ['PE'],
            notifyOnSuspicious: settings.notify_on_suspicious,
            alertEmail: settings.alert_email || profileLookup.data?.email || context.profile.email || '',
            lastVerifiedAt: settings.last_verified_at,
            maskedTwoFactorEmail: maskEmail(settings.two_factor_email),
            lockTimeoutMinutes: settings.lock_timeout_minutes,
            hasLockPin: !!settings.lock_pin_hash,
        },
    });
}

export async function POST(request: Request) {
    const { context, response } = await requireAuth(request);
    if (response || !context) {
        return response!;
    }

    const body = await request.json();
    const notifyOnSuspicious = typeof body.notifyOnSuspicious === 'boolean' ? body.notifyOnSuspicious : true;
    const alertEmail = typeof body.alertEmail === 'string' ? body.alertEmail.trim().toLowerCase() : '';
    const twoFactorEnabled = typeof body.twoFactorEnabled === 'boolean' ? body.twoFactorEnabled : undefined;
    const lockTimeoutMinutes = typeof body.lockTimeoutMinutes === 'number' ? body.lockTimeoutMinutes : undefined;

    if (twoFactorEnabled === false) {
        return NextResponse.json({ error: 'Para desactivar la doble verificación, usa el flujo de envío de código.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from('profile_security_settings')
        .upsert({
            profile_id: context.profile.id,
            allowed_countries: ['PE'],
            notify_on_suspicious: notifyOnSuspicious,
            alert_email: alertEmail || context.profile.email,
            ...(twoFactorEnabled !== undefined ? { two_factor_enabled: twoFactorEnabled } : {}),
            ...(lockTimeoutMinutes !== undefined ? { lock_timeout_minutes: lockTimeoutMinutes } : {}),
            updated_at: new Date().toISOString()
        });

    if (error) {
        return NextResponse.json({ error: 'No se pudo guardar la configuración.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
