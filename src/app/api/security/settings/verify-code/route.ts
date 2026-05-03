import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, requireAuth } from '@/lib/server-auth';
import { logSecurityEvent, verifyOtpChallenge } from '@/lib/security';

const supabaseAdmin = getSupabaseAdminClient();

export async function POST(request: Request) {
    const { context, response } = await requireAuth(request);
    if (response || !context) {
        return response!;
    }

    const body = await request.json();
    const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const step = ['new', 'current', 'disable', 'alerts'].includes(body.step) ? body.step : 'current';
    const currentChallengeId = typeof body.currentChallengeId === 'string' ? body.currentChallengeId.trim() : '';

    if (!challengeId || !code) {
        return NextResponse.json({ error: 'Faltan challengeId o codigo.' }, { status: 400 });
    }

    if (step === 'current') {
        const verification = await verifyOtpChallenge({
            profileId: context.profile.id,
            challengeId,
            code,
            purpose: 'change_2fa_current_email',
        });

        if (!verification.ok) {
            return NextResponse.json(
                { error: 'Codigo invalido o expirado.', reason: verification.reason },
                { status: 400 }
            );
        }

        await logSecurityEvent({
            profileId: context.profile.id,
            email: context.profile.email,
            eventType: '2FA_CURRENT_EMAIL_VERIFIED',
            request,
            metadata: { challengeId },
        });

        return NextResponse.json({
            success: true,
            step: 'current',
            currentChallengeId: challengeId,
        });
    }

    if (step === 'disable') {
        const verification = await verifyOtpChallenge({
            profileId: context.profile.id,
            challengeId,
            code,
            purpose: 'disable_2fa',
        });

        if (!verification.ok) {
            return NextResponse.json(
                { error: 'Código inválido o expirado.', reason: verification.reason },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from('profile_security_settings')
            .upsert({
                profile_id: context.profile.id,
                two_factor_enabled: false,
            });

        if (error) {
            return NextResponse.json({ error: 'No se pudo desactivar el 2FA.' }, { status: 500 });
        }

        await logSecurityEvent({
            profileId: context.profile.id,
            email: context.profile.email,
            eventType: '2FA_DISABLED',
            request,
            metadata: { challengeId },
        });

        return NextResponse.json({
            success: true,
            step: 'disable',
            twoFactorEnabled: false,
        });
    }

    if (step === 'alerts') {
        const verification = await verifyOtpChallenge({
            profileId: context.profile.id,
            challengeId,
            code,
            purpose: 'alerts',
        });

        if (!verification.ok) {
            return NextResponse.json(
                { error: 'Código inválido o expirado.', reason: verification.reason },
                { status: 400 }
            );
        }

        const notifyOnSuspicious = typeof body.notifyOnSuspicious === 'boolean' ? body.notifyOnSuspicious : true;

        const { error } = await supabaseAdmin
            .from('profile_security_settings')
            .upsert({
                profile_id: context.profile.id,
                notify_on_suspicious: notifyOnSuspicious,
            });

        if (error) {
            return NextResponse.json({ error: 'No se pudieron actualizar las alertas.' }, { status: 500 });
        }

        await logSecurityEvent({
            profileId: context.profile.id,
            email: context.profile.email,
            eventType: '2FA_ALERTS_UPDATED',
            request,
            metadata: { challengeId, notifyOnSuspicious },
        });

        return NextResponse.json({
            success: true,
            step: 'alerts',
        });
    }

    const verification = await verifyOtpChallenge({
        profileId: context.profile.id,
        challengeId,
        code,
        purpose: 'change_2fa_new_email',
    });

    if (!verification.ok) {
        return NextResponse.json(
            { error: 'Codigo invalido o expirado.', reason: verification.reason },
            { status: 400 }
        );
    }

    const linkedCurrentChallengeId =
        typeof verification.context.currentChallengeId === 'string'
            ? verification.context.currentChallengeId
            : '';

    if (!currentChallengeId || linkedCurrentChallengeId !== currentChallengeId) {
        return NextResponse.json({ error: 'La autorizacion del correo actual no coincide.' }, { status: 400 });
    }

    const { data: currentChallenge, error: currentError } = await supabaseAdmin
        .from('auth_otp_challenges')
        .select('id, consumed_at')
        .eq('id', currentChallengeId)
        .eq('profile_id', context.profile.id)
        .eq('purpose', 'change_2fa_current_email')
        .maybeSingle<{ id: string; consumed_at: string | null }>();

    if (currentError || !currentChallenge?.consumed_at) {
        return NextResponse.json({ error: 'Primero valida el codigo del correo actual.' }, { status: 400 });
    }

    const verifiedEmail = verification.email;
    const { error } = await supabaseAdmin
        .from('profile_security_settings')
        .upsert({
            profile_id: context.profile.id,
            two_factor_email: verifiedEmail,
            two_factor_enabled: true,
            allowed_countries: ['PE'],
            notify_on_suspicious: true,
            alert_email: verifiedEmail,
            last_verified_at: new Date().toISOString(),
        });

    if (error) {
        return NextResponse.json({ error: 'No se pudo guardar el correo verificado.' }, { status: 500 });
    }

    await logSecurityEvent({
        profileId: context.profile.id,
        email: context.profile.email,
        eventType: '2FA_EMAIL_CHANGED',
        request,
        metadata: { verifiedEmail, currentChallengeId, newChallengeId: challengeId },
    });

    return NextResponse.json({
        success: true,
        step: 'new',
        twoFactorEmail: verifiedEmail,
        twoFactorEnabled: true,
    });
}
