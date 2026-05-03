# IMPLEMENTATION_PLAN.md

## Objetivo del Rediseño
Transformar la pantalla de seguridad de una vista larga y saturada de campos, a un **Dashboard Compacto y Profesional** (estilo "App Nativa"). Todo encajará en una sola pantalla sin necesidad de hacer scroll hacia abajo, utilizando ventanas modales (pop-ups elegantes) para ocultar la complejidad de los formularios.

## Concepto Visual y UX (Experiencia de Usuario)
La página se dividirá en dos capas principales:

### 1. El Panel Principal (Fondo)
Estará compuesto por **3 Tarjetas (Cards)** limpias y compactas, dispuestas en una cuadrícula (grid). 
- **Tarjeta 1: Acceso Regional**: Solo un icono de escudo, el texto "Acceso restringido" y el estado "Solo Perú".
- **Tarjeta 2: Alertas de Seguridad**: Eliminaremos el campo de correo confuso. Solo habrá un texto explicativo y un "Switch" (interruptor moderno) para encender/apagar las notificaciones de inicios de sesión sospechosos.
- **Tarjeta 3: Verificación en Dos Pasos (2FA)**: Un indicador brillante de estado (Verde si está activo, Gris si no). Mostrará el correo enmascarado.
  - Tendrá 2 botones muy limpios: **"Configurar/Cambiar Correo"** y **"Desactivar"** (si está encendido).

### 2. Capa de Modales (Pop-ups)
Toda la lógica de escribir correos y códigos ya no ensuciará la pantalla principal. Cuando el usuario haga clic en una acción, el fondo se oscurecerá sutilmente (efecto *Glassmorphism* / desenfoque) y aparecerá una ventana flotante centrada:
- **Modal de Desactivación**: Aparece solo si le das a desactivar. Te pide el código OTP de 6 dígitos.
- **Modal de Cambio de Correo (Flujo paso a paso)**: 
  - *Paso 1:* Pide el nuevo correo.
  - *Paso 2:* La tarjeta gira o cambia suavemente para pedir el código de tu correo actual.
  - *Paso 3:* Pide el código del correo nuevo.

## User Review Required

> [!IMPORTANT]
> **Cambios a Nivel Código:**
> 1. Voy a borrar el campo `alertEmail` de la interfaz para siempre. Las alertas llegarán a tu correo principal o 2FA.
> 2. Todo el código actual de `page.tsx` será borrado y reescrito utilizando componentes modales y un grid compacto con Tailwind CSS.
>
> ¿Te gusta esta propuesta visual basada en Tarjetas de Estado + Modales Flotantes? Si me das el "Ok", empiezo a construir la interfaz.

## Proposed Changes

### [MODIFY] `src/app/(app)/settings/profile/page.tsx`
- **Reescritura Total:** Se eliminará el layout vertical y se implementará un `grid-cols-1 md:grid-cols-3` compacto.
- **Implementación de Modales:** Crearemos un componente `<Modal />` interno que use `fixed inset-0 backdrop-blur-sm z-50`.
- **Limpieza de Estado:** Se mantendrá la persistencia con `sessionStorage`, pero atada a la visibilidad de los modales.

## Verification Plan
1. Verificar que la pantalla no requiera scroll en resoluciones de escritorio normales.
2. Confirmar que al abrir un modal, el usuario no pueda interactuar con el fondo por error.
3. Probar todo el flujo 2FA (activar, cambiar, desactivar) puramente desde los modales.
4. Asegurar que las notificaciones (alertas de guardado) se vean elegantes, estilo "toast", para no romper el layout.
