"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
    FileText, Users, Briefcase, Shirt, Heart, Globe, Zap, Package, Layers, Target, Building2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Platform {
    id: string;
    name: string;
    description: string;
    icon: string;      // lucide icon name stored in DB
    color: string;      // color key: "blue", "emerald", etc.
    is_active: boolean;
    created_at: string;
    route_key: string;  // static key for routing: "leads", "tramites", etc.
}

// Known route keywords — used to derive route_key from platform name
const KNOWN_ROUTE_KEYWORDS = ['leads', 'tramites', 'reclutamiento', 'textil', 'dashboard'];

/** Derive a stable route_key from a platform name. e.g. "Escolta Leads" → "leads" */
export function deriveRouteKey(name: string): string {
    const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const keyword of KNOWN_ROUTE_KEYWORDS) {
        if (normalized.includes(keyword)) return keyword;
    }
    // Fallback: full normalized name with underscores
    return normalized.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Map icon names to actual Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
    FileText, Users, Briefcase, Shirt, Heart, Globe, Zap, Package, Layers, Target, Building2,
};

// Map color names to Tailwind classes
const COLOR_MAP: Record<string, { text: string; bg: string; border: string }> = {
    blue: { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
    emerald: { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    purple: { text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
    amber: { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    rose: { text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
    cyan: { text: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
    indigo: { text: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
    orange: { text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
};

export function getIconComponent(iconName: string): LucideIcon {
    return ICON_MAP[iconName] || Layers;
}

export function getColorClasses(colorName: string) {
    return COLOR_MAP[colorName] || COLOR_MAP.blue;
}

export function usePlatforms() {
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPlatforms = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
            const res = await fetch('/api/admin/platforms', { headers });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al cargar plataformas');
            // Enrich each platform with a stable route_key
            const enriched = (data.platforms || []).map((p: Platform) => ({
                ...p,
                route_key: p.route_key || deriveRouteKey(p.name),
            }));
            setPlatforms(enriched);
        } catch (err: any) {
            console.error('usePlatforms fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlatforms();
    }, [fetchPlatforms]);

    const createPlatform = async (name: string, description: string): Promise<Platform | null> => {
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch('/api/admin/platforms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ name, description }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al crear plataforma');

            // Refresh list
            await fetchPlatforms();
            return data.platform;
        } catch (err: any) {
            throw err;
        }
    };

    const updatePlatform = async (id: string, name: string, description: string): Promise<void> => {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch('/api/admin/platforms', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ id, name, description }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al actualizar plataforma');
        await fetchPlatforms();
    };

    const reorderPlatforms = async (reorderedPlatforms: Platform[]): Promise<void> => {
        setPlatforms(reorderedPlatforms); // Optimistic
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const reorder = reorderedPlatforms.map((p, i) => ({ id: p.id, sort_order: i }));
        const res = await fetch('/api/admin/platforms', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ reorder }),
        });
        if (!res.ok) await fetchPlatforms(); // Revert on error
    };

    const deletePlatform = async (id: string): Promise<void> => {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch('/api/admin/platforms', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al eliminar plataforma');
        await fetchPlatforms();
    };

    return { platforms, loading, error, createPlatform, updatePlatform, deletePlatform, reorderPlatforms, refetch: fetchPlatforms };
}
