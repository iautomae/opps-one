import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { memberId, newRole } = await req.json();

        if (!memberId || !newRole || !['tenant_owner', 'client'].includes(newRole)) {
            return NextResponse.json({ error: 'memberId y newRole (tenant_owner | client) son requeridos.' }, { status: 400 });
        }

        // 1. Validar caller
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (!user) {
            return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
        }

        // 2. Verificar que el caller es tenant_owner
        const { data: callerProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, role, tenant_id')
            .eq('id', user.id)
            .single();

        if (!callerProfile || callerProfile.role !== 'tenant_owner') {
            return NextResponse.json({ error: 'Solo propietarios pueden cambiar roles.' }, { status: 403 });
        }

        // 3. Verificar que el miembro pertenece al mismo tenant
        const { data: memberProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, role, tenant_id')
            .eq('id', memberId)
            .single();

        if (!memberProfile || memberProfile.tenant_id !== callerProfile.tenant_id) {
            return NextResponse.json({ error: 'El miembro no pertenece a tu equipo.' }, { status: 400 });
        }

        // 4. No puede degradarse a sí mismo
        if (memberId === callerProfile.id) {
            return NextResponse.json({ error: 'No puedes cambiar tu propio rol.' }, { status: 400 });
        }

        // 5. Actualizar rol
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ role: newRole })
            .eq('id', memberId);

        if (updateError) {
            console.error('Error updating role:', updateError);
            return NextResponse.json({ error: 'Error al actualizar el rol.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, newRole });

    } catch (error: any) {
        console.error('POST /api/tenant/change-role error:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
