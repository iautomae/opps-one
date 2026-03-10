"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, Database, Fingerprint, Lock, Edit2, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SELAccountPopoverProps {
    tramiteId: string;
    initialData: {
        sel_ruc10: string | null;
        sel_dni: string | null;
        sel_clave: string | null;
    };
    onUpdate: () => void;
}

export function SELAccountPopover({ tramiteId, initialData, onUpdate }: SELAccountPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(initialData);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

    const updatePosition = useCallback(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPopoverPos({
                top: rect.bottom + 6,
                left: rect.left,
            });
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();

        function handleClickOutside(event: MouseEvent) {
            if (
                popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                setIsEditing(false);
            }
        }

        function handleScroll() {
            updatePosition();
        }

        document.addEventListener("mousedown", handleClickOutside);
        // Listen for scroll on all ancestors to reposition
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleScroll);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", handleScroll);
        };
    }, [isOpen, updatePosition]);

    const handleCopy = (text: string | null, field: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('tramites')
                .update({
                    sel_ruc10: editData.sel_ruc10,
                    sel_dni: editData.sel_dni,
                    sel_clave: editData.sel_clave
                })
                .eq('id', tramiteId);

            if (error) throw error;
            setIsEditing(false);
            onUpdate();
        } catch (error) {
            console.error('Error updating SEL credentials:', error);
            alert('Error al guardar cambios');
        } finally {
            setIsSaving(false);
        }
    };

    const popoverContent = isOpen ? createPortal(
        <div
            ref={popoverRef}
            className="fixed w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden"
            style={{
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Database size={12} className="text-brand-primary" /> Credenciales SEL
                </span>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="p-1 hover:bg-emerald-100 text-emerald-600 rounded transition-colors"
                            >
                                <Save size={14} />
                            </button>
                            <button
                                onClick={() => { setIsEditing(false); setEditData(initialData); }}
                                className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1 hover:bg-slate-200 text-slate-500 rounded transition-colors"
                        >
                            <Edit2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* RUC 10 */}
                <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">RUC 10</label>
                    <div className="flex items-center gap-2 group">
                        <div className="flex-1 relative">
                            <Fingerprint size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={editData.sel_ruc10 || ''}
                                onChange={(e) => setEditData({ ...editData, sel_ruc10: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-7 pr-3 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:bg-slate-50/50"
                                placeholder="No asignado"
                            />
                        </div>
                        {!isEditing && (
                            <button
                                onClick={() => handleCopy(initialData.sel_ruc10, 'ruc')}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-brand-primary rounded-lg transition-all"
                            >
                                {copiedField === 'ruc' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* DNI */}
                <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">DNI Usuario</label>
                    <div className="flex items-center gap-2 group">
                        <div className="flex-1 relative">
                            <Fingerprint size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={editData.sel_dni || ''}
                                onChange={(e) => setEditData({ ...editData, sel_dni: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-7 pr-3 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:bg-slate-50/50"
                                placeholder="No asignado"
                            />
                        </div>
                        {!isEditing && (
                            <button
                                onClick={() => handleCopy(initialData.sel_dni, 'dni')}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-brand-primary rounded-lg transition-all"
                            >
                                {copiedField === 'dni' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Clave */}
                <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Clave SOL</label>
                    <div className="flex items-center gap-2 group">
                        <div className="flex-1 relative">
                            <Lock size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                                type="text"
                                disabled={!isEditing}
                                value={editData.sel_clave || ''}
                                onChange={(e) => setEditData({ ...editData, sel_clave: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-7 pr-3 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:bg-slate-50/50"
                                placeholder="No asignada"
                            />
                        </div>
                        {!isEditing && (
                            <button
                                onClick={() => handleCopy(initialData.sel_clave, 'clave')}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-brand-primary rounded-lg transition-all"
                            >
                                {copiedField === 'clave' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div className="inline-block">
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`text-[9px] font-bold uppercase tracking-wider transition-all px-3 py-0.5 rounded-md border whitespace-nowrap ${isOpen
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white text-brand-primary border-brand-primary/20 hover:border-brand-primary hover:bg-brand-primary/5'
                    }`}
            >
                cuenta sel
            </button>
            {popoverContent}
        </div>
    );
}
