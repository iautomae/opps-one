"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useRouter } from "next/navigation";
import {
    Users, UserPlus, X, LoaderCircle, CheckCircle2, AlertCircle,
    ChevronDown, ChevronRight, Shield, Mail, Search, Crown, UserMinus
} from "lucide-react";
import { usePlatforms, getIconComponent, getColorClasses } from "@/hooks/usePlatforms";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ── Tabs disponibles por plataforma ──────────────────────────────────
// Cada plataforma tiene sub-secciones que el owner puede asignar individualmente.
// El key de cada tab se guarda en features como "plataforma:tab" (ej: "tramites:calendario")
const PLATFORM_TABS: Record<string, { label: string; tabs: { id: string; label: string }[] }> = {
    tramites: {
        label: "Trámites",
        tabs: [
            { id: "licencias", label: "Licencias" },
            { id: "tarjeta", label: "Tarjeta de Propiedad" },
            { id: "otros", label: "Otros Trámites" },
            { id: "calendario", label: "Calendario" },
            { id: "finanzas", label: "Finanzas" },
            { id: "requerimientos", label: "Requerimientos" },
        ],
    },
    leads: {
        label: "Leads",
        tabs: [],
    },
    citas: {
        label: "Citas",
        tabs: [
            { id: "programar", label: "Para Programar" },
            { id: "programadas", label: "Citas Programadas" },
            { id: "desaprobados", label: "Desaprobados" },
        ],
    },
    seguimiento: {
        label: "Seguimiento",
        tabs: [
            { id: "tramite", label: "Seguimiento de Trámite" },
            { id: "observados", label: "Observados" },
        ],
    },
    terminados: {
        label: "Terminados",
        tabs: [
            { id: "aprobado", label: "Aprobado" },
            { id: "desaprobado", label: "Desaprobado" },
        ],
    },
};

interface TeamMember {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    features: Record<string, any>;
    has_leads_access: boolean;
    status: 'active' | 'pending';
}

interface TenantAgent {
    id: string;
    nombre: string;
    pushover_user_1_name?: string;
    pushover_user_2_name?: string;
    pushover_user_3_name?: string;
}

export default function TeamPage() {
    const { profile, loading: profileLoading } = useProfile();
    const router = useRouter();
    const { platforms: dbPlatforms, loading: platformsLoading } = usePlatforms();

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({});
    const [isToggling, setIsToggling] = useState<string | null>(null);

    // Tenant agents (for advisor slot names)
    const [tenantAgents, setTenantAgents] = useState<TenantAgent[]>([]);

    // Invite modal
    const [showInvite, setShowInvite] = useState(false);
    const [inviteName, setInviteName] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);

    // Role change
    const [changingRole, setChangingRole] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    // ── Plataformas a las que el owner tiene acceso (usa route_key estático) ──
    const ownerPlatformKeys = React.useMemo(() => {
        if (!profile) return [];
        return dbPlatforms
            .map(p => p.route_key || p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_"))
            .filter(key => {
                if (key === "leads") return profile.features?.["leads"] || profile.has_leads_access;
                return profile.features?.[key];
            });
    }, [profile, dbPlatforms]);

    // ── Fetch team (via server-side API to bypass RLS) ──
    const fetchTeam = useCallback(async () => {
        if (!profile?.tenant_id) return;
        setLoading(true);
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch("/api/tenant/team", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMembers(data.members || []);
        } catch (err) {
            console.error("Error fetching team:", err);
        } finally {
            setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        if (!profileLoading && profile) {
            if (profile.role !== "tenant_owner") {
                router.push("/");
                return;
            }
            fetchTeam();

            // Fetch tenant agents for advisor slot names
            (async () => {
                try {
                    const token = (await supabase.auth.getSession()).data.session?.access_token;
                    const res = await fetch("/api/leads/tenant-agents", {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setTenantAgents(data.agents || []);
                    }
                } catch (err) {
                    console.error("Error fetching tenant agents:", err);
                }
            })();
        }
    }, [profile, profileLoading, fetchTeam, router]);

    // ── Invite member ──
    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch("/api/tenant/invite-member", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ email: inviteEmail.trim(), fullName: inviteName.trim() || null }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setMembers(prev => [...prev, {
                id: data.member.id,
                email: data.member.email,
                full_name: data.member.full_name || null,
                role: "client",
                features: {},
                has_leads_access: false,
                status: "pending" as const,
            }]);
            setInviteName("");
            setInviteEmail("");
            setShowInvite(false);
            setToast({ message: "Invitación enviada correctamente.", type: "success" });
            // Auto-select the new member
            setSelectedId(data.member.id);
        } catch (err: any) {
            setToast({ message: err.message || "Error al invitar.", type: "error" });
        } finally {
            setInviting(false);
        }
    };

    // ── Change role (promote/demote co-owner) ──
    const handleChangeRole = async (memberId: string, newRole: "tenant_owner" | "client") => {
        setChangingRole(true);
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch("/api/tenant/change-role", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ memberId, newRole }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setMembers(prev =>
                prev.map(m => m.id === memberId ? { ...m, role: newRole } : m)
            );
            setToast({
                message: newRole === "tenant_owner"
                    ? "Miembro promovido a Administrador."
                    : "Miembro degradado a Empleado.",
                type: "success",
            });
        } catch (err: any) {
            setToast({ message: err.message || "Error al cambiar rol.", type: "error" });
        } finally {
            setChangingRole(false);
        }
    };

    // ── Toggle platform access ──
    const togglePlatform = async (memberId: string, platformKey: string) => {
        const member = members.find(m => m.id === memberId);
        if (!member) return;

        const currentValue = platformKey === "leads"
            ? (member.features?.["leads"] || member.has_leads_access)
            : !!member.features?.[platformKey];
        const newValue = !currentValue;

        setIsToggling(platformKey);
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch("/api/admin/toggle-access", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ userId: memberId, featureKey: platformKey, newValue }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setMembers(prev =>
                prev.map(m =>
                    m.id === memberId
                        ? { ...m, features: data.features, has_leads_access: data.has_leads_access }
                        : m
                )
            );

            // Si se desactiva la plataforma, desactivar todos sus tabs también y refrescar
            if (!newValue && PLATFORM_TABS[platformKey]) {
                for (const tab of PLATFORM_TABS[platformKey].tabs) {
                    const tabKey = `${platformKey}:${tab.id}`;
                    if (member.features?.[tabKey]) {
                        await fetch("/api/admin/toggle-access", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({ userId: memberId, featureKey: tabKey, newValue: false }),
                        });
                    }
                }
                // Re-fetch to get clean state after batch updates
                fetchTeam();
            }
        } catch (err) {
            console.error("Error toggling platform:", err);
            setToast({ message: "Error al actualizar acceso.", type: "error" });
        } finally {
            setIsToggling(null);
        }
    };

    // ── Update leads advisor visibility ──
    const updateAdvisorVisibility = async (memberId: string, newVisibility: 'all' | number[]) => {
        setIsToggling('leads_advisors');
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch("/api/admin/toggle-access", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    userId: memberId,
                    featureKey: "leads",
                    newValue: true,
                    leadsVisibleAdvisors: newVisibility,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setMembers(prev =>
                prev.map(m =>
                    m.id === memberId
                        ? { ...m, features: data.features, has_leads_access: data.has_leads_access }
                        : m
                )
            );
        } catch (err) {
            console.error("Error updating advisor visibility:", err);
            setToast({ message: "Error al actualizar visibilidad de asesores.", type: "error" });
        } finally {
            setIsToggling(null);
        }
    };

    // ── Toggle tab access ──
    const toggleTab = async (memberId: string, platformKey: string, tabId: string) => {
        const member = members.find(m => m.id === memberId);
        if (!member) return;

        const tabKey = `${platformKey}:${tabId}`;
        const newValue = !member.features?.[tabKey];
        setIsToggling(tabKey);

        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch("/api/admin/toggle-access", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ userId: memberId, featureKey: tabKey, newValue }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setMembers(prev =>
                prev.map(m =>
                    m.id === memberId
                        ? { ...m, features: data.features, has_leads_access: data.has_leads_access }
                        : m
                )
            );
        } catch (err) {
            console.error("Error toggling tab:", err);
            setToast({ message: "Error al actualizar pestaña.", type: "error" });
        } finally {
            setIsToggling(null);
        }
    };

    // ── Helpers ──
    const selectedMember = members.find(m => m.id === selectedId);

    const getPlatformLabel = (key: string) => {
        const plat = dbPlatforms.find(p => (p.route_key || p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_")) === key);
        return plat?.name || PLATFORM_TABS[key]?.label || key;
    };

    const getMemberAccessSummary = (member: TeamMember) => {
        const count = ownerPlatformKeys.filter(k => {
            if (k === "leads") return member.features?.["leads"] || member.has_leads_access;
            return !!member.features?.[k];
        }).length;
        if (count === ownerPlatformKeys.length && count > 0) return { label: "Acceso Total", color: "text-green-600 bg-green-50 border-green-200" };
        if (count > 0) return { label: `${count} plataforma${count > 1 ? "s" : ""}`, color: "text-blue-600 bg-blue-50 border-blue-200" };
        return { label: "Sin Acceso", color: "text-gray-500 bg-gray-50 border-gray-200" };
    };

    // ── Loading ──
    if (profileLoading || platformsLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <LoaderCircle className="w-8 h-8 text-brand-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Cargando...</p>
            </div>
        );
    }

    if (!profile || profile.role !== "tenant_owner") return null;

    return (
        <div className="bg-background animate-in fade-in duration-500 overflow-y-auto" style={{ height: "calc(100vh - 2rem)" }}>
            <div className="w-full max-w-[70rem] mx-auto px-6 py-8 space-y-6 h-full flex flex-col">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mi Equipo</h1>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-primary" />
                            Invita miembros y gestiona sus permisos
                        </p>
                    </div>
                    <button
                        onClick={() => setShowInvite(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-brand-dark font-bold text-sm rounded-xl shadow-md shadow-brand-primary/20 hover:shadow-lg hover:shadow-brand-primary/30 transition-all"
                    >
                        <UserPlus size={18} />
                        Invitar Miembro
                    </button>
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <LoaderCircle className="w-6 h-6 text-brand-primary animate-spin" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
                            <Users size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-700 mb-1">Aún no tienes miembros</h3>
                        <p className="text-sm text-gray-500 max-w-sm text-center mb-6">
                            Invita a tu equipo y asígnales acceso a las plataformas y secciones que necesiten.
                        </p>
                        <button
                            onClick={() => setShowInvite(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-brand-dark font-bold text-sm rounded-xl shadow-md"
                        >
                            <UserPlus size={16} />
                            Invitar Primer Miembro
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                        {/* ── Left: Member List ── */}
                        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-2 overflow-y-auto">
                            {members.map(member => {
                                const summary = getMemberAccessSummary(member);
                                const isSelected = selectedId === member.id;
                                return (
                                    <button
                                        key={member.id}
                                        onClick={() => setSelectedId(member.id)}
                                        className={cn(
                                            "p-4 rounded-2xl border text-left transition-all flex gap-3 items-center",
                                            isSelected
                                                ? "bg-white border-brand-primary shadow-md ring-1 ring-brand-primary/20"
                                                : "bg-white border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md"
                                        )}
                                    >
                                        <div className="overflow-hidden flex-1">
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {member.full_name || member.email}
                                            </p>
                                            {member.full_name && (
                                                <p className="text-[11px] text-gray-400 truncate">{member.email}</p>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                <span className={cn(
                                                    "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border inline-flex items-center gap-1",
                                                    member.status === "active"
                                                        ? "text-green-600 bg-green-50 border-green-200"
                                                        : "text-amber-600 bg-amber-50 border-amber-200"
                                                )}>
                                                    <CheckCircle2 size={8} />
                                                    {member.status === "active" ? "Activo" : "Pendiente"}
                                                </span>
                                                {member.role === "tenant_owner" && (
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border inline-flex items-center gap-1 text-purple-600 bg-purple-50 border-purple-200">
                                                        <Crown size={8} />
                                                        Admin
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* ── Right: Permission Panel ── */}
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            {selectedMember ? (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                                    {/* User header */}
                                    <div className="p-6 border-b border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-gray-900">
                                                        {selectedMember.full_name || selectedMember.email}
                                                    </h3>
                                                    <span className={cn(
                                                        "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border inline-flex items-center gap-1",
                                                        selectedMember.status === "active"
                                                            ? "text-green-600 bg-green-50 border-green-200"
                                                            : "text-amber-600 bg-amber-50 border-amber-200"
                                                    )}>
                                                        <CheckCircle2 size={8} />
                                                        {selectedMember.status === "active" ? "Activo" : "Pendiente"}
                                                    </span>
                                                </div>
                                                {selectedMember.full_name && (
                                                    <p className="text-xs text-gray-400">{selectedMember.email}</p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-0.5">Configura a qué plataformas y secciones tiene acceso.</p>
                                            </div>

                                            {/* Role change button - top right */}
                                            {selectedMember.role === "tenant_owner" ? (
                                                <button
                                                    onClick={() => handleChangeRole(selectedMember.id, "client")}
                                                    disabled={changingRole}
                                                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all disabled:opacity-50 shrink-0"
                                                >
                                                    {changingRole ? <LoaderCircle size={14} className="animate-spin" /> : <UserMinus size={14} />}
                                                    Quitar Administrador
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleChangeRole(selectedMember.id, "tenant_owner")}
                                                    disabled={changingRole}
                                                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all disabled:opacity-50 shrink-0"
                                                >
                                                    {changingRole ? <LoaderCircle size={14} className="animate-spin" /> : <Crown size={14} />}
                                                    Volver Administrador
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Platforms */}
                                    <div className="p-6 space-y-3">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                            Plataformas Disponibles
                                        </p>

                                        {ownerPlatformKeys.map(platformKey => {
                                            const dbPlat = dbPlatforms.find(
                                                p => (p.route_key || p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_")) === platformKey
                                            );
                                            const IconComp = dbPlat ? getIconComponent(dbPlat.icon) : Shield;
                                            const colors = dbPlat ? getColorClasses(dbPlat.color) : { text: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" };

                                            const isPlatformActive = platformKey === "leads"
                                                ? (selectedMember.features?.["leads"] || selectedMember.has_leads_access)
                                                : !!selectedMember.features?.[platformKey];

                                            const hasTabs = !!PLATFORM_TABS[platformKey];
                                            const isExpanded = !!expandedPlatforms[platformKey];

                                            return (
                                                <div key={platformKey} className={cn(
                                                    "rounded-xl border transition-all",
                                                    isPlatformActive ? `${colors.border} ${colors.bg}/30` : "border-gray-200 bg-gray-50/50"
                                                )}>
                                                    {/* Platform row */}
                                                    <div className="flex items-center justify-between p-3.5">
                                                        <div className="flex items-center gap-3">
                                                            {hasTabs && isPlatformActive ? (
                                                                <button
                                                                    onClick={() => setExpandedPlatforms(prev => ({ ...prev, [platformKey]: !prev[platformKey] }))}
                                                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                                                                >
                                                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                </button>
                                                            ) : (
                                                                <div className="w-6 h-6" />
                                                            )}
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-lg flex items-center justify-center border",
                                                                isPlatformActive ? `${colors.bg} ${colors.border} ${colors.text}` : "bg-gray-100 border-gray-200 text-gray-400"
                                                            )}>
                                                                <IconComp size={16} />
                                                            </div>
                                                            <span className={cn(
                                                                "text-sm font-bold",
                                                                isPlatformActive ? "text-gray-900" : "text-gray-400"
                                                            )}>
                                                                {getPlatformLabel(platformKey)}
                                                            </span>
                                                        </div>

                                                        {/* Toggle switch */}
                                                        <button
                                                            onClick={() => togglePlatform(selectedMember.id, platformKey)}
                                                            disabled={isToggling === platformKey}
                                                            className={cn(
                                                                "w-11 h-6 rounded-full relative transition-colors",
                                                                isPlatformActive ? "bg-brand-primary" : "bg-gray-300",
                                                                isToggling === platformKey && "opacity-50"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform",
                                                                isPlatformActive ? "translate-x-[22px]" : "translate-x-0.5"
                                                            )} />
                                                        </button>
                                                    </div>

                                                    {/* Advisor visibility selector for Leads */}
                                                    {platformKey === 'leads' && isPlatformActive && isExpanded && (
                                                        <div className="px-3.5 pb-2 pt-0">
                                                            <div className="ml-9 pl-3 border-l-2 border-emerald-200 space-y-1">
                                                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-2 ml-1">
                                                                    Asesores asignados
                                                                </p>
                                                                {(() => {
                                                                    const currentVisibility = selectedMember.features?.leads_visible_advisors;
                                                                    const selectedSlots: number[] = currentVisibility === 'all' ? [1, 2, 3] : (Array.isArray(currentVisibility) ? currentVisibility : []);

                                                                    const advisorSlots = [
                                                                        { num: 1, label: tenantAgents[0]?.pushover_user_1_name || 'Asesor 1' },
                                                                        { num: 2, label: tenantAgents[0]?.pushover_user_2_name || 'Asesor 2' },
                                                                        { num: 3, label: tenantAgents[0]?.pushover_user_3_name || 'Asesor 3' },
                                                                    ];

                                                                    const handleToggleSlot = (slot: number) => {
                                                                        const newSlots = selectedSlots.includes(slot)
                                                                            ? selectedSlots.filter(s => s !== slot)
                                                                            : [...selectedSlots, slot].sort();
                                                                        updateAdvisorVisibility(selectedMember.id, newSlots.length === 3 ? 'all' : newSlots);
                                                                    };

                                                                    return (
                                                                        <div className="space-y-1.5">
                                                                            {advisorSlots.map(slot => {
                                                                                const isActive = selectedSlots.includes(slot.num);
                                                                                return (
                                                                                    <div
                                                                                        key={slot.num}
                                                                                        onClick={() => handleToggleSlot(slot.num)}
                                                                                        className={cn(
                                                                                            "flex items-center gap-2.5 py-2 px-2.5 rounded-lg cursor-pointer transition-all",
                                                                                            isActive ? "bg-emerald-50/80" : "hover:bg-gray-50"
                                                                                        )}
                                                                                    >
                                                                                        <div className={cn(
                                                                                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shadow-sm",
                                                                                            isActive
                                                                                                ? "bg-emerald-500 border-emerald-500 shadow-emerald-500/20"
                                                                                                : "border-gray-300 bg-white"
                                                                                        )}>
                                                                                            {isActive && (
                                                                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-white">
                                                                                                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                                                </svg>
                                                                                            )}
                                                                                        </div>
                                                                                        <span className={cn(
                                                                                            "text-xs font-semibold",
                                                                                            isActive ? "text-emerald-800" : "text-gray-500"
                                                                                        )}>
                                                                                            {slot.label}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Tabs expandable */}
                                                    {hasTabs && isPlatformActive && isExpanded && (
                                                        <div className="px-3.5 pb-3.5 pt-0">
                                                            <div className="ml-9 pl-3 border-l-2 border-gray-200 space-y-1">
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                                                    Secciones
                                                                </p>
                                                                {PLATFORM_TABS[platformKey].tabs.map(tab => {
                                                                    const tabKey = `${platformKey}:${tab.id}`;
                                                                    const isTabActive = !!selectedMember.features?.[tabKey];

                                                                    return (
                                                                        <div key={tab.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/60 transition-colors">
                                                                            <span className={cn(
                                                                                "text-xs font-medium",
                                                                                isTabActive ? "text-gray-800" : "text-gray-400"
                                                                            )}>
                                                                                {tab.label}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => toggleTab(selectedMember.id, platformKey, tab.id)}
                                                                                disabled={isToggling === tabKey}
                                                                                className={cn(
                                                                                    "w-8 h-4.5 rounded-full relative transition-colors",
                                                                                    isTabActive ? "bg-brand-primary/80" : "bg-gray-300",
                                                                                    isToggling === tabKey && "opacity-50"
                                                                                )}
                                                                                style={{ width: "34px", height: "18px" }}
                                                                            >
                                                                                <div className={cn(
                                                                                    "w-3.5 h-3.5 bg-white rounded-full shadow-sm absolute top-[2px] transition-transform",
                                                                                    isTabActive ? "translate-x-[16px]" : "translate-x-[2px]"
                                                                                )}
                                                                                    style={{ width: "14px", height: "14px" }}
                                                                                />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-2xl p-8 min-h-[300px]">
                                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-4 border border-gray-100">
                                        <Users size={24} className="text-gray-300" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-700 mb-1">Selecciona un miembro</h3>
                                    <p className="text-xs text-gray-500 text-center max-w-[250px]">
                                        Haz clic en un miembro de la lista para configurar sus accesos.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Invite Modal ── */}
            {showInvite && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                    <UserPlus size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Invitar Miembro</h3>
                                    <p className="text-xs text-gray-500">Se le enviará un correo de invitación</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowInvite(false); setInviteName(""); setInviteEmail(""); }}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Nombre Completo
                                </label>
                                <div className="relative">
                                    <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={inviteName}
                                        onChange={e => setInviteName(e.target.value)}
                                        placeholder="Ej: Juan Pérez"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleInvite()}
                                        placeholder="correo@ejemplo.com"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
                                    />
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-400">
                                Después de invitar, podrás asignar plataformas y secciones desde el panel.
                            </p>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowInvite(false); setInviteName(""); setInviteEmail(""); }}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleInvite}
                                disabled={inviting || !inviteEmail.trim()}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-primary text-brand-dark shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {inviting ? (
                                    <>
                                        <LoaderCircle size={16} className="animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Mail size={16} />
                                        Enviar Invitación
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {toast && (
                <div className={cn(
                    "fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4 duration-300",
                    toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
                )}>
                    {toast.type === "success"
                        ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                        : <AlertCircle size={18} className="text-red-500 shrink-0" />}
                    <p className="text-xs font-bold">{toast.message}</p>
                    <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
