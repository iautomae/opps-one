import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { userId, featureKey, newValue } = await req.json();

        if (!userId || !featureKey || typeof newValue !== 'boolean') {
            return NextResponse.json(
                { error: 'userId, featureKey y newValue (boolean) son requeridos.' },
                { status: 400 }
            );
        }

        // 1. Leer el perfil actual para mergear features
        const { data: profile, error: readError } = await supabaseAdmin
            .from('profiles')
            .select('features, has_leads_access')
            .eq('id', userId)
            .single();

        if (readError || !profile) {
            return NextResponse.json(
                { error: 'Perfil no encontrado.' },
                { status: 404 }
            );
        }

        // 2. Actualizar features JSONB
        const newFeatures = { ...(profile.features || {}), [featureKey]: newValue };

        // 3. Construir payload — leads sincroniza la columna legacy
        const updatePayload: Record<string, unknown> = { features: newFeatures };
        if (featureKey === 'leads') {
            updatePayload.has_leads_access = newValue;
        }

        // 4. Guardar con service role (bypassa RLS)
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(updatePayload)
            .eq('id', userId);

        if (updateError) {
            console.error('toggle-access update error:', updateError);
            return NextResponse.json(
                { error: 'Error al actualizar el acceso.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            features: newFeatures,
            has_leads_access: featureKey === 'leads' ? newValue : profile.has_leads_access
        });

    } catch (error: any) {
        console.error('POST /api/admin/toggle-access error:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}