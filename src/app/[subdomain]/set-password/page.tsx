"use client";

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LoaderCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function SetPasswordPage({
    params
}: {
    params: Promise<{ subdomain: string }>
}) {
    const { subdomain } = use(params);
    const router = useRouter();
    const [tenantConfig, setTenantConfig] = useState<any>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [isRecovery, setIsRecovery] = useState(false);

    // Load tenant branding
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

    // Handle auth session from invite link or recovery hash fragment
    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[set-password] Auth event:', event, 'Session:', !!session);

            if (event === 'PASSWORD_RECOVERY') {
                setIsRecovery(true);
            }

            if (session?.user) {
                if (timeoutId) clearTimeout(timeoutId);
                setEmail(session.user.email || '');
                setSessionReady(true);
                setCheckingSession(false);
            }
        });

        // Also check if there's already a session
        const checkExisting = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setEmail(session.user.email || '');
                setSessionReady(true);
                setCheckingSession(false);
            } else {
                // Wait for onAuthStateChange to process the hash fragment
                // Use a longer timeout as fallback for slow connections
                timeoutId = setTimeout(() => {
                    setCheckingSession(false);
                }, 10000);
            }
        };
        checkExisting();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            setIsLoading(false);
            return;
        }

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            // Mark onboarding as completed
            await supabase.auth.updateUser({
                data: { onboarding_completed: true }
            });

            // Mark tenant as active (account confirmed) via API to bypass RLS
            if (subdomain && !isRecovery) {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                fetch('/api/tenant/mark-active', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentSession?.access_token || ''}`,
                    },
                    body: JSON.stringify({ slug: subdomain }),
                }).catch(() => {});
            }

            setSuccess(true);

            if (isRecovery) {
                // Recovery: sign out and redirect to login for a clean session
                setTimeout(async () => {
                    await supabase.auth.signOut();
                    router.push('/login');
                }, 2000);
            } else {
                // Invite: redirect to CRM directly
                setTimeout(() => {
                    router.push('/leads');
                }, 2000);
            }

        } catch (err: any) {
            setError(err.message || 'Error al actualizar la contraseña');
        } finally {
            setIsLoading(false);
        }
    };

    // Dynamic variables
    const primaryColor = tenantConfig?.color_primary || '#2CDB9B';
    const logoUrl = tenantConfig?.logo_url || null;
    const companyName = tenantConfig?.nombre || 'Opps One';

    // Loading state while checking session
    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <div className="text-center space-y-4">
                    <LoaderCircle className="animate-spin mx-auto" size={40} style={{ color: primaryColor }} />
                    <p className="text-gray-500 text-sm font-medium">Verificando tu invitación...</p>
                </div>
            </div>
        );
    }

    // No session found - invite link expired or invalid
    if (!sessionReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <div className="w-full max-w-sm text-center space-y-6">
                    {logoUrl && (
                        <img src={logoUrl} alt={companyName} className="h-16 object-contain mx-auto" />
                    )}
                    <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-amber-800 mb-2">Enlace expirado o inválido</h3>
                        <p className="text-amber-700 text-sm leading-relaxed">
                            Este enlace de invitación ya no es válido. Puede haber expirado o ya fue utilizado.
                            Contacta a tu administrador para solicitar un nuevo enlace.
                        </p>
                    </div>
                    <a
                        href={`/login`}
                        className="inline-block w-full py-3 rounded-xl text-white font-semibold shadow-md transition-all"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Ir al inicio de sesión
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            <div className="w-full max-w-sm text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">

                <div className="flex justify-center mb-6">
                    {logoUrl && (
                        <img src={logoUrl} alt={companyName} className="h-16 object-contain" />
                    )}
                </div>

                {!success ? (
                    <>
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold uppercase tracking-wider mx-auto mb-4">
                                <ShieldCheck size={14} />
                                {isRecovery ? 'Recuperación de Acceso' : 'Configuración de Acceso'}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {isRecovery ? 'Restablece tu contraseña' : 'Crea tu contraseña'}
                            </h2>
                            <p className="mt-2 text-sm text-gray-500 font-medium">
                                {isRecovery
                                    ? 'Ingresa tu nueva contraseña para recuperar el acceso.'
                                    : <>Establece una contraseña segura para tu acceso en <strong>{companyName}</strong>.</>
                                }
                            </p>
                        </div>

                        <form onSubmit={handleSetPassword} className="space-y-4 text-left mt-8">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            {/* Email display (read only) */}
                            {email && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tu correo</label>
                                    <input
                                        type="email"
                                        value={email}
                                        readOnly
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                                    />
                                </div>
                            )}

                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Nueva</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                    >
                                        {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repite tu contraseña"
                                        className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                    >
                                        {showConfirmPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-4 py-3 rounded-xl text-white font-semibold shadow-md border hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                            >
                                {isLoading ? <LoaderCircle className="animate-spin" size={20} /> : isRecovery ? 'Restablecer contraseña' : 'Activar mi cuenta'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="bg-green-50 text-green-700 p-8 rounded-2xl border border-green-100 space-y-4">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold">{isRecovery ? '¡Contraseña restablecida!' : '¡Cuenta activada!'}</h3>
                        <p className="text-sm">
                            {isRecovery
                                ? 'Tu contraseña ha sido actualizada. Redirigiendo al inicio de sesión...'
                                : 'Tu contraseña ha sido guardada. Redirigiendo a tu panel...'
                            }
                        </p>
                        <LoaderCircle className="animate-spin mx-auto text-green-500" size={24} />
                    </div>
                )}
            </div>
        </div>
    );
}
