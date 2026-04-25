# WALKTHROUGH.md

Bitacora oficial del proyecto ESCOLTA.

Este archivo, junto con `IMPLEMENTATION_PLAN.md` y `TASKS.md`, es la bandera del proyecto. No eliminar ni reemplazar por `PLAN.md`.

## Resumen Del Avance

El proyecto ya tiene una base de seguridad avanzada. La tarea actual es estabilizar el flujo de cambio de correo 2FA en el panel, no construir el sistema desde cero.

## Cambios Ya Realizados

### Seguridad De Webhooks

- WhatsApp Webhook restringido con CORS hacia `https://graph.facebook.com`.
- WhatsApp Webhook con verificacion `X-Hub-Signature-256`.
- ElevenLabs Webhook auditado y verificado con HMAC.
- Secretos sensibles movidos fuera del codigo.

### Seguridad De Acceso

- Login con Supabase implementado.
- Doble verificacion por correo implementada.
- Bloqueo por pais permitido implementado para Peru.
- Registro de eventos de seguridad implementado.
- Panel de perfil con configuracion de seguridad implementado.

### Base De Datos

Tablas de seguridad creadas y utilizadas:

- `profile_security_settings`
- `auth_otp_challenges`
- `auth_session_clearances`
- `auth_security_events`

## Punto Exacto De Retoma

El problema reportado era:

> Al colocar o cambiar el nuevo correo de 2FA en perfil, la pantalla se refresca o reinicia sola.

Ademas, el flujo esperado para cambiar el correo 2FA debia ser mas estricto:

> Antes de aceptar un nuevo correo 2FA, el sistema debe enviar un codigo al correo actual de 2FA o correo de respaldo registrado. Solo despues de validar ese codigo se debe enviar otro codigo al correo nuevo.

## Ultima Implementacion

Se actualizo el flujo de cambio de correo 2FA:

- La pantalla de perfil separa el flujo en dos pasos.
- Primero se envia y valida un codigo al correo actual/respaldo.
- Despues se envia y valida un codigo al correo nuevo.
- `two_factor_email` solo se actualiza despues de ambas validaciones.
- Los botones de accion usan `type="button"` para evitar submits accidentales.

## Archivos Clave Para Revisar

- `src/app/(app)/settings/profile/page.tsx`
- `src/app/api/security/settings/route.ts`
- `src/app/api/security/settings/send-code/route.ts`
- `src/app/api/security/settings/verify-code/route.ts`
- `src/lib/security.ts`
- `src/components/AuthGuard.tsx`
- `src/hooks/useProfile.ts`

## Criterio De Exito

El flujo queda correcto cuando se pruebe manualmente que:

- escribir el nuevo correo no refresca la pantalla,
- pedir codigo no reinicia el panel,
- el primer codigo llega al correo actual/respaldo,
- el segundo codigo llega al correo nuevo,
- el correo 2FA solo cambia despues de ambas validaciones,
- el siguiente login usa el nuevo correo 2FA.

## Documentacion Oficial

Solo estos tres documentos deben guiar el proyecto:

- `IMPLEMENTATION_PLAN.md`
- `TASKS.md`
- `WALKTHROUGH.md`

`PLAN.md` queda retirado para evitar confusion.
