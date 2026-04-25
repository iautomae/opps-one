import { NextResponse } from 'next/server';
import { getProfileById, getSupabaseAdminClient, requireAuth } from '@/lib/server-auth';
import {
    createOtpChallenge,
    getOrCreateSecuritySettings,
    logSecurityEvent,
    maskEmail,
    sendSecurityCodeEmail,
} from '@/lib/security';

const supabaseAdmin = getSupabaseAdminClient();

export async function POST(request: Request) {
    const { context, response } = await requireAuth(request);
    if (response || !context) {
        return response!;
    }

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const step = body.step === 'new' ? 'new' : 'current';
    const currentChallengeId = typeof body.currentChallengeId === 'string' ? body.currentChallengeId.trim() : '';

    const profileLookup = await getProfileById(context.profile.id);
    const profileEmail = profileLookup.data?.email || context.profile.email || '';
    const settings = await getOrCreateSecuritySettings(context.profile.id, profileEmail);

    if (step === 'new') {
        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Ingresa un correo valido.' }, { status: 400 });
        }

        if (settings.two_factor_email && email === settings.two_factor_email.toLowerCase()) {
            return NextResponse.json({ error: 'El nuevo correo debe ser diferente al actual.' }, { status: 400 });
        }

        if (!currentChallengeId) {
            return NextResponse.json({ error: 'Primero valida el correo actual o de respaldo.' }, { status: 400 });
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

        const challenge = await createOtpChallenge({
            profileId: context.profile.id,
            email,
            purpose: 'change_2fa_new_email',
            context: { currentChallengeId },
        });

        await sendSecurityCodeEmail({
            to: email,
            code: challenge.code,
            purposeLabel: 'confirmar tu nuevo correo de doble acceso',
        });

        await logSecurityEvent({
            profileId: context.profile.id,
            email: context.profile.email,
            eventType: '2FA_NEW_EMAIL_CHALLENGE_SENT',
            request,
            metadata: { challengeId: challenge.challengeId, targetEmail: email, currentChallengeId },
        });

        return NextResponse.json({
            success: true,
            step: 'new',
            challengeId: challenge.challengeId,
            expiresAt: challenge.expiresAt,
            maskedEmail: maskEmail(email),
        });
    }

    const currentEmail = settings.two_factor_email || settings.alert_email || profileEmail;
    if (!currentEmail || !currentEmail.includes('@')) {
        return NextResponse.json({ error: 'No hay un correo de respaldo configurado.' }, { status: 400 });
    }

    const challenge = await createOtpChallenge({
        profileId: context.profile.id,
        email: currentEmail,
        purpose: 'change_2fa_current_email',
        context: { proposedEmail: email || null },
    });

    await sendSecurityCodeEmail({
        to: currentEmail,
        code: challenge.code,
        purposeLabel: 'autorizar el cambio de correo de doble acceso',
    });

    await logSecurityEvent({
        profileId: context.profile.id,
        email: context.profile.email,
        eventType: '2FA_CURRENT_EMAIL_CHALLENGE_SENT',
        request,
        metadata: { challengeId: challenge.challengeId, targetEmail: currentEmail, proposedEmail: email || null },
    });

    return NextResponse.json({
        success: true,
        step: 'current',
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        maskedEmail: maskEmail(currentEmail),
    });
}
