"use client";

import React from 'react';
import { Shield, Clock, LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PendingApprovalPage() {
    const { signOut } = useAuth();
    const { profile, loading } = useProfile();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (profile?.has_leads_access) {
                router.push('/leads');
            } else if (profile?.features?.['tramites']) {
                router.push('/tramites');
            }
        }
    }, [profile, loading, router]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#F9FAFB] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-black/5 border border-gray-100 p-10 text-center space-y-8 animate-in zoom-in-95 duration-500">

                {/* Animated Icon Container */}
                <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-brand-turquoise/20 rounded-full animate-pulse" />
                    <div className="relative flex items-center justify-center w-full h-full bg-white rounded-full border-4 border-brand-turquoise shadow-inner">
                        <Clock className="text-brand-turquoise" size={40} />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Shield className="text-brand-turquoise" size={18} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Acceso Resguardado</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cuenta en Revisión</h1>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        ¡Hola! Hemos recibido tu registro correctamente. Por seguridad y para garantizar la mejor experiencia, un administrador de <span className="font-bold text-gray-900">Opps One</span> activará tu cuenta manualmente en breve.
                    </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-left space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-turquoise" />
                        ¿Qué sigue ahora?
                    </h4>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-white rounded-md border border-gray-100">
                                <Shield size={12} className="text-brand-turquoise" />
                            </div>
                            <p className="text-[11px] text-gray-600">Verificaremos tu identidad y los servicios solicitados.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-white rounded-md border border-gray-100">
                                <MessageSquare size={12} className="text-brand-turquoise" />
                            </div>
                            <p className="text-[11px] text-gray-600">Recibirás un mensaje de confirmación cuando tu acceso esté listo.</p>
                        </li>
                    </ul>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                    <button
                        onClick={handleSignOut}
                        className="w-full btn-primary py-4 text-xs font-bold shadow-lg shadow-brand-turquoise/20 flex items-center justify-center gap-2 group"
                    >
                        <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                        CERRAR SESIÓN
                    </button>
                </div>

                <p className="text-[10px] text-gray-300 font-medium">
                    Powered by Opps One • ID de Seguridad v2.0
                </p>
            </div>
        </div>
    );
}
