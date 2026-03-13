import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { cookies } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { email, fullName } = await req.json();

        if (!email || !email.trim()) {
            return NextResponse.json({ error: 'El correo es obligatorio.' }, { status: 400 });
        }

        // 1. Obtener el token del caller desde la cookie de Supabase
        const cookieStore = await cookies();
        const accessToken =
            cookieStore.get('sb-access-token')?.value ||
            cookieStore.get(`sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`)?.value;

        // Fallback: leer Authorization header
        const authHeader = req.headers.get('authorization');
        let callerProfile: any = null;

        if (accessToken) {
            const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
            if (user) {
                const { data } = await supabaseAdmin
                    .from('profiles')
                    .select('id, role, tenant_id, tenants(nombre, slug)')
                    .eq('id', user.id)
                    .single();
                callerProfile = data;
            }
        }

        // Si no se pudo obtener por cookie, intentar por header Authorization
        if (!callerProfile && authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) {
                const { data } = await supabaseAdmin
                    .from('profiles')
                    .select('id, role, tenant_id, tenants(nombre, slug)')
                    .eq('id', user.id)
                    .single();
                callerProfile = data;
            }
        }

        if (!callerProfile || callerProfile.role !== 'tenant_owner') {
            return NextResponse.json({ error: 'Solo el propietario puede invitar miembros.' }, { status: 403 });
        }

        const tenantId = callerProfile.tenant_id;
        const companyName = callerProfile.tenants?.nombre || 'tu empresa';
        const slug = callerProfile.tenants?.slug || '';

        if (!tenantId) {
            return NextResponse.json({ error: 'No se encontró el tenant asociado.' }, { status: 400 });
        }

        // 2. Crear usuario en Supabase Auth con link de invitación
        const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'opps.one').trim();
        const tenantBaseUrl = `https://${slug}.${rootDomain}`;

        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: email.trim(),
            options: {
                redirectTo: `${tenantBaseUrl}/set-password`
            }
        });

        if (inviteError) {
            console.error('Error generating invite link:', inviteError);
            if (inviteError.message?.includes('already been registered')) {
                return NextResponse.json({ error: 'Este correo ya tiene una cuenta registrada.' }, { status: 400 });
            }
            return NextResponse.json({ error: 'Error al generar la invitación.' }, { status: 500 });
        }

        const userId = inviteData.user.id;

        // Reescribir action_link para el subdominio del tenant
        const verifyUrl = new URL(inviteData.properties.action_link);
        verifyUrl.searchParams.set('redirect_to', `${tenantBaseUrl}/set-password`);
        const actionLink = verifyUrl.toString();

        // 3. Crear perfil vinculado al tenant (sin accesos, el owner los asigna después)
        const profileData: Record<string, unknown> = {
            id: userId,
            email: email.trim(),
            tenant_id: tenantId,
            role: 'client',
            has_leads_access: false,
            features: {}
        };
        if (fullName && fullName.trim()) {
            profileData.full_name = fullName.trim();
        }

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert(profileData);

        if (profileError) {
            console.error('Error creating profile:', profileError);
        }

        // 4. Enviar correo de invitación
        try {
            await resend.emails.send({
                from: 'Opps One <admin@opps.one>',
                to: email.trim(),
                subject: `Has sido invitado al equipo de ${companyName} en Opps One`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 16px; background-color: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;">
                        <div style="text-align: center; margin-bottom: 12px;">
                            <h1 style="color: #2CDB9B; margin: 0; font-size: 22px;">Opps One</h1>
                        </div>
                        <div style="background-color: white; padding: 20px; border-radius: 8px;">
                            <h2 style="color: #111827; margin-top: 0; font-size: 16px;">${fullName ? `Hola ${fullName.trim()}, te` : 'Te'} han invitado al equipo</h2>
                            <p style="color: #4b5563; line-height: 1.5; font-size: 14px; margin: 8px 0 16px;">
                                Únete al equipo de <strong>${companyName}</strong>. Crea tu contraseña para comenzar.
                            </p>
                            <div style="text-align: center; margin: 16px 0;">
                                <a href="${actionLink}" style="background-color: #2CDB9B; color: #003327; font-weight: bold; text-decoration: none; padding: 10px 24px; border-radius: 8px; display: inline-block; font-size: 14px;">
                                    Aceptar Invitación
                                </a>
                            </div>
                        </div>
                        <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 12px;">
                            © 2026 Opps One
                        </p>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error('Error sending invite email:', emailErr);
            // El usuario fue creado, no fallar por el email
        }

        return NextResponse.json({
            success: true,
            member: {
                id: userId,
                email: email.trim(),
                full_name: fullName?.trim() || null,
                role: 'client',
                features: {},
                has_leads_access: false
            }
        });

    } catch (error: any) {
        console.error('POST /api/tenant/invite-member error:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
