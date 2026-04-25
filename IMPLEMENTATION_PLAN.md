# IMPLEMENTATION_PLAN.md

Documento oficial de implementacion del proyecto ESCOLTA.

Este archivo, junto con `TASKS.md` y `WALKTHROUGH.md`, es la bandera del proyecto. No eliminar ni reemplazar por `PLAN.md`.

## Estado Actual Del Proyecto

El proyecto ya esta avanzado:

- Login con Supabase funcionando.
- Flujo 2FA por correo implementado.
- Panel de perfil con gestion de seguridad implementado.
- Tablas de seguridad creadas en Supabase.
- Webhooks de ElevenLabs y WhatsApp endurecidos.
- Variables sensibles movidas a Doppler/Supabase/Vercel segun corresponda.

## Problema Activo

El foco actual no es crear 2FA desde cero. El foco es corregir el comportamiento del cambio de correo 2FA en el panel.

### Bug Principal

Cuando el usuario escribe o intenta colocar un nuevo correo de 2FA en el panel de perfil, la pantalla se refresca o reinicia sola.

Se debe revisar:

- Si algun boton esta actuando como `submit` por defecto.
- Si algun formulario esta provocando reload.
- Si `AuthGuard`, `useProfile`, `router.refresh`, `router.push` o algun `useEffect` esta rehidratando la pagina.
- Si el guardado de settings dispara recarga de sesion o redireccion.
- Si el estado local de `pendingEmail`, `challengeId` o `verificationCode` se pierde durante la interaccion.

Archivo principal a revisar:

- `src/app/(app)/settings/profile/page.tsx`

Archivos relacionados:

- `src/app/api/security/settings/route.ts`
- `src/app/api/security/settings/send-code/route.ts`
- `src/app/api/security/settings/verify-code/route.ts`
- `src/lib/security.ts`
- `src/components/AuthGuard.tsx`
- `src/hooks/useProfile.ts`

## Regla De Seguridad Para Cambiar Correo 2FA

Para cambiar el correo de 2FA no basta con validar el correo nuevo.

El flujo correcto debe ser:

1. El usuario inicia cambio de correo 2FA desde perfil.
2. El sistema envia un codigo al correo de respaldo actual o correo 2FA ya registrado.
3. El usuario valida ese codigo para demostrar que controla el correo actual.
4. Recién despues se permite enviar un codigo al correo nuevo.
5. El usuario valida el codigo recibido en el correo nuevo.
6. Solo entonces se actualiza `two_factor_email`.

Si el usuario todavia no tiene correo 2FA registrado, se puede usar el correo principal del perfil como correo de respaldo inicial.

## Cambios Esperados

### Perfil Seguridad

Modificar `src/app/(app)/settings/profile/page.tsx` para separar visualmente:

- Correo 2FA actual.
- Correo nuevo propuesto.
- Paso 1: verificar correo actual/respaldo.
- Paso 2: verificar correo nuevo.

Evitar cualquier recarga completa de pagina durante el flujo.

### Endpoints De Seguridad

Revisar si los endpoints actuales distinguen entre:

- Verificacion del correo actual/respaldo.
- Verificacion del correo nuevo.

Si no lo hacen, ajustar el flujo para usar propositos separados en OTP:

- `change_2fa_current_email`
- `change_2fa_new_email`

### Persistencia UX

Mantener estado local durante el flujo:

- correo nuevo propuesto,
- challenge del correo actual,
- challenge del correo nuevo,
- paso actual del flujo,
- mensajes de error/exito.

Si se detecta que el estado se pierde por navegacion o refresh, usar `sessionStorage` solo para este flujo.

## Verificacion Manual

- Escribir un nuevo correo 2FA y confirmar que la pantalla no se refresca.
- Solicitar codigo para cambiar correo.
- Confirmar que primero llega codigo al correo actual/respaldo.
- Validar codigo del correo actual/respaldo.
- Confirmar que recien despues se puede enviar codigo al correo nuevo.
- Validar codigo del correo nuevo.
- Confirmar que `two_factor_email` cambia en Supabase.
- Cerrar sesion e iniciar login para confirmar que el nuevo correo recibe el codigo 2FA.
