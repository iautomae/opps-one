"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, FileText } from 'lucide-react';

// For simplicity in this initial calendar view, we'll just mock a few events or fetch 'tramites' to show them on their creation date
// In a full implementation, you'd query a specific 'citas' table

export default function TramitesCalendarPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    return (
        <div className="flex-1 flex flex-col p-8 pb-32">

            {/* Header */}
            <button
                onClick={() => router.push('/tramites')}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-primary transition-colors w-fit mb-6 font-medium"
            >
                <ArrowLeft size={16} /> Volver a Registro
            </button>

            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <CalendarIcon className="text-brand-primary" size={32} /> Calendario de Citas
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">Gestiona las citas de Exámenes Médicos, Polígono y SUCAMEC.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-xl hover:bg-brand-primary/90 transition-colors text-sm font-semibold shadow-sm">
                        <Plus size={18} /> Nueva Cita
                    </button>
                </div>
            </div>

            {/* Calendar UI */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
                {/* Calendar Header Tools */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-sm font-semibold text-slate-700 transition-colors">
                            Hoy
                        </button>
                        <button onClick={nextMonth} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 grid grid-cols-7 grid-rows-6">
                    {/* Days of week */}
                    {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(day => (
                        <div key={day} className="px-2 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-white">
                            {day}
                        </div>
                    ))}

                    {/* Empty cells before start of month */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} className="border-b border-r border-slate-50 bg-slate-50/30 p-2 min-h-[100px]"></div>
                    ))}

                    {/* Days of month */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const isToday = day === new Date().getDate() &&
                            currentDate.getMonth() === new Date().getMonth() &&
                            currentDate.getFullYear() === new Date().getFullYear();

                        // Simulated Event
                        const hasEvent = day === 15 || day === 22;

                        return (
                            <div key={`day-${day}`} className={`border-b border-r border-slate-100 p-2 min-h-[120px] transition-colors relative group ${isToday ? 'bg-brand-primary/5' : 'hover:bg-slate-50'}`}>
                                <div className="flex justify-between items-start">
                                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${isToday ? 'bg-brand-primary text-white' : 'text-slate-700 group-hover:bg-slate-200'
                                        }`}>
                                        {day}
                                    </span>
                                </div>

                                {hasEvent && (
                                    <div className="mt-2 space-y-1">
                                        <div className="px-2 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-xs font-medium text-blue-700 truncate cursor-pointer hover:bg-blue-100 transition-colors">
                                            <div className="flex items-center gap-1 mb-0.5"><Clock size={10} /> 10:00 AM</div>
                                            Examen Médico - <span className="font-bold">Juan Pérez</span>
                                        </div>
                                    </div>
                                )}
                                {day === 22 && (
                                    <div className="mt-1 space-y-1">
                                        <div className="px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-medium text-emerald-700 truncate cursor-pointer hover:bg-emerald-100 transition-colors">
                                            <div className="flex items-center gap-1 mb-0.5"><FileText size={10} /> 09:30 AM</div>
                                            Cita SUCAMEC - <span className="font-bold">L2 Renov.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Fill remaining spaces */}
                    {Array.from({ length: 42 - (daysInMonth + firstDayOfMonth) }).map((_, i) => (
                        <div key={`empty-end-${i}`} className="border-b border-r border-slate-50 bg-slate-50/30 p-2 min-h-[100px]"></div>
                    ))}
                </div>
            </div>
        </div>
    );
}
