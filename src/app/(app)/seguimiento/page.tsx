"use client";

import { PanelPageLayout } from "@/components/ui/PanelPageLayout";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { TramitesTableBase, type TramiteRow } from '@/components/tramites/TramitesTableBase';
import { Loader2 } from 'lucide-react';

const SEGUIMIENTO_TABS = [
    { id: 'EN_PROCESO', label: 'Seguimiento de Trámite' },
    { id: 'OBSERVADOS', label: 'Observados' },
];

export default function SeguimientoPage() {
    const [activeTab, setActiveTab] = useState('EN_PROCESO');
    const [tramites, setTramites] = useState<TramiteRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTramites = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('tramites')
                .select('*')
                .in('estado_general', ['EN_PROCESO', 'OBSERVADO'])
                .order('updated_at', { ascending: false });

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

    const filteredTramites = tramites.filter(t => {
        if (activeTab === 'EN_PROCESO') return t.estado_general === 'EN_PROCESO';
        if (activeTab === 'OBSERVADOS') return t.estado_general === 'OBSERVADO';
        return false;
    });

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-brand-primary" size={48} />
            </div>
        );
    }

    const tabCounts = {
        EN_PROCESO: tramites.filter(t => t.estado_general === 'EN_PROCESO').length,
        OBSERVADOS: tramites.filter(t => t.estado_general === 'OBSERVADO').length,
    };

    return (
        <PanelPageLayout>
            <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                <div className="flex items-center shrink-0 overflow-x-auto hide-scrollbar flex-1">
                    <FilterTabs
                        tabs={SEGUIMIENTO_TABS.map(tab => ({ ...tab, count: tabCounts[tab.id as keyof typeof tabCounts] }))}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />
                </div>
            </div>

            <TramitesTableBase tramites={filteredTramites} onRefresh={fetchTramites} />
        </PanelPageLayout>
    );
}
