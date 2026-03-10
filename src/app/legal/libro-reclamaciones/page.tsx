"use client";

import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

export default function LibroReclamacionesPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [complaintType, setComplaintType] = useState<'RECLAMO' | 'QUEJA'>('RECLAMO');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        // Simulate submission
        setTimeout(() => {
            setStatus('success');
        }, 1500);
    };

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-brand-turquoise/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="text-brand-turquoise w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold text-white">¡Enviado con éxito!</h2>
                <p className="text-slate-400 max-w-sm">
                    Hemos recibido tu reclamación. Se ha enviado una copia a tu correo y nuestro equipo responderá en el plazo legal establecido.
                </p>
                <button
                    onClick={() => setStatus('idle')}
                    className="btn-primary py-3 px-8 text-sm"
                >
                    VOLVER AL FORMULARIO
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-turquoise">Indecopi</span>
                    <div className="h-px flex-1 bg-white/10" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white text-center">
                    Libro de <span className="text-brand-turquoise">Reclamaciones</span>
                </h1>
                <p className="text-slate-500 text-center text-sm">
                    Opps One - Conforme al reglamento de la Ley N° 29571.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8 bg-white/5 p-8 rounded-2xl border border-white/5">
                {/* consumer data */}
                <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white border-l-2 border-brand-turquoise pl-3">
                        1. Identificación del Consumidor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-medium ml-1">Nombre Completo</label>
                            <input required type="text" className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-brand-turquoise outline-none transition-colors" placeholder="Ej. Juan Pérez" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-medium ml-1">Documento (DNI/CE)</label>
                            <input required type="text" className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-brand-turquoise outline-none transition-colors" placeholder="8 dígitos" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs text-slate-400 font-medium ml-1">Correo Electrónico</label>
                            <input required type="email" className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-brand-turquoise outline-none transition-colors" placeholder="tu@correo.com" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs text-slate-400 font-medium ml-1">Domicilio</label>
                            <input required type="text" className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-brand-turquoise outline-none transition-colors" placeholder="Dirección completa" />
                        </div>
                    </div>
                </div>

                {/* service data */}
                <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white border-l-2 border-brand-turquoise pl-3">
                        2. Identificación del Bien o Servicio
                    </h3>
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-medium ml-1">Monto Reclamado (Opcional)</label>
                        <input type="text" className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-brand-turquoise outline-none transition-colors" placeholder="S/ 0.00" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-medium ml-1">Descripción del Servicio</label>
                        <textarea required rows={2} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-brand-turquoise outline-none transition-colors resize-none" placeholder="IA Agents, Consultoría, etc." />
                    </div>
                </div>

                {/* complaint detail */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white border-l-2 border-brand-turquoise pl-3">
                            3. Detalle de Reclamación
                        </h3>
                        <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-white/10">
                            {(['RECLAMO', 'QUEJA'] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setComplaintType(type)}
                                    className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${complaintType === type ? 'bg-brand-turquoise text-[#003327]' : 'text-slate-500'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-medium ml-1">Detalle (Explica qué sucedió)</label>
                            <textarea required rows={4} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-brand-turquoise outline-none transition-colors resize-none" placeholder="Escribe aquí tu detalle..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-medium ml-1">Pedido del Consumidor</label>
                            <textarea required rows={2} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-brand-turquoise outline-none transition-colors resize-none" placeholder="¿Qué solicitas de la empresa?" />
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-2 group"
                    >
                        {status === 'loading' ? 'ENVIANDO...' : (
                            <>
                                ENVIAR HOJA DE RECLAMACIÓN
                                <Send size={16} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                    <p className="mt-4 text-[10px] text-slate-500 text-center leading-relaxed">
                        Acepto que Opps One trate mis datos personales según la Política de Privacidad para fines de atención a este reclamo.
                    </p>
                </div>
            </form>
        </div>
    );
}
