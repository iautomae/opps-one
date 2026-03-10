"use client";

import React, { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * PanelPageLayout — Reusable full-page panel layout.
 * 
 * Provides the exact same dimensions and spacing used by the Leads dashboard,
 * ensuring visual parity across all panel pages (Leads, Trámites, etc.).
 * 
 * Structure:
 *   Root (100vh - 2rem, overflow-hidden)
 *     → Padded container (pt-6 pb-6 px-8, flex-1)
 *       → Header section (title text-3xl + subtitle text-sm, mb-8)
 *       → Content area (flex-1 min-h-0, for filter tabs + DataPanel)
 * 
 * Usage:
 *   <PanelPageLayout
 *     title="Registro de Trámites"
 *     subtitle="Administra y da seguimiento a todos los expedientes."
 *     headerActions={<button>+ Nuevo</button>}
 *   >
 *     <FilterTabs ... />
 *     <DataPanel>
 *       <DataTable ... />
 *       <Pagination ... />
 *     </DataPanel>
 *   </PanelPageLayout>
 */

interface PanelPageLayoutProps {
    /** Page title — rendered as text-3xl bold (same as Leads) */
    title?: string;
    /** Subtitle below the title — rendered as text-sm text-gray-500 */
    subtitle?: string;
    /** Actions to render on the right side of the header (buttons, etc.) */
    headerActions?: ReactNode;
    /** Banner element rendered above the header (e.g. admin impersonation bar) */
    banner?: ReactNode;
    /** Main content: filter tabs, DataPanel with DataTable + Pagination, etc. */
    children: ReactNode;
    /** Additional classes for the root container */
    className?: string;
}

export function PanelPageLayout({
    title,
    subtitle,
    headerActions,
    banner,
    children,
    className,
}: PanelPageLayoutProps) {
    return (
        <div className={cn(
            "w-full flex flex-col animate-in fade-in duration-500 h-[calc(100vh-2rem)] overflow-hidden",
            className
        )}>
            {/* Optional banner (e.g. admin impersonation notice) */}
            {banner}

            {/* Padded content container — exact Leads spacing */}
            <div className="flex flex-col pt-6 pb-6 px-8 flex-1 overflow-hidden">
                {/* Header: title + subtitle + actions — mb-8 matches Leads */}
                {(title || subtitle || headerActions) && (
                    <div className="flex items-center justify-between mb-8 shrink-0">
                        <div className="space-y-1">
                            {title && (
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                                    {title}
                                </h1>
                            )}
                            {subtitle && (
                                <p className="text-gray-500 text-sm font-medium ml-1">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {headerActions && (
                            <div className="flex items-center gap-3">
                                {headerActions}
                            </div>
                        )}
                    </div>
                )}

                {/* Content area: flex-1 min-h-0 ensures correct shrinking */}
                <div className="flex flex-col h-full overflow-hidden">
                    {children}
                </div>
            </div>
        </div>
    );
}
