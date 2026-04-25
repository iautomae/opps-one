# TASKS.md

Checklist oficial del proyecto ESCOLTA.

Este archivo, junto con `IMPLEMENTATION_PLAN.md` y `WALKTHROUGH.md`, es la bandera del proyecto. No eliminar ni reemplazar por `PLAN.md`.

## Completado

- [x] Auditoria de rutas API de seguridad.
- [x] Endurecimiento de WhatsApp Webhook.
- [x] CORS restringido en `supabase/functions/whatsapp-webhook/index.ts`.
- [x] Verificacion de firma `X-Hub-Signature-256`.
- [x] Webhook de ElevenLabs con HMAC validado.
- [x] Tablas de seguridad creadas en Supabase.
- [x] Login con 2FA por correo implementado.
- [x] Panel de perfil con seccion de seguridad implementado.
- [x] Endpoints base para settings de seguridad implementados.

## En Progreso Ahora

- [x] Corregir refresh/reinicio de pantalla al colocar nuevo correo 2FA en perfil.
    - [x] Separar el flujo en acciones controladas sin submit accidental.
    - [x] Usar botones `type="button"` en acciones de seguridad.
    - [x] Separar estado de correo actual, correo nuevo, challenges y codigos.
    - [x] Evitar recarga completa de pagina durante el cambio de correo.

- [x] Implementar flujo correcto para cambiar correo 2FA.
    - [x] Enviar primer codigo al correo actual de 2FA o correo de respaldo registrado.
    - [x] Validar el codigo del correo actual/respaldo antes de permitir el cambio.
    - [x] Enviar segundo codigo al nuevo correo.
    - [x] Validar el codigo del nuevo correo.
    - [x] Actualizar `two_factor_email` solo despues de ambas validaciones.

## Pendiente Despues

- [ ] Probar manualmente en navegador que la pantalla no se refresca al escribir o cambiar correo 2FA.
- [ ] Revisar si conviene usar `sessionStorage` para mantener el flujo de cambio de correo si el usuario cambia de pestana.
- [ ] Validar login real despues de cambiar correo 2FA.
- [ ] Probar logout/login completo con el nuevo correo 2FA.
- [ ] Validacion final de WhatsApp con Meta en entorno real.
- [ ] Confirmar que `WHATSAPP_APP_SECRET` este configurado en produccion y que no se acepten POST sin firma.

## No Usar

- [x] `PLAN.md` queda retirado para evitar confusion.
