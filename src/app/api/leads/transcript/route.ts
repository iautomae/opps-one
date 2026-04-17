import { NextResponse } from 'next/server';
import { getProfileById, getSupabaseAdminClient, requireAuth } from '@/lib/server-auth';

const supabaseAdmin = getSupabaseAdminClient();

export async function GET(request: Request) {
    try {
        const { context, response } = await requireAuth(request, ['admin', 'tenant_owner', 'client']);
        if (response || !context) {
            return response!;
        }

        const url = new URL(request.url);
        const leadId = url.searchParams.get('id');

        if (!leadId) {
            return NextResponse.json({ error: 'lead id es requerido.' }, { status: 400 });
        }

        // Fetch just the transcript and basic relation info to verify ownership
        const { data: lead, error } = await supabaseAdmin
            .from('leads')
            .select('transcript, agent_id, user_id')
            .eq('id', leadId)
            .single();

        if (error || !lead) {
            return NextResponse.json({ error: 'Lead no encontrado.' }, { status: 404 });
        }

        const profile = context.profile;
        const { data: agentOwner } = await getProfileById(lead.user_id);

        if (!agentOwner) {
            return NextResponse.json({ error: 'No se pudo validar el propietario del agente.' }, { status: 403 });
        }

        const isSameTenantAgent =
            !!profile.tenant_id &&
            !!agentOwner.tenant_id &&
            profile.tenant_id === agentOwner.tenant_id;
        const isAdminOwnedAgent = agentOwner.role === 'admin';

        if (profile.role !== 'admin' && !isSameTenantAgent && !isAdminOwnedAgent) {
            return NextResponse.json({ error: 'No puedes consultar transcript de otro tenant.' }, { status: 403 });
        }

        return NextResponse.json({ transcript: lead.transcript || [] });
    } catch (error: unknown) {
        console.error('Error fetching transcript:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
