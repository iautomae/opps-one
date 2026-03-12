"use client";

import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useRouter } from "next/navigation";
import { Shield, Settings, ExternalLink, Search, LoaderCircle, UserPlus, X, Trash2, MoreVertical, Users, CheckCircle2, AlertCircle } from "lucide-react";
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
    id: string; // Tenant ID
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

    // Modal state
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ companyName: '', email: '', role: 'admin' });
    const [isInviting, setIsInviting] = useState(false);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

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
            console.log("Admin Panel: Fetching all tenants...");

            // 1. Fetch ALL tenants and their profiles
            const { data: tenantsData, error: tenantsError } = await supabase
                .from("tenants")
                .select("id, nombre, branding_complete, created_at, profiles(id, email, role)")
                .order("created_at", { ascending: false });

            if (tenantsError) {
                console.error("Tenants Query Error:", tenantsError);
                throw tenantsError;
            }

            // 2. Map tenants to ClientProfile
            const formatted: ClientProfile[] = (tenantsData || [])
                .filter(t => t.id !== profile?.tenant_id) // Ocultar el tenant del super admin
                .map((t: any) => {
                    const profiles = Array.isArray(t.profiles) ? t.profiles : [];
                    // Encontrar el propietario de esta empresa (tenant_owner o legacy admin)
                    const mainAdmin = profiles.find((p: any) => p.role === 'tenant_owner')
                        || profiles.find((p: any) => p.role === 'admin')
                        || profiles[0] || {};

                    return {
                        id: mainAdmin.id || t.id, // ID del admin para impersonate
                        email: mainAdmin.email || 'Sin usuario asignado',
                        role: mainAdmin.role || 'client',
                        features: {},
                        has_leads_access: true,
                        brand_logo: undefined,
                        created_at: t.created_at,
                        companyName: t.nombre || 'Sin Empresa',
                        tenant_id: t.id,
                        branding_complete: t.branding_complete
                    };
                });

            setClients(formatted);
        } catch (err) {
            console.error("DEBUG: fetchClients failed", err);
        } finally {
            setIsLoading(false);
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

            setToast({ message: `Empresa creada e invitación enviada a ${inviteForm.email}`, type: 'success' });
            setIsInviteModalOpen(false);
            setInviteForm({ companyName: '', email: '', role: 'admin' });
            fetchClients();
        } catch (err: any) {
            setToast({ message: err.message, type: 'error' });
            console.error(err);
        } finally {
            setIsInviting(false);
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

            setToast({ message: data.message || 'Empresa eliminada correctamente.', type: 'success' });
            fetchClients();
        } catch (err: any) {
            setToast({ message: err.message, type: 'error' });
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
                <LoaderCircle className="w-8 h-8 text-brand-primary animate-spin mb-4" />
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
                            <colgroup>
                                <col className="w-[200px]" />
                                <col className="w-auto" />
                                <col className="w-[160px]" />
                                <col className="w-[240px]" />
                            </colgroup>
                            <tbody className="divide-y divide-gray-200">
                                {filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-5 py-3.5">
                                            <p className="text-xs font-bold text-gray-900 truncate">{client.companyName}</p>
                                        </td>
                                        <td className="px-5 py-3.5 border-l border-gray-100">
                                            <p className="text-xs font-medium text-gray-500 truncate">{client.email}</p>
                                        </td>
                                        <td className="px-5 py-3.5 border-l border-gray-100">
                                            {client.branding_complete ? (
                                                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-green-600 uppercase tracking-wider">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-orange-500 uppercase tracking-wider">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                                    Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 border-l border-gray-100">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/admin/tenant/${client.tenant_id}?companyName=${encodeURIComponent(client.companyName)}`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 text-[10px] font-bold rounded-lg transition-all shadow-sm"
                                                >
                                                    <Users size={12} />
                                                    Ver Equipo
                                                </Link>

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
                                        {isInviting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <UserPlus size={16} />}
                                        {isInviting ? 'Creando...' : 'Enviar Invitación'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Toast Popup */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    {toast.type === 'success'
                        ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                        : <AlertCircle size={18} className="text-red-500 shrink-0" />
                    }
                    <p className="text-xs font-bold">{toast.message}</p>
                    <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                        <X size={14} />
                    </button>
                </div>
            )}
        </div >
    );
}
