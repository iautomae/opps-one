"use client";

import React, { useState } from 'react';
import { X, FileText, User, MapPin, Phone, ShieldCheck, HelpCircle, Database as DatabaseIcon, Fingerprint, Lock } from 'lucide-react';
import { Database } from '@/types/database.types';

type TramiteTipo = Database['public']['Enums']['tramite_tipo'];

interface NuevoTramiteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}

const TIPO_TRAMITE_OPTIONS: { value: TramiteTipo; label: string; description: string }[] = [
    { value: 'L1', label: 'L1 - Defensa Personal', description: 'Licencia para portar armas de fuego para defensa personal.' },
    { value: 'L2', label: 'L2 - Caza', description: 'Licencia para uso de armas de fuego en actividades de caza deportiva.' },
    { value: 'L3', label: 'L3 - Deporte', description: 'Licencia para uso de armas de fuego en actividades de tiro deportivo.' },
    { value: 'L4', label: 'L4 - Seguridad Privada', description: 'Licencia para personal que presta servicios de seguridad privada.' },
    { value: 'L5', label: 'L5 - Resguardo / SISPE', description: 'Licencia especial para resguardo e intervenciones.' },
    { value: 'L6', label: 'L6 - Colección', description: 'Licencia para la tenencia de armas clasificados como de colección.' },
    { value: 'TP', label: 'Tarjeta de Propiedad', description: 'Trámite exclusivo para la tarjeta de propiedad del arma.' },
    { value: 'OTROS', label: 'Otros (Cartas, Oficios)', description: 'Gestiones variadas y oficios generales.' },
];

export function NuevoTramiteModal({ isOpen, onClose, onSubmit }: NuevoTramiteModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        cliente_nombre: '',
        cliente_dni: '',
        cliente_telefono: '',
        provincia: '',
        tipo_tramite: 'L1' as TramiteTipo,
        modalidad: 'INICIAL',
        sel_ruc10: '',
        sel_dni: '',
        sel_clave: '',
        notas: '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Error creating tramite:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Crear Nuevo Trámite</h2>
                        <p className="text-sm text-slate-500 mt-1">Registra un nuevo cliente y selecciona el tipo de gestión.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="nuevo-tramite-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Datos del Cliente */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-brand-primary uppercase tracking-wider flex items-center gap-2">
                                <User size={16} /> Datos del Cliente
                            </h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre Completo</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center justify-center pointer-events-none text-slate-400">
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                value={formData.cliente_nombre}
                                                onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-slate-800"
                                                placeholder="Ej. Juan Pérez M."
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">DNI</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center justify-center pointer-events-none text-slate-400">
                                                <Fingerprint size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.cliente_dni}
                                                onChange={(e) => setFormData({ ...formData, cliente_dni: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-slate-800"
                                                placeholder="Ej. 12345678"
                                                maxLength={8}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono (Opcional)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center justify-center pointer-events-none text-slate-400">
                                                <Phone size={18} />
                                            </div>
                                            <input
                                                type="tel"
                                                value={formData.cliente_telefono}
                                                onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-slate-800"
                                                placeholder="Ej. 987654321"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Provincia (Opcional)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center justify-center pointer-events-none text-slate-400">
                                                <MapPin size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.provincia}
                                                onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-slate-800"
                                                placeholder="Ej. Lima, Trujillo..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Cuenta SEL */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-brand-primary uppercase tracking-wider flex items-center gap-2">
                                <DatabaseIcon size={16} /> Credenciales Cuenta SEL
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-600 mb-1">RUC 10</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center justify-center pointer-events-none text-slate-400">
                                            <DatabaseIcon size={14} />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.sel_ruc10}
                                            onChange={(e) => setFormData({ ...formData, sel_ruc10: e.target.value })}
                                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary transition-all text-sm"
                                            placeholder="10..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-600 mb-1">DNI (Usuario SEL)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center justify-center pointer-events-none text-slate-400">
                                            <Fingerprint size={14} />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.sel_dni}
                                            onChange={(e) => setFormData({ ...formData, sel_dni: e.target.value })}
                                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary transition-all text-sm"
                                            placeholder="DNI"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Clave</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center justify-center pointer-events-none text-slate-400">
                                            <Lock size={14} />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.sel_clave}
                                            onChange={(e) => setFormData({ ...formData, sel_clave: e.target.value })}
                                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary transition-all text-sm"
                                            placeholder="****"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Tipo de Trámite */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-brand-primary uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck size={16} /> Tipo de Gestión
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {TIPO_TRAMITE_OPTIONS.map((tipo) => (
                                    <label
                                        key={tipo.value}
                                        className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.tipo_tramite === tipo.value
                                            ? 'border-brand-primary bg-brand-primary/5 shadow-sm'
                                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-1">
                                            <input
                                                type="radio"
                                                name="tipo_tramite"
                                                value={tipo.value}
                                                checked={formData.tipo_tramite === tipo.value}
                                                onChange={(e) => {
                                                    const newTipo = e.target.value as TramiteTipo;
                                                    let newModalidad = formData.modalidad;

                                                    // Auto-adjust modalidad based on type
                                                    if (newTipo === 'TP') {
                                                        newModalidad = 'ARMA_NUEVA';
                                                    } else if (newTipo !== 'OTROS') {
                                                        // For licenses, if current modality is TP specific, reset it
                                                        if (newModalidad === 'ARMA_NUEVA' || newModalidad === 'TRANSFERENCIA') {
                                                            newModalidad = 'INICIAL';
                                                        }
                                                    }

                                                    setFormData({ ...formData, tipo_tramite: newTipo, modalidad: newModalidad });
                                                }}
                                                className="w-4 h-4 text-brand-primary border-slate-300 focus:ring-brand-primary"
                                            />
                                            <span className="font-semibold text-slate-800">{tipo.label}</span>
                                        </div>
                                        <span className="text-xs text-slate-500 pl-7">{tipo.description}</span>
                                    </label>
                                ))}
                            </div>

                            {/* Modalidad Selector (Sub-type) */}
                            {formData.tipo_tramite !== 'OTROS' && (
                                <div className="mt-6 space-y-3">
                                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Modalidad
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(formData.tipo_tramite === 'TP' ? [
                                            { value: 'ARMA_NUEVA', label: 'Arma Nueva' },
                                            { value: 'TRANSFERENCIA', label: 'Transferencia' }
                                        ] : [
                                            { value: 'INICIAL', label: 'Inicial' },
                                            { value: 'RENOVACION', label: 'Renovación' }
                                        ]).map((mod) => (
                                            <button
                                                key={mod.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, modalidad: mod.value })}
                                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${formData.modalidad === mod.value
                                                    ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {mod.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notas Adicionales */}
                            <div className="mt-6">
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Notas Varias (Opcional)</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-slate-400 min-h-[80px] resize-y"
                                    placeholder="Ingrese cualquier observación o detalle adicional..."
                                    value={formData.notas}
                                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                />
                            </div>

                            {/* Alerta Informativa */}
                            <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
                                <HelpCircle className="text-blue-500 flex-shrink-0" size={20} />
                                <p>
                                    Al crear el trámite <strong>{formData.tipo_tramite}</strong>, el sistema generará automáticamente la lista de requisitos (Tasas, Exámenes Médicos, FUT, etc.) correspondientes a esta categoría en la vista de detalle del cliente.
                                </p>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="nuevo-tramite-form"
                        className="btn-primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creando...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <FileText size={18} /> Crear Expediente
                            </span>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
