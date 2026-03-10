"use client";

import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useRouter } from "next/navigation";
import { Shield, Settings, ExternalLink, Search, RefreshCw, UserPlus, X, Trash2, MoreVertical, Users } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ClientProfile {
    id: string;
    email: string;
    role: string;
    features: Record<string, boolean>;
    has_leads_access: boolean;
    brand_logo?: string;
    created_at: string;
    companyName: string;
    tenant_id: string;
    branding_complete?: boolean;
}

interface ProfileQueryResult {
    id: string;
    email: string | null;
    role: string | null;
    features: Record<string, boolean> | null;
    has_leads_access: boolean | null;
    brand_logo: string | null;
    tenant_id: string | null;
    created_at: string | null;
    tenants: { nombre: string, branding_complete: boolean } | null;
}

export default function SuperAdminDashboard() {
    const { profile, loading: profileLoading } = useProfile();
    const router = useRouter();
    const [clients, setClients] = useState<ClientProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    // Team Modal state
    const [selectedTenant, setSelectedTenant] = useState<{ id: string, name: string } | null>(null);
    const [tenantUsers, setTenantUsers] = useState<ClientProfile[]>([]);
    const [isFetchingTeam, setIsFetchingTeam] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

    // Modal state
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ companyName: '', email: '', role: 'admin' });
    const [isInviting, setIsInviting] = useState(false);

    // Feature definitions
    const AVAILABLE_FEATURES = [
        { id: "leads", label: "Leads", icon: "👥", isBooleanCol: true },
        { id: "tramites", label: "Trámites", icon: "📄", isBooleanCol: false },
    ];

    const [hasFetched, setHasFetched] = useState(false);

    useEffect(() => {
        if (!profileLoading) {
            if (!profile || profile.role !== "admin") {
                router.push("/leads");
                return;
            }

            if (profile.role === "admin" && !hasFetched) {
                console.log("Admin Panel Mounted and Fetching...");
                fetchClients();
                setHasFetched(true);
            }
        }
    }, [profile?.role, profileLoading, router, hasFetched]);

    const fetchClients = async () => {
        setIsLoading(true);
        try {
            console.log("Admin Panel: Fetching all users...");

            // 1. Fetch ALL profiles (no role filter)
            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("id, email, role, features, has_leads_access, brand_logo, tenant_id, tenants(nombre, branding_complete)");

            if (profilesError) {
                console.error("Profiles Query Error:", profilesError);
                throw profilesError;
            }

            // 2. Only exclude the current logged-in super admin
            const formatted: ClientProfile[] = (profilesData as unknown as ProfileQueryResult[] || [])
                .filter(p => p.id !== profile?.id) // Solo ocultar mi propio perfil
                .map((p) => ({
                    id: p.id,
                    email: p.email || 'Sin email',
                    role: p.role || 'client',
                    features: p.features || {},
                    has_leads_access: p.has_leads_access || false,
                    brand_logo: p.brand_logo || undefined,
                    created_at: '',
                    companyName: p.tenants?.nombre || 'Sin Empresa',
                    tenant_id: p.tenant_id || '',
                    branding_complete: p.tenants?.branding_complete
                }));

            setClients(formatted);
        } catch (err) {
            console.error("DEBUG: fetchClients failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    const viewTeam = async (tenantId: string, companyName: string) => {
        setSelectedTenant({ id: tenantId, name: companyName });
        setIsTeamModalOpen(true);
        setIsFetchingTeam(true);
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, email, role, features, has_leads_access, brand_logo, tenant_id, tenants(nombre)")
                .eq("tenant_id", tenantId)
                .order("role", { ascending: true });

            if (error) throw error;

            const formatted: ClientProfile[] = (data as unknown as ProfileQueryResult[] || []).map((p) => ({
                id: p.id,
                email: p.email || 'Sin email',
                role: p.role || 'client',
                features: p.features || {},
                has_leads_access: p.has_leads_access || false,
                brand_logo: p.brand_logo || undefined,
                created_at: '',
                companyName: p.tenants?.nombre || 'Empresa Desconocida',
                tenant_id: p.tenant_id || ''
            }));
            setTenantUsers(formatted);
        } catch (err) {
            console.error("Error fetching team:", err);
            alert("No se pudo cargar el equipo.");
        } finally {
            setIsFetchingTeam(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsInviting(true);
        try {
            const res = await fetch('/api/admin/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inviteForm)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to invite');

            alert(`Empresa creada e invitación enviada a ${inviteForm.email}`);
            setIsInviteModalOpen(false);
            setInviteForm({ companyName: '', email: '', role: 'admin' });
            fetchClients(); // Refrescar lista
        } catch (err: any) {
            alert(err.message);
            console.error(err);
        } finally {
            setIsInviting(false);
        }
    };

    const toggleFeature = async (userId: string, featureId: string, isBooleanCol: boolean) => {
        setIsUpdating(`${userId}-${featureId}`);
        const user = tenantUsers.find((c) => c.id === userId);
        if (!user) {
            setIsUpdating(null);
            return;
        }

        try {
            if (isBooleanCol) {
                // e.g. has_leads_access
                const newValue = !user.has_leads_access;
                const { error } = await supabase
                    .from("profiles")
                    .update({ has_leads_access: newValue })
                    .eq("id", userId);

                if (error) throw error;

                setTenantUsers((prev) =>
                    prev.map((c) =>
                        c.id === userId ? { ...c, has_leads_access: newValue } : c
                    )
                );
            } else {
                // e.g. features: { tramites: true }
                const newFeatures = { ...user.features };
                newFeatures[featureId] = !newFeatures[featureId];

                const { error } = await supabase
                    .from("profiles")
                    .update({ features: newFeatures })
                    .eq("id", userId);

                if (error) throw error;

                setTenantUsers((prev) =>
                    prev.map((c) =>
                        c.id === userId ? { ...c, features: newFeatures } : c
                    )
                );
            }
        } catch (err) {
            console.error("Error updating features:", err);
        } finally {
            setIsUpdating(null);
        }
    };

    const setRole = async (userId: string, newRole: string) => {
        if (!confirm(`¿Cambiar rol a ${newRole}?`)) return;
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ role: newRole })
                .eq("id", userId);
            if (error) throw error;
            if (selectedTenant && isTeamModalOpen) {
                viewTeam(selectedTenant.id, selectedTenant.name);
            } else {
                fetchClients();
            }
        } catch (err) {
            console.error("Error updating role:", err);
        }
    };

    const deleteClient = async (userId: string, email: string) => {
        if (!confirm(`¿Estás SEGURO de que deseas eliminar permanentemente a la empresa y usuario asociado a ${email}? Esta acción no se puede deshacer.`)) return;

        setIsUpdating(`delete-${userId}`);
        try {
            const res = await fetch('/api/admin/remove-tenant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to delete tenant');

            alert(data.message || 'Usuario y empresa eliminados.');
            fetchClients();
        } catch (err: any) {
            alert(err.message);
            console.error("Error deleting client:", err);
        } finally {
            setIsUpdating(null);
        }
    };

    const filteredClients = clients.filter((c) =>
        c.id !== profile?.id && (c.email.toLowerCase().includes(searchTerm.toLowerCase()) || c.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );


    if (profileLoading || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 text-brand-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Cargando Panel Maestro...</p>
            </div>
        );
    }

    if (!profile || profile.role !== "admin") return null;

    return (
        <div className="bg-background animate-in fade-in duration-500 overflow-hidden" style={{ height: 'calc(100vh - 2rem)' }}>
            <div className="w-full max-w-[90rem] mx-auto px-6 py-4 space-y-4 h-full flex flex-col">
                {/* Header */}
                <header className="flex items-center justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                <Shield size={20} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Panel Maestro</h1>
                                <p className="text-gray-500 text-xs font-medium">Supervisión central de clientes y servicios.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all w-64 shadow-sm font-medium"
                            />
                        </div>
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-primary/90 transition-all shadow-sm shadow-brand-primary/20"
                        >
                            <UserPlus size={16} />
                            Invitar Empresa
                        </button>
                    </div>
                </header>

                {/* Clients Table */}
                <div className="bg-white rounded-3xl border border-gray-200 shadow-xl relative flex-1 min-h-0 flex flex-col">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead className="bg-gray-50/50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-2.5 text-[11px] font-bold text-gray-900 uppercase tracking-tight w-[18%] border-b border-gray-100">Nombre de la Empresa</th>
                                    <th className="px-6 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-tight w-[45%] border-b border-l border-gray-100">Correo Principal</th>
                                    <th className="px-6 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-tight w-[30%] text-center border-b border-l border-gray-100">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-gray-200/60 transition-colors group">
                                        <td className="px-6 py-2 border-b border-gray-50">
                                            <p className="text-sm font-bold text-gray-900 truncate">{client.companyName}</p>
                                        </td>
                                        <td className="px-6 py-2 border-b border-l border-gray-50">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-sm font-medium text-gray-500 truncate">{client.email}</p>
                                                {!client.branding_complete && (
                                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-orange-500 uppercase tracking-wider">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                                                        Invitación Pendiente
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-2 border-b border-l border-gray-50 relative">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => viewTeam(client.tenant_id, client.companyName)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 text-[10px] font-bold rounded-lg transition-all shadow-sm"
                                                >
                                                    <Users size={12} />
                                                    Ver Equipo
                                                </button>

                                                <Link
                                                    href={`/leads?view_as=${client.id}`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white text-[10px] font-bold rounded-lg transition-all"
                                                >
                                                    <ExternalLink size={12} />
                                                    Entrar
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredClients.length === 0 && (
                        <div className="p-12 text-center bg-gray-50/30">
                            <p className="text-gray-400 text-xs font-medium">No se encontraron clientes que coincidan con la búsqueda.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Team Modal */}
            {isTeamModalOpen && selectedTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                    <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
                                        <Users size={20} />
                                    </div>
                                    Equipo Autorizado: {selectedTenant.name}
                                </h2>
                                <p className="text-xs font-medium text-gray-500 mt-2">Gestiona el nivel de acceso y los módulos disponibles para cada empleado.</p>
                            </div>
                            <button onClick={() => setIsTeamModalOpen(false)} className="text-gray-400 hover:text-gray-900 bg-white shadow-sm border border-gray-200 p-2.5 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-8 bg-gray-50/30 flex-1 relative">
                            {isFetchingTeam ? (
                                <div className="flex justify-center items-center h-48"><RefreshCw className="animate-spin text-brand-primary w-8 h-8" /></div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {tenantUsers.map((user) => (
                                        <div key={user.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
                                            {/* Accent line if admin */}
                                            {user.role === 'admin' && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                                            )}

                                            <div className="min-w-[200px] flex gap-4 items-center">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 font-bold shrink-0">
                                                    {(user.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{user.email}</p>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase whitespace-nowrap",
                                                        user.role === 'admin' ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                                                    )}>
                                                        {user.role === 'admin' ? 'Propietario' : 'Agente/Usuario'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex-1 bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Módulos Autorizados</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {AVAILABLE_FEATURES.map((feature) => {
                                                        const isActive = feature.isBooleanCol ? user.has_leads_access : user.features?.[feature.id];
                                                        const key = `${user.id}-${feature.id}`;
                                                        return (
                                                            <button
                                                                key={feature.id}
                                                                onClick={() => toggleFeature(user.id, feature.id, !!feature.isBooleanCol)}
                                                                disabled={isUpdating === key}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 border transition-all",
                                                                    isActive
                                                                        ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-sm hover:bg-brand-primary/20"
                                                                        : "bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer"
                                                                )}
                                                            >
                                                                <span className="text-xs">{feature.icon}</span>
                                                                {feature.label}
                                                                {isUpdating === key && <RefreshCw className="w-3 h-3 animate-spin" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center justify-end">
                                                <button
                                                    onClick={() => setRole(user.id, user.role === 'admin' ? 'client' : 'admin')}
                                                    className="opacity-0 group-hover:opacity-100 flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all border border-gray-200 shadow-sm"
                                                >
                                                    <Settings size={14} />
                                                    {user.role === 'admin' ? 'Degradar a Agente' : 'Hacer Propietario'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {
                isInviteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h2 className="text-lg font-bold text-gray-900">Invitar Nueva Empresa</h2>
                                <button
                                    onClick={() => setIsInviteModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleInvite} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de la Empresa</label>
                                    <p className="text-[10px] text-gray-500 mb-2">Se usará para generar su subdominio (ej: mi-empresa.opps.one)</p>
                                    <input
                                        type="text"
                                        required
                                        value={inviteForm.companyName}
                                        onChange={e => setInviteForm({ ...inviteForm, companyName: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                                        placeholder="Ej. Inmobiliaria Los Andes"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico</label>
                                    <p className="text-[10px] text-gray-500 mb-2">A este correo llegará la invitación oficial.</p>
                                    <input
                                        type="email"
                                        required
                                        value={inviteForm.email}
                                        onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                                        placeholder="admin@empresa.com"
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsInviteModalOpen(false)}
                                        className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isInviting || !inviteForm.companyName || !inviteForm.email}
                                        className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-brand-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isInviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus size={16} />}
                                        {isInviting ? 'Creando...' : 'Enviar Invitación'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
