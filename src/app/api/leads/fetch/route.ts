import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, requireAuth } from '@/lib/server-auth';

const supabaseAdmin = getSupabaseAdminClient();

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

        // Verify the agent exists
        const { data: agent, error: agentError } = await supabaseAdmin
            .from('agentes')
            .select('id, user_id, pushover_user_1_profile_id, pushover_user_2_profile_id, pushover_user_3_profile_id')
            .eq('id', agentId)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: 'Agente no encontrado.' }, { status: 404 });
        }

        const profile = context.profile;

        // Determine which leads to return based on role and visibility
        if (profile.role === 'admin' || profile.role === 'tenant_owner') {
            // Admin and tenant_owner see ALL leads for this agent
            const { data: leads, error } = await supabaseAdmin
                .from('leads')
                .select('*')
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return NextResponse.json({ leads: leads || [] });
        }

        // Client: filter by leads_visible_advisors
        const features = profile.features || {};
        const visibility = features.leads_visible_advisors || 'all';

        if (visibility === 'all') {
            const { data: leads, error } = await supabaseAdmin
                .from('leads')
                .select('*')
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return NextResponse.json({ leads: leads || [] });
        }

        // Resolve slot numbers to profile_ids
        const slots = Array.isArray(visibility) ? visibility : [];
        const visibleProfileIds: string[] = [];
        for (const slot of slots) {
            const profileId = slot === 1 ? agent.pushover_user_1_profile_id
                : slot === 2 ? agent.pushover_user_2_profile_id
                : slot === 3 ? agent.pushover_user_3_profile_id
                : null;
            if (profileId) visibleProfileIds.push(profileId);
        }

        if (visibleProfileIds.length === 0) {
            return NextResponse.json({ leads: [] });
        }

        const { data: leads, error } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('agent_id', agentId)
            .in('assigned_profile_id', visibleProfileIds)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ leads: leads || [] });
    } catch (error: unknown) {
        console.error('Error fetching leads:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
