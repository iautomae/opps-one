"use client";

import { useEffect, useState } from "react";
import { PanelPageLayout as PageLayout } from "@/components/ui/PanelPageLayout";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { TramitesTableBase } from "@/components/tramites/TramitesTableBase";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { Filter, Activity, BarChart2, CheckCircle2 } from "lucide-react";

const DASHBOARD_TABS = [
    { id: 'TOTAL', label: 'Total Trámites' },
    { id: 'STATS', label: 'Estadística' },
];

// Mock Data for Charts
const trendData = [
    { name: 'Ene', tramites: 40 },
    { name: 'Feb', tramites: 30 },
    { name: 'Mar', tramites: 45 },
    { name: 'Abr', tramites: 50 },
    { name: 'May', tramites: 65 },
    { name: 'Jun', tramites: 85 },
];

const incomeData = [
    { name: 'Licencias', amount: 4500 },
    { name: 'Tarjetas Prop.', amount: 3200 },
    { name: 'Traspasos', amount: 2100 },
    { name: 'Otros', amount: 1500 },
];

const statusData = [
    { name: 'Atendidos', value: 400 },
    { name: 'En Proceso', value: 150 },
    { name: 'Observados', value: 50 },
];

const COLORS = ['#14b8a6', '#0ea5e9', '#f59e0b', '#ef4444']; // Tailwind colors: teal-500, sky-500, amber-500, red-500
const BRAND_COLORS = ['#2CDB9B', '#003327', '#14b8a6', '#475569'];

const processingTimeData = [
    { name: 'Lun', hours: 24 },
    { name: 'Mar', hours: 28 },
    { name: 'Mié', hours: 22 },
    { name: 'Jue', hours: 35 },
    { name: 'Vie', hours: 30 },
];

export default function DashboardPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('TOTAL');
    const [tramites, setTramites] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('Mes'); // Mock filter state

    const fetchTramites = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('tramites')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data && !error) {
            setTramites(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchTramites();
    }, [user]);

    return (
        <PageLayout title="Dashboard">
            <div className="mb-6">
                <FilterTabs
                    tabs={DASHBOARD_TABS}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            {activeTab === 'TOTAL' ? (
                isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                    </div>
                ) : (
                    <TramitesTableBase
                        tramites={tramites}
                        onRefresh={fetchTramites}
                    />
                )
            ) : (
                <div className="space-y-6">
                    {/* Filters Strip */}
                    <div className="flex justify-end items-center gap-3">
                        <span className="text-sm text-slate-500 font-medium">Filtrar por:</span>
                        <select
                            className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-slate-700"
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                        >
                            <option value="Semana">Esta Semana</option>
                            <option value="Mes">Este Mes</option>
                            <option value="Año">Este Año</option>
                        </select>
                        <select className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-slate-700">
                            <option value="ALL">Todas las Categorías</option>
                            <option value="LICENCIAS">Licencias</option>
                            <option value="TARJETA">Tarjeta de Propiedad</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gráfico 1: Evolución en el tiempo (Lineal) */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                            <h3 className="text-slate-700 font-semibold mb-6 flex items-center gap-2">
                                <Activity size={18} className="text-brand-primary" />
                                Evolución de Trámites ({timeFilter})
                            </h3>
                            <div className="flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Line type="monotone" dataKey="tramites" stroke="#2CDB9B" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Gráfico 2: Ingresos por categoría */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                            <h3 className="text-slate-700 font-semibold mb-6 flex items-center gap-2">
                                <BarChart2 size={18} className="text-brand-primary" />
                                Ingresos Estimados (S/)
                            </h3>
                            <div className="flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={incomeData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} tickFormatter={(val) => `S/${val}`} />
                                        <RechartsTooltip
                                            cursor={{ fill: '#f1f5f9' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => [`S/ ${value}`, 'Ingresos']}
                                        />
                                        <Bar dataKey="amount" fill="#003327" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Gráfico 3: Estado de Trámites (Pie/Donut) */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                            <h3 className="text-slate-700 font-semibold mb-6 flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-brand-primary" />
                                Distribución por Estado
                            </h3>
                            <div className="flex-1 min-h-[300px] flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Gráfico 4: Tiempo de atención/demora */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                            <h3 className="text-slate-700 font-semibold mb-6 flex items-center gap-2">
                                <Activity size={18} className="text-brand-primary" />
                                Tiempo Medio de Atención (Horas)
                            </h3>
                            <div className="flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={processingTimeData}>
                                        <defs>
                                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2CDB9B" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#2CDB9B" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => [`${value} hrs`, 'Tiempo']}
                                        />
                                        <Area type="monotone" dataKey="hours" stroke="#2CDB9B" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
