import { NextResponse } from 'next/server';
import { getProfileById, getSupabaseAdminClient, requireAuth } from '@/lib/server-auth';

const supabaseAdmin = getSupabaseAdminClient();

type LeadRow = {
    id: string;
    [key: string]: unknown;
};

// Helper: apply visibility OR filter to a query builder
function applyVisibility(query: any, orFilter: string | null) {
    return orFilter ? query.or(orFilter) : query;
}

// Helper: build the OR clause for advisor visibility
function buildOrFilter(visibleProfileIds: string[], visibleAdvisorNames: string[]): string | null {
    const clauses: string[] = [];
    if (visibleProfileIds.length > 0) {
        clauses.push(`assigned_profile_id.in.(${visibleProfileIds.join(',')})`);
    }
    if (visibleAdvisorNames.length > 0) {
        clauses.push(`advisor_name.in.(${visibleAdvisorNames.join(',')})`);
    }
    return clauses.length > 0 ? clauses.join(',') : null;
}

export async function GET(request: Request) {
    try {
        const { context, response } = await requireAuth(request, ['admin', 'tenant_owner', 'client']);
        if (response || !context) {
            return response!;
        }

        const url = new URL(request.url);
        const agentId = url.searchParams.get('agent_id');

        if (!agentId) {
            return NextResponse.json({ error: 'agent_id es requerido.' }, { status: 400 });
        }

        const { data: agent, error: agentError } = await supabaseAdmin
            .from('agentes')
            .select('id, user_id, pushover_user_1_profile_id, pushover_user_2_profile_id, pushover_user_3_profile_id, pushover_user_1_name, pushover_user_2_name, pushover_user_3_name')
            .eq('id', agentId)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: 'Agente no encontrado.' }, { status: 404 });
        }

        const profile = context.profile;
        const { data: agentOwner, error: agentOwnerError } = await getProfileById(agent.user_id);

        if (agentOwnerError || !agentOwner) {
            return NextResponse.json({ error: 'No se pudo validar el propietario del agente.' }, { status: 403 });
        }

        const isSameTenantAgent =
            !!profile.tenant_id &&
            !!agentOwner.tenant_id &&
            profile.tenant_id === agentOwner.tenant_id;
        const isAdminOwnedAgent = agentOwner.role === 'admin';

        if (profile.role !== 'admin' && !isSameTenantAgent && !isAdminOwnedAgent) {
            return NextResponse.json({ error: 'No puedes consultar leads de otro tenant.' }, { status: 403 });
        }

        // --- Resolve visibility ---
        let orFilter: string | null = null;

        const viewAsUid = url.searchParams.get('view_as');
        let effectiveFeatures = profile.features || {};

        if (profile.role === 'admin' && viewAsUid) {
            const { data: viewAsProfile } = await getProfileById(viewAsUid);
            if (viewAsProfile && viewAsProfile.role === 'client') {
                effectiveFeatures = viewAsProfile.features || {};
            }
        } else if (profile.role === 'admin' || profile.role === 'tenant_owner') {
            // orFilter stays null — show all
        } else {
            const visibility = effectiveFeatures.leads_visible_advisors || 'all';
            if (visibility !== 'all') {
                const slots = Array.isArray(visibility) ? visibility : [];
                const visibleProfileIds: string[] = [];
                const visibleAdvisorNames: string[] = [];
                for (const slot of slots) {
                    const slotNum = typeof slot === 'string' ? parseInt(slot, 10) : slot;
                    if (![1, 2, 3].includes(slotNum)) continue;
                    const profileId = slotNum === 1 ? agent.pushover_user_1_profile_id
                        : slotNum === 2 ? agent.pushover_user_2_profile_id
                        : slotNum === 3 ? agent.pushover_user_3_profile_id
                        : null;
                    if (profileId) visibleProfileIds.push(profileId);
                    const advisorName = slotNum === 1 ? agent.pushover_user_1_name
                        : slotNum === 2 ? agent.pushover_user_2_name
                        : slotNum === 3 ? agent.pushover_user_3_name
                        : null;
                    if (advisorName) visibleAdvisorNames.push(advisorName);
                }
                if (visibleProfileIds.length === 0 && visibleAdvisorNames.length === 0) {
                    return NextResponse.json({ leads: [] });
                }
                orFilter = buildOrFilter(visibleProfileIds, visibleAdvisorNames);
            }
        }

        // Handle admin + view_as resolved visibility for client profiles
        if (profile.role === 'admin' && viewAsUid) {
            const visibility = effectiveFeatures.leads_visible_advisors || 'all';
            if (visibility !== 'all') {
                const slots = Array.isArray(visibility) ? visibility : [];
                const visibleProfileIds: string[] = [];
                const visibleAdvisorNames: string[] = [];
                for (const slot of slots) {
                    const slotNum = typeof slot === 'string' ? parseInt(slot, 10) : slot;
                    if (![1, 2, 3].includes(slotNum)) continue;
                    const profileId = slotNum === 1 ? agent.pushover_user_1_profile_id
                        : slotNum === 2 ? agent.pushover_user_2_profile_id
                        : slotNum === 3 ? agent.pushover_user_3_profile_id
                        : null;
                    if (profileId) visibleProfileIds.push(profileId);
                    const advisorName = slotNum === 1 ? agent.pushover_user_1_name
                        : slotNum === 2 ? agent.pushover_user_2_name
                        : slotNum === 3 ? agent.pushover_user_3_name
                        : null;
                    if (advisorName) visibleAdvisorNames.push(advisorName);
                }
                if (visibleProfileIds.length === 0 && visibleAdvisorNames.length === 0) {
                    return NextResponse.json({ leads: [] });
                }
                orFilter = buildOrFilter(visibleProfileIds, visibleAdvisorNames);
            }
        }

        // --- Fetch all leads (up to 5000) — client-side filtering is instant ---
        let q = supabaseAdmin
            .from('leads')
            .select('id, agent_id, user_id, eleven_labs_conversation_id, nombre, status, summary, phone, tokens_raw, tokens_billed, advisor_name, assigned_profile_id, estado, notas_seguimiento, fecha_seguimiento, tipo_tramite, motivo_descarte, primer_pago, segundo_pago, created_at, contact_history')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false })
            .range(0, 199);
        q = applyVisibility(q, orFilter);

        const { data: leads, error } = await q;
        if (error) throw error;

        return NextResponse.json({ leads: leads || [] });
    } catch (error: unknown) {
        console.error('Error fetching leads:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
