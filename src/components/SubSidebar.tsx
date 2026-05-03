"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    ChevronRight,
    LayoutGrid,
    Settings2,
    Bell,
    FileText,
    Users
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useUI } from '@/hooks/useUI';
import { useProfile } from '@/hooks/useProfile';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const SUB_MENU_CONFIG = {
    dashboard: {
        title: 'Dashboard',
        items: [
            { label: 'Vista General', href: '/', icon: LayoutGrid },
            { label: 'Notificaciones', href: '/notifications', icon: Bell },
        ]
    },
    tramites: {
        title: 'Trámites',
        items: [
            { label: 'Licencias', href: '/tramites?categoria=licencias', icon: FileText },
            { label: 'Tarjeta de Propiedad', href: '/tramites?categoria=tarjeta', icon: FileText },
            { label: 'Otros', href: '/tramites?categoria=otros', icon: FileText },
        ]
    },
    settings: {
        title: 'Ajustes',
        items: [
            { label: 'Equipo', href: '/settings/team', icon: Users },
            { label: 'Seguridad', href: '/settings/profile', icon: Settings2 },
        ]
    }
};

export function SubSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { activeCategory, isSubSidebarOpen, setSubSidebarOpen } = useUI();
    const { profile, isImpersonating } = useProfile();

    // We are NOT auto-opening anymore as per user request ("solo cuando se clickeado").
    // But we close it if the pathname or search parameters change (user clicked an item)
    React.useEffect(() => {
        setSubSidebarOpen(false);
    }, [pathname, searchParams, setSubSidebarOpen]);

    if (!activeCategory || !isSubSidebarOpen) return null;

    const config = SUB_MENU_CONFIG[activeCategory as keyof typeof SUB_MENU_CONFIG];
    if (!config) return null;

    // "Equipo" only visible to tenant_owner (or admin impersonating one)
    const isTenantOwner = profile?.role === 'tenant_owner';
    const isAdminImpersonating = profile?.role === 'admin' && isImpersonating;
    const filteredItems = config.items.filter(item => {
        if (item.href === '/settings/team' && !isTenantOwner && !isAdminImpersonating) return false;
        return true;
    });

    return (
        <>
            {/* Invisible backdrop to dismiss on outside click */}
            {isSubSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setSubSidebarOpen(false)}
                />
            )}
            <div className={cn(
                "fixed left-[112px] top-4 bottom-4 w-64 bg-white rounded-2xl border border-slate-100 z-50 transition-all duration-300 transform shadow-2xl animate-in slide-in-from-left duration-300 overflow-hidden",
                isSubSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0 pointer-events-none"
            )}>
                <div className="h-full flex flex-col p-6">
                    <div className="flex justify-between items-center mb-6 px-3">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {config.title}
                        </h3>
                    </div>

                    <nav className="space-y-1">
                        {filteredItems.map((item) => {
                            const isActive = pathname === item.href;
                            // Preserve ?view_as= during impersonation
                            const viewAs = searchParams.get('view_as');
                            const hrefWithParams = viewAs
                                ? `${item.href}${item.href.includes('?') ? '&' : '?'}view_as=${viewAs}`
                                : item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={hrefWithParams}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                                        isActive || (pathname === '/tramites' && item.href.includes('?categoria=') && typeof window !== 'undefined' && window.location.search === item.href.split('?')[1] ? "??" + window.location.search : "")
                                            ? "bg-brand-turquoise/10 text-brand-turquoise"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} className={cn(isActive || (pathname === '/tramites' && item.href.includes('?categoria=') && typeof window !== 'undefined' && window.location.search === '?' + item.href.split('?')[1]) ? "text-brand-turquoise" : "text-gray-400 group-hover:text-gray-600")} />
                                        <span>{item.label}</span>
                                    </div>
                                    <ChevronRight size={14} className={cn("transition-transform opacity-0 group-hover:opacity-100", (isActive || (pathname === '/tramites' && item.href.includes('?categoria=') && typeof window !== 'undefined' && window.location.search === '?' + item.href.split('?')[1])) && "opacity-100")} />
                                </Link>
                            );
                        })}
                    </nav>
                </div>

            </div>
        </>
    );
}
