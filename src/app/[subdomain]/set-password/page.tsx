"use client";

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SetPasswordPage({
    params
}: {
    params: Promise<{ subdomain: string }>
}) {
    const { subdomain } = use(params);
    const router = useRouter();
    const [tenantConfig, setTenantConfig] = useState<any>(null);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Cargar la configuración del Tenant (Logo, Colores) basado en el subdominio
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
            // Actualizar la contraseña del usuario actualmente autenticado (visto a través del magic link hash)
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            // Marcar user onboarding completed
            await supabase.auth.updateUser({
                data: { onboarding_completed: true }
            });

            setSuccess(true);

            // Redirigir al CRM luego de 2 segundos de mostrar el checklist de exito
            setTimeout(() => {
                router.push('/leads');
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'Error al actualizar la contraseña');
        } finally {
            setIsLoading(false);
        }
    };

    // Variables dinámicas
    const primaryColor = tenantConfig?.color_primary || '#2CDB9B';
    const logoUrl = tenantConfig?.logo_url || null;
    const companyName = tenantConfig?.nombre || 'Opps One';

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            <div className="w-full max-w-sm text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">

                <div className="flex justify-center mb-6">
                    {logoUrl ? (
                        <img src={logoUrl} alt={companyName} className="h-16 object-contain" />
                    ) : (
                        <div className="h-16 w-16 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                            <span className="text-xl font-bold">{companyName.charAt(0)}</span>
                        </div>
                    )}
                </div>

                {!success ? (
                    <>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                Establecer contraseña
                            </h2>
                            <p className="mt-2 text-sm text-gray-500 font-medium">
                                Por favor, crea una nueva contraseña segura para tu acceso en <strong>{companyName}</strong>.
                            </p>
                        </div>

                        <form onSubmit={handleSetPassword} className="space-y-4 text-left mt-8">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Nueva</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repite tu contraseña"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-4 py-3 rounded-xl text-white font-semibold shadow-md border hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                            >
                                {isLoading ? 'Guardando...' : 'Guardar contraseña'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="bg-green-50 text-green-700 p-8 rounded-2xl border border-green-100 space-y-4">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h3 className="text-xl font-bold">¡Contraseña guardada!</h3>
                        <p className="text-sm">Redirigiendo a tu panel...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
