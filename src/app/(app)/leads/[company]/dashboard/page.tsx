"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Plus, Trash2, Activity, BarChart2, CheckCircle2, X, Pencil, LoaderCircle, Settings, Bot, Download, Lock, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Bell, RotateCcw, Shield, Rocket, Check, Calendar, MessageSquare, UserCog, CheckCheck, ExternalLink, Zap, ClipboardList, Phone, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Lead Interface for Real Data ---
interface Lead {
    id: string;
    name: string;
    phone: string;
    date: string;
    time: string;
    status: 'POTENCIAL' | 'NO_POTENCIAL';
    summary: string;
    score: number;
    transcript: { role: string; message?: string; text?: string; time?: string }[];
    created_at: string;
    tokens_billed?: number;
    advisor_name?: string;
    estado?: 'Sin respuesta' | 'En seguimiento' | 'Compromiso de pago' | 'Pagado' | 'Descartado' | '';
    notas_seguimiento?: string;
    fecha_seguimiento?: string;
    tipo_tramite?: string;
    motivo_descarte?: string;
    primer_pago?: string;
    segundo_pago?: string;
    contact_history?: { date: string; estado: string; notas: string; }[];
}

// --- CRM Constants ---
const CRM_ESTADOS = [
    { value: 'Sin respuesta', label: 'Sin respuesta', color: 'bg-gray-100 text-gray-600 border-gray-200', activeColor: 'bg-gray-700 text-white border-gray-700' },
    { value: 'En seguimiento', label: 'En seguimiento', color: 'bg-blue-50 text-blue-600 border-blue-200', activeColor: 'bg-blue-600 text-white border-blue-600' },
    { value: 'Compromiso de pago', label: 'Compromiso de pago', color: 'bg-amber-50 text-amber-600 border-amber-200', activeColor: 'bg-amber-600 text-white border-amber-600' },
    { value: 'Pagado', label: 'Pagado', color: 'bg-green-50 text-green-600 border-green-200', activeColor: 'bg-green-600 text-white border-green-600' },
    { value: 'Descartado', label: 'Descartado sin interés', color: 'bg-red-50 text-red-600 border-red-200', activeColor: 'bg-red-600 text-white border-red-600' },
];

const ESTADO_FILTER_BUTTONS = [
    { value: 'Sin respuesta', label: 'Sin respuesta', activeClass: 'bg-white text-gray-700 shadow-sm' },
    { value: 'En seguimiento', label: 'Seguimiento', activeClass: 'bg-white text-blue-600 shadow-sm' },
    { value: 'Compromiso de pago', label: 'Para pago', activeClass: 'bg-white text-amber-600 shadow-sm' },
    { value: 'Pagado', label: 'Pagado', activeClass: 'bg-white text-green-600 shadow-sm' },
];

const MOTIVOS_DESCARTE = [
    'No contesta',
    'Número equivocado',
    'No interesado',
    'Ya tiene proveedor',
    'Precio fuera de presupuesto',
    'Otro',
];

// Placeholder agent type for better type safety
interface Agent {
    id: string;
    nombre: string;
    status: string;
    user_id: string;
    personalidad: string;
    avatar_url?: string;
    description?: string;
    prompt?: string;
    eleven_labs_agent_id?: string;
    pushover_user_1_name?: string;
    pushover_user_1_key?: string;
    pushover_user_1_token?: string;
    pushover_user_1_active?: boolean;
    pushover_user_1_template?: string;
    pushover_user_1_profile_id?: string;
    pushover_user_2_name?: string;
    pushover_user_2_key?: string;
    pushover_user_2_token?: string;
    pushover_user_2_active?: boolean;
    pushover_user_2_template?: string;
    pushover_user_2_profile_id?: string;
    pushover_user_3_name?: string;
    pushover_user_3_key?: string;
    pushover_user_3_token?: string;
    pushover_user_3_active?: boolean;
    pushover_user_3_template?: string;
    pushover_user_3_profile_id?: string;
    pushover_template?: string;
    pushover_title?: string;
    pushover_reply_message?: string;
    pushover_notification_filter?: 'ALL' | 'POTENTIAL_ONLY' | 'NO_POTENTIAL_ONLY';
    make_webhook_url?: string;
    updated_at: string;
    created_at: string;
}


export default function DynamicLeadsDashboard() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { profile } = useProfile();
    const company = params?.company as string || 'Empresa';

    // Admin View Login: Check if viewing as another user
    const viewAsUid = searchParams.get('view_as');
    const isAdmin = profile?.role === 'admin';
    const isClient = profile?.role === 'client';
    const isTenantOwner = profile?.role === 'tenant_owner';
    const targetUid = (isAdmin && viewAsUid) ? viewAsUid : user?.id;

    // Advisor visibility for clients (loaded from tenant-agents API)
    const [leadsVisibleAdvisors, setLeadsVisibleAdvisors] = useState<'all' | number[]>('all');

    // UI States — all roles skip GALLERY, go directly to LEADS
    const [view, setView] = useState<'GALLERY' | 'LEADS'>('LEADS');
    const [editableCompany, setEditableCompany] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`panel_name_${company}`);
            if (saved) return saved;
        }
        return company.charAt(0).toUpperCase() + company.slice(1);
    });
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newAgentName, setNewAgentName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAgentStats, setSelectedAgentStats] = useState<Agent | null>(null);
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
    const [crmModalLead, setCrmModalLead] = useState<Lead | null>(null);
    const [crmModalType, setCrmModalType] = useState<'INFO' | 'FOLLOW_UP' | null>(null);
    const [isSavingLead, setIsSavingLead] = useState(false);
    const [historyLead, setHistoryLead] = useState<Lead | null>(null);
    const [registroLead, setRegistroLead] = useState<Lead | null>(null);

    // Calendar panel
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Lead Stats
    const [realLeads, setRealLeads] = useState<Lead[]>([]);

    const fetchLeads = React.useCallback(async () => {
        if (!activeAgentId) {
            return;
        }

        let leadData, error;

        // Use server-side API to bypass RLS — handles role-based filtering server-side
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const fetchUrl = viewAsUid
                ? `/api/leads/fetch?agent_id=${activeAgentId}&view_as=${viewAsUid}`
                : `/api/leads/fetch?agent_id=${activeAgentId}`;
            const res = await fetch(fetchUrl, {
                headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
            });
            if (res.ok) {
                const json = await res.json();
                leadData = json.leads;
            } else {
                const errJson = await res.json();
                error = errJson.error;
            }
        } catch (e: unknown) {
            error = e instanceof Error ? e.message : String(e);
        }

        if (leadData && !error) {
            const formattedLeads: Lead[] = leadData.map((l: {
                id: string;
                created_at: string;
                nombre?: string;
                phone?: string;
                status?: string;
                summary?: string;
                transcript?: { role: string; message?: string; text?: string; time?: string }[];
                score?: number;
                tokens_billed?: number;
                advisor_name?: string;
                estado?: string;
                notas_seguimiento?: string;
                fecha_seguimiento?: string;
                tipo_tramite?: string;
                motivo_descarte?: string;
                primer_pago?: string;
                segundo_pago?: string;
                contact_history?: { date: string; estado: string; notas: string; }[];
            }) => {
                const dateObj = new Date(l.created_at);
                return {
                    id: l.id,
                    phone: l.phone || 'No proveído',
                    transcript: l.transcript || [],
                    created_at: l.created_at,
                    name: l.nombre || 'Lead Desconocido',
                    date: dateObj.toLocaleDateString('es-ES'),
                    time: dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    status: (l.status as 'POTENCIAL' | 'NO_POTENCIAL') || 'POTENCIAL',
                    summary: l.summary || 'Sin resumen',
                    score: l.score || 0,
                    tokens_billed: l.tokens_billed || 0,
                    advisor_name: l.advisor_name || '',
                    estado: (l.estado as any) || '',
                    notas_seguimiento: l.notas_seguimiento || '',
                    fecha_seguimiento: l.fecha_seguimiento || '',
                    tipo_tramite: l.tipo_tramite || '',
                    motivo_descarte: l.motivo_descarte || '',
                    primer_pago: l.primer_pago || '',
                    segundo_pago: l.segundo_pago || '',
                    contact_history: l.contact_history || []
                };
            });
            setRealLeads(formattedLeads);
        } else if (error) {
            console.error('Error fetching leads:', error);
        }
        // setIsLoadingLeads(false);
    }, [activeAgentId, view, isClient, isTenantOwner]);

    // Side Panel State
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [panelTab, setPanelTab] = useState<'SUMMARY' | 'CHAT'>('SUMMARY');
    // const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);

    // Filter State
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'POTENCIAL' | 'NO_POTENCIAL'>('ALL');
    const [filterEstado, setFilterEstado] = useState<string | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Lead filtering and pagination logic
    const filteredLeads = realLeads.filter(lead => {
        if (filterStatus !== 'ALL' && lead.status !== filterStatus) return false;
        if (filterEstado && lead.estado !== filterEstado) return false;
        return true;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const paginatedLeads = filteredLeads.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);

    // Modal States
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, name: string } | null>(null);
    const [deleteInput, setDeleteInput] = useState('');
    const [infoModal, setInfoModal] = useState<{ isOpen: boolean, type: 'success' | 'error', message: string }>({ isOpen: false, type: 'success', message: '' });

    // Safety check: ensure activeAgentId belongs to the available agents
    React.useEffect(() => {
        if (activeAgentId && agents.length > 0 && !isLoading) {
            const isAvailable = agents.some(a => a.id === activeAgentId);
            if (!isAvailable) {
                console.warn('Attempted access to unavailable agent:', activeAgentId);
                if ((isClient || isTenantOwner) && agents.length > 0) {
                    setActiveAgentId(agents[0].id);
                } else {
                    setActiveAgentId(null);
                    setView('GALLERY');
                }
            }
        }
    }, [activeAgentId, agents, isLoading, isClient, isTenantOwner]);

    // Stable ref for fetchLeads to avoid restarting the polling interval
    const fetchLeadsRef = React.useRef(fetchLeads);
    React.useEffect(() => { fetchLeadsRef.current = fetchLeads; }, [fetchLeads]);

    // Fetch leads effect with polling (realtime blocked by RLS for tenant_owners/clients)
    React.useEffect(() => {
        if (view === 'LEADS' && user?.id && activeAgentId) {
            fetchLeadsRef.current();

            const interval = setInterval(() => {
                fetchLeadsRef.current();
            }, 15000); // Poll every 15 seconds

            return () => {
                clearInterval(interval);
            };
        }
    }, [view, user?.id, activeAgentId]);

    // Load Real Agents
    React.useEffect(() => {
        if (!targetUid && !isClient && !isTenantOwner) {
            setAgents([]);
            return;
        }
        async function loadAgents() {
            setIsLoading(true);
            let data, error;
            const isImpersonating = isAdmin && viewAsUid;

            if (isClient || isTenantOwner) {
                // Client & tenant_owner: fetch tenant agents + shared admin agents via API
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch('/api/leads/tenant-agents', {
                        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
                    });
                    if (res.ok) {
                        const json = await res.json();
                        data = json.agents;
                        if (isClient) {
                            setLeadsVisibleAdvisors(json.leadsVisibleAdvisors || 'all');
                        }
                        if (json.tenantName) {
                            setEditableCompany(json.tenantName);
                        }
                    } else {
                        const errJson = await res.json();
                        error = errJson.error;
                    }
                } catch (e: unknown) {
                    error = e instanceof Error ? e.message : String(e);
                }
            } else if (isImpersonating) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch(`/api/admin/impersonate/agents?user_id=${targetUid}`, {
                        headers: { 'Authorization': `Bearer ${session?.access_token}` }
                    });
                    if (res.ok) {
                        const json = await res.json();
                        data = json.agents;
                    } else {
                        const errJson = await res.json();
                        error = errJson.error;
                    }
                } catch (e: unknown) {
                    error = e instanceof Error ? e.message : String(e);
                }
            } else {
                const result = await supabase
                    .from('agentes')
                    .select('*')
                    .eq('user_id', targetUid)
                    .order('created_at', { ascending: true });
                data = result.data;
                error = result.error;
            }

            if (data && !error) {
                setAgents(data);
                // Auto-select last agent (most recent) and skip to LEADS for all roles
                if (data.length > 0 && !activeAgentId) {
                    setActiveAgentId(data[data.length - 1].id);
                    setView('LEADS');
                }
            } else {
                setAgents([]);
                if (error) console.error('Error fetching agents:', error);
            }
            setIsLoading(false);
        }
        loadAgents();
    }, [targetUid, isAdmin, isClient, isTenantOwner, viewAsUid]);

    // Import Modal States
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importKey, setImportKey] = useState('');
    const [importKeyError, setImportKeyError] = useState('');
    const [importStep, setImportStep] = useState<'key' | 'select'>('key');
    const [importableAgents, setImportableAgents] = useState<{ agent_id: string; name?: string }[]>([]);
    const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
    const [isLoadingImports, setIsLoadingImports] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [creationProgress, setCreationProgress] = useState(0);


    // Usage Modal State
    const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
    const [selectedAgentForUsage, setSelectedAgentForUsage] = useState<Agent | null>(null);
    const [usageStats, setUsageStats] = useState<{
        total_tokens: number;
        total_cost: number;
        total_calls: number;
        daily_breakdown: { date: string; tokens: number; calls: number }[];
    }>({ total_tokens: 0, total_cost: 0, total_calls: 0, daily_breakdown: [] });
    const [usageFilter, setUsageFilter] = useState<'DAYS_7' | 'DAYS_30'>('DAYS_30');
    const [isLoadingUsage, setIsLoadingUsage] = useState(false);

    const fetchUsageStats = async (agent: Agent) => {
        setIsLoadingUsage(true);
        setSelectedAgentForUsage(agent);
        setIsUsageModalOpen(true);

        try {
            // 1. Fetch leads for this agent to calculate usage
            // Note: In a real large-scale app, we would use an RPC function or a separate stats table
            const { data: leads, error } = await supabase
                .from('leads')
                .select('created_at, tokens_billed')
                .eq('agent_id', agent.id);

            if (error) throw error;

            if (error) throw error;

            // Initialize aggregation map
            const dailyData = new Map<string, { tokens: number; calls: number }>();
            const todayStr = new Date().toISOString().split('T')[0];
            let todayTokens = 0;
            let todayCalls = 0;

            // Fill map with empty data for last 30 days
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                dailyData.set(dateStr, { tokens: 0, calls: 0 });
            }

            // Aggregate actual data
            leads?.forEach(lead => {
                const dateStr = new Date(lead.created_at).toISOString().split('T')[0];
                if (dailyData.has(dateStr)) {
                    const current = dailyData.get(dateStr)!;
                    current.tokens += (lead.tokens_billed || 0);
                    current.calls += 1;
                    dailyData.set(dateStr, current);
                }

                // Calculate Today's stats specifically
                if (dateStr === todayStr) {
                    todayTokens += (lead.tokens_billed || 0);
                    todayCalls += 1;
                }
            });

            // Convert to array and sort by date
            const breakdown = Array.from(dailyData.entries())
                .map(([date, stats]) => ({ date, ...stats }))
                .sort((a, b) => a.date.localeCompare(b.date));

            // Cost calculation: $0.30 per 1k tokens
            const costPer1k = 0.30;
            const estimatedCost = (todayTokens / 1000) * costPer1k;

            setUsageStats({
                total_tokens: todayTokens,
                total_cost: estimatedCost,
                total_calls: todayCalls,
                daily_breakdown: breakdown
            });

        } catch (err) {
            console.error('Error fetching usage:', err);
        } finally {
            setIsLoadingUsage(false);
        }
    };
    // --- Pushover States ---
    const [isPushoverModalOpen, setIsPushoverModalOpen] = useState(false);
    const [configuringAgent, setConfiguringAgent] = useState<Agent | null>(null);

    // Per-Advisor Settings (ALL Independent now)
    const [pushoverUser1Name, setPushoverUser1Name] = useState('');
    const [pushoverUser1Key, setPushoverUser1Key] = useState('');
    const [pushoverUser1Token, setPushoverUser1Token] = useState('');
    const [pushoverUser1Active, setPushoverUser1Active] = useState(true);
    const [pushoverUser1Template, setPushoverUser1Template] = useState('');
    const [pushoverUser1Title, setPushoverUser1Title] = useState('');
    const [pushoverUser1Filter, setPushoverUser1Filter] = useState<'ALL' | 'POTENTIAL_ONLY' | 'NO_POTENTIAL_ONLY'>('ALL');
    const [pushoverUser1TestPhone, setPushoverUser1TestPhone] = useState('');
    const [pushoverUser1ProfileId, setPushoverUser1ProfileId] = useState('');

    const [pushoverUser2Name, setPushoverUser2Name] = useState('');
    const [pushoverUser2Key, setPushoverUser2Key] = useState('');
    const [pushoverUser2Token, setPushoverUser2Token] = useState('');
    const [pushoverUser2Active, setPushoverUser2Active] = useState(true);
    const [pushoverUser2Template, setPushoverUser2Template] = useState('');
    const [pushoverUser2Title, setPushoverUser2Title] = useState('');
    const [pushoverUser2Filter, setPushoverUser2Filter] = useState<'ALL' | 'POTENTIAL_ONLY' | 'NO_POTENTIAL_ONLY'>('ALL');
    const [pushoverUser2TestPhone, setPushoverUser2TestPhone] = useState('');
    const [pushoverUser2ProfileId, setPushoverUser2ProfileId] = useState('');

    const [pushoverUser3Name, setPushoverUser3Name] = useState('');
    const [pushoverUser3Key, setPushoverUser3Key] = useState('');
    const [pushoverUser3Token, setPushoverUser3Token] = useState('');
    const [pushoverUser3Active, setPushoverUser3Active] = useState(true);
    const [pushoverUser3Template, setPushoverUser3Template] = useState('');
    const [pushoverUser3Title, setPushoverUser3Title] = useState('');
    const [pushoverUser3Filter, setPushoverUser3Filter] = useState<'ALL' | 'POTENTIAL_ONLY' | 'NO_POTENTIAL_ONLY'>('ALL');
    const [pushoverUser3TestPhone, setPushoverUser3TestPhone] = useState('');
    const [pushoverUser3ProfileId, setPushoverUser3ProfileId] = useState('');

    // Team members for advisor linking
    const [teamMembers, setTeamMembers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);

    // Shared UI UI States for Pushover Modal
    const [pushoverReplyMessage, setPushoverReplyMessage] = useState('');
    const [pushoverTitle, setPushoverTitle] = useState(''); // Fallback title
    const [pushoverFilter, setPushoverFilter] = useState<'ALL' | 'POTENTIAL_ONLY' | 'NO_POTENTIAL_ONLY'>('ALL'); // Fallback filter
    const [makeWebhookUrl, setMakeWebhookUrl] = useState('');
    const [activeAdvisorTab, setActiveAdvisorTab] = useState(1);
    const [isSavingPushover, setIsSavingPushover] = useState(false);
    const [isPushoverSectionOpen, setIsPushoverSectionOpen] = useState(false);

    const isPushoverConfigured = (agentId: string | null) => {
        if (!agentId) return false;
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = agent as any;
        return (
            (agent.pushover_user_1_key && agent.pushover_user_1_token && (a.pushover_user_1_active ?? true)) ||
            (agent.pushover_user_2_key && agent.pushover_user_2_token && (a.pushover_user_2_active ?? true)) ||
            (agent.pushover_user_3_key && agent.pushover_user_3_token && (a.pushover_user_3_active ?? true))
        );
    };

    const isLeadsSectionOpen = true; // Placeholder for UI logic

    // Derived: Final template generated from components
    const generatedPushoverTemplate = `Nombre: {nombre}\nResumen: {resumen}\n\n👉 Responder:\n{wa_link}`;

    // Derived state for unsaved changes in Pushover modal
    const hasUnsavedNotificationChanges = configuringAgent && (
        pushoverUser1Name !== (configuringAgent.pushover_user_1_name || '') ||
        pushoverUser1Key !== (configuringAgent.pushover_user_1_key || '') ||
        pushoverUser1Token !== (configuringAgent.pushover_user_1_token || '') ||
        pushoverUser2Name !== (configuringAgent.pushover_user_2_name || '') ||
        pushoverUser2Key !== (configuringAgent.pushover_user_2_key || '') ||
        pushoverUser2Token !== (configuringAgent.pushover_user_2_token || '') ||
        pushoverUser3Name !== (configuringAgent.pushover_user_3_name || '') ||
        pushoverUser3Key !== (configuringAgent.pushover_user_3_key || '') ||
        pushoverUser3Token !== (configuringAgent.pushover_user_3_token || '') ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser1Active !== ((configuringAgent as any).pushover_user_1_active ?? true) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser2Active !== ((configuringAgent as any).pushover_user_2_active ?? true) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser3Active !== ((configuringAgent as any).pushover_user_3_active ?? true) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser1Template !== ((configuringAgent as any).pushover_user_1_template || '') ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser1Title !== ((configuringAgent as any).pushover_user_1_title || '') ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser1Filter !== ((configuringAgent as any).pushover_user_1_notification_filter || 'ALL') ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser1TestPhone !== ((configuringAgent as any).pushover_user_1_test_phone || '') ||

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser2Template !== ((configuringAgent as any).pushover_user_2_template || '') ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser2Title !== ((configuringAgent as any).pushover_user_2_title || '') ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser2Filter !== ((configuringAgent as any).pushover_user_2_notification_filter || 'ALL') ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser2TestPhone !== ((configuringAgent as any).pushover_user_2_test_phone || '') ||

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser3Template !== ((configuringAgent as any).pushover_user_3_template || '') ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser3Title !== ((configuringAgent as any).pushover_user_3_title || '') ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser3Filter !== ((configuringAgent as any).pushover_user_3_notification_filter || 'ALL') ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverUser3TestPhone !== ((configuringAgent as any).pushover_user_3_test_phone || '') ||

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushoverReplyMessage !== ((configuringAgent as any).pushover_reply_message || (configuringAgent.pushover_template?.match(/text=(.*)/)?.[1] ? decodeURIComponent(configuringAgent.pushover_template.match(/text=(.*)/)![1]) : '')) ||
        pushoverTitle !== (configuringAgent.pushover_title || '') ||
        pushoverFilter !== (configuringAgent.pushover_notification_filter || 'ALL') ||
        makeWebhookUrl !== (configuringAgent.make_webhook_url || '')
    );

    const handleOpenPushover = (agent: Agent) => {
        setConfiguringAgent(agent);
        setPushoverUser1Name(agent.pushover_user_1_name || '');
        setPushoverUser1Key(agent.pushover_user_1_key || '');
        setPushoverUser1Token(agent.pushover_user_1_token || '');
        setPushoverUser2Name(agent.pushover_user_2_name || '');
        setPushoverUser2Key(agent.pushover_user_2_key || '');
        setPushoverUser2Token(agent.pushover_user_2_token || '');
        setPushoverUser3Name(agent.pushover_user_3_name || '');
        setPushoverUser3Key(agent.pushover_user_3_key || '');
        setPushoverUser3Token(agent.pushover_user_3_token || '');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = agent as any;
        setPushoverUser1Active(a.pushover_user_1_active ?? true);
        setPushoverUser2Active(a.pushover_user_2_active ?? true);
        setPushoverUser3Active(a.pushover_user_3_active ?? true);
        setPushoverUser1Template(a.pushover_user_1_template || '');
        setPushoverUser1Title(a.pushover_user_1_title || '');
        setPushoverUser1Filter(a.pushover_user_1_notification_filter || 'ALL');
        setPushoverUser1TestPhone(a.pushover_user_1_test_phone || '');
        setPushoverUser1ProfileId(a.pushover_user_1_profile_id || '');

        setPushoverUser2Template(a.pushover_user_2_template || '');
        setPushoverUser2Title(a.pushover_user_2_title || '');
        setPushoverUser2Filter(a.pushover_user_2_notification_filter || 'ALL');
        setPushoverUser2TestPhone(a.pushover_user_2_test_phone || '');
        setPushoverUser2ProfileId(a.pushover_user_2_profile_id || '');

        setPushoverUser3Template(a.pushover_user_3_template || '');
        setPushoverUser3Title(a.pushover_user_3_title || '');
        setPushoverUser3Filter(a.pushover_user_3_notification_filter || 'ALL');
        setPushoverUser3TestPhone(a.pushover_user_3_test_phone || '');
        setPushoverUser3ProfileId(a.pushover_user_3_profile_id || '');

        // Fetch team members for the advisor-linking dropdown
        (async () => {
            try {
                const token = (await supabase.auth.getSession()).data.session?.access_token;
                const res = await fetch('/api/tenant/team', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (res.ok) {
                    const data = await res.json();
                    setTeamMembers(data.members || []);
                }
            } catch { /* ignore - dropdown will just be empty */ }
        })();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const initialReply = a.pushover_reply_message ||
            (agent.pushover_template?.match(/text=(.*)/)?.[1] ? decodeURIComponent(agent.pushover_template.match(/text=(.*)/)![1]) : 'Hola {nombre}, mi nombre es Luis Franco de Escolta. Acabo de ver tu interés y me gustaría ayudarte.');

        setPushoverReplyMessage(initialReply);
        setPushoverTitle(agent.pushover_title || '');
        setPushoverFilter(agent.pushover_notification_filter || 'ALL');
        setMakeWebhookUrl(agent.make_webhook_url || '');
        setIsPushoverSectionOpen(false);
        setIsPushoverModalOpen(true);
    };

    const handleSavePushover = async () => {
        if (!configuringAgent) return;
        setIsSavingPushover(true);
        try {
            const isImpersonating = isAdmin && viewAsUid;
            const updateData = {
                pushover_user_1_name: pushoverUser1Name,
                pushover_user_1_key: pushoverUser1Key,
                pushover_user_1_token: pushoverUser1Token,
                pushover_user_1_active: pushoverUser1Active,
                pushover_user_1_template: pushoverUser1Template,
                pushover_user_1_title: pushoverUser1Title,
                pushover_user_1_notification_filter: pushoverUser1Filter,
                pushover_user_1_test_phone: pushoverUser1TestPhone,
                pushover_user_1_profile_id: pushoverUser1ProfileId || null,

                pushover_user_2_name: pushoverUser2Name,
                pushover_user_2_key: pushoverUser2Key,
                pushover_user_2_token: pushoverUser2Token,
                pushover_user_2_active: pushoverUser2Active,
                pushover_user_2_template: pushoverUser2Template,
                pushover_user_2_title: pushoverUser2Title,
                pushover_user_2_notification_filter: pushoverUser2Filter,
                pushover_user_2_test_phone: pushoverUser2TestPhone,
                pushover_user_2_profile_id: pushoverUser2ProfileId || null,

                pushover_user_3_name: pushoverUser3Name,
                pushover_user_3_key: pushoverUser3Key,
                pushover_user_3_token: pushoverUser3Token,
                pushover_user_3_active: pushoverUser3Active,
                pushover_user_3_template: pushoverUser3Template,
                pushover_user_3_title: pushoverUser3Title,
                pushover_user_3_notification_filter: pushoverUser3Filter,
                pushover_user_3_test_phone: pushoverUser3TestPhone,
                pushover_user_3_profile_id: pushoverUser3ProfileId || null,

                pushover_template: generatedPushoverTemplate,
                pushover_title: pushoverTitle,
                pushover_reply_message: pushoverReplyMessage,
                pushover_notification_filter: pushoverFilter,
                make_webhook_url: makeWebhookUrl
            };

            if (isImpersonating) {
                const { data: { session } } = await supabase.auth.getSession();
                console.log('Admin Save Payload:', {
                    action: 'SAVE_AGENT_CONFIG',
                    targetUid,
                    agentId: configuringAgent.id,
                    data: updateData
                });
                const res = await fetch('/api/admin/impersonate/mutate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        action: 'SAVE_AGENT_CONFIG',
                        targetUid,
                        agentId: configuringAgent.id,
                        data: updateData
                    })
                });
                if (!res.ok) {
                    const err = await res.json();
                    console.error('Server side error:', err);
                    throw new Error(err.error || 'Server error');
                }
            } else if (profile?.role === 'tenant_owner') {
                // Tenant owners use server-side API to bypass RLS for shared/global agents
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch('/api/agents/update-config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        agentId: configuringAgent.id,
                        config: updateData
                    })
                });
                if (!res.ok) {
                    const err = await res.json();
                    console.error('Server side error:', err);
                    throw new Error(err.error || 'Server error');
                }
            } else {
                console.log('Direct Save Payload:', updateData);
                const { error } = await supabase
                    .from('agentes')
                    .update(updateData)
                    .eq('id', configuringAgent.id);

                if (error) throw error;
            }

            setAgents(prevAgents => prevAgents.map(a =>
                a.id === configuringAgent.id
                    ? {
                        ...a,
                        ...updateData
                    }
                    : a
            ));
            setInfoModal({ isOpen: true, type: 'success', message: 'Configuración de notificaciones guardada.' });
            setIsPushoverModalOpen(false);
        } catch (error) {
            console.error('Error saving Pushover settings:', error);
            setInfoModal({ isOpen: true, type: 'error', message: 'Error al guardar la configuración de notificaciones.' });
        } finally {
            setIsSavingPushover(false);
        }
    };
    const handleUpdateLead = async (leadId: string, updates: Partial<Lead>) => {
        // Update local state immediately for UX
        setRealLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));

        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            // Map frontend field names to API field names
            const apiBody: Record<string, unknown> = { leadId };
            if (updates.name !== undefined) apiBody.name = updates.name;
            if (updates.status !== undefined) apiBody.status = updates.status;
            if (updates.advisor_name !== undefined) apiBody.advisorName = updates.advisor_name;
            if (updates.estado !== undefined) apiBody.estado = updates.estado;
            if (updates.notas_seguimiento !== undefined) apiBody.notas_seguimiento = updates.notas_seguimiento;
            if (updates.fecha_seguimiento !== undefined) apiBody.fecha_seguimiento = updates.fecha_seguimiento;
            if (updates.tipo_tramite !== undefined) apiBody.tipo_tramite = updates.tipo_tramite;
            if (updates.motivo_descarte !== undefined) apiBody.motivo_descarte = updates.motivo_descarte;
            if (updates.primer_pago !== undefined) apiBody.primer_pago = updates.primer_pago;
            if (updates.segundo_pago !== undefined) apiBody.segundo_pago = updates.segundo_pago;
            if (updates.contact_history !== undefined) apiBody.contact_history = updates.contact_history;

            const res = await fetch('/api/leads/update-lead', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(apiBody)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Server error');
            }
            // Refetch to ensure consistency with DB
            fetchLeadsRef.current();
        } catch (error) {
            console.error('Error updating lead:', error);
            setInfoModal({ isOpen: true, type: 'error', message: 'Error al actualizar el lead.' });
            // Revert optimistic update on failure
            fetchLeadsRef.current();
        }
    };

    const handleDeleteAgent = (agent: Agent) => {
        setDeleteConfirmation({ id: agent.id, name: agent.nombre || 'Agente sin nombre' });
        setDeleteInput(''); // Reset word check
    };

    /*
    const fetchMessages = React.useCallback(async (leadId: string) => {
        // ... implementation preserved in comments ...
    }, [targetUid, isAdmin, viewAsUid, activeAgentId]);
    */

    const confirmDelete = async () => {
        if (!deleteConfirmation || deleteInput !== 'ELIMINAR') return;
        const { id, name: nombre } = deleteConfirmation;

        try {
            console.log(`🗑️ Starting deletion for agent ${nombre} (${id})...`);
            const isImpersonating = isAdmin && viewAsUid;

            if (isImpersonating) {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch('/api/admin/impersonate/mutate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        action: 'DELETE_AGENT',
                        targetUid,
                        agentId: id
                    })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Server error');
                }
            } else {
                // 1. Manually delete associated leads first
                const { error: leadsError, count: leadsCount } = await supabase
                    .from('leads')
                    .delete({ count: 'exact' })
                    .eq('agent_id', id)
                    .eq('user_id', targetUid);

                if (leadsError) {
                    console.error('Error deleting leads:', leadsError);
                    throw new Error('No se pudieron eliminar los leads asociados.');
                }
                console.log(`✅ Leads deleted: ${leadsCount}`);

                // 2. Delete the agent
                const { error: agentError } = await supabase
                    .from('agentes')
                    .delete()
                    .eq('id', id)
                    .eq('user_id', targetUid);

                if (agentError) {
                    console.error('Error deleting agent:', agentError);
                    throw new Error('No se pudo eliminar el registro del agente.');
                }
            }

            console.log(`✅ Agent ${nombre} successfully deleted.`);

            setAgents(agents.filter(a => a.id !== id));
            setDeleteConfirmation(null);
            setDeleteInput('');
            setInfoModal({ isOpen: true, type: 'success', message: 'Agente y sus datos eliminados correctamente.' });
        } catch (error: unknown) {
            console.error('Detailed deletion error:', error);
            setDeleteConfirmation(null);
            setDeleteInput('');
            const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el agente.';
            setInfoModal({
                isOpen: true,
                type: 'error',
                message: errorMessage
            });
        }
    };

    const toggleAgentStatus = async (agent: Agent) => {
        const newStatus = agent.status === 'active' ? 'inactive' : 'active';
        try {
            const isImpersonating = isAdmin && viewAsUid;
            if (isImpersonating) {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch('/api/admin/impersonate/mutate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        action: 'TOGGLE_AGENT_STATUS',
                        targetUid,
                        agentId: agent.id,
                        data: { status: newStatus }
                    })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Server error');
                }
            } else {
                const { error } = await supabase
                    .from('agentes')
                    .update({ status: newStatus })
                    .eq('id', agent.id);
                if (error) throw error;
            }
            setAgents(prevAgents => prevAgents.map(a => a.id === agent.id ? { ...a, status: newStatus } : a));
        } catch (error) {
            console.error('Error updating status:', error);
            setInfoModal({ isOpen: true, type: 'error', message: 'Error al actualizar el estado.' });
        }
    };

    const handleQuickCreate = async () => {
        if (!newAgentName.trim() || !targetUid) return;
        setIsCreating(true);

        try {
            const { data, error } = await supabase
                .from('agentes')
                .insert([{
                    nombre: newAgentName.trim(),
                    user_id: targetUid,
                    status: 'active',
                    personalidad: 'Asesor de ventas / Asistente Comercial'
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setAgents([...agents, data]);
                setIsCreateModalOpen(false);
                setNewAgentName('');
                setInfoModal({ isOpen: true, type: 'success', message: '¡Agente creado con éxito! Ahora puedes configurarlo.' });
            }
        } catch (error) {
            console.error(error);
            setInfoModal({ isOpen: true, type: 'error', message: 'Error al crear el agente.' });
        } finally {
            setIsCreating(false);
        }
    };

    const handleFetchAvailableAgents = async () => {
        setIsLoadingImports(true);
        setImportStep('select');

        try {
            const res = await fetch('/api/elevenlabs/agents');
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error from ElevenLabs');
            }

            // ElevenLabs may return { agents: [...] } or just [...]
            let elAgents: Array<{ agent_id: string; name: string }> = [];
            if (Array.isArray(data)) {
                elAgents = data;
            } else if (data && Array.isArray(data.agents)) {
                elAgents = data.agents;
            }

            // NEW: The API already filters assigned agents and returns only one random available one.
            if (elAgents.length > 0) {
                setSelectedImports(new Set([elAgents[0].agent_id]));
            }
            setImportableAgents(elAgents);
        } catch (err) {
            console.error('Error fetching ElevenLabs agents:', err);
            setInfoModal({ isOpen: true, type: 'error', message: 'Error al conectar con ElevenLabs.' });
            setIsImportModalOpen(false);
        } finally {
            setIsLoadingImports(false);
        }
    };

    const handleOpenCreateModal = () => {
        setIsImportModalOpen(true);
        setImportStep('select');
        setImportKey('');
        setImportKeyError('');
        setNewAgentName('');
        handleFetchAvailableAgents();
    };

    const handleVerifyImportKey = async () => {
        const correctKey = process.env.NEXT_PUBLIC_IMPORT_KEY || 'oppsone2026';
        if (importKey !== correctKey) {
            setImportKeyError('Clave incorrecta. Inténtalo de nuevo.');
            return;
        }
        setImportKeyError('');
        handleFetchAvailableAgents();
    };

    /*
    const toggleImportSelection = (agentId: string) => {
        setSelectedImports(prev => {
            const next = new Set(prev);
            if (next.has(agentId)) next.delete(agentId);
            else next.add(agentId);
            return next;
        });
    };
    */

    const confirmImport = async () => {
        if (!user?.id || selectedImports.size === 0) return;
        setIsImporting(true);
        setCreationProgress(0);

        // Progress simulation interval
        const progressInterval = setInterval(() => {
            setCreationProgress(prev => {
                if (prev >= 95) return prev;
                const increment = Math.floor(Math.random() * 8) + 2;
                return Math.min(prev + increment, 95);
            });
        }, 400);

        try {
            const toImport = importableAgents.filter(a => selectedImports.has(a.agent_id));
            const newAgents: Agent[] = [];

            for (const elAgent of toImport) {
                // Fetch full agent details (prompt, knowledge base, phone, etc.)
                let agentPrompt = '';
                const agentPersonality = 'Asesor de ventas / Asistente Comercial';
                let knowledgeFiles: { name: string; size: string }[] = [];
                let phoneNumber: string | undefined;
                let phoneNumberId: string | undefined;

                try {
                    const detailRes = await fetch(`/api/elevenlabs/agents/${elAgent.agent_id}`);
                    if (detailRes.ok) {
                        const detail = await detailRes.json();

                        // Extract system prompt from conversation_config
                        const convConfig = detail.conversation_config || {};
                        const agentConfig = convConfig.agent || {};
                        agentPrompt = agentConfig.prompt?.prompt || '';

                        // Extract knowledge base files
                        const kb = agentConfig.prompt?.knowledge_base || [];
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        knowledgeFiles = kb.map((item: any) => ({
                            name: item.name || item.file_name || 'documento',
                            size: item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'N/A',
                        }));

                        // Extract WhatsApp phone number from whatsapp_accounts
                        const waAccounts = detail.whatsapp_accounts || [];
                        if (waAccounts.length > 0) {
                            phoneNumber = waAccounts[0].phone_number || '';
                            phoneNumberId = waAccounts[0].phone_number_id || '';
                        }

                        // Fallback: check phone_numbers array too
                        if (!phoneNumber) {
                            const phoneNums = detail.phone_numbers || [];
                            if (phoneNums.length > 0) {
                                phoneNumber = phoneNums[0].phone_number || '';
                                phoneNumberId = phoneNums[0].phone_number_id || '';
                            }
                        }
                    }
                } catch { /* detail fetch is optional, agent still gets imported */ }

                const token = (await supabase.auth.getSession()).data.session?.access_token;
                const importResponse = await fetch('/api/agents/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        userId: targetUid,
                        agent: {
                            name: newAgentName.trim() || elAgent.name || 'Agente Importado',
                            status: 'active',
                            personalidad: agentPersonality,
                            eleven_labs_agent_id: elAgent.agent_id,
                            prompt: agentPrompt || undefined,
                            knowledge_files: knowledgeFiles.length > 0 ? knowledgeFiles : undefined,
                            phone_number: phoneNumber || undefined,
                            phone_number_id: phoneNumberId || undefined,
                        }
                    })
                });

                if (importResponse.ok) {
                    const { agent: importedAgent } = await importResponse.json();
                    if (importedAgent) {
                        // Check if we already have this agent in state to avoid duplicates if updating
                        const exists = newAgents.find(a => a.id === importedAgent.id);
                        if (!exists) {
                            newAgents.push(importedAgent);
                        }
                    }
                } else {
                    console.error('Failed to import agent via API');
                }
            }

            setCreationProgress(100);
            setTimeout(() => {
                setAgents(prev => [...prev, ...newAgents]);
                setIsImportModalOpen(false);
                setImportStep('key');
                setImportKey('');
                setSelectedImports(new Set());
                setImportableAgents([]);
                setInfoModal({ isOpen: true, type: 'success', message: 'Agente creado con éxito.' });
            }, 500);
        } catch (err) {
            console.error('Import error:', err);
            setInfoModal({ isOpen: true, type: 'error', message: 'Error al crear el agente.' });
        } finally {
            clearInterval(progressInterval);
            setIsImporting(false);
            // Don't reset progress immediately so user can see 100%
        }
    };



    return (
        <div className="w-full flex flex-col animate-in fade-in duration-500 h-[calc(100vh-2rem)] overflow-hidden">
            {/* Admin Impersonation Banner is now handled globally by ClientLayout */}

            <div className="flex flex-col pt-6 pb-6 px-8 flex-1 overflow-hidden">
                {/* Header with Dynamic Company Name */}
                <div className="flex items-center justify-between mb-8 shrink-0">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            {/* Back Button removed — all roles go directly to LEADS */}

                            <div className="flex items-center gap-3 group">
                                {isEditingTitle ? (
                                    <input
                                        type="text"
                                        value={editableCompany}
                                        onChange={(e) => setEditableCompany(e.target.value)}
                                        onBlur={() => {
                                            setIsEditingTitle(false);
                                            localStorage.setItem(`panel_name_${company}`, editableCompany);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setIsEditingTitle(false);
                                                localStorage.setItem(`panel_name_${company}`, editableCompany);
                                            }
                                        }}
                                        autoFocus
                                        className="text-3xl font-bold text-gray-900 tracking-tight bg-gray-50 border-b border-brand-primary outline-none px-1"
                                    />
                                ) : (
                                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                                        Panel de {editableCompany}
                                    </h1>
                                )}
                                {!isClient && !isTenantOwner && (
                                    <button
                                        onClick={() => setIsEditingTitle(!isEditingTitle)}
                                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-brand-primary transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm font-medium ml-1">
                            {isClient ? "Mis Leads" : "Gestión de Leads"}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {isClient ? null : activeAgentId ? (
                            <>
                                <Link
                                    href={`/leads/agent-config?id=${activeAgentId}`}
                                    className="px-5 py-2.5 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-700 hover:border-brand-primary hover:text-brand-primary transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 shadow-sm"
                                >
                                    <Settings size={16} />
                                    Configurar Agente
                                </Link>
                                <button
                                    onClick={() => {
                                        const agentToConfig = agents.find(a => a.id === activeAgentId);
                                        if (agentToConfig) {
                                            handleOpenPushover(agentToConfig);
                                        } else {
                                            setInfoModal({ isOpen: true, type: 'error', message: 'No hay agentes para configurar.' });
                                        }
                                    }}
                                    className={cn(
                                        "px-5 py-2.5 border rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 shadow-sm",
                                        isPushoverConfigured(activeAgentId)
                                            ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                                            : "bg-white border-gray-200 text-gray-700 hover:border-brand-primary hover:text-brand-primary"
                                    )}
                                >
                                    <Bell size={16} />
                                    Notificaciones {isPushoverConfigured(activeAgentId) && <Check size={14} className="ml-1" />}
                                </button>
                            </>
                        ) : null}
                    </div>
                </div>

                {
                    isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                            <div className="w-10 h-10 border-4 border-brand-mint border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargando Leads...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full overflow-hidden">
                            {/* Filter Buttons */}
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                {/* Filter Tabs with Counts - Defined Container */}
                                <div className="flex bg-gray-300/60 p-1 rounded-xl shadow-sm border border-gray-100/30">
                                    <button
                                        onClick={() => { setFilterStatus('ALL'); setFilterEstado(null); setCurrentPage(1); }}
                                        className={cn(
                                            "px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                            filterStatus === 'ALL' && !filterEstado ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                                        )}
                                    >
                                        Todos ({realLeads.length})
                                    </button>
                                    <button
                                        onClick={() => { setFilterStatus('NO_POTENCIAL'); setFilterEstado(null); setCurrentPage(1); }}
                                        className={cn(
                                            "px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                            filterStatus === 'NO_POTENCIAL' && !filterEstado ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-red-500"
                                        )}
                                    >
                                        No Aptos ({realLeads.filter(l => l.status === 'NO_POTENCIAL').length})
                                    </button>
                                    <button
                                        onClick={() => { setFilterStatus('POTENCIAL'); setFilterEstado(null); setCurrentPage(1); }}
                                        className={cn(
                                            "px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                            filterStatus === 'POTENCIAL' && !filterEstado ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-emerald-600"
                                        )}
                                    >
                                        Aptos ({realLeads.filter(l => l.status === 'POTENCIAL').length})
                                    </button>
                                </div>

                                {/* Estado Filter Buttons */}
                                <div className="flex items-center gap-3">
                                    <div className="flex bg-gray-300/60 p-1 rounded-xl shadow-sm border border-gray-100/30">
                                        {ESTADO_FILTER_BUTTONS.map((btn) => {
                                            const isActive = filterEstado === btn.value;
                                            const count = realLeads.filter(l => l.estado === btn.value).length;
                                            return (
                                                <button
                                                    key={btn.value}
                                                    onClick={() => { setFilterEstado(btn.value); setFilterStatus('POTENCIAL'); setCurrentPage(1); }}
                                                    className={cn(
                                                        "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                                        isActive ? btn.activeClass : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                                                    )}
                                                >
                                                    {btn.label} ({count})
                                                </button>
                                            );
                                        })}
                                    </div>

                                </div>
                            </div>

                            <div className="flex-1 overflow-auto bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl relative flex flex-col">
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-left border-collapse table-fixed">
                                        <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-3 py-3 text-[10px] font-bold text-gray-900 border-b border-gray-200 uppercase tracking-tight bg-gray-50/50 w-[75px]">Fecha</th>
                                                <th className="px-2 py-3 text-[10px] font-bold text-gray-500 border-b border-l border-gray-100 uppercase tracking-tight bg-gray-50/50 w-[50px] text-center">Tokens</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-gray-500 border-b border-l border-gray-100 uppercase tracking-tight bg-gray-50/50 w-[160px]">Nombre</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-gray-500 border-b border-l border-gray-100 uppercase tracking-tight bg-gray-50/50 w-[105px]">Teléfono</th>
                                                <th className="px-3 py-3 text-[10px] font-bold text-gray-500 border-b border-l border-gray-100 uppercase tracking-tight bg-gray-50/50">Resumen</th>
                                                <th className="px-2 py-3 text-[10px] font-bold text-gray-500 border-b border-l border-gray-100 text-center uppercase tracking-tight bg-gray-50/50 w-[42px]">Chat</th>
                                                <th className="px-2 py-3 text-[10px] font-bold text-gray-500 border-b border-l border-gray-100 text-center uppercase tracking-tight bg-gray-50/50 w-[95px]">Calific.</th>
                                                <th className="px-2 py-3 text-[10px] font-bold text-gray-500 border-b border-l border-gray-100 text-center uppercase tracking-tight bg-gray-50/50 w-[100px]">Estado</th>
                                                <th className="px-2 py-3 text-[10px] font-bold text-gray-500 border-b border-l border-gray-100 text-center uppercase tracking-tight bg-gray-50/50 w-[80px]">Asesor</th>
                                                <th className="px-2 py-3 text-[10px] font-bold text-gray-500 border-b border-l border-gray-100 text-center uppercase tracking-tight bg-gray-50/50 w-[155px]">CRM</th>
                                            </tr >
                                        </thead >
                                        <tbody className="divide-y divide-gray-100">
                                            {paginatedLeads.map((lead) => (
                                                <tr
                                                    key={lead.id}
                                                    className="bg-white hover:bg-gray-100 transition-colors group"
                                                >
                                                    <td className="px-3 py-1.5 border-b border-gray-100">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-medium text-gray-700">
                                                                {lead.date}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400">
                                                                {lead.time}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-1.5 border-b border-l border-gray-100 text-center">
                                                        <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full border border-gray-200">
                                                            {lead.tokens_billed?.toLocaleString() || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-1.5 border-b border-l border-gray-100">
                                                        <span className="text-xs font-medium text-gray-700 block truncate" title={lead.name}>
                                                            {lead.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-1.5 border-b border-l border-gray-100">
                                                        <span className="text-[10px] text-gray-500 font-medium">{lead.phone}</span>
                                                    </td>
                                                    <td className="px-3 py-1.5 border-b border-l border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { setSelectedLead(lead); setPanelTab('SUMMARY'); }}>
                                                        <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight" title="Ver resumen completo">
                                                            {lead.summary}
                                                        </p>
                                                    </td>
                                                    <td className="px-2 py-1.5 border-b border-l border-gray-100 text-center">
                                                        <button
                                                            onClick={() => { setSelectedLead(lead); setPanelTab('CHAT'); }}
                                                            className="p-1 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-md transition-colors group/chat"
                                                            title="Ver Chat WhatsApp"
                                                        >
                                                            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-[#25D366] group-hover/chat:scale-110 transition-transform">
                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                    <td className="px-2 py-1.5 border-b border-l border-gray-100 text-center">
                                                        <span className={cn(
                                                            "px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wide inline-flex justify-center border",
                                                            lead.status === 'POTENCIAL' ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-red-100 text-red-600 border-red-200"
                                                        )}>
                                                            {lead.status === 'POTENCIAL' ? 'Potencial' : 'No Potencial'}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-1.5 border-b border-l border-gray-100 text-center">
                                                        {lead.status === 'POTENCIAL' ? (
                                                            <span className={cn(
                                                                "px-1.5 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wide inline-flex justify-center border whitespace-nowrap",
                                                                lead.estado === 'Sin respuesta' && "bg-gray-100 text-gray-500 border-gray-200",
                                                                lead.estado === 'En seguimiento' && "bg-blue-100 text-blue-600 border-blue-200",
                                                                lead.estado === 'Compromiso de pago' && "bg-amber-100 text-amber-600 border-amber-200",
                                                                lead.estado === 'Pagado' && "bg-green-100 text-green-600 border-green-200",
                                                                lead.estado === 'Descartado' && "bg-red-100 text-red-600 border-red-200",
                                                                !lead.estado && "bg-gray-50 text-gray-400 border-gray-200"
                                                            )}>
                                                                {lead.estado || 'X Contactar'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-1.5 border-b border-l border-gray-100 text-center">
                                                        <span className="text-[9px] font-bold text-gray-700 truncate block">
                                                            {lead.status === 'POTENCIAL' ? (lead.advisor_name || '—') : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-1.5 border-b border-l border-gray-100 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {(isAdmin || isTenantOwner) && (
                                                            <button
                                                                onClick={() => { setCrmModalLead(lead); setCrmModalType('INFO'); }}
                                                                className="p-1.5 bg-emerald-50 text-emerald-500 border border-emerald-200 rounded-lg transition-all hover:scale-110 hover:shadow-md hover:shadow-emerald-100"
                                                                title="Actualizar Info"
                                                            >
                                                                <UserCog size={13} />
                                                            </button>
                                                            )}
                                                            {lead.status === 'POTENCIAL' && (
                                                                <button
                                                                    onClick={() => { setCrmModalLead(lead); setCrmModalType('FOLLOW_UP'); }}
                                                                    className="p-1.5 bg-amber-50 text-amber-500 border border-amber-200 rounded-lg transition-all hover:scale-110 hover:shadow-md hover:shadow-amber-100"
                                                                    title="Gestionar Lead"
                                                                >
                                                                    <Zap size={13} />
                                                                </button>
                                                            )}
                                                            {lead.contact_history && lead.contact_history.length > 0 && (
                                                                <button
                                                                    onClick={() => setHistoryLead(lead)}
                                                                    className="p-1.5 bg-indigo-50 text-indigo-500 border border-indigo-200 rounded-lg transition-all hover:scale-110 hover:shadow-md hover:shadow-indigo-100"
                                                                    title="Historial de contacto"
                                                                >
                                                                    <ClipboardList size={13} />
                                                                </button>
                                                            )}
                                                            {lead.estado === 'Pagado' && (
                                                                <button
                                                                    onClick={() => setRegistroLead(lead)}
                                                                    className="p-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg transition-all hover:scale-110 hover:shadow-md hover:shadow-green-100"
                                                                    title="Registro de cliente"
                                                                >
                                                                    <DollarSign size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Footer - Inside Container */}
                                <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-200 flex items-center justify-between shrink-0 backdrop-blur-md">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                            className="bg-white border border-gray-300 rounded-md text-[10px] font-bold text-gray-700 py-0.5 pl-2 pr-6 outline-none focus:border-brand-primary h-6 cursor-pointer hover:border-brand-primary transition-colors"
                                        >
                                            <option value={15}>15 Filas</option>
                                            <option value={50}>50 Filas</option>
                                            <option value={100}>100 Filas</option>
                                        </select>
                                        <p className="text-[10px] text-gray-400 font-medium ml-2">
                                            {Math.min(indexOfLastItem, filteredLeads.length)} de {filteredLeads.length}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            className="p-1 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                                        >
                                            <ChevronsLeft size={14} />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="p-1 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                                        >
                                            <ChevronLeft size={14} />
                                        </button>

                                        <div className="px-2 text-[10px] font-bold text-gray-600">
                                            {currentPage} / {totalPages}
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="p-1 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            className="p-1 rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                                        >
                                            <ChevronsRight size={14} />
                                        </button>
                                    </div>
                                </div >
                            </div >
                        </div >
                    )
                }
                {/* Statistics Modal */}
                {
                    selectedAgentStats && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-mint/10 flex items-center justify-center text-brand-mint">
                                            <Activity size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Estadísticas de Uso</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{selectedAgentStats.nombre}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedAgentStats(null)}
                                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Hoy</p>
                                            <p className="text-2xl font-black text-gray-900">452 <span className="text-[10px] font-bold text-gray-400">Tokens</span></p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Este Mes</p>
                                            <p className="text-2xl font-black text-gray-900">12.4k <span className="text-[10px] font-bold text-gray-400">Tokens</span></p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actividad Reciente</h4>
                                        <div className="space-y-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl text-xs">
                                                    <span className="text-gray-500 font-medium">0{i} Feb, 2024</span>
                                                    <span className="font-bold text-brand-mint">+120 tokens</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedAgentStats(null)}
                                        className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-gray-900/10"
                                    >
                                        Cerrar Ventanilla
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Quick Create Modal */}
                {
                    isCreateModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-mint/10 flex items-center justify-center text-brand-mint">
                                            <Plus size={20} />
                                        </div>
                                        <h3 className="font-bold text-gray-900">Nuevo Agente</h3>
                                    </div>
                                    <button
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nombre del Agente</label>
                                        <input
                                            type="text"
                                            value={newAgentName}
                                            onChange={(e) => setNewAgentName(e.target.value)}
                                            placeholder="Ej: Sofia de Ventas"
                                            autoFocus
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-brand-mint/20 focus:border-brand-mint outline-none text-gray-900 font-bold placeholder:text-gray-300 transition-all font-mono"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setIsCreateModalOpen(false)}
                                            className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleQuickCreate}
                                            disabled={isCreating || !newAgentName.trim()}
                                            className="flex-2 px-8 py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-gray-900/10 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isCreating ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}
                                            Crear Agente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Delete Confirmation Modal */}
                {
                    deleteConfirmation && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center border-2 border-red-100">
                                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Trash2 size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">¡Cuidado! Acción de alto riesgo</h3>

                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 text-left">
                                    <p className="text-[11px] font-bold text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Activity size={14} />
                                        ¿Qué se eliminará?
                                    </p>
                                    <ul className="text-xs text-amber-700/80 space-y-1 ml-4 list-disc font-medium">
                                        <li>Todos los leads capturados por <span className="font-bold text-amber-900">{deleteConfirmation.name}</span>.</li>
                                        <li>Historial de chats y registros de actividad.</li>
                                        <li>Configuración personalizada del agente.</li>
                                    </ul>
                                </div>

                                <p className="text-sm text-gray-500 mb-6 font-medium">
                                    Para confirmar la eliminación permanente, escribe <span className="font-bold text-red-600">ELIMINAR</span> a continuación:
                                </p>

                                <input
                                    type="text"
                                    value={deleteInput}
                                    onChange={(e) => setDeleteInput(e.target.value.toUpperCase())}
                                    placeholder="Escribe ELIMINAR"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-center font-bold text-red-600 placeholder:text-gray-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mb-6 transition-all"
                                    autoFocus
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDeleteConfirmation(null)}
                                        className="flex-1 py-3 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        disabled={deleteInput !== 'ELIMINAR'}
                                        className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-30 disabled:shadow-none"
                                    >
                                        Eliminar Agente
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Info/Success/Error Modal */}
                {
                    infoModal.isOpen && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center">
                                <div className={cn(
                                    "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                                    infoModal.type === 'success' ? "bg-brand-mint/10 text-brand-mint" : "bg-red-50 text-red-500"
                                )}>
                                    {infoModal.type === 'success' ? <CheckCircle2 size={32} /> : <X size={32} />}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    {infoModal.type === 'success' ? '¡Éxito!' : 'Ups, algo pasó'}
                                </h3>
                                <p className="text-sm text-gray-500 mb-8 font-medium">
                                    {infoModal.message}
                                </p>
                                <button
                                    onClick={() => setInfoModal({ ...infoModal, isOpen: false })}
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-lg"
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Import Agents Modal */}
                {
                    isImportModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-mint/10 flex items-center justify-center text-brand-mint">
                                            {importStep === 'key' ? <Lock size={20} /> : <Download size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">
                                                {importStep === 'key' ? 'Verificar Acceso' : 'Crea tu Nuevo Agente'}
                                            </h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                {importStep === 'key' ? 'Ingresa tu clave de acceso' : 'Ingresa el nombre para tu nuevo asistente'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setIsImportModalOpen(false); setImportStep('key'); setImportKey(''); }}
                                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-6">
                                    {importStep === 'key' ? (
                                        <>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Clave Secreta</label>
                                                <input
                                                    type="password"
                                                    value={importKey}
                                                    onChange={(e) => { setImportKey(e.target.value); setImportKeyError(''); }}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyImportKey()}
                                                    placeholder="Ingresa tu clave de acceso"
                                                    autoFocus
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-brand-mint/20 focus:border-brand-mint outline-none text-gray-900 font-bold placeholder:text-gray-300 transition-all"
                                                />
                                                {importKeyError && (
                                                    <p className="text-red-500 text-xs font-medium">{importKeyError}</p>
                                                )}
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setIsImportModalOpen(false)}
                                                    className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleVerifyImportKey}
                                                    disabled={!importKey.trim()}
                                                    className="flex-2 px-8 py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-gray-900/10 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    <Lock size={14} />
                                                    Verificar
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {isLoadingImports ? (
                                                <div className="flex flex-col items-center justify-center py-8 gap-3">
                                                    <LoaderCircle size={24} className="animate-spin text-brand-mint" />
                                                    <p className="text-sm text-gray-400 font-medium">Cargando agentes de ElevenLabs...</p>
                                                </div>
                                            ) : importableAgents.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-8 gap-3">
                                                    <CheckCircle2 size={32} className="text-brand-mint" />
                                                    <p className="text-sm text-gray-500 font-medium text-center">No hay más agentes disponibles en este momento.<br /><span className="text-[10px] text-gray-400 uppercase">Contacta con soporte para ampliar tu pool.</span></p>
                                                    <button
                                                        onClick={() => setIsImportModalOpen(false)}
                                                        className="mt-4 px-8 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all"
                                                    >
                                                        Cerrar
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="space-y-4">
                                                        {isImporting ? (
                                                            <div className="flex flex-col items-center justify-center py-6 gap-5 w-full">
                                                                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden border border-gray-100 shadow-inner">
                                                                    <div
                                                                        className="bg-brand-mint h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(44,219,155,0.4)]"
                                                                        style={{ width: `${creationProgress}%` }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <LoaderCircle size={14} className="animate-spin text-brand-mint" />
                                                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.2em]">
                                                                        Creando Agente... <span className="text-brand-mint">{creationProgress}%</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nombre del Agente</label>
                                                                    <input
                                                                        type="text"
                                                                        value={newAgentName}
                                                                        onChange={(e) => setNewAgentName(e.target.value)}
                                                                        placeholder="Ej: Asistente de Ventas"
                                                                        autoFocus
                                                                        onKeyDown={(e) => e.key === 'Enter' && confirmImport()}
                                                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-brand-mint/20 focus:border-brand-mint outline-none text-gray-900 font-bold placeholder:text-gray-300 transition-all font-inter"
                                                                    />
                                                                </div>
                                                                <div className="flex gap-3 mt-6">
                                                                    <button
                                                                        onClick={() => { setIsImportModalOpen(false); setImportStep('key'); }}
                                                                        className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                    <button
                                                                        onClick={confirmImport}
                                                                        disabled={isImporting || !newAgentName.trim() || selectedImports.size === 0}
                                                                        className="flex-2 px-8 py-4 bg-brand-mint text-brand-dark rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-brand-mint/10 disabled:opacity-50 flex items-center justify-center gap-2"
                                                                    >
                                                                        <Plus size={14} />
                                                                        Crear Ahora
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Unified Side Panel */}
                {
                    selectedLead && (
                        <div className="fixed inset-0 z-50 flex justify-end">
                            {/* Backdrop */}
                            <div
                                className="absolute inset-0 bg-black/20 backdrop-blur-[1px] transition-opacity"
                                onClick={() => setSelectedLead(null)}
                            />

                            {/* Panel */}
                            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-gray-100">
                                {/* Header */}
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-green-50 rounded-xl text-green-600 shadow-sm border border-green-100">
                                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366]">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-sm">{selectedLead.name}</h3>
                                                <p className="text-[10px] text-gray-500">{selectedLead.phone}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedLead(null)}
                                            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Qualification Badge */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calificación</span>
                                        <span className={cn(
                                            "w-24 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide inline-flex justify-center",
                                            selectedLead.status === 'POTENCIAL'
                                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                : "bg-red-100 text-red-700 border border-red-200"
                                        )}>
                                            {selectedLead.status === 'POTENCIAL' ? 'POTENCIAL' : 'NO POTENCIAL'}
                                        </span>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex bg-gray-200/50 p-1 rounded-xl">
                                        <button
                                            onClick={() => setPanelTab('SUMMARY')}
                                            className={cn(
                                                "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                                panelTab === 'SUMMARY' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            Resumen
                                        </button>
                                        <button
                                            onClick={() => setPanelTab('CHAT')}
                                            className={cn(
                                                "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                                panelTab === 'CHAT' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            Chat
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-visible bg-white relative flex flex-col min-h-0">
                                    {panelTab === 'SUMMARY' ? (
                                        <div className="p-6 overflow-y-auto">
                                            <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">
                                                {selectedLead.summary}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col h-full min-h-0">
                                            {/* Transcript Content */}
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 relative">
                                                {selectedLead.transcript && selectedLead.transcript.length > 0 ? (
                                                    selectedLead.transcript.map((msg: { role: string; message?: string; text?: string; time?: string }, idx: number) => (
                                                        <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                                            <div className={cn(
                                                                "px-3 py-2 rounded-lg text-xs max-w-[80%] shadow-sm",
                                                                msg.role === 'user'
                                                                    ? "bg-brand-mint/20 text-gray-900 rounded-tr-none"
                                                                    : "bg-white border border-gray-100 text-gray-900 rounded-tl-none"
                                                            )}>
                                                                <p>{msg.message || msg.text}</p>
                                                                {msg.time && <span className="text-[9px] text-gray-400 block text-right mt-1">{msg.time}</span>}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center p-12 text-center">
                                                        <Lock size={32} className="text-gray-200 mb-2" />
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sin transcripción disponible</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Fixed Footer Disclaimer */}
                                            <div className="bg-gray-50 border-t border-gray-100 p-4 shrink-0">
                                                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm">
                                                    <Lock size={10} className="text-gray-400" />
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                                        Protegido y guardado por <span className="text-brand-primary">Opps One</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    )
                }

                {/* Pushover Configuration Modal */}
                {
                    isPushoverModalOpen && configuringAgent && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                            <Bell size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 leading-tight">Configurar Notificación Push</h3>
                                            <div className="mt-1 relative group">
                                                <select
                                                    value={configuringAgent.id}
                                                    onChange={(e) => {
                                                        const selected = agents.find(a => a.id === e.target.value);
                                                        if (selected) handleOpenPushover(selected);
                                                    }}
                                                    className="w-full bg-transparent border-none p-0 text-[10px] text-gray-400 font-bold uppercase tracking-widest focus:ring-0 cursor-pointer hover:text-brand-primary transition-colors appearance-none pr-4"
                                                >
                                                    {agents.map(agent => (
                                                        <option key={agent.id} value={agent.id}>{agent.nombre}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-brand-primary transition-colors">
                                                    <ChevronsRight size={10} className="rotate-90" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsPushoverModalOpen(false)}
                                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                                    <div className="space-y-4 pt-4">
                                        <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                            <h4 className="text-[11px] font-bold text-gray-400 gap-2 uppercase tracking-widest flex items-center">
                                                <Bell size={12} className="text-brand-primary" />
                                                Pushover (Opcional)
                                            </h4>
                                            <button
                                                onClick={() => setIsPushoverSectionOpen(!isPushoverSectionOpen)}
                                                className="text-[10px] font-bold text-brand-primary uppercase tracking-tighter hover:underline"
                                            >
                                                {isPushoverSectionOpen ? 'Ocultar' : 'Configurar'}
                                            </button>
                                        </div>

                                        {isPushoverSectionOpen && (
                                            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-3 bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                                                    <div className="space-y-4">
                                                        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                                                            {[1, 2, 3].map((num) => (
                                                                <button
                                                                    key={num}
                                                                    onClick={() => setActiveAdvisorTab(num)}
                                                                    className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeAdvisorTab === num
                                                                        ? 'bg-white text-brand-primary shadow-sm'
                                                                        : 'text-gray-400 hover:text-gray-600'
                                                                        }`}
                                                                >
                                                                    Asesor {num}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                            <div className="flex items-center justify-between bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Activar Asesor {activeAdvisorTab}</label>
                                                                    <span className="text-[9px] text-gray-400 font-medium">Habilitar/deshabilitar notificaciones para este usuario.</span>
                                                                </div>
                                                                <div
                                                                    onClick={() => {
                                                                        if (activeAdvisorTab === 1) setPushoverUser1Active(!pushoverUser1Active);
                                                                        else if (activeAdvisorTab === 2) setPushoverUser2Active(!pushoverUser2Active);
                                                                        else setPushoverUser3Active(!pushoverUser3Active);
                                                                    }}
                                                                    className={cn(
                                                                        "w-11 h-6 rounded-full relative transition-all cursor-pointer shadow-inner flex items-center px-1",
                                                                        (activeAdvisorTab === 1 ? pushoverUser1Active : activeAdvisorTab === 2 ? pushoverUser2Active : pushoverUser3Active) ? "bg-brand-primary/20" : "bg-gray-100 border border-gray-200"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "w-4 h-4 rounded-full shadow-md transition-all duration-300",
                                                                        (activeAdvisorTab === 1 ? pushoverUser1Active : activeAdvisorTab === 2 ? pushoverUser2Active : pushoverUser3Active) ? "translate-x-5 bg-brand-primary" : "translate-x-0 bg-gray-400"
                                                                    )} />
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3 bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nombre del Asesor {activeAdvisorTab}</label>
                                                                <input
                                                                    type="text"
                                                                    value={activeAdvisorTab === 1 ? pushoverUser1Name : activeAdvisorTab === 2 ? pushoverUser2Name : pushoverUser3Name}
                                                                    onChange={(e) => activeAdvisorTab === 1 ? setPushoverUser1Name(e.target.value) : activeAdvisorTab === 2 ? setPushoverUser2Name(e.target.value) : setPushoverUser3Name(e.target.value)}
                                                                    placeholder={`Nombre del Asesor ${activeAdvisorTab}`}
                                                                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none text-sm text-gray-900 font-bold placeholder:text-gray-300 transition-all shadow-sm"
                                                                />
                                                            </div>


                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-3 bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">User Key</label>
                                                                    <input
                                                                        type="text"
                                                                        value={activeAdvisorTab === 1 ? pushoverUser1Key : activeAdvisorTab === 2 ? pushoverUser2Key : pushoverUser3Key}
                                                                        onChange={(e) => activeAdvisorTab === 1 ? setPushoverUser1Key(e.target.value) : activeAdvisorTab === 2 ? setPushoverUser2Key(e.target.value) : setPushoverUser3Key(e.target.value)}
                                                                        placeholder="User Key"
                                                                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none text-xs text-gray-900 font-bold placeholder:text-gray-300 transition-all font-mono"
                                                                    />
                                                                </div>
                                                                <div className="space-y-3 bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">API Token</label>
                                                                    <input
                                                                        type="password"
                                                                        value={activeAdvisorTab === 1 ? pushoverUser1Token : activeAdvisorTab === 2 ? pushoverUser2Token : pushoverUser3Token}
                                                                        onChange={(e) => activeAdvisorTab === 1 ? setPushoverUser1Token(e.target.value) : activeAdvisorTab === 2 ? setPushoverUser2Token(e.target.value) : setPushoverUser3Token(e.target.value)}
                                                                        placeholder="API Token"
                                                                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none text-xs text-gray-900 font-bold placeholder:text-gray-300 transition-all font-mono"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3 bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teléfono para Prueba (Obligatorio)</label>
                                                                    <button
                                                                        onClick={async () => {
                                                                            const key = activeAdvisorTab === 1 ? pushoverUser1Key : activeAdvisorTab === 2 ? pushoverUser2Key : pushoverUser3Key;
                                                                            const token = activeAdvisorTab === 1 ? pushoverUser1Token : activeAdvisorTab === 2 ? pushoverUser2Token : pushoverUser3Token;
                                                                            const testPhone = activeAdvisorTab === 1 ? pushoverUser1TestPhone : activeAdvisorTab === 2 ? pushoverUser2TestPhone : pushoverUser3TestPhone;
                                                                            const advisorTemplate = activeAdvisorTab === 1 ? pushoverUser1Template : activeAdvisorTab === 2 ? pushoverUser2Template : pushoverUser3Template;

                                                                            if (!key || !token) {
                                                                                setInfoModal({ isOpen: true, type: 'error', message: 'Configura Key y Token antes de probar.' });
                                                                                return;
                                                                            }
                                                                            if (!testPhone || testPhone.trim() === '') {
                                                                                setInfoModal({ isOpen: true, type: 'error', message: 'Indica un teléfono para la prueba.' });
                                                                                return;
                                                                            }

                                                                            try {
                                                                                const cleanPhone = testPhone.replace(/\D/g, '');
                                                                                const waBase = `https://wa.me/${cleanPhone}`;
                                                                                const rawReply = advisorTemplate ?? pushoverReplyMessage ?? '';
                                                                                const personalizedReply = rawReply.replace(/{nombre}/g, 'Usuario de Prueba');
                                                                                const waLink = personalizedReply.trim()
                                                                                    ? `${waBase}?text=${encodeURIComponent(personalizedReply)}`
                                                                                    : waBase;

                                                                                const testMessage = `Nombre: <b>Usuario de Prueba</b><br>Resumen: <b>Mensaje de comprobación de configuración.</b><br><br>👉 Responder:<br><a href="${waLink}">${waLink}</a>`;

                                                                                const res = await fetch('/api/pushover/test', {
                                                                                    method: 'POST',
                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                    body: JSON.stringify({
                                                                                        key,
                                                                                        token,
                                                                                        title: (activeAdvisorTab === 1 ? pushoverUser1Title : activeAdvisorTab === 2 ? pushoverUser2Title : pushoverUser3Title) || 'Prueba de Notificación',
                                                                                        message: testMessage
                                                                                    })
                                                                                });
                                                                                if (res.ok) setInfoModal({ isOpen: true, type: 'success', message: '¡Push de prueba enviado!' });
                                                                                else throw new Error('Error en el envío');
                                                                            } catch (err) {
                                                                                setInfoModal({ isOpen: true, type: 'error', message: 'Error al enviar el push de prueba.' });
                                                                            }
                                                                        }}
                                                                        className="px-3 py-1 bg-brand-primary text-white text-[9px] font-bold uppercase rounded-lg hover:brightness-110 flex items-center gap-1.5 transition-all active:scale-95"
                                                                    >
                                                                        <Rocket size={10} />
                                                                        🚀 Probar
                                                                    </button>
                                                                </div>
                                                                <textarea
                                                                    value={activeAdvisorTab === 1 ? pushoverUser1TestPhone : activeAdvisorTab === 2 ? pushoverUser2TestPhone : pushoverUser3TestPhone}
                                                                    onChange={(e) => activeAdvisorTab === 1 ? setPushoverUser1TestPhone(e.target.value) : activeAdvisorTab === 2 ? setPushoverUser2TestPhone(e.target.value) : setPushoverUser3TestPhone(e.target.value)}
                                                                    placeholder="Ej: 521234567890 (Sin símbolos)"
                                                                    rows={1}
                                                                    className="w-full bg-white border border-gray-200 rounded-xl py-2 px-4 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none text-xs text-gray-900 font-bold transition-all"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filtro de Notificaciones (Asesor {activeAdvisorTab})</label>
                                                    <div className="relative">
                                                        <select
                                                            value={activeAdvisorTab === 1 ? pushoverUser1Filter : activeAdvisorTab === 2 ? pushoverUser2Filter : pushoverUser3Filter}
                                                            onChange={(e) => {
                                                                const val = e.target.value as 'ALL' | 'POTENTIAL_ONLY' | 'NO_POTENTIAL_ONLY';
                                                                if (activeAdvisorTab === 1) setPushoverUser1Filter(val);
                                                                else if (activeAdvisorTab === 2) setPushoverUser2Filter(val);
                                                                else setPushoverUser3Filter(val);
                                                            }}
                                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none text-sm text-gray-900 font-medium transition-all appearance-none cursor-pointer"
                                                        >
                                                            <option value="ALL">Notificar Todos los Leads</option>
                                                            <option value="POTENTIAL_ONLY">Solo Leads Potenciales</option>
                                                            <option value="NO_POTENTIAL_ONLY">Solo Leads No Potenciales</option>
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                            <ChevronsRight size={14} className="rotate-90" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Título de Notificación (Asesor {activeAdvisorTab})</label>
                                                    <input
                                                        type="text"
                                                        value={activeAdvisorTab === 1 ? pushoverUser1Title : activeAdvisorTab === 2 ? pushoverUser2Title : pushoverUser3Title}
                                                        onChange={(e) => {
                                                            if (activeAdvisorTab === 1) setPushoverUser1Title(e.target.value);
                                                            else if (activeAdvisorTab === 2) setPushoverUser2Title(e.target.value);
                                                            else setPushoverUser3Title(e.target.value);
                                                        }}
                                                        placeholder="Ej: Nuevo Lead Detectado"
                                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none text-sm text-gray-900 font-medium placeholder:text-gray-300 transition-all font-mono"
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Plantilla de Notificación (Asesor {activeAdvisorTab})</label>
                                                        <span className="text-[9px] text-blue-500 font-medium">Usa {"{nombre}"} para personalizar el mensaje de WhatsApp individual</span>
                                                    </div>

                                                    <div className="relative">
                                                        <textarea
                                                            value={activeAdvisorTab === 1 ? pushoverUser1Template : activeAdvisorTab === 2 ? pushoverUser2Template : pushoverUser3Template}
                                                            onChange={(e) => activeAdvisorTab === 1 ? setPushoverUser1Template(e.target.value) : activeAdvisorTab === 2 ? setPushoverUser2Template(e.target.value) : setPushoverUser3Template(e.target.value)}
                                                            placeholder={`Escribe el mensaje para el Asesor ${activeAdvisorTab}...`}
                                                            rows={4}
                                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none text-sm text-gray-900 font-medium placeholder:text-gray-300 transition-all leading-relaxed"
                                                        />
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50/50 rounded-xl border border-gray-100">
                                                        {['👋', '😊', '🤝', '🙌', '🔥', '✨', '🚀', '✅', '📞', '💬', '📍', '📩', '📱', '🎯'].map(emoji => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => {
                                                                    if (activeAdvisorTab === 1) setPushoverUser1Template(prev => prev + emoji);
                                                                    else if (activeAdvisorTab === 2) setPushoverUser2Template(prev => prev + emoji);
                                                                    else setPushoverUser3Template(prev => prev + emoji);
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-100 rounded-lg text-base shadow-sm transition-all hover:scale-110 active:scale-90 border border-gray-100"
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="p-4 bg-gray-900 rounded-2xl border border-gray-800 shadow-inner">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Vista Previa (Móvil)</span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex gap-2">
                                                                <span className="text-[10px] font-bold text-brand-primary">Nombre:</span>
                                                                <span className="text-[10px] text-gray-300">Juan Pérez</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <span className="text-[10px] font-bold text-brand-primary">Resumen:</span>
                                                                <span className="text-[10px] text-gray-300 line-clamp-1">Interesado en cotización...</span>
                                                            </div>
                                                            <div className="pt-2 border-t border-gray-800">
                                                                <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-2 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-lg bg-[#25D366] flex items-center justify-center">
                                                                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Responder WhatsApp</span>
                                                                    </div>
                                                                    <ChevronsRight size={12} className="text-white/50" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!isPushoverSectionOpen && (
                                        <div className="space-y-4 pt-4 border-t border-gray-50 animate-in fade-in duration-500">
                                            <h4 className="text-[11px] font-bold text-amber-500 uppercase tracking-widest pb-2 flex items-center gap-2">
                                                <RotateCcw size={12} />
                                                WEBHOOK
                                            </h4>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">WEBHOOK URL</label>
                                                <input
                                                    type="text"
                                                    value={makeWebhookUrl}
                                                    onChange={(e) => setMakeWebhookUrl(e.target.value)}
                                                    placeholder="https://hook.us1.make.com/..."
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-sm text-gray-900 font-medium placeholder:text-gray-300 transition-all font-mono"
                                                />
                                                <p className="text-[9px] text-amber-500 font-medium">Reenviará el paquete de datos original a esta URL.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3 pt-4 border-t border-gray-50">
                                        <button
                                            onClick={handleSavePushover}
                                            disabled={isSavingPushover}
                                            className={cn(
                                                "w-full py-4 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2",
                                                hasUnsavedNotificationChanges ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/10" : "bg-gray-900 hover:brightness-110 shadow-gray-900/10"
                                            )}
                                        >
                                            {isSavingPushover ? <LoaderCircle size={14} className="animate-spin" /> : null}
                                            {isSavingPushover ? 'Guardando...' : 'Guardar Configuración'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Usage Statistics Modal - Redesigned */}
                {
                    isUsageModalOpen && selectedAgentForUsage && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                                {/* Header with Brand Gradient */}
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-brand-primary-darker to-brand-primary text-white">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner">
                                            <Activity size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-2xl leading-tight">Resumen de Uso</h3>
                                            <p className="text-xs text-brand-accent font-bold uppercase tracking-widest opacity-90">{selectedAgentForUsage.nombre}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsUsageModalOpen(false)}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white/80 hover:text-white"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-8 overflow-y-auto">
                                    {isLoadingUsage ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <LoaderCircle size={32} className="animate-spin text-brand-primary" />
                                            <p className="text-sm font-medium text-gray-400">Analizando consumo de tokens...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Summary Cards - TODAY */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* Calls Card */}
                                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                                    <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1 flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
                                                                Conversaciones (Hoy)
                                                            </p>
                                                            <p className="text-4xl font-black text-gray-900">{usageStats.total_calls}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs font-medium text-green-600 bg-green-50 w-fit px-2 py-1 rounded-full">
                                                            <Activity size={12} />
                                                            <span>Activo ahora</span>
                                                        </div>
                                                    </div>
                                                    <Bot size={64} className="absolute -right-2 -bottom-2 text-gray-50 group-hover:text-gray-100 transition-colors" />
                                                </div>

                                                {/* Tokens Card */}
                                                <div className="bg-brand-primary/5 rounded-2xl p-6 border border-brand-primary/10 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                                    <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-brand-primary-dark tracking-widest mb-1 flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary-dark"></span>
                                                                Tokens (Hoy)
                                                            </p>
                                                            <p className="text-4xl font-black text-brand-primary-darker">{usageStats.total_tokens.toLocaleString()}</p>
                                                        </div>
                                                        <div className="text-xs text-brand-primary-dark/70 font-medium">
                                                            Facturados al cliente
                                                        </div>
                                                    </div>
                                                    <Activity size={64} className="absolute -right-2 -bottom-2 text-brand-primary/10 group-hover:text-brand-primary/20 transition-colors" />
                                                </div>

                                                {/* Cost Card */}
                                                <div className="bg-brand-dark rounded-2xl p-6 border border-brand-dark shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                                    <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-brand-accent/80 tracking-widest mb-1 flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
                                                                Costo Estimado (Hoy)
                                                            </p>
                                                            <p className="text-4xl font-black text-white">${usageStats.total_cost.toFixed(2)}</p>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-[10px] font-medium text-brand-accent/80 bg-white/10 px-2 py-1 rounded-full backdrop-blur-sm">
                                                                Ref: $0.30 / 1k
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute right-0 top-0 w-24 h-24 bg-brand-accent/20 rounded-full blur-3xl -mr-8 -mt-8"></div>
                                                </div>
                                            </div>

                                            {/* Advanced Chart Section */}
                                            <div className="bg-white border boundary-gray-100 rounded-3xl p-6 shadow-sm">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-lg">Tendencia de Consumo</h4>
                                                        <p className="text-xs text-gray-400 font-medium mt-1">Comparativa de tokens facturados por día</p>
                                                    </div>
                                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                                        <button
                                                            onClick={() => setUsageFilter('DAYS_7')}
                                                            className={cn(
                                                                "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                                                usageFilter === 'DAYS_7' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                                            )}
                                                        >
                                                            7 Días
                                                        </button>
                                                        <button
                                                            onClick={() => setUsageFilter('DAYS_30')}
                                                            className={cn(
                                                                "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                                                usageFilter === 'DAYS_30' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                                            )}
                                                        >
                                                            30 Días
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* SVG Chart */}
                                                <div className="w-full h-64 relative">
                                                    {(() => {
                                                        const data = usageStats.daily_breakdown;
                                                        const limit = usageFilter === 'DAYS_7' ? 7 : 30;
                                                        const chartData = data.slice(-limit);

                                                        if (chartData.length === 0) return <div className="h-full flex items-center justify-center text-gray-300 text-sm">Sin datos suficientes</div>;

                                                        const maxTokens = Math.max(...chartData.map(d => d.tokens), 100); // Min 100 scale
                                                        const height = 256; // h-64
                                                        const width = 100; // percent

                                                        // Helper to scale Y
                                                        const getY = (val: number) => height - ((val / maxTokens) * height * 0.8) - 20; // 20px padding bottom, 0.8 scale to leave room top

                                                        // Generate points for SVG path
                                                        const points = chartData.map((d, i) => {
                                                            const x = (i / (chartData.length - 1)) * 100; // percentage
                                                            return `${x},${getY(d.tokens)}`;
                                                        }).join(' ');

                                                        // Generate area path (close to bottom)
                                                        const areaPoints = `${points} 100,${height} 0,${height}`;

                                                        return (
                                                            <div className="relative w-full h-full">
                                                                {/* Y-Axis Grid Lines */}
                                                                <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-gray-300 font-medium pointer-events-none pb-6">
                                                                    <div className="border-b border-gray-50 border-dashed w-full flex items-end"><span>{Math.round(maxTokens)}</span></div>
                                                                    <div className="border-b border-gray-50 border-dashed w-full flex items-end"><span>{Math.round(maxTokens * 0.75)}</span></div>
                                                                    <div className="border-b border-gray-50 border-dashed w-full flex items-end"><span>{Math.round(maxTokens * 0.5)}</span></div>
                                                                    <div className="border-b border-gray-50 border-dashed w-full flex items-end"><span>{Math.round(maxTokens * 0.25)}</span></div>
                                                                    <div className="border-b border-gray-50 border-dashed w-full flex items-end"><span>0</span></div>
                                                                </div>

                                                                {/* Chart Draw */}
                                                                <svg className="w-full h-full overflow-visible preserve-3d" preserveAspectRatio="none" viewBox={`0 0 100 ${height}`}>
                                                                    <defs>
                                                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.2" />
                                                                            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                                                                        </linearGradient>
                                                                    </defs>

                                                                    {/* Area Fill */}
                                                                    <polygon points={areaPoints} fill="url(#chartGradient)" vectorEffect="non-scaling-stroke" />

                                                                    {/* Stroke Line */}
                                                                    <polyline
                                                                        points={points}
                                                                        fill="none"
                                                                        stroke="#14b8a6"
                                                                        strokeWidth="3"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        vectorEffect="non-scaling-stroke"
                                                                        className="drop-shadow-sm"
                                                                    />

                                                                    {/* Data Points (Dots) */}
                                                                </svg>

                                                                {/* Data Points (HTML Dots to avoid SVG aspect ratio distortion) */}
                                                                {chartData.map((d, i) => {
                                                                    const x = (i / (chartData.length - 1)) * 100;
                                                                    const y = getY(d.tokens);
                                                                    return (
                                                                        <div
                                                                            key={i}
                                                                            className="absolute w-3 h-3 bg-white border-2 border-brand-dark rounded-full hover:w-4 hover:h-4 hover:border-brand-accent transition-all duration-300 cursor-pointer z-10 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 shadow-sm group"
                                                                            style={{ left: `${x}%`, top: `${y}px` }}
                                                                            title={`${d.date}: ${d.tokens.toLocaleString()} tokens`}
                                                                        >
                                                                            <div className="hidden group-hover:block absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none">
                                                                                {new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}: {d.tokens.toLocaleString()}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}


                                                                {/* X-Axis Labels */}
                                                                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-gray-400 font-medium pt-2">
                                                                    {chartData.map((d, i) => {
                                                                        // Show filtered labels to avoid crowding
                                                                        const showLabel = usageFilter === 'DAYS_7' || i % 4 === 0;
                                                                        return (
                                                                            <span key={i} className={showLabel ? 'opacity-100' : 'opacity-0'}>
                                                                                {new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* --- CRM MODALS --- */}

                {/* Actualizar Info Modal */}
                {crmModalType === 'INFO' && crmModalLead && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
                            <div className="bg-brand-dark p-6 text-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-brand-primary/20 rounded-xl text-brand-primary">
                                        <UserCog size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight uppercase tracking-tight">Actualizar Info</h3>
                                        <p className="text-[10px] text-brand-primary font-bold opacity-80 uppercase tracking-widest">Información Básica del Lead</p>
                                    </div>
                                </div>
                                <button onClick={() => setCrmModalType(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            {(() => {
                                const originalInfoLead = realLeads.find(l => l.id === crmModalLead.id);
                                const infoHasChanges = originalInfoLead ? (
                                    crmModalLead.status !== originalInfoLead.status ||
                                    crmModalLead.advisor_name !== originalInfoLead.advisor_name
                                ) : false;
                                // Para guardar: si es POTENCIAL debe tener asesor asignado
                                const canSaveInfo = infoHasChanges && (
                                    crmModalLead.status === 'NO_POTENCIAL' || !!crmModalLead.advisor_name
                                );
                                const activeAgent = agents.find(a => a.id === activeAgentId);
                                const advisorNames = [
                                    activeAgent?.pushover_user_1_name,
                                    activeAgent?.pushover_user_2_name,
                                    activeAgent?.pushover_user_3_name,
                                ].filter(Boolean) as string[];

                                return (
                                    <div className="p-8 space-y-6">
                                        {/* Opción 1: Nombre */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                            <input
                                                type="text"
                                                defaultValue={crmModalLead.name}
                                                id="edit-lead-name"
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                                            />
                                        </div>

                                        {/* Opción 2: Calificación */}
                                        <div className="flex items-center justify-between bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                    crmModalLead.status === 'POTENCIAL' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                                )}>
                                                    <Activity size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-700 uppercase tracking-tight">Calificación</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{crmModalLead.status === 'POTENCIAL' ? 'Potencial' : 'No Potencial'}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setCrmModalLead({ ...crmModalLead, status: crmModalLead.status === 'POTENCIAL' ? 'NO_POTENCIAL' : 'POTENCIAL' })}
                                                className={cn(
                                                    "w-12 h-6 rounded-full transition-all duration-300 relative",
                                                    crmModalLead.status === 'POTENCIAL' ? "bg-brand-primary" : "bg-gray-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                                                    crmModalLead.status === 'POTENCIAL' ? "left-7" : "left-1"
                                                )} />
                                            </button>
                                        </div>

                                        {/* Opción 3: Asesor — from pushover config */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Asignar Asesor</label>
                                            {advisorNames.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {advisorNames.map((adv) => (
                                                        <button
                                                            key={adv}
                                                            onClick={() => setCrmModalLead({ ...crmModalLead, advisor_name: crmModalLead.advisor_name === adv ? '' : adv })}
                                                            className={cn(
                                                                "px-4 py-3 rounded-2xl text-sm font-medium border transition-all flex-1 min-w-0",
                                                                crmModalLead.advisor_name === adv
                                                                    ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary font-bold"
                                                                    : "bg-gray-50 border-gray-100 text-gray-500 hover:border-brand-primary/20"
                                                            )}
                                                        >
                                                            {adv}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    defaultValue={crmModalLead.advisor_name || ''}
                                                    id="edit-lead-advisor"
                                                    placeholder="Nombre del asesor..."
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                                                />
                                            )}
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                onClick={async () => {
                                                    const name = (document.getElementById('edit-lead-name') as HTMLInputElement).value;
                                                    const advisor_name = crmModalLead.advisor_name || (document.getElementById('edit-lead-advisor') as HTMLInputElement)?.value || '';
                                                    setIsSavingLead(true);
                                                    const updates: Partial<Lead> = {
                                                        name,
                                                        status: crmModalLead.status,
                                                        advisor_name
                                                    };
                                                    // Si cambia a NO_POTENCIAL, limpiar estado, asesor y campos CRM
                                                    if (crmModalLead.status === 'NO_POTENCIAL') {
                                                        updates.advisor_name = '';
                                                        updates.estado = '';
                                                        updates.notas_seguimiento = '';
                                                        updates.fecha_seguimiento = '';
                                                        updates.tipo_tramite = '';
                                                        updates.motivo_descarte = '';
                                                        updates.primer_pago = '';
                                                        updates.segundo_pago = '';
                                                    }
                                                    await handleUpdateLead(crmModalLead.id, updates);
                                                    setIsSavingLead(false);
                                                    setCrmModalType(null);
                                                }}
                                                disabled={isSavingLead || !canSaveInfo}
                                                className={cn(
                                                    "w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2",
                                                    canSaveInfo
                                                        ? "bg-orange-500 text-white hover:bg-orange-600 shadow-lg"
                                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                                )}
                                            >
                                                {isSavingLead ? <LoaderCircle size={16} className="animate-spin" /> : (canSaveInfo ? 'Guardar Cambios' : infoHasChanges && crmModalLead.status === 'POTENCIAL' && !crmModalLead.advisor_name ? 'Selecciona un asesor' : 'Guardar')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Gestionar Lead — Offcanvas Panel */}
                {crmModalType === 'FOLLOW_UP' && crmModalLead && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
                            onClick={() => setCrmModalType(null)}
                        />
                        {/* Slide Panel */}
                        <div className="fixed inset-y-0 right-0 w-full max-w-md z-[101] animate-in slide-in-from-right duration-300">
                            <div className="h-full bg-white shadow-2xl flex flex-col border-l border-gray-200">
                                {/* Header — Lead info directly, no title */}
                                <div className="bg-brand-dark px-5 py-4 text-white shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-brand-primary/20 rounded-lg flex items-center justify-center text-brand-primary font-bold text-sm shrink-0">
                                            {crmModalLead.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold truncate">{crmModalLead.name}</p>
                                            <p className="text-[10px] text-white/60 font-medium">{crmModalLead.phone} · {crmModalLead.date}</p>
                                        </div>
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase border shrink-0",
                                            crmModalLead.status === 'POTENCIAL' ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" : "bg-red-500/20 text-red-300 border-red-400/30"
                                        )}>
                                            {crmModalLead.status === 'POTENCIAL' ? 'Potencial' : 'No Potencial'}
                                        </span>
                                        <button onClick={() => setCrmModalType(null)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white ml-1">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable Content */}
                                {(() => {
                                    const originalLead = realLeads.find(l => l.id === crmModalLead.id);
                                    const hasChanges = originalLead ? (
                                        crmModalLead.estado !== originalLead.estado ||
                                        crmModalLead.notas_seguimiento !== originalLead.notas_seguimiento ||
                                        crmModalLead.fecha_seguimiento !== originalLead.fecha_seguimiento ||
                                        crmModalLead.motivo_descarte !== originalLead.motivo_descarte ||
                                        crmModalLead.primer_pago !== originalLead.primer_pago ||
                                        crmModalLead.segundo_pago !== originalLead.segundo_pago
                                    ) : false;

                                    return (
                                        <>
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                    {/* Section 1: Estado */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Estado del Lead <span className="text-red-400">*</span></label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {CRM_ESTADOS.map((est) => {
                                                const isActive = crmModalLead.estado === est.value;
                                                return (
                                                    <button
                                                        key={est.value}
                                                        onClick={() => setCrmModalLead({ ...crmModalLead, estado: est.value as any })}
                                                        className={cn(
                                                            "h-10 rounded-xl text-[11px] font-bold border transition-all duration-200 flex items-center justify-center gap-2",
                                                            isActive ? est.activeColor : est.color,
                                                            !isActive && "hover:shadow-sm hover:-translate-y-0.5"
                                                        )}
                                                    >
                                                        {isActive && <Check size={12} className="shrink-0" />}
                                                        <span>{est.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Section 2: Tipo de Trámite + Detalles — hidden for Pagado */}
                                    {crmModalLead.estado !== 'Pagado' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tipo de Trámite y Detalle de Contacto</label>
                                        <textarea
                                            value={crmModalLead.notas_seguimiento || ''}
                                            onChange={(e) => setCrmModalLead({ ...crmModalLead, notas_seguimiento: e.target.value })}
                                            rows={4}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/30 transition-all resize-none"
                                            placeholder="Ej: Licencia L1 — Cliente interesado, se agendó cita para el lunes..."
                                        />
                                    </div>
                                    )}

                                    {/* Section 4: Pagos — solo para Compromiso de pago */}
                                    {crmModalLead.estado === 'Compromiso de pago' && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="text-[10px] font-bold text-amber-500 uppercase tracking-widest ml-1">Registro de Pagos</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">1er Pago</label>
                                                    <input
                                                        type="text"
                                                        value={crmModalLead.primer_pago || ''}
                                                        onChange={(e) => setCrmModalLead({ ...crmModalLead, primer_pago: e.target.value })}
                                                        placeholder="Monto o detalle..."
                                                        className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">2do Pago</label>
                                                    <input
                                                        type="text"
                                                        value={crmModalLead.segundo_pago || ''}
                                                        onChange={(e) => setCrmModalLead({ ...crmModalLead, segundo_pago: e.target.value })}
                                                        placeholder="Monto o detalle..."
                                                        className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Section 5: Conditional sections by estado */}
                                    {crmModalLead.estado === 'Descartado' && (
                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest ml-1">Motivo del Descarte</label>
                                            <select
                                                value={crmModalLead.motivo_descarte || ''}
                                                onChange={(e) => setCrmModalLead({ ...crmModalLead, motivo_descarte: e.target.value })}
                                                className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Seleccionar motivo...</option>
                                                {MOTIVOS_DESCARTE.map((m) => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {(crmModalLead.estado === 'En seguimiento' || crmModalLead.estado === 'Compromiso de pago') && (
                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Próximo Contacto</label>
                                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                                                <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary shrink-0">
                                                    <Calendar size={16} />
                                                </div>
                                                <input
                                                    type="datetime-local"
                                                    value={crmModalLead.fecha_seguimiento ? new Date(crmModalLead.fecha_seguimiento).toISOString().slice(0, 16) : ''}
                                                    onChange={(e) => setCrmModalLead({ ...crmModalLead, fecha_seguimiento: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                                                    className="flex-1 bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Fixed Footer */}
                                <div className="shrink-0 p-5 border-t border-gray-100 bg-gray-50/80">
                                    <button
                                        onClick={async () => {
                                            if (!crmModalLead.estado) {
                                                setInfoModal({ isOpen: true, type: 'error', message: 'Debes seleccionar un estado para el lead.' });
                                                return;
                                            }
                                            if (crmModalLead.estado === 'Descartado' && !crmModalLead.motivo_descarte) {
                                                setInfoModal({ isOpen: true, type: 'error', message: 'Debes seleccionar un motivo de descarte.' });
                                                return;
                                            }
                                            setIsSavingLead(true);
                                            // Build new contact history entry
                                            const newHistoryEntry = {
                                                date: new Date().toISOString(),
                                                estado: crmModalLead.estado || '',
                                                notas: crmModalLead.notas_seguimiento || '',
                                            };
                                            const prevHistory = crmModalLead.contact_history || [];
                                            const updatedHistory = [...prevHistory, newHistoryEntry];
                                            await handleUpdateLead(crmModalLead.id, {
                                                estado: crmModalLead.estado,
                                                notas_seguimiento: crmModalLead.notas_seguimiento,
                                                fecha_seguimiento: crmModalLead.fecha_seguimiento || undefined,
                                                motivo_descarte: crmModalLead.estado === 'Descartado' ? crmModalLead.motivo_descarte : undefined,
                                                primer_pago: crmModalLead.primer_pago || undefined,
                                                segundo_pago: crmModalLead.segundo_pago || undefined,
                                                contact_history: updatedHistory,
                                            });
                                            setIsSavingLead(false);
                                            setCrmModalType(null);
                                        }}
                                        disabled={isSavingLead}
                                        className={cn(
                                            "w-full py-3.5 rounded-2xl font-bold text-sm uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg",
                                            hasChanges
                                                ? "bg-orange-500 text-white hover:bg-orange-600"
                                                : "bg-brand-dark text-white hover:bg-slate-800"
                                        )}
                                    >
                                        {isSavingLead ? (
                                            <LoaderCircle size={16} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Check size={14} />
                                                {hasChanges ? 'Guardar Cambios' : 'Guardar'}
                                            </>
                                        )}
                                    </button>
                                </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </>
                )}
            {/* Calendar Panel — Scheduled Follow-ups */}
            {isCalendarOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsCalendarOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
                        {(() => {
                            const today = new Date().toISOString().slice(0, 10);
                            const scheduledLeads = realLeads
                                .filter(l => !!l.fecha_seguimiento)
                                .sort((a, b) => new Date(a.fecha_seguimiento!).getTime() - new Date(b.fecha_seguimiento!).getTime());

                            // Group by date
                            const grouped: Record<string, Lead[]> = {};
                            for (const lead of scheduledLeads) {
                                const dateKey = lead.fecha_seguimiento!.slice(0, 10);
                                if (!grouped[dateKey]) grouped[dateKey] = [];
                                grouped[dateKey].push(lead);
                            }
                            const dateKeys = Object.keys(grouped).sort();

                            const formatDate = (dateStr: string) => {
                                if (dateStr === today) return 'Hoy';
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                if (dateStr === tomorrow.toISOString().slice(0, 10)) return 'Mañana';
                                const d = new Date(dateStr + 'T12:00:00');
                                return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                            };

                            const formatTime = (isoStr: string) => {
                                const d = new Date(isoStr);
                                return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                            };

                            return (
                                <>
                                    {/* Header */}
                                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-brand-primary/10 rounded-xl">
                                                <Calendar size={20} className="text-brand-primary" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900">Calendario de Seguimientos</h2>
                                                <p className="text-xs text-gray-500">{scheduledLeads.length} contacto{scheduledLeads.length !== 1 ? 's' : ''} agendado{scheduledLeads.length !== 1 ? 's' : ''}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsCalendarOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                            <X size={18} className="text-gray-400" />
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="overflow-y-auto p-6 space-y-5" style={{ maxHeight: 'calc(80vh - 72px)' }}>
                                        {dateKeys.length === 0 ? (
                                            <div className="text-center py-12">
                                                <Calendar size={40} className="text-gray-200 mx-auto mb-3" />
                                                <p className="text-sm font-bold text-gray-400">No hay seguimientos agendados</p>
                                                <p className="text-xs text-gray-300 mt-1">Agenda fechas de contacto desde el CRM de cada lead.</p>
                                            </div>
                                        ) : (
                                            dateKeys.map(dateKey => {
                                                const isToday = dateKey === today;
                                                const isPast = dateKey < today;
                                                return (
                                                    <div key={dateKey}>
                                                        {/* Date Header */}
                                                        <div className="flex items-center gap-2 mb-2">
                                                            {isToday && (
                                                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                                            )}
                                                            <h3 className={cn(
                                                                "text-xs font-black uppercase tracking-widest",
                                                                isToday ? "text-amber-600" : isPast ? "text-red-400" : "text-gray-400"
                                                            )}>
                                                                {formatDate(dateKey)}
                                                            </h3>
                                                            {isPast && !isToday && (
                                                                <span className="text-[9px] font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Vencido</span>
                                                            )}
                                                            <span className="text-[9px] text-gray-300 font-medium">{grouped[dateKey].length} lead{grouped[dateKey].length !== 1 ? 's' : ''}</span>
                                                        </div>

                                                        {/* Leads for this date */}
                                                        <div className="space-y-2">
                                                            {grouped[dateKey].map(lead => (
                                                                <div
                                                                    key={lead.id}
                                                                    onClick={() => {
                                                                        setIsCalendarOpen(false);
                                                                        setSelectedLead(lead);
                                                                        setCrmModalLead(lead);
                                                                        setCrmModalType('FOLLOW_UP');
                                                                    }}
                                                                    className={cn(
                                                                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
                                                                        isToday ? "bg-amber-50/50 border-amber-200 hover:border-amber-300" : isPast ? "bg-red-50/30 border-red-100 hover:border-red-200" : "bg-white border-gray-100 hover:border-gray-200"
                                                                    )}
                                                                >
                                                                    {/* Time */}
                                                                    <div className={cn(
                                                                        "text-xs font-bold tabular-nums shrink-0 w-12 text-center",
                                                                        isToday ? "text-amber-600" : isPast ? "text-red-400" : "text-gray-400"
                                                                    )}>
                                                                        {formatTime(lead.fecha_seguimiento!)}
                                                                    </div>

                                                                    <div className="w-px h-8 bg-gray-200 shrink-0" />

                                                                    {/* Lead Info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-bold text-gray-900 truncate">{lead.name}</p>
                                                                        <p className="text-[10px] text-gray-400 truncate">{lead.phone}{lead.advisor_name ? ` · ${lead.advisor_name}` : ''}</p>
                                                                    </div>

                                                                    {/* Estado Badge */}
                                                                    {lead.estado && (
                                                                        <span className={cn(
                                                                            "text-[9px] font-bold px-2 py-1 rounded-full border shrink-0",
                                                                            lead.estado === 'En seguimiento' ? "bg-blue-50 text-blue-600 border-blue-200"
                                                                                : lead.estado === 'Compromiso de pago' ? "bg-amber-50 text-amber-600 border-amber-200"
                                                                                : lead.estado === 'Pagado' ? "bg-green-50 text-green-600 border-green-200"
                                                                                : lead.estado === 'Sin respuesta' ? "bg-gray-50 text-gray-500 border-gray-200"
                                                                                : "bg-gray-50 text-gray-500 border-gray-200"
                                                                        )}>
                                                                            {lead.estado}
                                                                        </span>
                                                                    )}

                                                                    <ArrowRight size={14} className="text-gray-300 shrink-0" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Registro de Cliente — Popup flotante para leads Pagados */}
            {registroLead && (
                <>
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
                        onClick={() => setRegistroLead(null)}
                    />
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 fade-in duration-300" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="bg-green-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3 text-white">
                                    <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                                        <DollarSign size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Registro de Cliente</p>
                                        <p className="text-[10px] text-white/60 font-medium">Datos para trámite</p>
                                    </div>
                                </div>
                                <button onClick={() => setRegistroLead(null)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Form Body */}
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nombres</label>
                                        <input
                                            type="text"
                                            defaultValue={registroLead.name?.split(' ').slice(0, 1).join(' ') || ''}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300 transition-all"
                                            placeholder="Nombre"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Apellidos</label>
                                        <input
                                            type="text"
                                            defaultValue={registroLead.name?.split(' ').slice(1).join(' ') || ''}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300 transition-all"
                                            placeholder="Apellidos"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        defaultValue={registroLead.phone || ''}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300 transition-all"
                                        placeholder="Teléfono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tipo de Trámite</label>
                                    <input
                                        type="text"
                                        defaultValue={registroLead.tipo_tramite || ''}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300 transition-all"
                                        placeholder="Ej: Licencia L1, Renovación..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">1er Pago</label>
                                        <input
                                            type="text"
                                            defaultValue={registroLead.primer_pago || ''}
                                            className="w-full bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all"
                                            placeholder="Monto..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">2do Pago</label>
                                        <input
                                            type="text"
                                            defaultValue={registroLead.segundo_pago || ''}
                                            className="w-full bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all"
                                            placeholder="Monto..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Notas</label>
                                    <textarea
                                        defaultValue={registroLead.notas_seguimiento || ''}
                                        rows={2}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300 transition-all resize-none"
                                        placeholder="Observaciones..."
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-6">
                                <p className="text-[10px] text-gray-400 text-center mb-3 font-medium">Vista previa — el formulario completo se habilitará próximamente</p>
                                <button
                                    onClick={() => setRegistroLead(null)}
                                    className="w-full py-3 rounded-2xl font-bold text-sm uppercase tracking-widest bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <Check size={14} />
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Contact History Panel */}
            {historyLead && (
                <>
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
                        onClick={() => setHistoryLead(null)}
                    />
                    <div className="fixed inset-y-0 right-0 w-full max-w-md z-[101] animate-in slide-in-from-right duration-300">
                        <div className="h-full bg-white shadow-2xl flex flex-col border-l border-gray-200">
                            {/* Header — Lead info */}
                            <div className="bg-indigo-600 px-5 py-4 text-white shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {historyLead.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold truncate">{historyLead.name}</p>
                                        <p className="text-[10px] text-white/60 font-medium">{historyLead.phone}</p>
                                    </div>
                                    <button onClick={() => setHistoryLead(null)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white ml-1">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Lead Info Card */}
                            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                                    <Calendar size={12} />
                                    Fecha de Registro
                                </div>
                                <p className="text-sm font-semibold text-gray-800">{historyLead.date} — {historyLead.time}</p>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                        <Phone size={12} className="text-gray-400" />
                                        {historyLead.phone}
                                    </div>
                                    {historyLead.advisor_name && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                            <UserCog size={12} className="text-gray-400" />
                                            {historyLead.advisor_name}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="flex-1 overflow-y-auto px-5 py-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">
                                    Historial de Contacto ({historyLead.contact_history?.length || 0})
                                </p>
                                <div className="relative">
                                    {/* Vertical line */}
                                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-indigo-100" />

                                    <div className="space-y-4">
                                        {[...(historyLead.contact_history || [])].reverse().map((entry, idx) => {
                                            const entryDate = new Date(entry.date);
                                            const estadoConfig = CRM_ESTADOS.find(e => e.value === entry.estado);
                                            return (
                                                <div key={idx} className="flex gap-3 relative">
                                                    {/* Dot */}
                                                    <div className={cn(
                                                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border-2",
                                                        idx === 0
                                                            ? "bg-indigo-500 border-indigo-500 text-white"
                                                            : "bg-white border-indigo-200 text-indigo-400"
                                                    )}>
                                                        <MessageSquare size={10} />
                                                    </div>

                                                    {/* Content */}
                                                    <div className={cn(
                                                        "flex-1 rounded-xl border p-3",
                                                        idx === 0 ? "bg-indigo-50/50 border-indigo-200" : "bg-white border-gray-100"
                                                    )}>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className={cn(
                                                                "text-[9px] font-bold px-2 py-0.5 rounded-full border",
                                                                estadoConfig ? estadoConfig.color : "bg-gray-100 text-gray-500 border-gray-200"
                                                            )}>
                                                                {entry.estado || 'Sin estado'}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400 font-medium tabular-nums">
                                                                {entryDate.toLocaleDateString('es-ES')} · {entryDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        {entry.notas && (
                                                            <p className="text-xs text-gray-700 leading-relaxed">{entry.notas}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            </div >
        </div >
    );
}
