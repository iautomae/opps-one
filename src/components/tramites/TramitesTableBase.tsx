"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, AlertCircle, CheckCircle2, Loader2, Eye, Edit2, ExternalLink, Trash2 } from 'lucide-react';
import { DataTable, DataTableHeader } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SELAccountPopover } from '@/components/tramites/SELAccountPopover';
import { DataPanel } from '@/components/ui/DataPanel';

export interface TramiteRow {
    id: string;
    cliente_nombre: string;
    cliente_dni: string | null;
    cliente_telefono: string | null;
    tipo_tramite: string;
    modalidad: string | null;
    fase_actual: string | null;
    estado_general: string;
    sucamec_expediente: string | null;
    provincia: string | null;
    created_at: string;
    sel_ruc10: string | null;
    sel_dni: string | null;
    sel_clave: string | null;
    // New optional columns for Progress Tracker
    etapa1_status?: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'NO_REQUIERE' | string;
    etapa2_status?: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'NO_REQUIERE' | string;
}

interface TramitesTableBaseProps {
    tramites: TramiteRow[];
    onRefresh: () => void;
    hideStatusColumn?: boolean;
    hideProgressColumn?: boolean;
}

export function TramitesTableBase({ tramites, onRefresh, hideStatusColumn = false, hideProgressColumn = false }: TramitesTableBaseProps) {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(17);
    const [modalidadFilter, setModalidadFilter] = useState<'TODOS' | 'INICIAL' | 'RENOVACION'>('TODOS');

    const filteredTramites = tramites.filter(t => {
        if (modalidadFilter === 'TODOS') return true;
        return t.modalidad === modalidadFilter;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const paginatedTramites = filteredTramites.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTramites.length / itemsPerPage);

    const tableHeaders: DataTableHeader[] = [
        { label: 'Ingreso', width: '90px' },
        { label: 'Cliente', width: '180px' },
        { label: 'DNI' },
        { label: 'Teléfono' },
        { label: 'SEL', className: 'text-center', width: '100px' },
        { label: 'Tipo', className: 'text-center' },
        { label: 'Modalidad', className: 'text-center' },
        ...(!hideProgressColumn ? [{ label: 'Progreso de Trámite', className: 'text-center', width: '280px' }] : []),
        { label: '', className: 'w-full' },
        ...(!hideStatusColumn ? [{ label: 'Estado', className: 'text-center' }] : []),
        { label: 'Acciones', className: 'text-center', width: '140px' }
    ];

    const getModalidadBadge = (modalidad: string | null) => {
        if (!modalidad) return <span className="text-[9px] text-gray-300">—</span>;
        const config: Record<string, { label: string; style: string }> = {
            'INICIAL': { label: 'Inicial', style: 'bg-sky-100 text-sky-700 border border-sky-200' },
            'RENOVACION': { label: 'Renov.', style: 'bg-violet-100 text-violet-700 border border-violet-200' },
            'ARMA_NUEVA': { label: 'A. Nueva', style: 'bg-orange-100 text-orange-700 border border-orange-200' },
            'TRANSFERENCIA': { label: 'Transf.', style: 'bg-rose-100 text-rose-700 border border-rose-200' },
        };
        const c = config[modalidad] || { label: modalidad, style: 'bg-gray-100 text-gray-600 border border-gray-200' };
        return (
            <span className={`inline-flex items-center justify-center w-[62px] py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${c.style}`}>
                {c.label}
            </span>
        );
    };

    const renderProgressTracker = (tramite: TramiteRow) => {
        const isMultiStage = ['L2', 'L3', 'L4', 'L5'].includes(tramite.tipo_tramite);

        // Fallback logic to infer statuses if DB columns are null (since they are new)
        let s1 = tramite.etapa1_status;
        let s2 = tramite.etapa2_status;

        if (!s1 && !s2) {
            if (tramite.estado_general === 'FINALIZADO') {
                s1 = 'COMPLETADO';
                s2 = 'COMPLETADO';
            } else if (tramite.fase_actual === 'CARNET') {
                s1 = 'EN_PROCESO';
                s2 = 'PENDIENTE';
            } else if (tramite.fase_actual === 'LICENCIA') {
                s1 = 'COMPLETADO';
                s2 = 'EN_PROCESO';
            } else {
                s1 = 'PENDIENTE';
                s2 = 'PENDIENTE';
            }
        } else {
            s1 = s1 || 'PENDIENTE';
            s2 = s2 || 'PENDIENTE';
        }

        const StageBadge = ({ label, status }: { label: string, status: string }) => {
            if (status === 'COMPLETADO') return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded-md border border-emerald-200"><CheckCircle2 size={12} /> {label}</span>;
            if (status === 'EN_PROCESO') return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-100/80 px-2 py-1 rounded-md border border-blue-200"><Loader2 size={12} className="animate-spin" /> {label}</span>;
            if (status === 'NO_REQUIERE') return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 line-through" title="No contratado/Ya tiene"><CheckCircle2 size={12} className="opacity-0 w-0 h-0" /> {label}</span>;
            return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200"><Clock size={12} /> {label}</span>; // PENDIENTE
        };

        if (isMultiStage) {
            const step1Label = tramite.tipo_tramite === 'L3' ? 'Acreditación' : 'Carnet';
            return (
                <div className="flex items-center gap-1.5 justify-center">
                    <StageBadge label={step1Label} status={s1} />
                    <div className="w-6 h-[2px] bg-slate-200 rounded-full relative">
                        {s1 === 'COMPLETADO' && <div className="absolute inset-0 bg-emerald-400 rounded-full w-full"></div>}
                    </div>
                    <StageBadge label="Licencia" status={s2} />
                </div>
            );
        }

        // Single stage
        return (
            <div className="flex justify-center">
                <StageBadge label={tramite.tipo_tramite === 'L6' ? 'SIVIC' : 'Licencia'} status={s1 as string} />
            </div>
        );
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'PENDIENTE': return { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: Clock, label: 'Pendiente' };
            case 'EN_PROCESO': return { color: 'bg-blue-100 text-blue-600 border-blue-200', icon: Loader2, label: 'En Proceso' };
            case 'OBSERVADO': return { color: 'bg-amber-100 text-amber-600 border-amber-200', icon: AlertCircle, label: 'Observado' };
            case 'FINALIZADO': return { color: 'bg-emerald-100 text-emerald-600 border-emerald-200', icon: CheckCircle2, label: 'Finalizado' };
            default: return { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: FileText, label: status };
        }
    };

    return (
        <div className="flex flex-col h-full gap-3">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center bg-gray-100/80 p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => { setModalidadFilter('TODOS'); setCurrentPage(1); }}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${modalidadFilter === 'TODOS' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => { setModalidadFilter('INICIAL'); setCurrentPage(1); }}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${modalidadFilter === 'INICIAL' ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                        Inicial
                    </button>
                    <button
                        onClick={() => { setModalidadFilter('RENOVACION'); setCurrentPage(1); }}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${modalidadFilter === 'RENOVACION' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                        Renovación
                    </button>
                </div>
            </div>
            <DataPanel>
                <DataTable headers={tableHeaders}>
                    {filteredTramites.length === 0 ? (
                        <EmptyState icon={FileText} title="No se encontraron expedientes" isTable colSpan={tableHeaders.length} />
                    ) : (
                        paginatedTramites.map((tramite) => (
                            <tr
                                key={tramite.id}
                                onClick={() => router.push(`/tramites/${tramite.id}`)}
                                className="hover:bg-gray-200/60 transition-colors cursor-pointer group"
                            >
                                <td className="px-2 py-1.5 border-b border-gray-200">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-medium text-gray-700">
                                            {new Date(tramite.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </span>
                                        <span className="text-[9px] text-gray-400">
                                            {new Date(tramite.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-2 py-1.5 border-b border-gray-200">
                                    <span className="text-xs font-semibold text-gray-800 block truncate max-w-[160px]" title={tramite.cliente_nombre}>
                                        {tramite.cliente_nombre}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5 border-b border-gray-200">
                                    <span className="text-[10px] text-gray-600 font-mono">
                                        {tramite.cliente_dni || <span className="text-gray-300">—</span>}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5 border-b border-gray-200">
                                    <span className="text-[10px] text-gray-600">
                                        {tramite.cliente_telefono || <span className="text-gray-300">—</span>}
                                    </span>
                                </td>
                                <td className="px-3 py-1.5 border-b border-gray-200 text-center">
                                    <SELAccountPopover
                                        tramiteId={tramite.id}
                                        initialData={{
                                            sel_ruc10: tramite.sel_ruc10,
                                            sel_dni: tramite.sel_dni,
                                            sel_clave: tramite.sel_clave
                                        }}
                                        onUpdate={onRefresh}
                                    />
                                </td>
                                <td className="px-2 py-1.5 border-b border-gray-200 text-center">
                                    <span className="inline-flex items-center justify-center w-[62px] py-0.5 rounded-md text-[9px] font-bold bg-slate-800 text-white uppercase tracking-wider">
                                        {tramite.tipo_tramite}
                                    </span>
                                </td>
                                <td className="px-3 py-1.5 border-b border-gray-200 text-center">
                                    {getModalidadBadge(tramite.modalidad)}
                                </td>
                                {!hideProgressColumn && (
                                    <td className="px-3 py-1.5 border-b border-gray-200 text-center">
                                        {renderProgressTracker(tramite)}
                                    </td>
                                )}
                                <td className="border-b border-gray-200" />
                                {!hideStatusColumn && (
                                    <td className="px-3 py-1.5 border-b border-gray-200 text-center text-nowrap">
                                        <StatusBadge
                                            label={getStatusConfig(tramite.estado_general).label}
                                            className={getStatusConfig(tramite.estado_general).color}
                                        />
                                    </td>
                                )}
                                <td className="px-2 py-1.5 border-b border-gray-200 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-md hover:bg-sky-100 text-gray-400 hover:text-sky-600 transition-colors" title="Ver">
                                            <Eye size={14} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-md hover:bg-amber-100 text-gray-400 hover:text-amber-600 transition-colors" title="Editar">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-md hover:bg-emerald-100 text-gray-400 hover:text-emerald-600 transition-colors" title="Abrir">
                                            <ExternalLink size={14} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-md hover:bg-rose-100 text-gray-400 hover:text-rose-600 transition-colors" title="Eliminar">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </DataTable>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredTramites.length}
                    indexOfLastItem={indexOfLastItem}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(newItemsPerPage) => {
                        setItemsPerPage(newItemsPerPage);
                        setCurrentPage(1);
                    }}
                />
            </DataPanel>
        </div>
    );
}
