"use client";

import React from 'react';
import { PanelPageLayout } from '@/components/ui/PanelPageLayout';
import { DollarSign } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FinanzasPage() {
    return (
        <PanelPageLayout
            title="Finanzas de Trámites"
            subtitle="Gestiona los ingresos, egresos y facturación de los expedientes."
        >
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
                <EmptyState
                    icon={DollarSign}
                    title="Módulo de Finanzas en Desarrollo"
                    description="Esta sección está siendo construida y estará disponible pronto."
                />
            </div>
        </PanelPageLayout>
    );
}
