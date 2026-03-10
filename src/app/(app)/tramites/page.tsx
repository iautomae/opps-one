"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { NuevoTramiteModal } from '@/components/tramites/NuevoTramiteModal';
import { supabase } from '@/lib/supabase';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { PanelPageLayout } from '@/components/ui/PanelPageLayout';
import { TramitesTableBase, type TramiteRow } from '@/components/tramites/TramitesTableBase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function TramitesPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tramites, setTramites] = useState<TramiteRow[]>([]);

    const searchParams = useSearchParams();
    const categoria = searchParams.get('categoria');

    const [activeTab, setActiveTab] = useState('LICENCIAS');
    const [activeSubTab, setActiveSubTab] = useState('ALL');

    const TRAMITES_TABS = [
        { id: 'LICENCIAS', label: 'Licencias' },
        { id: 'TARJETA', label: 'Tarjeta de Propiedad' },
        { id: 'OTROS', label: 'Otros' }
    ];

    const LICENCIAS_SUBTABS = [
        { id: 'ALL', label: 'Todas' },
        { id: 'L1', label: 'L1' },
        { id: 'L2', label: 'L2' },
        { id: 'L3', label: 'L3' },
        { id: 'L4', label: 'L4' },
        { id: 'L5', label: 'L5' },
        { id: 'L6', label: 'L6' }
    ];

    const TARJETA_SUBTABS = [
        { id: 'ALL', label: 'Todas' },
        { id: 'ARMA_NUEVA', label: 'Arma Nueva' },
        { id: 'TRANSFERENCIA', label: 'Transferencia' }
    ];

    const fetchTramites = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('tramites')
                .select('*')
                .eq('estado_general', 'PENDIENTE')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTramites(data || []);
        } catch (error) {
            console.error('Error fetching tramites:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTramites();
    }, []);

    useEffect(() => {
        if (categoria === 'licencias') {
            setActiveTab('LICENCIAS');
            setActiveSubTab('ALL');
        } else if (categoria === 'tarjeta') {
            setActiveTab('TARJETA');
            setActiveSubTab('ALL');
        } else if (categoria === 'otros') {
            setActiveTab('OTROS');
            setActiveSubTab('ALL');
        } else {
            // Default active tab
            setActiveTab('LICENCIAS');
        }
    }, [categoria]);

    const filteredTramites = tramites.filter(t => {
        let matchesTab = true;
        if (activeTab === 'LICENCIAS') {
            if (activeSubTab === 'ALL') {
                matchesTab = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].includes(t.tipo_tramite);
            } else {
                matchesTab = t.tipo_tramite === activeSubTab;
            }
        } else if (activeTab === 'TARJETA') {
            matchesTab = t.tipo_tramite === 'TP' || t.tipo_tramite === 'TARJETA DE PROPIEDAD';
        } else if (activeTab === 'OTROS') {
            matchesTab = t.tipo_tramite === 'OTROS' || (!['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'TP', 'TARJETA DE PROPIEDAD'].includes(t.tipo_tramite));
        }

        return matchesTab;
    });

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-brand-primary" size={48} />
            </div>
        );
    }

    const tabCounts = {
        LICENCIAS: tramites.filter(t => ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].includes(t.tipo_tramite)).length,
        TARJETA: tramites.filter(t => t.tipo_tramite === 'TP' || t.tipo_tramite === 'TARJETA DE PROPIEDAD').length,
        OTROS: tramites.filter(t => t.tipo_tramite === 'OTROS' || (!['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'TP', 'TARJETA DE PROPIEDAD'].includes(t.tipo_tramite))).length,
    };

    return (
        <PanelPageLayout>
            <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                <div className="flex items-center shrink-0 overflow-x-auto hide-scrollbar flex-1">
                    <h1 className="text-xl font-bold text-slate-800">
                        {TRAMITES_TABS.find(t => t.id === activeTab)?.label || 'Trámites'}
                    </h1>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 bg-brand-primary text-white flex-shrink-0 px-4 py-1.5 rounded-lg hover:brightness-110 transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-brand-primary/20 h-8"
                >
                    <Plus size={14} />
                    Nuevo Trámite
                </button>
            </div>

            {activeTab === 'LICENCIAS' && (
                <div className="flex items-center gap-2 mb-3 shrink-0 overflow-x-auto pb-1 hide-scrollbar">
                    {LICENCIAS_SUBTABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveSubTab(tab.id);
                            }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border",
                                activeSubTab === tab.id
                                    ? "bg-brand-primary/10 text-brand-primary border-brand-primary"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {activeTab === 'TARJETA' && (
                <div className="flex items-center gap-2 mb-4 shrink-0 overflow-x-auto pb-1 hide-scrollbar">
                    {TARJETA_SUBTABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={cn(
                                "px-2 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border",
                                activeSubTab === tab.id
                                    ? "bg-brand-primary/10 text-brand-primary border-brand-primary"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            <TramitesTableBase tramites={filteredTramites} onRefresh={fetchTramites} hideProgressColumn={activeTab !== 'LICENCIAS' || activeSubTab === 'ALL'} />

            <NuevoTramiteModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={async (data) => {
                    if (!user) {
                        alert("Error: Usuario no autenticado.");
                        return;
                    }

                    let faseActual: string | null = null;
                    if (['L4', 'L5'].includes(data.tipo_tramite)) {
                        faseActual = data.modalidad === 'INICIAL' ? 'CARNET' : 'LICENCIA';
                    } else if (data.tipo_tramite.startsWith('L')) {
                        faseActual = 'LICENCIA';
                    }

                    const newTramite = {
                        usuario_creador_id: user.id,
                        cliente_nombre: data.cliente_nombre,
                        cliente_dni: data.cliente_dni || null,
                        cliente_telefono: data.cliente_telefono || null,
                        tipo_tramite: data.tipo_tramite,
                        modalidad: data.modalidad || 'INICIAL',
                        fase_actual: faseActual,
                        sucamec_expediente: data.sucamec_expediente || null,
                        provincia: data.provincia || null,
                        notas: data.notas || null,
                        estado_general: 'PENDIENTE',
                        sel_ruc10: data.sel_ruc10 || null,
                        sel_dni: data.sel_dni || null,
                        sel_clave: data.sel_clave || null,
                    };

                    const { data: insertedTramite, error: tramiteError } = await supabase
                        .from('tramites')
                        .insert(newTramite as any)
                        .select()
                        .single();

                    if (tramiteError || !insertedTramite) {
                        console.error("Error creating tramite:", tramiteError);
                        alert("Error al crear expediente.");
                        return;
                    }

                    let reqList: string[] = [];
                    if (data.tipo_tramite === 'L4' || data.tipo_tramite === 'L5') {
                        if (data.modalidad === 'INICIAL') {
                            reqList = ['Examen Psicológico (Carnet)', 'Curso Sucamec (Carnet)', 'Examen Psicosomático (Licencia)', 'Antecedentes Penales'];
                        } else {
                            reqList = ['Examen Psicosomático', 'Antecedentes Penales', 'Copia de Licencia Vencida'];
                        }
                    } else if (data.tipo_tramite === 'TP') {
                        reqList = data.modalidad === 'TRANSFERENCIA'
                            ? ['Contrato de Transferencia', 'DNI del Vendedor', 'DNI del Comprador']
                            : ['Contrato de Compra/Venta', 'Factura', 'DNI vigente', 'Formulario Múltiple'];
                    } else if (data.tipo_tramite === 'OTROS') {
                        reqList = ['Documento de identidad', 'Formulario de solicitud'];
                    } else { // L1, L2, L3, L6
                        reqList = ['Certificado médico', 'Antecedentes penales', 'DNI vigente', 'Foto pasaporte'];
                    }

                    const requisitos = reqList.map((tipo_requisito: string) => ({
                        tramite_id: insertedTramite.id,
                        tipo_requisito,
                        estado: 'PENDIENTE',
                    }));

                    const { error: reqError } = await supabase
                        .from('tramite_requisitos')
                        .insert(requisitos as any);

                    if (reqError) {
                        console.error("Error creating requirements:", reqError);
                        alert("Expediente creado, pero falló la generación de requisitos. Por favor agregar manualmente.");
                    } else {
                        fetchTramites();
                    }

                    setIsModalOpen(false);
                }}
            />
        </PanelPageLayout>
    );
}
