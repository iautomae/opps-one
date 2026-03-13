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
                <div className="fixed top-0 left-0 right-0 z-[100] bg-[#0a0a0a] text-white h-9 flex items-center justify-center gap-3 shadow-lg border-b border-white/10">
                    <Eye size={14} className="text-brand-turquoise" />
                    <span className="text-xs font-medium tracking-wide text-white/70">
                        Visualizando como: <span className="text-brand-turquoise font-bold">{profile.full_name || profile.email}</span>
                        <span className="text-white/40 ml-1">
                            {profile.role === 'tenant_owner' ? '(Propietario)' : '(Empleado)'}
                        </span>
                    </span>
                    <button
                        onClick={exitImpersonation}
                        className="flex items-center gap-1 ml-4 px-3 py-1 bg-white/10 hover:bg-white/20 text-brand-turquoise text-[10px] font-bold rounded-lg transition-all border border-white/10"
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
