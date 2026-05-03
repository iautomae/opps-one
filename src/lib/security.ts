import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const SECURITY_CLEARANCE_COOKIE = 'esc_session_clearance';
const OTP_EXPIRY_MINUTES = 10;
const CLEARANCE_TTL_HOURS = 12;
const DEFAULT_ALLOWED_COUNTRIES = ['PE'];

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let ensureSecurityTablesPromise: Promise<void> | null = null;

export type SecuritySettings = {
    profile_id: string;
    two_factor_email: string | null;
    two_factor_enabled: boolean;
    allowed_countries: string[] | null;
    notify_on_suspicious: boolean;
    alert_email: string | null;
    last_verified_at: string | null;
    lock_pin_hash: string | null;
    lock_timeout_minutes: number;
};

export type ClientSecurityInfo = {
    ipAddress: string | null;
    countryCode: string | null;
    userAgent: string | null;
};

function getExecSqlEndpoint() {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`;
}

function getServiceHeaders() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    return {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
    };
}

export async function ensureSecurityTables() {
    if (ensureSecurityTablesPromise) {
        return ensureSecurityTablesPromise;
    }

    ensureSecurityTablesPromise = (async () => {
        const sql = `
            CREATE TABLE IF NOT EXISTS public.profile_security_settings (
                profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
                two_factor_email TEXT NULL,
                two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
                allowed_countries JSONB NOT NULL DEFAULT '["PE"]'::jsonb,
                notify_on_suspicious BOOLEAN NOT NULL DEFAULT true,
                alert_email TEXT NULL,
                last_verified_at TIMESTAMPTZ NULL,
                lock_pin_hash TEXT NULL,
                lock_timeout_minutes INTEGER NOT NULL DEFAULT 15,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS public.auth_otp_challenges (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                target_email TEXT NOT NULL,
                code_hash TEXT NOT NULL,
                purpose TEXT NOT NULL,
                context JSONB NOT NULL DEFAULT '{}'::jsonb,
                expires_at TIMESTAMPTZ NOT NULL,
                consumed_at TIMESTAMPTZ NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS public.auth_session_clearances (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                clearance_hash TEXT NOT NULL,
                ip_address TEXT NULL,
                country_code TEXT NULL,
                user_agent TEXT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                revoked_at TIMESTAMPTZ NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );

            CREATE UNIQUE INDEX IF NOT EXISTS auth_session_clearances_hash_idx
                ON public.auth_session_clearances(clearance_hash);

            CREATE TABLE IF NOT EXISTS public.auth_security_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
                email TEXT NULL,
                event_type TEXT NOT NULL,
                ip_address TEXT NULL,
                country_code TEXT NULL,
                user_agent TEXT NULL,
                metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `;

        const response = await fetch(getExecSqlEndpoint(), {
            method: 'POST',
            headers: getServiceHeaders(),
            body: JSON.stringify({ sql }),
        });

        if (!response.ok) {
            const body = await response.text();
            console.error('Security SQL bootstrap failed:', body);
            throw new Error('No se pudo preparar la base de seguridad.');
        }
    })();

    return ensureSecurityTablesPromise;
}

export function hashValue(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateOtpCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export function maskEmail(email: string | null) {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    if (localPart.length <= 2) return `${localPart[0] || '*'}***@${domain}`;
    return `${localPart.slice(0, 2)}***@${domain}`;
}

export function getClientSecurityInfo(request: Request): ClientSecurityInfo {
    const forwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const ipAddress = forwardedFor.split(',')[0]?.trim() || null;
    const countryCode =
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('cf-ipcountry') ||
        request.headers.get('x-country-code') ||
        null;
    const userAgent = request.headers.get('user-agent');

    return {
        ipAddress,
        countryCode: countryCode ? countryCode.toUpperCase() : null,
        userAgent,
    };
}

function parseCookieValue(cookieHeader: string | null, name: string) {
    if (!cookieHeader) return null;
    const parts = cookieHeader.split(';').map((entry) => entry.trim());
    const match = parts.find((entry) => entry.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function getClearanceCookieFromRequest(request: Request) {
    return parseCookieValue(request.headers.get('cookie'), SECURITY_CLEARANCE_COOKIE);
}

export async function getOrCreateSecuritySettings(profileId: string, email?: string | null) {
    await ensureSecurityTables();

    const { data: existing, error } = await supabaseAdmin
        .from('profile_security_settings')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle<SecuritySettings>();

    if (error) {
        throw error;
    }

    if (existing) {
        return {
            ...existing,
            allowed_countries: Array.isArray(existing.allowed_countries) && existing.allowed_countries.length > 0
                ? existing.allowed_countries
                : DEFAULT_ALLOWED_COUNTRIES,
        };
    }

    const payload = {
        profile_id: profileId,
        two_factor_email: null,
        two_factor_enabled: false,
        allowed_countries: DEFAULT_ALLOWED_COUNTRIES,
        notify_on_suspicious: true,
        alert_email: email || null,
    };

    const { data: created, error: createError } = await supabaseAdmin
        .from('profile_security_settings')
        .upsert(payload)
        .select('*')
        .single<SecuritySettings>();

    if (createError || !created) {
        throw createError || new Error('No se pudo crear la configuración de seguridad.');
    }

    return created;
}

export type OtpPurpose = 'setup_email' | 'login' | 'change_2fa_current_email' | 'change_2fa_new_email' | 'disable_2fa' | 'alerts';

export async function createOtpChallenge(params: {
    profileId: string;
    email: string;
    purpose: OtpPurpose;
    context?: Record<string, unknown>;
}) {
    await ensureSecurityTables();

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
        .from('auth_otp_challenges')
        .insert({
            profile_id: params.profileId,
            target_email: params.email,
            code_hash: hashValue(code),
            purpose: params.purpose,
            context: params.context || {},
            expires_at: expiresAt,
        })
        .select('id, expires_at')
        .single<{ id: string; expires_at: string }>();

    if (error || !data) {
        throw error || new Error('No se pudo crear el reto OTP.');
    }

    return {
        challengeId: data.id,
        code,
        expiresAt: data.expires_at,
    };
}

export async function getActiveOtpChallenge(profileId: string, purpose: OtpPurpose) {
    await ensureSecurityTables();

    const { data, error } = await supabaseAdmin
        .from('auth_otp_challenges')
        .select('id, target_email, expires_at, created_at')
        .eq('profile_id', profileId)
        .eq('purpose', purpose)
        .is('consumed_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; target_email: string; expires_at: string; created_at: string }>();

    if (error) {
        throw error;
    }

    return data;
}

export async function verifyOtpChallenge(params: {
    profileId: string;
    challengeId: string;
    code: string;
    purpose: OtpPurpose;
}) {
    await ensureSecurityTables();

    const { data, error } = await supabaseAdmin
        .from('auth_otp_challenges')
        .select('*')
        .eq('id', params.challengeId)
        .eq('profile_id', params.profileId)
        .eq('purpose', params.purpose)
        .maybeSingle<{
            id: string;
            target_email: string;
            code_hash: string;
            expires_at: string;
            consumed_at: string | null;
            context: Record<string, unknown> | null;
        }>();

    if (error || !data) {
        return { ok: false as const, reason: 'challenge_not_found' };
    }

    if (data.consumed_at) {
        return { ok: false as const, reason: 'challenge_already_used' };
    }

    if (new Date(data.expires_at).getTime() < Date.now()) {
        return { ok: false as const, reason: 'challenge_expired' };
    }

    if (hashValue(params.code.trim()) !== data.code_hash) {
        return { ok: false as const, reason: 'invalid_code' };
    }

    const { error: consumeError } = await supabaseAdmin
        .from('auth_otp_challenges')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', params.challengeId);

    if (consumeError) {
        throw consumeError;
    }

    return {
        ok: true as const,
        email: data.target_email,
        context: data.context || {},
    };
}

export async function logSecurityEvent(params: {
    profileId?: string | null;
    email?: string | null;
    eventType: string;
    request?: Request;
    metadata?: Record<string, unknown>;
}) {
    await ensureSecurityTables();

    const clientInfo = params.request ? getClientSecurityInfo(params.request) : { ipAddress: null, countryCode: null, userAgent: null };

    await supabaseAdmin.from('auth_security_events').insert({
        profile_id: params.profileId || null,
        email: params.email || null,
        event_type: params.eventType,
        ip_address: clientInfo.ipAddress,
        country_code: clientInfo.countryCode,
        user_agent: clientInfo.userAgent,
        metadata: params.metadata || {},
    });
}

export async function sendSecurityCodeEmail(params: {
    to: string;
    code: string;
    purposeLabel: string;
}) {
    await resend.emails.send({
        from: 'Seguridad Opps One <admin@opps.one>',
        to: params.to,
        subject: `${params.code} es tu código de verificación`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                <h2 style="margin: 0 0 12px; color: #0f172a;">Verificación de seguridad</h2>
                <p style="margin: 0 0 20px; color: #475569; line-height: 1.6;">
                    Usa este código para ${params.purposeLabel}. El código vence en ${OTP_EXPIRY_MINUTES} minutos.
                </p>
                <div style="font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #0f172a; background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; text-align: center;">
                    ${params.code}
                </div>
                <p style="margin: 20px 0 0; color: #94a3b8; font-size: 12px;">
                    Si tú no solicitaste este acceso, cambia tu contraseña y revisa la seguridad de tu cuenta.
                </p>
            </div>
        `,
    });
}

export async function sendSuspiciousAccessAlert(params: {
    to: string | string[];
    email: string | null;
    reason: string;
    request: Request;
}) {
    const clientInfo = getClientSecurityInfo(params.request);

    await resend.emails.send({
        from: 'Alertas Opps One <admin@opps.one>',
        to: params.to,
        subject: 'Alerta de acceso sospechoso bloqueado',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #fff7ed; border-radius: 16px; border: 1px solid #fdba74;">
                <h2 style="margin: 0 0 12px; color: #9a3412;">Acceso bloqueado por seguridad</h2>
                <p style="margin: 0 0 16px; color: #7c2d12; line-height: 1.6;">
                    Detectamos un intento de acceso sospechoso para la cuenta ${params.email || 'sin correo'}.
                </p>
                <ul style="color: #7c2d12; line-height: 1.8; padding-left: 18px; margin: 0 0 16px;">
                    <li>Motivo: ${params.reason}</li>
                    <li>País detectado: ${clientInfo.countryCode || 'Desconocido'}</li>
                    <li>IP detectada: ${clientInfo.ipAddress || 'Desconocida'}</li>
                    <li>Agente: ${clientInfo.userAgent || 'No disponible'}</li>
                </ul>
                <p style="margin: 0; color: #7c2d12; font-size: 13px;">
                    Si fuiste tú, revisa la política de países permitidos o entra desde una red autorizada.
                </p>
            </div>
        `,
    });
}

export function getAlertDestinations(settings: SecuritySettings, profileEmail: string | null | undefined): string[] {
    const destinations: string[] = [];
    if (profileEmail) destinations.push(profileEmail);
    if (settings.two_factor_enabled && settings.two_factor_email) {
        destinations.push(settings.two_factor_email);
    }
    return Array.from(new Set(destinations));
}

export function isCountryAllowed(settings: SecuritySettings, countryCode: string | null) {
    const allowedCountries = Array.isArray(settings.allowed_countries) && settings.allowed_countries.length > 0
        ? settings.allowed_countries.map((value) => String(value).toUpperCase())
        : DEFAULT_ALLOWED_COUNTRIES;

    if (!countryCode) {
        return process.env.NODE_ENV !== 'production';
    }

    return allowedCountries.includes(countryCode.toUpperCase());
}

export async function getLatestSuccessfulAccess(profileId: string) {
    await ensureSecurityTables();

    const { data, error } = await supabaseAdmin
        .from('auth_security_events')
        .select('ip_address, country_code, user_agent, created_at')
        .eq('profile_id', profileId)
        .eq('event_type', 'LOGIN_SUCCESS')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ ip_address: string | null; country_code: string | null; user_agent: string | null; created_at: string }>();

    if (error) {
        throw error;
    }

    return data;
}

export function isSuspiciousComparedToLastLogin(current: ClientSecurityInfo, last: { ip_address: string | null; country_code: string | null; user_agent: string | null } | null) {
    if (!last) return false;

    const countryChanged = !!current.countryCode && !!last.country_code && current.countryCode !== last.country_code;
    const ipChanged = !!current.ipAddress && !!last.ip_address && current.ipAddress !== last.ip_address;
    const agentChanged = !!current.userAgent && !!last.user_agent && current.userAgent !== last.user_agent;

    return countryChanged || ipChanged || agentChanged;
}

export async function issueSecurityClearance(response: NextResponse, params: {
    profileId: string;
    request: Request;
}) {
    await ensureSecurityTables();

    const token = crypto.randomBytes(32).toString('hex');
    const clientInfo = getClientSecurityInfo(params.request);
    const expiresAt = new Date(Date.now() + CLEARANCE_TTL_HOURS * 60 * 60 * 1000);

    await supabaseAdmin
        .from('auth_session_clearances')
        .insert({
            profile_id: params.profileId,
            clearance_hash: hashValue(token),
            ip_address: clientInfo.ipAddress,
            country_code: clientInfo.countryCode,
            user_agent: clientInfo.userAgent,
            expires_at: expiresAt.toISOString(),
        });

    response.cookies.set(SECURITY_CLEARANCE_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: expiresAt,
    });
}

export async function revokeSecurityClearance(request: Request) {
    await ensureSecurityTables();
    const clearanceCookie = getClearanceCookieFromRequest(request);

    if (!clearanceCookie) {
        return;
    }

    await supabaseAdmin
        .from('auth_session_clearances')
        .update({ revoked_at: new Date().toISOString() })
        .eq('clearance_hash', hashValue(clearanceCookie))
        .is('revoked_at', null);
}

export async function validateSecurityClearance(request: Request, profileId: string) {
    await ensureSecurityTables();

    const clearanceCookie = getClearanceCookieFromRequest(request);
    if (!clearanceCookie) {
        return { ok: false as const, reason: 'missing_clearance' };
    }

    const clientInfo = getClientSecurityInfo(request);
    const { data, error } = await supabaseAdmin
        .from('auth_session_clearances')
        .select('id, country_code, expires_at')
        .eq('profile_id', profileId)
        .eq('clearance_hash', hashValue(clearanceCookie))
        .is('revoked_at', null)
        .maybeSingle<{ id: string; country_code: string | null; expires_at: string }>();

    if (error || !data) {
        return { ok: false as const, reason: 'clearance_not_found' };
    }

    if (new Date(data.expires_at).getTime() < Date.now()) {
        return { ok: false as const, reason: 'clearance_expired' };
    }

    if (data.country_code && clientInfo.countryCode && data.country_code !== clientInfo.countryCode) {
        await supabaseAdmin
            .from('auth_session_clearances')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', data.id);

        return { ok: false as const, reason: 'country_changed' };
    }

    return { ok: true as const };
}

export function clearSecurityCookie(response: NextResponse) {
    response.cookies.set(SECURITY_CLEARANCE_COOKIE, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(0),
    });
}
