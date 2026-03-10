"use client";

import React from 'react';
import { PanelPageLayout } from '@/components/ui/PanelPageLayout';
import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function RequerimientosPage() {
    return (
        <PanelPageLayout
            title="Requerimientos Globales"
            subtitle="Administra y da seguimiento a todos los requisitos pendientes de los expedientes."
        >
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
                <EmptyState
                    icon={ClipboardList}
                    title="Módulo de Requerimientos en Desarrollo"
                    description="Esta sección está siendo construida y estará disponible pronto."
                />
            </div>
        </PanelPageLayout>
    );
}
