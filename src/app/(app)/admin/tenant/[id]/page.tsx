"use client";

import React, { useEffect, useState, use } from "react";
import Link from 'next/link';
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Settings, ExternalLink, Search, LoaderCircle, UserPlus, X, Trash2, MoreVertical, Users, ArrowLeft, CheckCircle2, ShieldAlert, AlertTriangle, Power, AlertCircle } from "lucide-react";
import { usePlatforms, getIconComponent, getColorClasses } from "@/hooks/usePlatforms";
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
    tenants: { nombre: string } | null;
}

export default function TenantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: tenantId } = use(params);
    const { profile, loading: profileLoading } = useProfile();
    const router = useRouter();
    const searchParams = useSearchParams();
    const companyNameParam = searchParams.get('companyName') || 'Empresa Desconocida';

    const [tenantUsers, setTenantUsers] = useState<ClientProfile[]>([]);
    const [isFetchingTeam, setIsFetchingTeam] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // Status Modals
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    // Asumimos un estado local para el switch visual, en producción se lee de DB
    const [isSuspended, setIsSuspended] = useState(false);

    const AVAILABLE_FEATURES = [
        { id: "leads", label: "Leads", icon: "👥", isBooleanCol: true },
        { id: "tramites", label: "Trámites", icon: "📄", isBooleanCol: false },
    ];

    // Dynamic platforms from DB
    const { platforms: dbPlatforms, loading: platformsLoading } = usePlatforms();

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isTogglingPlatform, setIsTogglingPlatform] = useState<string | null>(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        if (!profileLoading) {
            if (!profile || profile.role !== "admin") {
                router.push("/leads");
                return;
            }
            if (tenantId) {
                fetchTeam(tenantId);
            }
        }
    }, [profile, profileLoading, tenantId]);

    const fetchTeam = async (tid: string) => {
        setIsFetchingTeam(true);
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, email, role, features, has_leads_access, brand_logo, tenant_id, tenants(nombre)")
                .eq("tenant_id", tid)
                .order("role", { ascending: true }); // admin (a) first

            if (error) throw error;

            const formatted: ClientProfile[] = (data as unknown as ProfileQueryResult[] || []).map((p) => ({
                id: p.id,
                email: p.email || 'Sin email',
                role: p.role || 'client',
                features: p.features || {},
                has_leads_access: p.has_leads_access || false,
                brand_logo: p.brand_logo || undefined,
                created_at: '',
                companyName: p.tenants?.nombre || companyNameParam,
                tenant_id: p.tenant_id || ''
            }));
            setTenantUsers(formatted);
        } catch (err) {
            console.error("Error fetching team:", err);
            setToast({ message: 'No se pudo cargar el equipo del tenant.', type: 'error' });
        } finally {
            setIsFetchingTeam(false);
        }
    };

    const toggleFeature = async (userId: string, featureId: string, isBooleanCol: boolean) => {
        setIsUpdating(`${userId}-${featureId}`);
        const user = tenantUsers.find((c) => c.id === userId);
        if (!user) {
            setIsUpdating(null);
            return;
        }

        const featureKey = isBooleanCol ? 'leads' : featureId;
        const currentValue = isBooleanCol ? user.has_leads_access : !!user.features?.[featureId];
        const newValue = !currentValue;

        try {
            const res = await fetch('/api/admin/toggle-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, featureKey, newValue }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setTenantUsers((prev) =>
                prev.map((c) =>
                    c.id === userId
                        ? {
                            ...c,
                            features: data.features,
                            has_leads_access: data.has_leads_access
                        }
                        : c
                )
            );
        } catch (err) {
            console.error("Error updating features:", err);
            setToast({ message: 'Error al actualizar el acceso.', type: 'error' });
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
            fetchTeam(tenantId);
        } catch (err) {
            console.error("Error updating role:", err);
        }
    };

    const handleDeleteTenant = async () => {
        setIsDeleting(true);
        try {
            // Si hay admin, enviar userId; si no, enviar tenantId directamente
            const admin = tenantUsers.find(u => u.role === 'admin');
            const payload = admin
                ? { userId: admin.id }
                : { tenantId: tenantId };

            const response = await fetch('/api/admin/remove-tenant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.success) {
                router.push('/admin');
            } else {
                setToast({ message: data.error || 'Ocurrió un error al eliminar la empresa.', type: 'error' });
                setIsDeleting(false);
            }
        } catch (error) {
            console.error('Error al eliminar tenant:', error);
            setToast({ message: 'Error de conexión al intentar eliminar la empresa.', type: 'error' });
            setIsDeleting(false);
        }
    };

    const togglePlatformAccess = async (platformName: string) => {
        if (!adminGeneral) return;
        const featureKey = platformName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
        setIsTogglingPlatform(featureKey);

        const currentValue = !!adminGeneral.features?.[featureKey];
        const newValue = !currentValue;

        try {
            const res = await fetch('/api/admin/toggle-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: adminGeneral.id, featureKey, newValue }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setTenantUsers(prev => prev.map(u =>
                u.id === adminGeneral.id
                    ? {
                        ...u,
                        features: data.features,
                        has_leads_access: data.has_leads_access
                    }
                    : u
            ));
        } catch (err) {
            console.error('Error toggling platform:', err);
            setToast({ message: 'Error al actualizar el acceso.', type: 'error' });
        } finally {
            setIsTogglingPlatform(null);
        }
    };

    if (profileLoading || isFetchingTeam || platformsLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <LoaderCircle className="w-8 h-8 text-brand-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Cargando detalles de la empresa...</p>
            </div>
        );
    }

    if (!profile || profile.role !== "admin") return null;

    // Separar "Propietario" del resto del equipo
    const adminGeneral = tenantUsers.find(u => u.role === 'tenant_owner')
        || tenantUsers.find(u => u.role === 'admin' && u.id !== profile?.id);
    const teamMembers = tenantUsers.filter(u => u !== adminGeneral);

    const getAccessIndicator = (user: ClientProfile) => {
        let totalFeatures = AVAILABLE_FEATURES.length;
        let activeFeatures = 0;

        AVAILABLE_FEATURES.forEach(feature => {
            const isActive = feature.isBooleanCol ? user.has_leads_access : !!user.features?.[feature.id];
            if (isActive) activeFeatures++;
        });

        if (activeFeatures === totalFeatures) {
            return { label: "Acceso Total", colorClass: "text-green-600 bg-green-50 border-green-200" };
        } else if (activeFeatures > 0) {
            return { label: "Acceso Parcial", colorClass: "text-orange-600 bg-orange-50 border-orange-200" };
        } else {
            return { label: "Sin Acceso", colorClass: "text-gray-500 bg-gray-50 border-gray-200" };
        }
    };

    return (
        <div className="bg-background animate-in fade-in duration-500 overflow-y-auto" style={{ height: 'calc(100vh - 2rem)' }}>
            <div className="w-full max-w-[70rem] mx-auto px-6 py-8 space-y-8 h-full flex flex-col">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin">
                            <button className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-brand-primary hover:border-brand-primary/20 hover:bg-brand-primary/5 transition-all shadow-sm">
                                <ArrowLeft size={20} />
                            </button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
                                {companyNameParam}
                            </h1>
                            <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
                                Gestión de permisos y equipo
                            </p>
                        </div>
                    </div>

                    {/* Acciones del Tenant (Suspender, Eliminar) */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSuspendModalOpen(true)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border transition-colors rounded-xl shadow-sm ${isSuspended
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <Power size={16} className={isSuspended ? 'text-amber-600' : 'text-gray-400'} />
                            {isSuspended ? 'Reactivar' : 'Suspender'}
                        </button>
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors rounded-xl shadow-sm"
                        >
                            <Trash2 size={16} />
                            Eliminar
                        </button>
                    </div>
                </div>      <div className="space-y-6">
                    {/* Tarjeta del ADMIN GENERAL (Compacta) */}
                    {adminGeneral && (
                        <div>
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Administrador General</h2>
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>

                                <div className="flex items-center justify-between pl-2">
                                    {/* Left: Admin Info */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0 text-lg">
                                            {(adminGeneral.email || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 truncate max-w-[250px]">{adminGeneral.email}</p>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                Propietario
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right: Compact Platform Toggles */}
                                    <div className="flex items-center gap-1.5">
                                        {dbPlatforms.map((platform) => {
                                            const featureKey = platform.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
                                            const isActive = !!adminGeneral.features?.[featureKey];
                                            const isToggling = isTogglingPlatform === featureKey;
                                            const IconComp = getIconComponent(platform.icon);
                                            const colors = getColorClasses(platform.color);

                                            return (
                                                <button
                                                    key={platform.id}
                                                    onClick={() => togglePlatformAccess(platform.name)}
                                                    disabled={isToggling}
                                                    className={cn(
                                                        "w-[30px] h-[30px] rounded-lg flex items-center justify-center border transition-all relative group/tip",
                                                        isActive
                                                            ? `${colors.bg} ${colors.border} ${colors.text}`
                                                            : "bg-gray-50 border-gray-200 text-gray-300 hover:text-gray-400 hover:border-gray-300"
                                                    )}
                                                >
                                                    {isToggling
                                                        ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                                                        : <IconComp size={14} />
                                                    }
                                                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 text-white text-[9px] font-bold rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                                                        {platform.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lista de USUARIOS INVITADOS */}
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4 ml-1">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Usuarios del Equipo ({teamMembers.length})</h2>
                        </div>
                        {teamMembers.length === 0 ? (
                            <div className="bg-white/50 border border-gray-dashed rounded-3xl p-10 text-center flex flex-col items-center">
                                <Users size={40} className="text-gray-300 mb-3" />
                                <p className="text-gray-500 font-medium">El administrador general aún no ha invitado a ningún usuario a su equipo.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col lg:flex-row gap-6 items-start">
                                {/* PANEL IZQUIERDO: Lista de Usuarios */}
                                <div className="w-full lg:w-1/3 flex flex-col gap-3">
                                    {teamMembers.map((user) => {
                                        const indicator = getAccessIndicator(user);
                                        const isSelected = selectedUserId === user.id;
                                        return (
                                            <button
                                                key={user.id}
                                                onClick={() => setSelectedUserId(user.id)}
                                                className={cn(
                                                    "p-4 rounded-2xl border text-left transition-all flex gap-3 items-center group relative cursor-pointer",
                                                    isSelected
                                                        ? "bg-white border-brand-primary shadow-md ring-1 ring-brand-primary/20"
                                                        : "bg-white border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md"
                                                )}
                                            >
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-inner transition-colors", isSelected ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" : "bg-gray-50 text-gray-500 border border-gray-200")}>
                                                    {(user.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap flex items-center gap-1 border", indicator.colorClass)}>
                                                            <CheckCircle2 size={10} />
                                                            {indicator.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* PANEL DERECHO: Detalles y Permisos */}
                                <div className="w-full lg:w-2/3 sticky top-6">
                                    {selectedUserId ? (() => {
                                        const selectedUser = teamMembers.find(u => u.id === selectedUserId);
                                        if (!selectedUser) return null;

                                        return (
                                            <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                                            {selectedUser.email}
                                                        </h3>
                                                        <p className="text-xs text-gray-500">Configura módulos y permisos de acceso para este usuario.</p>
                                                    </div>
                                                    <div className="shrink-0 pt-1">
                                                        <span className="text-[9px] font-bold px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase">
                                                            Rol Actual: Empleado
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Permisos de Módulos</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {AVAILABLE_FEATURES.map((feature) => {
                                                                const isActive = feature.isBooleanCol ? selectedUser.has_leads_access : selectedUser.features?.[feature.id];
                                                                const key = `${selectedUser.id}-${feature.id}`;
                                                                return (
                                                                    <button
                                                                        key={feature.id}
                                                                        onClick={() => toggleFeature(selectedUser.id, feature.id, !!feature.isBooleanCol)}
                                                                        disabled={isUpdating === key}
                                                                        className={cn(
                                                                            "px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all",
                                                                            isActive
                                                                                ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-sm hover:bg-brand-primary/20"
                                                                                : "bg-white border-gray-200 text-gray-400 hover:text-gray-500 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-100 hover:bg-gray-50 cursor-pointer"
                                                                        )}
                                                                    >
                                                                        <span className="text-sm">{feature.icon}</span>
                                                                        {feature.label}
                                                                        {isActive && <CheckCircle2 size={12} className="ml-0.5 opacity-70" />}
                                                                        {isUpdating === key && <LoaderCircle className="w-3 h-3 animate-spin ml-1" />}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 -mx-5 md:-mx-6 -mb-5 md:-mb-6 px-5 md:px-6 py-4 rounded-b-2xl">
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Opciones Avanzadas</p>
                                                    <button
                                                        onClick={() => {
                                                            setRole(selectedUser.id, 'admin');
                                                            setSelectedUserId(null);
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 hover:text-red-700 rounded-lg transition-all border border-red-200 shadow-sm"
                                                    >
                                                        <ShieldAlert size={12} />
                                                        Transferir Admin
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        <div className="bg-gray-50/50 border-gray-300 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[250px] border-2">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mb-3 border border-gray-100">
                                                <Users size={20} className="text-gray-300" />
                                            </div>
                                            <h3 className="text-sm font-bold text-gray-700 mb-1">Selecciona un Usuario</h3>
                                            <p className="text-xs text-gray-500 max-w-[250px]">Haz clic en la lista para ver o modificar los accesos específicos del usuario.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Suspensión */}
            {isSuspendModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-amber-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                    <Power size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {isSuspended ? 'Reactivar Empresa' : 'Suspender Empresa'}
                                    </h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsSuspendModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-600 font-medium text-sm">
                                {isSuspended
                                    ? `¿Estás seguro de reactivar el acceso de ${companyNameParam}? Podrán volver a usar la plataforma inmediatamente.`
                                    : `¿Estás seguro de suspender el acceso de ${companyNameParam}? Ninguno de los usuarios del equipo podrá acceder a la plataforma hasta que se reactive.`
                                }
                            </p>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsSuspendModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    alert("El estado de suspensión será manejado por la API.");
                                    setIsSuspended(!isSuspended);
                                    setIsSuspendModalOpen(false);
                                }}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all flex items-center gap-2 ${isSuspended ? 'bg-brand-primary hover:bg-brand-primary/90 shadow-brand-primary/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                                    }`}
                            >
                                {isSuspended ? 'Reactivar' : 'Suspender'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Eliminación */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-red-100 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-red-100 bg-red-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-red-700">Eliminar Empresa</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-700 font-medium text-sm mb-4">
                                Estás a punto de eliminar a <strong>{companyNameParam}</strong> y a todos sus usuarios asociados.
                            </p>
                            <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                                <p className="text-red-700 font-bold text-sm">
                                    Esta acción es irreversible. Se perderán todos los datos, historiales y configuraciones asociadas a este equipo.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isDeleting}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteTenant}
                                disabled={isDeleting}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <LoaderCircle size={16} className="animate-spin" />
                                        Eliminando...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        Eliminar Definitivamente
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
}
