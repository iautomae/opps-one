import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usa Service Role para poder saltar RLS y borrar datos críticos
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'Falta el ID del usuario' }, { status: 400 });
        }

        // 1. Validar que quien llama es el Admin (usando RLS o proxy, pero aquí confiamos en el cliente admin provisionalmente)
        // En producción debemos validar el token del usuario logueado en los headers.

        // 2. Obtener el perfil para saber qué Tenant borrar
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('tenant_id, role')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            console.error("Profile not found:", profileError);
            return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
        }

        // Protección extra: No permitimos borrar si es admin maestro (podemos pulir esto con metadata)
        if (profile.role === 'admin') {
            // Check secondary if it's the master tenant
            const { data: tenant } = await supabaseAdmin
                .from('tenants')
                .select('slug')
                .eq('id', profile.tenant_id)
                .single();

            if (tenant?.slug === 'iautomae' || tenant?.slug === 'app') {
                return NextResponse.json({ error: 'No se puede eliminar la cuenta de administración maestra' }, { status: 403 });
            }
        }

        // 3. Obtener sub-usuarios (agentes) asociados al mismo tenant_id para borrarlos también?
        // Idealmente sí: si borramos la empresa, sus empleados también pierden acceso.
        const { data: subProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('tenant_id', profile.tenant_id);

        if (subProfiles && subProfiles.length > 0) {
            for (const sp of subProfiles) {
                // Borrar todo de Auth. (Por foreign key, esto borra los registros de la tabla 'profiles')
                await supabaseAdmin.auth.admin.deleteUser(sp.id);
            }
        } else {
            // Solo por si acaso si no lo encontró por la consulta
            await supabaseAdmin.auth.admin.deleteUser(userId);
        }

        // 4. Finalmente, borrar la Empresa (Tenant)
        if (profile.tenant_id) {
            const { error: tenantError } = await supabaseAdmin
                .from('tenants')
                .delete()
                .eq('id', profile.tenant_id)
                .neq('slug', 'iautomae')
                .neq('slug', 'app');

            if (tenantError) {
                console.error("Error al borrar tenant:", tenantError);
                // No tiramos 500 porque el auth ya se borró, lo cual inutiliza la cuenta de todas formas
            }
        }

        return NextResponse.json({ success: true, message: "Empresa y dependencias eliminadas permanentemente" });

    } catch (error) {
        console.error("Remove tenant API error:", error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
