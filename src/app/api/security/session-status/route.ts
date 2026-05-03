import { NextResponse } from 'next/server';
import { getProfileById, requireAuth } from '@/lib/server-auth';
import {
    getActiveOtpChallenge,
    getClientSecurityInfo,
    getLatestSuccessfulAccess,
    getOrCreateSecuritySettings,
    getAlertDestinations,
    isCountryAllowed,
    isSuspiciousComparedToLastLogin,
    issueSecurityClearance,
    logSecurityEvent,
    maskEmail,
    sendSuspiciousAccessAlert,
    validateSecurityClearance,
} from '@/lib/security';

export async function GET(request: Request) {
    const { context, response } = await requireAuth(request, undefined, { skipSecurityCheck: true });
    if (response || !context) {
        return response!;
    }

    const profileLookup = await getProfileById(context.profile.id);
    const profile = profileLookup.data;

    const settings = await getOrCreateSecuritySettings(context.profile.id, profile?.email || context.profile.email);
    const clientInfo = getClientSecurityInfo(request);

    if (!isCountryAllowed(settings, clientInfo.countryCode)) {
        await logSecurityEvent({
            profileId: context.profile.id,
            email: profile?.email || context.profile.email,
            eventType: 'LOGIN_BLOCKED_COUNTRY',
            request,
            metadata: { allowedCountries: settings.allowed_countries || ['PE'] },
        });

        if (settings.notify_on_suspicious) {
            const destinations = getAlertDestinations(settings, profile?.email || context.profile.email);
            if (destinations.length > 0) {
                await sendSuspiciousAccessAlert({
                    to: destinations,
                    email: profile?.email || context.profile.email,
                    reason: `País no permitido (${clientInfo.countryCode || 'desconocido'})`,
                    request,
                });
            }
        }

        return NextResponse.json(
            {
                ok: false,
                status: 'blocked_country',
                country: clientInfo.countryCode,
                allowedCountries: settings.allowed_countries || ['PE'],
            },
            { status: 403 }
        );
    }

    const clearance = await validateSecurityClearance(request, context.profile.id);
    if (clearance.ok) {
        return NextResponse.json({
            ok: true,
            status: 'verified',
            twoFactorEnabled: settings.two_factor_enabled,
            maskedEmail: maskEmail(settings.two_factor_email),
        });
    }

    if (!settings.two_factor_enabled || !settings.two_factor_email) {
        const successResponse = NextResponse.json({
            ok: true,
            status: 'verified',
            twoFactorEnabled: false,
            maskedEmail: '',
        });
        await issueSecurityClearance(successResponse, {
            profileId: context.profile.id,
            request,
        });
        return successResponse;
    }

    const lastAccess = await getLatestSuccessfulAccess(context.profile.id);
    const isSuspicious = isSuspiciousComparedToLastLogin(clientInfo, lastAccess || null);
    const challenge = await getActiveOtpChallenge(context.profile.id, 'login');

    return NextResponse.json({
        ok: true,
        status: 'requires_2fa',
        twoFactorEnabled: true,
        maskedEmail: maskEmail(settings.two_factor_email),
        hasActiveChallenge: !!challenge,
        challengeId: challenge?.id || null,
        suspicious: isSuspicious,
    });
}
