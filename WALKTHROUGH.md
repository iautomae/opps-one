# WALKTHROUGH.md

Bitacora oficial del proyecto ESCOLTA.

Este archivo, junto con `IMPLEMENTATION_PLAN.md` y `TASKS.md`, es la bandera del proyecto. No eliminar ni reemplazar por `PLAN.md`.

## Resumen Del Avance

El proyecto ya tiene una base de seguridad avanzada. Se estabilizó de manera exitosa el flujo de cambio de correo 2FA en el panel, evitando recargas visuales y pérdida de progreso.

## Cambios Ya Realizados

### Seguridad De Webhooks

- WhatsApp Webhook restringido con CORS hacia `https://graph.facebook.com`.
- WhatsApp Webhook con verificacion `X-Hub-Signature-256`.
- ElevenLabs Webhook auditado y verificado con HMAC.
- Secretos sensibles movidos fuera del codigo e inyectados via Doppler.

### Seguridad De Acceso

- Login con Supabase implementado.
- Doble verificacion por correo implementada.
- Bloqueo por pais permitido implementado para Peru.
- Registro de eventos de seguridad implementado.
- Panel de perfil con configuracion de seguridad implementado y resiliente a cambios de pestaña.

### Base De Datos

Tablas de seguridad creadas y utilizadas:

- `profile_security_settings`
- `auth_otp_challenges`
- `auth_session_clearances`
- `auth_security_events`

## Corrección del Bug de 2FA (Cambio de Pestaña)

El problema final reportado fue:
> Al solicitar el código e ir a revisar el correo en otra pestaña, al regresar al panel, este se recargaba solo, reseteando todo el progreso como si nunca se hubiera pedido el código.

### Root Cause (Causa Raíz)
Se descubrió que el cliente de Supabase dispara un evento `onAuthStateChange` al recuperar el foco de la ventana (para sincronizar la sesión). Esto activaba un re-render en `AuthGuard`, el cual regresaba su estado interno a `"checking"`, renderizando temporalmente un `<LoaderCircle />` y desmontando completamente el componente de la página de Perfil, lo que destruía todos los estados locales de React (`useState`).

### Solución Implementada
1. **Protección en `AuthGuard.tsx`**: Se modificó para que, si el estado de seguridad ya era `"verified"`, no regrese visualmente al estado `"checking"` durante la re-verificación silenciosa, previniendo el desmontaje de la página.
2. **Persistencia con `sessionStorage` en `page.tsx`**: Para mayor robustez contra F5 (recargas manuales), todo el flujo (paso actual, IDs de challenge, y correos en progreso) ahora se guarda dinámicamente en el almacenamiento de sesión y se limpia al terminar exitosamente.

## Criterio De Exito Cumplido

El flujo queda correcto porque:

- escribir el nuevo correo no refresca la pantalla,
- pedir codigo no reinicia el panel,
- cambiar de pestaña ya no desmonta la aplicación,
- recargar la página intencionalmente (F5) no borra el progreso actual.

## Pasos Siguientes

- [ ] Validar el flujo de login 2FA completo.
- [ ] Testear integraciones finales de WhatsApp en producción.

## Documentacion Oficial

Solo estos tres documentos deben guiar el proyecto:

- `IMPLEMENTATION_PLAN.md`
- `TASKS.md`
- `WALKTHROUGH.md`

`PLAN.md` queda retirado para evitar confusion.
