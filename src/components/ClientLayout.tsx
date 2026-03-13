"use client";

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sidebar } from "@/components/Sidebar";
import { SubSidebar } from "@/components/SubSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ArrowLeft, Eye } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { profile, isImpersonating, exitImpersonation } = useProfile();

    // ADJUSTED MARGIN: Floating sidebar (16px left + 80px width + 16px gap = 112px)
    const marginClass = user ? "ml-[112px]" : "ml-0";

    return (
        <div className="flex bg-background min-h-screen">
            {/* Impersonation Banner */}
            {isImpersonating && profile && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-brand-primary text-white h-9 flex items-center justify-center gap-3 shadow-lg shadow-brand-primary/20">
                    <Eye size={14} className="opacity-80" />
                    <span className="text-xs font-bold tracking-wide">
                        Visualizando como: {profile.email}
                        {profile.role === 'tenant_owner' ? ' (Propietario)' : ' (Empleado)'}
                    </span>
                    <button
                        onClick={exitImpersonation}
                        className="flex items-center gap-1 ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold rounded-lg transition-all"
                    >
                        <ArrowLeft size={12} />
                        Regresar a mi panel
                    </button>
                </div>
            )}

            <Sidebar />
            <SubSidebar />

            <main
                className={cn(
                    "flex-1 min-h-screen py-4 pr-8 relative z-0 transition-all duration-300",
                    marginClass,
                    isImpersonating && "pt-[52px]"
                )}
            >
                {children}
            </main>
        </div>
    );
}
