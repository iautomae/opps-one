# IMPLEMENTATION_PLAN.md

Documento oficial de implementacion del proyecto ESCOLTA.

Este archivo, junto con `TASKS.md` y `WALKTHROUGH.md`, es la bandera del proyecto. No eliminar ni reemplazar por `PLAN.md`.

## Estado Actual Del Proyecto

El proyecto ya está avanzado:
- Login con Supabase funcionando.
- Flujo 2FA por correo implementado.
- Panel de perfil con gestión de seguridad implementado.
- Tablas de seguridad creadas en Supabase.
- Webhooks de ElevenLabs y WhatsApp endurecidos.
- Variables sensibles movidas a Doppler/Supabase/Vercel según corresponda.

## Hallazgos de la Auditoría

Se realizó una revisión profunda de la seguridad del flujo 2FA y la integración con Doppler:

1. **Conexión a Doppler:** Verificada. La CLI de Doppler está autenticada y el entorno `escolta_doppler` (dev) inyecta correctamente todas las variables sensibles.
2. **Backend (Rutas API 2FA):** 
   - El endpoint `/verify-code` verifica estrictamente que el `currentChallengeId` pertenezca a la validación del correo antiguo antes de permitir actualizar al nuevo.
   - Los propósitos de los OTP (`change_2fa_current_email` y `change_2fa_new_email`) aseguran que un código no sirva para otro contexto.
   - El uso de `supabaseAdmin` para crear y leer challenges está protegido por `requireAuth()`, mitigando riesgos de escalada de privilegios.
3. **Frontend (Bug de recarga de pantalla):**
   - El archivo `src/app/(app)/settings/profile/page.tsx` ya tiene separados los botones con `type="button"` y no hay un elemento `<form>` que dispare validaciones nativas que recarguen la página por error.

## User Review Required

> [!IMPORTANT]
> El sistema 2FA está seguro y la lógica base está bien diseñada. El bug de refresco de pantalla al escribir el correo ya está parcheado a nivel código. 
> 
> **Decisión Pendiente:** En tus tareas mencionas que podríamos usar `sessionStorage` para mantener los pasos de validación en caso de que el usuario recargue accidentalmente la pestaña (F5). ¿Deseas que agregue esto al código de `page.tsx`, o prefieres probar el flujo actual primero para ver si es estable?

## Proposed Changes

Si deseas implementar `sessionStorage`, el cambio sería:

### [MODIFY] `src/app/(app)/settings/profile/page.tsx`
- Agregar un `useEffect` para persistir `newTwoFactorEmail`, `changeStep`, `currentChallengeId`, y `newEmailChallengeId` en `sessionStorage`.
- Leer estos valores al montar el componente para restaurar el estado si la página se recargó.

## Verification Plan

### Manual Verification
1. Ingresar a Perfil y probar escribir un nuevo correo (validar que la página no parpadee ni se recargue).
2. Probar el flujo completo (recibir código 1, validar, recibir código 2, validar).
3. Salir y volver a iniciar sesión para verificar que se requiere el código al nuevo correo.
