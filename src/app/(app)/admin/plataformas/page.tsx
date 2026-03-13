"use client";

import React, { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useRouter } from "next/navigation";
import { usePlatforms, getIconComponent, getColorClasses } from "@/hooks/usePlatforms";
import {
    Layers,
    ArrowRight,
    LoaderCircle,
    Plus,
    X,
    CheckCircle2,
    AlertCircle,
    Pencil,
    Check,
    ChevronUp,
    ChevronDown
} from "lucide-react";

// Map platform names to routes
const PLATFORM_ROUTES: Record<string, string> = {
    leads: '/leads',
    tramites: '/tramites',
    reclutamiento: '/reclutamiento',
    textil: '/textil',
};

function normalizeName(name: string): string {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

export default function PlataformasPage() {
    const { profile, loading: profileLoading } = useProfile();
    const router = useRouter();
    const { platforms, loading: platformsLoading, createPlatform, updatePlatform, reorderPlatforms } = usePlatforms();

    // Create modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    React.useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    if (profileLoading || platformsLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <LoaderCircle className="w-8 h-8 text-brand-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Cargando plataformas...</p>
            </div>
        );
    }

    if (!profile || profile.role !== "admin") {
        router.push("/leads");
        return null;
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await createPlatform(newName, newDesc);
            setToast({ message: `Plataforma "${newName}" creada con éxito.`, type: 'success' });
            setIsCreateOpen(false);
            setNewName('');
            setNewDesc('');
        } catch (err: any) {
            setToast({ message: err.message, type: 'error' });
        } finally {
            setIsCreating(false);
        }
    };

    const startEdit = (platform: { id: string; name: string; description: string }) => {
        setEditingId(platform.id);
        setEditName(platform.name);
        setEditDesc(platform.description);
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        setIsSaving(true);
        try {
            await updatePlatform(editingId, editName, editDesc);
            setToast({ message: 'Plataforma actualizada.', type: 'success' });
            setEditingId(null);
        } catch (err: any) {
            setToast({ message: err.message, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= platforms.length) return;
        const reordered = [...platforms];
        [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
        reorderPlatforms(reordered);
    };

    const handleNavigate = (platform: { name: string; route_key: string }) => {
        const route = PLATFORM_ROUTES[platform.route_key];
        if (route) {
            router.push(route);
        } else {
            setToast({ message: `Ruta para "${platform.name}" aún no configurada.`, type: 'error' });
        }
    };

    return (
        <div className="bg-background animate-in fade-in duration-500 overflow-y-auto" style={{ height: 'calc(100vh - 2rem)' }}>
            <div className="w-full max-w-[70rem] mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                <Layers size={24} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Plataformas</h1>
                                <p className="text-sm font-medium text-gray-500 mt-0.5">
                                    Módulos e interfaces disponibles para tus clientes.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-brand-primary/90 transition-all shadow-sm shadow-brand-primary/20"
                        >
                            <Plus size={16} />
                            Nueva Plataforma
                        </button>
                    </div>
                </div>

                {/* Platform Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {platforms.map((platform, index) => {
                        const IconComp = getIconComponent(platform.icon);
                        const colors = getColorClasses(platform.color);
                        const isEditing = editingId === platform.id;

                        return (
                            <div
                                key={platform.id}
                                className={`relative group bg-white rounded-xl border ${colors.border} p-4 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5`}
                            >
                                {/* Status Badge + Edit + Move Buttons */}
                                <div className="absolute top-4 right-4 flex items-center gap-1">
                                    {!isEditing && (
                                        <>
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                                                <button
                                                    onClick={() => handleMove(index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Mover arriba"
                                                >
                                                    <ChevronUp size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleMove(index, 'down')}
                                                    disabled={index === platforms.length - 1}
                                                    className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Mover abajo"
                                                >
                                                    <ChevronDown size={12} />
                                                </button>
                                                <button
                                                    onClick={() => startEdit(platform)}
                                                    className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all"
                                                    title="Editar nombre"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-200 uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        Activo
                                    </span>
                                </div>

                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center mb-3`}>
                                    <IconComp size={18} className={colors.text} />
                                </div>

                                {/* Content — editable or static */}
                                {isEditing ? (
                                    (() => {
                                        const hasChanges = editName.trim() !== platform.name || editDesc.trim() !== platform.description;
                                        return (
                                    <div className="space-y-2 mb-4">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                                            autoFocus
                                        />
                                        <input
                                            type="text"
                                            value={editDesc}
                                            onChange={e => setEditDesc(e.target.value)}
                                            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                                            placeholder="Descripción..."
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={isSaving || !editName.trim() || !hasChanges}
                                                className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all disabled:opacity-50 ${
                                                    hasChanges
                                                        ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                            >
                                                {isSaving ? <LoaderCircle size={12} className="animate-spin" /> : <Check size={12} />}
                                                {hasChanges ? 'Guardar Cambios' : 'Guardar'}
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                        );
                                    })()
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-bold text-gray-900">{platform.name}</h3>
                                            <span className="text-[8px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">/{platform.route_key}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed mb-4">
                                            {platform.description}
                                        </p>
                                    </>
                                )}

                                {/* Action — Navigate */}
                                {!isEditing && (
                                    <button
                                        onClick={() => handleNavigate(platform)}
                                        className={`inline-flex items-center gap-2 text-xs font-bold ${colors.text} hover:underline transition-all group/btn`}
                                    >
                                        Gestionar módulo
                                        <ArrowRight size={14} className="transition-transform group-hover/btn:translate-x-1" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Info Footer */}
                <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs text-gray-400 text-center font-medium">
                        Cada plataforma puede ser asignada a empresas individuales como módulos independientes desde el panel de Usuarios.
                    </p>
                </div>
            </div>

            {/* Create Platform Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900">Nueva Plataforma</h2>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de la Plataforma</label>
                                <p className="text-[10px] text-gray-500 mb-2">Ej: &quot;Inventario&quot;, &quot;Contabilidad&quot;, etc.</p>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                                    placeholder="Ej. Inventario"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Descripción</label>
                                <p className="text-[10px] text-gray-500 mb-2">Si dejas vacío, se generará automáticamente como &quot;Gestión de [nombre]&quot;.</p>
                                <input
                                    type="text"
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                                    placeholder="Gestión de inventario y stocks..."
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating || !newName.trim()}
                                    className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-brand-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isCreating ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
                                    {isCreating ? 'Creando...' : 'Crear Plataforma'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
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
