"use client";

import React, { Suspense, use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { NebulaBackground } from '@/components/NebulaBackground';
import { Eye, EyeOff } from 'lucide-react';

type SecurityFlowState = 'login' | 'verify';

function LoginContent({ subdomain }: { subdomain: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isRecovery = searchParams.get('view') === 'recovery';
    const requestedStep = searchParams.get('step') === 'verify' ? 'verify' : 'login';
    const securityBlocked = searchParams.get('security') === 'blocked_country';

    const [tenantConfig, setTenantConfig] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [recoverySent, setRecoverySent] = useState(false);
    const [flowState, setFlowState] = useState<SecurityFlowState>(requestedStep);
    const [maskedEmail, setMaskedEmail] = useState('');
    const [challengeId, setChallengeId] = useState('');
    const [challengeSent, setChallengeSent] = useState(false);

    async function markTenantActive() {
        if (!subdomain) return;

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession?.access_token) return;

        fetch('/api/tenant/mark-active', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentSession.access_token}`,
            },
            body: JSON.stringify({ slug: subdomain }),
        }).catch(() => {});
    }

    useEffect(() => {
        setFlowState(requestedStep);
    }, [requestedStep]);

    useEffect(() => {
        async function loadTenant() {
            if (!subdomain) return;

            const { data } = await supabase
                .from('tenants')
                .select('nombre, logo_url, color_primary, color_secondary')
                .eq('slug', subdomain)
                .eq('is_active', true)
                .single();

            if (data) {
                setTenantConfig(data);
            }
        }

        loadTenant();
    }, [subdomain]);

    useEffect(() => {
        if (!securityBlocked) return;
        setError('Acceso bloqueado: intento de inicio de sesión desde una región no autorizada.');
    }, [securityBlocked]);

    useEffect(() => {
        async function bootstrapVerificationStep() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const res = await fetch('/api/security/session-status', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            const json = await res.json().catch(() => ({}));

            if (res.ok && json.status === 'verified') {
                if (pathname !== `/${subdomain}/login`) { // Evitar bucle si ya estamos en login
                    await markTenantActive();
                    router.push('/leads');
                }
                return;
            }

            if (json.status === 'requires_2fa') {
                setFlowState('verify');
                setMaskedEmail(json.maskedEmail || '');
                setChallengeId(json.challengeId || '');

                if (!json.hasActiveChallenge && flowState === 'verify') {
                    await startSecurityChallenge(session.access_token);
                }
            }
        }

        bootstrapVerificationStep();
    }, [subdomain, router]);

    async function startSecurityChallenge(accessToken: string) {
        const res = await fetch('/api/security/login/challenge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            if (json.status === 'blocked_country') {
                await supabase.auth.signOut();
                router.replace(`/${subdomain}/login?security=blocked_country`);
                return;
            }

            throw new Error(json.error || 'No se pudo iniciar la verificación.');
        }

        if (json.status === 'verified') {
            await markTenantActive();
            router.push('/leads');
            return;
        }

        setFlowState('verify');
        setMaskedEmail(json.maskedEmail || '');
        setChallengeId(json.challengeId || '');
        setChallengeSent(true);
        setError('');
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;

            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession?.access_token) {
                throw new Error('No se pudo abrir la sesión.');
            }

            await startSecurityChallenge(currentSession.access_token);
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error('La sesión expiró. Vuelve a ingresar.');
            }

            if (!challengeId) {
                await startSecurityChallenge(session.access_token);
                throw new Error('Te enviamos un código nuevo. Revisa tu correo.');
            }

            const res = await fetch('/api/security/login/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    challengeId,
                    code: verificationCode,
                }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json.error || 'Código inválido.');
            }

            await markTenantActive();
            router.push('/leads');
        } catch (err: any) {
            setError(err.message || 'No se pudo verificar el código.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/set-password`,
            });
            if (resetError) throw resetError;
            setRecoverySent(true);
        } catch (err: any) {
            setError(err.message || 'Error al enviar instrucciones de recuperación');
        } finally {
            setIsLoading(false);
        }
    };

    const primaryColor = tenantConfig?.color_primary || '#2CDB9B';
    const logoUrl = tenantConfig?.logo_url || null;
    const companyName = tenantConfig?.nombre || 'Opps One';

    if (isRecovery) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <div className="w-full max-w-sm text-center space-y-8">
                    <div className="flex justify-center mb-6">
                        {logoUrl && (
                            <img src={logoUrl} alt={companyName} className="h-16 object-contain" />
                        )}
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h2>
                        <p className="mt-2 text-sm text-gray-500">Ingresa tu correo para recibir las instrucciones</p>
                    </div>

                    {recoverySent ? (
                        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 text-sm">
                            Hemos enviado un enlace de recuperación a tu correo electrónico. Revisa tu bandeja o spam.
                        </div>
                    ) : (
                        <form onSubmit={handleRecovery} className="space-y-4 text-left">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 text-sm text-center">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tu email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isLoading ? 'Enviando...' : 'Enviar enlace'}
                            </button>
                        </form>
                    )}

                    <div className="pt-4">
                        <button
                            onClick={() => router.push(`/${subdomain}/login`)}
                            className="text-sm font-medium hover:underline transition-all"
                            style={{ color: primaryColor }}
                        >
                            Volver al inicio de sesión
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative bg-[#050505] overflow-hidden">
            <div className="absolute inset-0 z-0">
                <NebulaBackground />
            </div>
            <div className="relative z-10 w-full max-w-md mx-auto p-4 md:p-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="w-full space-y-8 bg-white/10 backdrop-blur-xl p-8 md:p-10 rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] border border-white/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    <div className="text-center space-y-6 relative z-10">
                        {logoUrl && (
                            <div className="flex justify-center">
                                <img src={logoUrl} alt={companyName} className="h-20 object-contain drop-shadow-2xl" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                                {flowState === 'verify' ? 'Verificación de seguridad' : 'Iniciar sesión'}
                            </h2>
                            <p className="mt-2 text-sm text-slate-300 font-medium">
                                Panel administrativo de <span className="text-white">{companyName}</span>
                            </p>
                        </div>
                    </div>

                    {flowState === 'verify' ? (
                        <form onSubmit={handleVerifyCode} className="space-y-6 mt-8 relative z-10">
                            {error && (
                                <div className="bg-red-500/20 backdrop-blur-md border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm shadow-lg">
                                    {error}
                                </div>
                            )}
                            {challengeSent && !error && (
                                <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-100 px-4 py-3 rounded-xl text-sm shadow-lg">
                                    Enviamos un código al correo {maskedEmail || 'de seguridad'}.
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-200 mb-2 ml-1">Código de seguridad</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    required
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full px-5 py-3.5 rounded-xl bg-black/20 border border-white/10 text-white tracking-[0.35em] text-center text-xl placeholder-slate-400 focus:ring-2 focus:border-transparent transition-all duration-300 outline-none backdrop-blur-md hover:bg-black/30 focus:bg-white/5"
                                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                    placeholder="000000"
                                />
                            </div>
                            <div className="text-xs text-slate-300 leading-6">
                                El acceso cuenta con restricciones geográficas. Si este ingreso fue legítimo y no ves el correo, revisa spam o solicita un nuevo código.
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const { data: { session } } = await supabase.auth.getSession();
                                        if (!session?.access_token) return;
                                        setIsLoading(true);
                                        setError('');
                                        try {
                                            await startSecurityChallenge(session.access_token);
                                        } catch (err: any) {
                                            setError(err.message || 'No se pudo reenviar el código.');
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    className="flex-1 py-3 rounded-xl border border-white/15 text-white/90 font-semibold hover:bg-white/5 transition-all"
                                    disabled={isLoading}
                                >
                                    Reenviar código
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || verificationCode.length !== 6}
                                    className="flex-1 py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {isLoading ? 'Verificando...' : 'Entrar al panel'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-6 mt-8 relative z-10">
                            {error && (
                                <div className="bg-red-500/20 backdrop-blur-md border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm shadow-lg flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-200 mb-2 ml-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-5 py-3.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-slate-400 focus:ring-2 focus:border-transparent transition-all duration-300 outline-none backdrop-blur-md hover:bg-black/30 focus:bg-white/5"
                                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-slate-200 ml-1">Contraseña</label>
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/${subdomain}/login?view=recovery`)}
                                        className="text-xs hover:text-white transition-colors"
                                        style={{ color: primaryColor }}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-5 py-3.5 pr-12 rounded-xl bg-black/20 border border-white/10 text-white placeholder-slate-400 focus:ring-2 focus:border-transparent transition-all duration-300 outline-none backdrop-blur-md hover:bg-black/30 focus:bg-white/5"
                                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors duration-200 focus:outline-none"
                                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    >
                                        {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-4 py-3.5 px-4 rounded-xl text-white font-bold border border-white/10 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110 shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-lg"
                                style={{
                                    backgroundColor: primaryColor,
                                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                }}
                            >
                                {isLoading ? 'Conectando...' : 'Continuar'}
                            </button>
                            <p className="text-[11px] text-slate-400 leading-5">
                                Este panel es privado. El acceso cuenta con controles de seguridad regionales y puede requerir un código adicional al correo de seguridad del usuario.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TenantLoginPage({ params }: { params: Promise<{ subdomain: string }> }) {
    const { subdomain } = use(params);

    return (
        <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-t-2 border-brand-turquoise animate-spin" /></div>}>
            <LoginContent subdomain={subdomain} />
        </Suspense>
    );
}
