"use client";

import { PanelPageLayout as PageLayout } from "@/components/ui/PanelPageLayout";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { useState } from "react";

const CITAS_TABS = [
    { id: 'PARA_PROGRAMAR', label: 'Citas para Programar' },
    { id: 'PROGRAMADAS', label: 'Citas Programadas' },
    { id: 'DESAPROBADOS', label: 'Desaprobados' },
];

export default function CitasPage() {
    const [activeTab, setActiveTab] = useState('PARA_PROGRAMAR');

    return (
        <PageLayout title="Citas">
            <div className="mb-6">
                <FilterTabs
                    tabs={CITAS_TABS}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm min-h-[400px]">
                <div className="text-slate-500">Módulo de Citas (en construcción)</div>
            </div>
        </PageLayout>
    );
}
