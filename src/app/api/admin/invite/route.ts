import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdminClient, requireAuth } from '@/lib/server-auth';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = getSupabaseAdminClient();

function slugifyCompanyName(companyName: string) {
    return companyName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

export async function POST(req: Request) {
    try {
        const { response } = await requireAuth(req, ['admin']);
        if (response) {
            return response;
        }

        const { companyName, email } = await req.json();
        const normalizedCompanyName = typeof companyName === 'string' ? companyName.trim() : '';
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const slug = slugifyCompanyName(normalizedCompanyName);

        if (!slug || !normalizedEmail) {
            return NextResponse.json({ error: 'Nombre de empresa o correo inválido.' }, { status: 400 });
        }

        const { data: newTenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .insert({
                slug,
                nombre: normalizedCompanyName,
                app_type: 'CRM_INMOBILIARIO',
                color_primary: '#3B82F6',
                color_secondary: '#1E40AF',
                branding_complete: false,
            })
            .select()
            .single<{ id: string; nombre: string; slug: string }>();

        if (tenantError || !newTenant) {
            console.error('Error creating tenant:', tenantError);
            return NextResponse.json(
                { error: 'El subdominio de la empresa ya existe o no se pudo crear.' },
                { status: 400 }
            );
        }

        const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'opps.one').trim();
        const tenantBaseUrl = `https://${slug}.${rootDomain}`;

        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: normalizedEmail,
            options: {
                redirectTo: `${tenantBaseUrl}/set-password`,
            },
        });

        if (inviteError || !inviteData?.user) {
            console.error('Error generating invite link:', inviteError);
            await supabaseAdmin.from('tenants').delete().eq('id', newTenant.id);
            return NextResponse.json(
                { error: 'No se pudo generar la invitación en Supabase Auth.' },
                { status: 500 }
            );
        }

        const verifyUrl = new URL(inviteData.properties.action_link);
        verifyUrl.searchParams.set('redirect_to', `${tenantBaseUrl}/set-password`);
        const actionLink = verifyUrl.toString();

        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
            id: inviteData.user.id,
            email: normalizedEmail,
            tenant_id: newTenant.id,
            role: 'tenant_owner',
            has_leads_access: false,
            features: {},
        });

        if (profileError) {
            console.error('Error linking profile:', profileError);
            return NextResponse.json({ error: 'No se pudo vincular el propietario al tenant.' }, { status: 500 });
        }

        const resendResult = await resend.emails.send({
            from: 'Opps One <admin@opps.one>',
            to: normalizedEmail,
            subject: `Has sido invitado a administrar ${normalizedCompanyName} en Opps One`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 16px; background-color: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;">
                    <div style="text-align: center; margin-bottom: 12px;">
                        <h1 style="color: #2CDB9B; margin: 0; font-size: 22px;">Opps One</h1>
                    </div>
                    <div style="background-color: white; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #111827; margin-top: 0; font-size: 16px;">Bienvenido a tu espacio de trabajo</h2>
                        <p style="color: #4b5563; line-height: 1.5; font-size: 14px; margin: 8px 0 16px;">
                            Has sido invitado para administrar <strong>${normalizedCompanyName}</strong>.
                        </p>
                        <div style="text-align: center; margin: 16px 0;">
                            <a href="${actionLink}" style="background-color: #2CDB9B; color: #003327; font-weight: bold; text-decoration: none; padding: 10px 24px; border-radius: 8px; display: inline-block; font-size: 14px;">
                                Aceptar invitación
                            </a>
                        </div>
                    </div>
                </div>
            `,
        });

        if (resendResult.error) {
            console.error('Resend API error:', resendResult.error);
            return NextResponse.json({ error: 'Error del proveedor de correo.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, tenant: newTenant });
    } catch (error: unknown) {
        console.error('Invite API error:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
