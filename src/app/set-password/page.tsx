"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
    Lock,
    ArrowRight,
    Mail,
    Loader2,
    ShieldCheck,
    CheckCircle2,
    History,
    Eye,
    EyeOff
} from 'lucide-react';
import Link from 'next/link';

export default function SetPasswordPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [alreadyOnboarded, setAlreadyOnboarded] = useState(false);
    const [isRecovery, setIsRecovery] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session) {
                router.push('/login');
                return;
            }

            if (session.user.user_metadata?.onboarding_completed) {
                setAlreadyOnboarded(true);
            }

            setEmail(session.user.email || '');
            setLoading(false);
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecovery(true);
            }
        });

        checkSession();

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setUpdating(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            setError(error.message);
            setUpdating(false);
        } else {
            await supabase.auth.updateUser({
                data: { onboarding_completed: true }
            });

            setSuccess(true);
            setUpdating(false);

            setTimeout(async () => {
                await supabase.auth.signOut();
                router.push('/login');
            }, 2000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <Loader2 className="text-brand-turquoise animate-spin" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col items-center text-center">
                    {/* Logo Removido por simplicidad */}

                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-turquoise/10 border border-brand-turquoise/20 text-brand-turquoise text-xs font-bold uppercase tracking-wider mx-auto">
                            <ShieldCheck size={14} />
                            {isRecovery ? 'Recuperación de Acceso' : 'Configuración de Acceso'}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {alreadyOnboarded && !isRecovery ? 'Cuenta ya existente' : isRecovery ? 'Restablece tu clave' : 'Crea tu contraseña'}
                        </h3>
                    </div>
                </div>

                {alreadyOnboarded && !isRecovery ? (
                    <div className="space-y-6">
                        <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
                            <p className="text-amber-800 text-sm font-medium text-center leading-relaxed">
                                Parece que ya has configurado tu cuenta anteriormente. Para tu seguridad, no puedes crear otra contraseña desde este enlace.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <Link
                                href="/login"
                                className="w-full py-4 rounded-xl bg-brand-turquoise text-white text-sm font-bold shadow-md hover:bg-brand-turquoise/90 flex items-center justify-center gap-2 group transition-colors"
                            >
                                INGRESAR AL SISTEMA
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <button
                                onClick={() => router.push('/login?view=recovery')}
                                className="w-full py-4 text-xs font-bold text-gray-500 hover:text-brand-turquoise transition-colors flex items-center justify-center gap-2"
                            >
                                <History size={16} />
                                RECUPERAR CONTRASEÑA
                            </button>
                        </div>
                    </div>
                ) : !success ? (
                    <form onSubmit={handleSetPassword} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 ml-1">Tu correo electrónico</label>
                            <div className="relative opacity-60">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    readOnly
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-500 cursor-not-allowed outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 ml-1">Nueva contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-turquoise transition-colors" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Min. 6 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-12 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-turquoise/50 focus:border-brand-turquoise transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 ml-1">Confirmar contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-turquoise transition-colors" size={20} />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Repite tu contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-12 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-turquoise/50 focus:border-brand-turquoise transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                >
                                    {showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-red-600 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={updating}
                            className="w-full py-4 mt-2 rounded-xl bg-brand-turquoise text-white text-sm font-bold shadow-md hover:bg-brand-turquoise/90 flex items-center justify-center gap-2 group transition-all disabled:opacity-50"
                        >
                            {updating ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    {isRecovery ? 'RESTABLECER CONTRASEÑA' : 'ACTIVAR MI CUENTA'}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center space-y-4">
                        <div className="flex justify-center">
                            <CheckCircle2 className="text-green-500" size={50} />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900">{isRecovery ? '¡Clave actualizada!' : '¡Contraseña establecida!'}</h4>
                        <p className="text-gray-600 text-sm">
                            {isRecovery ? 'Tu contraseña ha sido restablecida con éxito.' : 'Tu cuenta ha sido activada correctamente.'} Redirigiendo al inicio de sesión...
                        </p>
                        <div className="flex justify-center pt-2">
                            <Loader2 className="text-green-500 animate-spin" size={24} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
