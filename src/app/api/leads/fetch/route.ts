import { NextResponse } from 'next/server';
import { getProfileById, getSupabaseAdminClient, requireAuth } from '@/lib/server-auth';

const supabaseAdmin = getSupabaseAdminClient();

type LeadRow = {
    id: string;
    [key: string]: unknown;
};

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

        // When admin is impersonating a collaborator via view_as, apply that user's visibility filter
        const viewAsUid = url.searchParams.get('view_as');
        let effectiveFeatures = profile.features || {};

        if (profile.role === 'admin' && viewAsUid) {
            const { data: viewAsProfile } = await getProfileById(viewAsUid);
            if (viewAsProfile && viewAsProfile.role === 'client') {
                effectiveFeatures = viewAsProfile.features || {};
            } else {
                // Viewing as tenant_owner or unknown — show all leads
                const { data: leads, error } = await supabaseAdmin
                    .from('leads')
                    .select('*')
                    .eq('agent_id', agentId)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return NextResponse.json({ leads: leads || [] });
            }
        } else if (profile.role === 'admin' || profile.role === 'tenant_owner') {
            const { data: leads, error } = await supabaseAdmin
                .from('leads')
                .select('*')
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return NextResponse.json({ leads: leads || [] });
        }

        const visibility = effectiveFeatures.leads_visible_advisors || 'all';

        if (visibility === 'all') {
            const { data: leads, error } = await supabaseAdmin
                .from('leads')
                .select('*')
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return NextResponse.json({ leads: leads || [] });
        }

        const slots = Array.isArray(visibility) ? visibility : [];
        const visibleProfileIds: string[] = [];
        const visibleAdvisorNames: string[] = [];
        for (const slot of slots) {
            const slotNum = typeof slot === 'string' ? parseInt(slot, 10) : slot;
            if (![1, 2, 3].includes(slotNum)) {
                continue;
            }

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

        let leads: LeadRow[] = [];
        if (visibleProfileIds.length > 0 && visibleAdvisorNames.length > 0) {
            const [{ data: profileLeads, error: profileLeadsError }, { data: advisorLeads, error: advisorLeadsError }] = await Promise.all([
                supabaseAdmin
                    .from('leads')
                    .select('*')
                    .eq('agent_id', agentId)
                    .in('assigned_profile_id', visibleProfileIds)
                    .order('created_at', { ascending: false }),
                supabaseAdmin
                    .from('leads')
                    .select('*')
                    .eq('agent_id', agentId)
                    .in('advisor_name', visibleAdvisorNames)
                    .order('created_at', { ascending: false }),
            ]);

            if (profileLeadsError) throw profileLeadsError;
            if (advisorLeadsError) throw advisorLeadsError;

            const mergedLeads = [...(profileLeads || []), ...(advisorLeads || [])] as LeadRow[];
            leads = Array.from(new Map(mergedLeads.map((lead) => [lead.id, lead])).values());
        } else if (visibleProfileIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from('leads')
                .select('*')
                .eq('agent_id', agentId)
                .in('assigned_profile_id', visibleProfileIds)
                .order('created_at', { ascending: false });
            if (error) throw error;
            leads = (data || []) as LeadRow[];
        } else {
            const { data, error } = await supabaseAdmin
                .from('leads')
                .select('*')
                .eq('agent_id', agentId)
                .in('advisor_name', visibleAdvisorNames)
                .order('created_at', { ascending: false });
            if (error) throw error;
            leads = (data || []) as LeadRow[];
        }

        return NextResponse.json({ leads });
    } catch (error: unknown) {
        console.error('Error fetching leads:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
