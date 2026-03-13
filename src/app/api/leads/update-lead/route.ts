import { NextResponse } from 'next/server';
import { getProfileById, getSupabaseAdminClient, requireAuth } from '@/lib/server-auth';

const supabaseAdmin = getSupabaseAdminClient();

type LeadRecord = {
    id: string;
    user_id: string | null;
    assigned_profile_id: string | null;
};

export async function POST(request: Request) {
    try {
        const { context, response } = await requireAuth(request, ['admin', 'tenant_owner', 'client']);
        if (response || !context) {
            return response!;
        }

        const body = await request.json();
        const { leadId, advisorName, name, status, estado, notas_seguimiento, fecha_seguimiento, tipo_tramite, motivo_descarte, primer_pago, segundo_pago } = body;

        if (!leadId) {
            return NextResponse.json({ error: 'Falta el leadId.' }, { status: 400 });
        }

        const { data: lead, error: leadError } = await supabaseAdmin
            .from('leads')
            .select('id, user_id, assigned_profile_id')
            .eq('id', leadId)
            .single<LeadRecord>();

        if (leadError || !lead) {
            return NextResponse.json({ error: 'Lead no encontrado.' }, { status: 404 });
        }

        if (context.profile.role !== 'admin') {
            const { data: ownerProfile, error: ownerProfileError } = await getProfileById(lead.user_id || '');
            if (ownerProfileError || !ownerProfile) {
                return NextResponse.json({ error: 'No se pudo validar el tenant del lead.' }, { status: 403 });
            }

            if (!context.profile.tenant_id || context.profile.tenant_id !== ownerProfile.tenant_id) {
                return NextResponse.json({ error: 'No puedes modificar leads de otro tenant.' }, { status: 403 });
            }

            if (
                context.profile.role === 'client' &&
                context.profile.id !== lead.assigned_profile_id &&
                context.profile.id !== lead.user_id
            ) {
                return NextResponse.json({ error: 'No tienes permisos para editar este lead.' }, { status: 403 });
            }
        }

        const updateData: Record<string, string | null> = {};
        if (advisorName !== undefined) updateData.advisor_name = advisorName ? String(advisorName).trim() : null;
        if (name !== undefined) updateData.nombre = name ? String(name).trim() : '';
        if (status !== undefined) updateData.status = status ? String(status).trim() : '';
        if (estado !== undefined) updateData.estado = estado ? String(estado).trim() : '';
        if (notas_seguimiento !== undefined) updateData.notas_seguimiento = notas_seguimiento ? String(notas_seguimiento) : '';
        if (fecha_seguimiento !== undefined) updateData.fecha_seguimiento = fecha_seguimiento ? String(fecha_seguimiento) : null;
        if (tipo_tramite !== undefined) updateData.tipo_tramite = tipo_tramite ? String(tipo_tramite).trim() : null;
        if (motivo_descarte !== undefined) updateData.motivo_descarte = motivo_descarte ? String(motivo_descarte).trim() : null;
        if (primer_pago !== undefined) updateData.primer_pago = primer_pago ? String(primer_pago).trim() : null;
        if (segundo_pago !== undefined) updateData.segundo_pago = segundo_pago ? String(segundo_pago).trim() : null;

        const { data: updatedLead, error: updateError } = await supabaseAdmin
            .from('leads')
            .update(updateData)
            .eq('id', leadId)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ success: true, lead: updatedLead });
    } catch (error: unknown) {
        console.error('Error updating lead:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
