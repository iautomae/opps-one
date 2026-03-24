"use client";

import React, { useState, useEffect, Suspense, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { NebulaBackground } from '@/components/NebulaBackground';
import { Eye, EyeOff } from 'lucide-react';

function LoginContent({ subdomain }: { subdomain: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isRecovery = searchParams.get('view') === 'recovery';

    const [tenantConfig, setTenantConfig] = useState<any>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [recoverySent, setRecoverySent] = useState(false);

    useEffect(() => {
        async function loadTenant() {
            if (!subdomain) return;

            const { data, error } = await supabase
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

            // Mark tenant as active on first successful login (via API to bypass RLS)
            if (subdomain) {
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

            // Redirect to leads (AuthGuard will handle routing to first available feature)
            router.push('/leads');
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
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
                // The URL to redirect to after clicking the link in the email
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
        // DISEÑO BLANCO Y MINIMALISTA PARA RECUPERACIÓN (Solicitado por el usuario)
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
                            Hemos enviado un enlace de recuperación a tu correo electrónico. Por favor, revisa tu bandeja de entrada o spam.
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

    // DISEÑO ORIGINAL CON NEBULA BACKGROUND PARA LOGIN PRINCIPAL
    return (
        <div className="min-h-screen flex items-center justify-center relative bg-[#050505] overflow-hidden">
            <div className="absolute inset-0 z-0">
                <NebulaBackground />
            </div>
            <div className="relative z-10 w-full max-w-md mx-auto p-4 md:p-8 animate-in fade-in zoom-in-95 duration-700">
                {/* Rediseño de la tarjeta: Efecto Glassmorphism más claro, premium y elegante */}
                <div className="w-full space-y-8 bg-white/10 backdrop-blur-xl p-8 md:p-10 rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] border border-white/20 relative overflow-hidden">
                    {/* Brillo interno sutil arriba */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>

                    <div className="text-center space-y-6 relative z-10">
                        {logoUrl && (
                            <div className="flex justify-center">
                                <img src={logoUrl} alt={companyName} className="h-20 object-contain drop-shadow-2xl" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight !text-white drop-shadow-sm" style={{ color: '#ffffff' }}>Iniciar sesión</h2>
                            <p className="mt-2 text-sm text-slate-300 font-medium">Panel administrativo de <span className="!text-white" style={{ color: '#ffffff' }}>{companyName}</span></p>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 mt-8 relative z-10">
                        {error && (
                            <div className="bg-red-500/20 backdrop-blur-md border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm animate-shake shadow-lg flex items-center gap-2">
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
                                    type={showPassword ? "text" : "password"}
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
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {showPassword ? (
                                        <Eye className="h-5 w-5" />
                                    ) : (
                                        <EyeOff className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-4 py-3.5 px-4 rounded-xl text-white font-bold border border-white/10 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110 shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-lg"
                            style={{
                                backgroundColor: primaryColor,
                                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                            }}
                        >
                            {isLoading ? 'Conectando...' : 'Iniciar sesión'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function TenantLoginPage({ params }: { params: Promise<{ subdomain: string }> }) {
    const { subdomain } = use(params);

    return (
        <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-t-2 border-brand-turquoise animate-spin"></div></div>}>
            <LoginContent subdomain={subdomain} />
        </Suspense>
    );
}
