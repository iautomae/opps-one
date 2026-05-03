import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, requireAuth } from '@/lib/server-auth';

const supabaseAdmin = getSupabaseAdminClient();

const DEFAULT_PLATFORMS = [
    { name: 'Trámites', description: 'Gestión de licencias, tarjetas de propiedad y trámites documentarios.', icon: 'FileText', color: 'blue', is_active: true, route_key: 'tramites' },
    { name: 'Leads', description: 'CRM de captación de clientes, seguimiento de prospectos y conversiones.', icon: 'Users', color: 'emerald', is_active: true, route_key: 'leads' },
    { name: 'Reclutamiento', description: 'Gestión de vacantes, candidatos y procesos de selección de personal.', icon: 'Briefcase', color: 'purple', is_active: true, route_key: 'reclutamiento' },
    { name: 'Textil', description: 'Control de operaciones textiles, inventario y producción.', icon: 'Shirt', color: 'amber', is_active: true, route_key: 'textil' },
];

// Known route keywords for deriving route_key from custom platform names
const KNOWN_ROUTE_KEYWORDS = ['leads', 'tramites', 'reclutamiento', 'textil', 'dashboard'];

function deriveRouteKey(name: string): string {
    const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const keyword of KNOWN_ROUTE_KEYWORDS) {
        if (normalized.includes(keyword)) return keyword;
    }
    return normalized.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

const COLOR_PALETTE = ['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan', 'indigo', 'orange'];
const ICON_PALETTE = ['FileText', 'Users', 'Briefcase', 'Shirt', 'Heart', 'Globe', 'Zap', 'Package'];

export async function GET(request: Request) {
    try {
        const { response } = await requireAuth(request, ['admin', 'tenant_owner', 'client']);
        if (response) {
            return response;
        }

        const { data, error } = await supabaseAdmin
            .from('platforms')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) {
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                return NextResponse.json({ platforms: [], needsSetup: true });
            }
            throw error;
        }

        return NextResponse.json({ platforms: data || [] });
    } catch (error: unknown) {
        console.error('GET /api/admin/platforms error:', error);
        return NextResponse.json({ error: 'Error al obtener plataformas.' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { response } = await requireAuth(req, ['admin']);
        if (response) {
            return response;
        }

        const { name, description, action } = await req.json();

        if (action === 'setup') {
            const { error: seedError } = await supabaseAdmin
                .from('platforms')
                .upsert(DEFAULT_PLATFORMS, { onConflict: 'name' });

            if (seedError) {
                console.error('Seed error:', seedError);
                return NextResponse.json(
                    { error: 'La tabla "platforms" no existe o no se pudo inicializar.' },
                    { status: 500 }
                );
            }

            const { data } = await supabaseAdmin
                .from('platforms')
                .select('*')
                .order('sort_order', { ascending: true });

            return NextResponse.json({ platforms: data || [], seeded: true });
        }

        const normalizedName = typeof name === 'string' ? name.trim() : '';
        const normalizedDescription = typeof description === 'string' ? description.trim() : '';

        if (!normalizedName) {
            return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
        }

        const { data: existing } = await supabaseAdmin.from('platforms').select('id');
        const index = (existing?.length || 0) % COLOR_PALETTE.length;

        const { data, error } = await supabaseAdmin
            .from('platforms')
            .insert({
                name: normalizedName,
                description: normalizedDescription || `Gestión de ${normalizedName.toLowerCase()}.`,
                icon: ICON_PALETTE[index],
                color: COLOR_PALETTE[index],
                is_active: true,
                route_key: deriveRouteKey(normalizedName),
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Ya existe una plataforma con ese nombre.' }, { status: 400 });
            }
            throw error;
        }

        return NextResponse.json({ platform: data });
    } catch (error: unknown) {
        console.error('POST /api/admin/platforms error:', error);
        return NextResponse.json({ error: 'Error al guardar la plataforma.' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { response } = await requireAuth(req, ['admin']);
        if (response) return response;

        const { id, name, description, icon, reorder } = await req.json();

        // Reorder: receives array of { id, sort_order }
        if (reorder && Array.isArray(reorder)) {
            for (const item of reorder) {
                await supabaseAdmin.from('platforms').update({ sort_order: item.sort_order }).eq('id', item.id);
            }
            return NextResponse.json({ success: true });
        }

        if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

        const updateData: Record<string, string> = {};
        if (name !== undefined) updateData.name = String(name).trim();
        if (description !== undefined) updateData.description = String(description).trim();
        if (icon !== undefined) updateData.icon = String(icon).trim();

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('platforms')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') return NextResponse.json({ error: 'Ya existe una plataforma con ese nombre.' }, { status: 400 });
            throw error;
        }

        return NextResponse.json({ platform: data });
    } catch (error: unknown) {
        console.error('PATCH /api/admin/platforms error:', error);
        return NextResponse.json({ error: 'Error al actualizar la plataforma.' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { response } = await requireAuth(req, ['admin']);
        if (response) return response;

        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('platforms')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('DELETE /api/admin/platforms error:', error);
        return NextResponse.json({ error: 'Error al eliminar la plataforma.' }, { status: 500 });
    }
}
