"use client";

import { PanelPageLayout } from "@/components/ui/PanelPageLayout";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { TramitesTableBase, type TramiteRow } from '@/components/tramites/TramitesTableBase';
import { Loader2 } from 'lucide-react';

const TERMINADOS_TABS = [
    { id: 'APROBADO', label: 'Aprobado' },
    { id: 'DESAPROBADO', label: 'Desaprobado' },
];

export default function TerminadosPage() {
    const [activeTab, setActiveTab] = useState('ALL');
    const [tramites, setTramites] = useState<TramiteRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTramites = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('tramites')
                .select('*')
                .eq('estado_general', 'FINALIZADO')
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

    // Here, we simulate the APROBADO / DESAPROBADO filter. 
    // Currently, the database doesn't have an explicit outcome column, so we show all finalizados for now,
    // but keep the tabs ready for when the backend is updated.
    const filteredTramites = tramites;

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-brand-primary" size={48} />
            </div>
        );
    }

    const tabCounts = {
        ALL: tramites.length,
        APROBADO: 0, // Placeholder until outcome is added
        DESAPROBADO: 0, // Placeholder until outcome is added
    };

    const ALL_TABS = [
        { id: 'ALL', label: 'Todos' },
        ...TERMINADOS_TABS
    ];

    return (
        <PanelPageLayout>
            <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                <div className="flex items-center shrink-0 overflow-x-auto hide-scrollbar flex-1">
                    <FilterTabs
                        tabs={ALL_TABS.map(tab => ({ ...tab, count: tabCounts[tab.id as keyof typeof tabCounts] }))}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />
                </div>
            </div>

            <TramitesTableBase tramites={filteredTramites} onRefresh={fetchTramites} />
        </PanelPageLayout>
    );
}
