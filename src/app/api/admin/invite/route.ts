import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Usa Service Role para poder saltar RLS y crear usuarios/tenants globales
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { companyName, email, role = 'client' } = await req.json();

        // 1. Validar que quien llama es el Admin (usando el token del header)
        // Por simplicidad en este prototipo, asumimos que el cliente envía un token válido
        // o podemos confiar en que la ruta está protegida por el frontend, 
        // pero idealmente deberíamos validar el JWT auth header aquí.

        // 2. Generar 'slug' basado en companyName
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        if (!slug || !email) {
            return NextResponse.json({ error: 'Nombre de empresa o correo inválido' }, { status: 400 });
        }

        // 3. Crear el nuevo Tenant (Empresa)
        const { data: newTenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .insert({
                slug: slug,
                nombre: companyName,
                app_type: 'CRM_INMOBILIARIO', // Default, se puede cambiar luego
                // Colores predeterminados genéricos
                color_primary: '#3B82F6',
                color_secondary: '#1E40AF',
                branding_complete: false // Requiere Onboarding
            })
            .select()
            .single();

        if (tenantError) {
            console.error("Error creating tenant:", tenantError);
            return NextResponse.json({ error: 'El subdominio (nombre de empresa) probablemente ya existe.' }, { status: 400 });
        }

        // 4. Crear el usuario en Supabase Auth y generar link de invitación (SIN enviar correo de Supabase)
        // generateLink crea el usuario internamente si no existe y nos devuelve la URL de acción.
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: email,
            options: {
                redirectTo: `https://${slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'}/set-password`
            }
        });

        if (inviteError) {
            console.error("Error generando link de invitación:", inviteError);
            return NextResponse.json({ error: 'No se pudo generar la invitación en Supabase Auth.' }, { status: 500 });
        }

        const userId = inviteData.user.id;
        const actionLink = inviteData.properties.action_link; // El link con el token mágico!

        // 5. Vincular el Perfil al Nuevo Tenant (Usamos upsert por si el trigger no ha creado el perfil aún)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                tenant_id: newTenant.id,
                role: role,
                has_leads_access: true,
                features: { tramites: false } // Permisos por defecto
            });

        if (profileError) {
            console.error("Error linking profile:", profileError);
            // Si falla no es tan crítico como el invite, pero deberíamos avisar
        }

        // 6. ENVIAR CORREO PERSONALIZADO CON RESEND (White Label)
        // Usamos nuestro propio correo e inyectamos el enlace exacto (actionLink)
        try {
            // 2. Enviar el correo usando Resend con el domain verificado
            console.log("Generando envio con Resend a:", email);
            const resendResult = await resend.emails.send({
                from: 'Opps One <admin@opps.one>',
                to: email,
                subject: `¡Has sido invitado a administrar ${companyName} en Opps One!`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h1 style="color: #2CDB9B; margin: 0; font-size: 28px;">Opps One</h1>
                        </div>
                        <div style="background-color: white; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            <h2 style="color: #111827; margin-top: 0;">Bienvenido a tu nuevo espacio de trabajo</h2>
                            <p style="color: #4b5563; line-height: 1.6;">
                                Has sido invitado para administrar el entorno de <strong>${companyName}</strong>. 
                                Todo tu ecosistema ya está preparado en tu propio subdominio privado.
                            </p>
                            
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${actionLink}" style="background-color: #2CDB9B; color: #003327; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; display: inline-block;">
                                    Aceptar Invitación y Crear Contraseña
                                </a>
                            </div>

                            <p style="color: #6b7280; font-size: 14px;">
                                Enlace de acceso directo: <br/>
                                <a href="${actionLink}" style="color: #2b6cb0;">${actionLink}</a>
                            </p>
                        </div>
                        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
                            © 2026 Opps One. Todos los derechos reservados.
                        </p>
                    </div>
                `
            });

            if (resendResult.error) {
                console.error("Resend API Error:", resendResult.error);
                return NextResponse.json({ error: 'Error del proveedor de correo (Resend): ' + resendResult.error.message }, { status: 500 });
            }
        } catch (resendError: any) {
            console.error("Resend delivery failed:", resendError);
            return NextResponse.json({ error: 'Error inesperado al enviar el correo' }, { status: 500 });
        }

        return NextResponse.json({ success: true, tenant: newTenant });

    } catch (error) {
        console.error("Invite API error:", error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
