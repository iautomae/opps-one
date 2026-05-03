# IMPLEMENTATION_PLAN.md

## Objetivo
Atender la solicitud de seguridad sobre la doble verificación (2FA):
1. **Aclaración sobre el cambio de correo**: Explicar y verificar que el flujo de *cambio de correo* ya funciona como solicitaste (el primer código llega al correo 2FA actual antes de permitir colocar uno nuevo).
2. **Desactivación Segura de 2FA**: Prevenir que cualquier persona con la sesión abierta pueda desactivar el 2FA con un simple clic. Requerir un código OTP enviado al correo 2FA configurado para poder apagarlo.

## Estado Actual
- **Cambiar correo 2FA**: ✅ Ya está implementado así. Cuando intentas cambiar el correo, el código que te pide bajo "Código del correo actual" se envía a la variable `two_factor_email`. Solo si validas ese correo, se te permite validar el nuevo. ¡Esto ya es 100% seguro!
- **Desactivar 2FA**: ❌ Vulnerable. Actualmente, el botón "Desactivar doble verificación" simplemente hace una petición POST y lo apaga en la base de datos sin preguntar nada. 

## User Review Required

> [!IMPORTANT]
> El plan es modificar el endpoint principal para bloquear la desactivación directa del 2FA. Cuando alguien haga clic en "Desactivar", el sistema ocultará el botón y mostrará un campo de código, enviando previamente un OTP al correo 2FA. 
>
> ¿Estás de acuerdo con implementar este nuevo flujo para el botón de Desactivar?

## Proposed Changes

### [MODIFY] `src/app/api/security/settings/route.ts`
- Modificar el método POST para que rechace automáticamente cualquier intento de enviar `{ twoFactorEnabled: false }`. Obligaremos a que el apagado del 2FA se haga exclusivamente por la ruta de verificación de OTP.

### [MODIFY] `src/app/api/security/settings/send-code/route.ts`
- Agregar soporte para un nuevo parámetro `action: 'disable_2fa'`.
- Generar un OTP con el propósito especial `disable_2fa` y mandarlo por correo (al correo 2FA configurado).

### [MODIFY] `src/app/api/security/settings/verify-code/route.ts`
- Agregar soporte para verificar el propósito `disable_2fa`.
- Si el código es correcto, actualizar `profile_security_settings` poniendo `two_factor_enabled: false`.

### [MODIFY] `src/app/(app)/settings/profile/page.tsx`
- Crear un nuevo estado visual para el botón de desactivar:
  - Si el usuario hace clic en "Desactivar", la UI pide el OTP en lugar de apagarlo directamente.
  - Ocultar el botón original y mostrar el input de código de desactivación con botones de "Confirmar" y "Cancelar".

## Verification Plan

### Pruebas Manuales
1. Al hacer clic en "Desactivar doble verificación", el panel no debe apagarse, sino que debe avisar que se envió un código al correo 2FA.
2. Ingresar un código incorrecto debe fallar.
3. Ingresar el código correcto enviado al correo 2FA debe apagar exitosamente el 2FA.
4. (Opcional) Intentar hackear la petición mandando un cURL directamente al endpoint original debe resultar en un error `400 Bad Request`.
