"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle, Upload, DollarSign, Calendar, History, Trash2, Save } from 'lucide-react';
import { Database } from '@/types/database.types';

type Tramite = Database['public']['Tables']['tramites']['Row'];
type Requisito = Database['public']['Tables']['tramite_requisitos']['Row'];
type RequisitoEstado = Database['public']['Enums']['requisito_estado'];

export default function TramiteDetallePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const { user } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [tramite, setTramite] = useState<Tramite | null>(null);
    const [requisitos, setRequisitos] = useState<Requisito[]>([]);

    // Form states
    const [pago1, setPago1] = useState<string>('');
    const [debe, setDebe] = useState<string>('');
    const [estadoGeneral, setEstadoGeneral] = useState<string>('');
    const [sucamecExpediente, setSucamecExpediente] = useState<string>('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Tramite
            const { data: tData, error: tError } = await supabase
                .from('tramites')
                .select('*')
                .eq('id', id)
                .single();

            if (tError) throw tError;
            if (tData) {
                setTramite(tData);
                setPago1(tData.pago1?.toString() || '');
                setDebe(tData.debe?.toString() || '');
                setEstadoGeneral(tData.estado_general);
                setSucamecExpediente(tData.sucamec_expediente || '');
            }

            // Fetch Requisitos
            const { data: rData, error: rError } = await supabase
                .from('tramite_requisitos')
                .select('*')
                .eq('tramite_id', id)
                .order('created_at', { ascending: true });

            if (rError) throw rError;
            if (rData) setRequisitos(rData);

        } catch (error) {
            console.error('Error fetching data:', error);
            alert("No se pudo cargar la información del expediente.");
            router.push('/tramites');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleUpdateTramite = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('tramites')
                .update({
                    pago1: parseFloat(pago1) || null,
                    debe: parseFloat(debe) || null,
                    estado_general: estadoGeneral as any,
                    sucamec_expediente: sucamecExpediente || null
                })
                .eq('id', id);

            if (error) throw error;
            // TODO: standard toast
            fetchData();
        } catch (error) {
            console.error('Error updating tramite:', error);
            alert("Error al actualizar los datos.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateRequisitoInfo = async (id: string, updates: Partial<Requisito>) => {
        try {
            const { error } = await supabase
                .from('tramite_requisitos')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            // Optimistic UI update
            setRequisitos(prev => prev.map(req => req.id === id ? { ...req, ...updates } : req));
        } catch (error) {
            console.error('Error updating requisito:', error);
        }
    };

    // Replace actual upload logic for now with a mock visual update.
    // Given the constraints we'll implement full storage logic in an isolated function later
    const handleFileUpload = async (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tramite || !user) return;

        try {
            // Generate a unique filename: tramite_id/req_id_timestamp.ext
            const fileExt = file.name.split('.').pop();
            const fileName = `${tramite.id}/${reqId}_${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('tramites-archivos')
                .upload(fileName, file, { upsert: true });

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('tramites-archivos')
                .getPublicUrl(fileName);

            // Update database requirement record
            await handleUpdateRequisitoInfo(reqId, {
                estado: 'REVISADO',
                archivo_url: publicUrlData.publicUrl
            });

            alert("Archivo subido exitosamente.");

        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Error al subir el archivo.");
        }
    };

    if (isLoading || !tramite) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-brand-primary" size={48} />
            </div>
        );
    }

    const formatReqName = (tipo: string) => {
        return tipo.replace(/_/g, ' ').replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
    };

    return (
        <div className="flex-1 flex flex-col p-8 pb-32">

            {/* Header / Breadcrumb */}
            <button
                onClick={() => router.push('/tramites')}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-primary transition-colors w-fit mb-6 font-medium"
            >
                <ArrowLeft size={16} /> Volver a Registro
            </button>
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{tramite.cliente_nombre}</h1>
                        <span className="bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-3 py-1 rounded-full text-xs font-bold">
                            {tramite.tipo_tramite}
                        </span>
                        {tramite.modalidad && (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold">
                                {tramite.modalidad.replace('_', ' ')}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm flex gap-4">
                        <span className="flex items-center gap-1"><FileText size={14} /> {tramite.id.split('-')[0]}</span>
                        {tramite.provincia && <span className="flex items-center gap-1 text-slate-500">📍 {tramite.provincia}</span>}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleUpdateTramite}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-xl hover:bg-brand-primary/90 transition-colors text-sm font-semibold shadow-sm"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar Cambios
                    </button>
                </div>
            </div>

            {/* Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Panel Izquierdo: Requisitos */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Stepper Component */}
                    {['L4', 'L5'].includes(tramite.tipo_tramite) && tramite.modalidad === 'INICIAL' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="font-bold text-slate-800 text-sm mb-5">Progreso de Fases</h3>
                            <div className="flex items-center gap-4">
                                {['CARNET', 'LICENCIA'].map((fase, i, arr) => {
                                    const currentIndex = arr.indexOf(tramite.fase_actual || 'CARNET');
                                    const isCompleted = currentIndex > i || tramite.estado_general === 'FINALIZADO';
                                    const isActive = currentIndex === i && tramite.estado_general !== 'FINALIZADO';
                                    return (
                                        <React.Fragment key={fase}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${isCompleted ? 'bg-brand-primary text-white' : isActive ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/30 ring-4 ring-brand-primary/5' : 'bg-slate-100 text-slate-400'}`}>
                                                    {isCompleted ? <CheckCircle2 size={16} /> : i + 1}
                                                </div>
                                                <span className={`font-bold text-sm tracking-wide ${isActive || isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                                                    {fase === 'CARNET' ? '1. Fase Carnet' : '2. Fase Licencia'}
                                                </span>
                                            </div>
                                            {i < arr.length - 1 && (
                                                <div className={`flex-1 h-1 rounded-full ${isCompleted ? 'bg-brand-primary/50' : 'bg-slate-100'}`} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {['CARNET', 'LICENCIA'].indexOf(tramite.fase_actual || 'CARNET') === 0 && tramite.estado_general !== 'FINALIZADO' && (
                                    <button
                                        onClick={async () => {
                                            if (confirm(`¿Aprobar fase Carnet y avanzar a Licencia?`)) {
                                                await supabase.from('tramites').update({ fase_actual: 'LICENCIA' }).eq('id', tramite.id);
                                                setTramite({ ...tramite, fase_actual: 'LICENCIA' });
                                            }
                                        }}
                                        className="ml-auto px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm"
                                    >
                                        Avanzar a Licencia
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                <CheckCircle2 className="text-brand-primary" size={20} />
                                Lista de Requisitos ({tramite.tipo_tramite})
                            </h2>
                            <span className="text-sm font-medium text-slate-500">
                                {requisitos.filter(r => r.estado === 'APROBADO').length} de {requisitos.length} Completados
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {requisitos.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">No hay requisitos para este trámite.</div>
                            ) : (
                                (() => {
                                    const renderReq = (req: Requisito) => (
                                        <div key={req.id} className="p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:bg-slate-50/50 transition-colors">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <div className={`w-3 h-3 rounded-full ${req.estado === 'APROBADO' ? 'bg-emerald-500' :
                                                        req.estado === 'OBSERVADO' ? 'bg-amber-500' :
                                                            req.estado === 'RECHAZADO' ? 'bg-red-500' :
                                                                req.estado === 'REVISADO' ? 'bg-blue-500' :
                                                                    'bg-slate-300'
                                                        }`} />
                                                    <h3 className="font-semibold text-slate-800 text-sm">{formatReqName(req.tipo_requisito)}</h3>
                                                </div>
                                                {req.archivo_url && (
                                                    <a href={req.archivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-primary ml-6 hover:underline cursor-pointer block">Ver documento adjunto</a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <select
                                                    value={req.estado}
                                                    onChange={(e) => handleUpdateRequisitoInfo(req.id, { estado: e.target.value as RequisitoEstado })}
                                                    className="bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                                                >
                                                    <option value="PENDIENTE">⏳ Pendiente</option>
                                                    <option value="REVISADO">👁️ Revisado</option>
                                                    <option value="OBSERVADO">⚠️ Observado</option>
                                                    <option value="APROBADO">✅ Aprobado</option>
                                                    <option value="RECHAZADO">❌ Rechazado</option>
                                                </select>
                                                <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 cursor-pointer transition-colors text-sm font-medium">
                                                    <Upload size={14} />
                                                    <span className="hidden sm:inline">Subir PDF</span>
                                                    <input
                                                        type="file"
                                                        accept=".pdf,image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleFileUpload(req.id, e)}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    );

                                    // Si es L4/L5 Inicial, los separamos por fase
                                    if (['L4', 'L5'].includes(tramite.tipo_tramite) && tramite.modalidad === 'INICIAL') {
                                        const reqsCarnet = requisitos.filter(r => r.tipo_requisito.includes('(Carnet)'));
                                        const reqsLicencia = requisitos.filter(r => !r.tipo_requisito.includes('(Carnet)'));

                                        return (
                                            <>
                                                <div className="bg-slate-50/80 px-5 py-2.5 border-b border-t border-slate-100 text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2 relative">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                    Fase 1: Carnet
                                                </div>
                                                <div className="divide-y divide-slate-100">
                                                    {reqsCarnet.map(renderReq)}
                                                </div>

                                                <div className="bg-slate-50/80 px-5 py-2.5 border-b border-t border-slate-100 text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2 relative mt-4">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                    Fase 2: Licencia
                                                </div>
                                                <div className="divide-y divide-slate-100">
                                                    {reqsLicencia.map(renderReq)}
                                                </div>
                                            </>
                                        );
                                    }

                                    // Si es flujo normal, mostramos todo directo
                                    return <div className="divide-y divide-slate-100">{requisitos.map(renderReq)}</div>;
                                })()
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel Derecho: Historial y Cobranza */}
                <div className="space-y-6">

                    {/* Tarjeta: Cobranza */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-md mb-6 relative">
                            <span className="w-1.5 h-6 bg-brand-primary rounded-full absolute -left-6"></span>
                            <DollarSign className="text-slate-400" size={18} /> Resumen Financiero
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Pago a cuenta (PAGO1)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-slate-500">S/</span>
                                    <input
                                        type="number"
                                        value={pago1}
                                        onChange={(e) => setPago1(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-slate-800 font-medium"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Deuda Pendiente</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-amber-600">S/</span>
                                    <input
                                        type="number"
                                        value={debe}
                                        onChange={(e) => setDebe(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-4 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-amber-800 font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta: Estado SUCAMEC e Historial */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-md mb-6 relative">
                            <span className="w-1.5 h-6 bg-brand-secondary rounded-full absolute -left-6"></span>
                            <History className="text-slate-400" size={18} /> Gestión SUCAMEC
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Expediente SUCAMEC</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><FileText size={16} /></span>
                                    <input
                                        type="text"
                                        value={sucamecExpediente}
                                        onChange={(e) => setSucamecExpediente(e.target.value)}
                                        placeholder="Ej. EX-2026-6453"
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-slate-800 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Estado General</label>
                                <select
                                    value={estadoGeneral}
                                    onChange={(e) => setEstadoGeneral(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-slate-800 font-medium"
                                >
                                    <option value="PENDIENTE">PENDIENTE</option>
                                    <option value="EN_PROCESO">EN PROCESO (SUCAMEC)</option>
                                    <option value="OBSERVADO">OBSERVADO</option>
                                    <option value="FINALIZADO">FINALIZADO</option>
                                </select>
                            </div>

                            {/* Alertas */}
                            {estadoGeneral === 'OBSERVADO' && (
                                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200/60">
                                    <div className="flex gap-3">
                                        <AlertCircle className="text-amber-500 shrink-0" size={18} />
                                        <div>
                                            <h4 className="text-sm font-semibold text-amber-800">Trámite Observado</h4>
                                            <p className="text-xs text-amber-700 mt-1">Recuerda que tienes un plazo legal máximo para subsanar esta observación ante SUCAMEC.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}
