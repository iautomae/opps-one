# Plan del Proyecto: Escolta

Este documento sirve como guía paso a paso para organizar el trabajo, las nuevas funcionalidades y el progreso del proyecto.

## 📝 Tareas Pendientes
- [ ] Definir los próximos objetivos y funcionalidades a desarrollar.

## 🚧 En Progreso
- [ ] (Añadir aquí lo que estemos trabajando en el momento)

## ✅ Tareas Completadas
- [x] Configuración inicial del entorno en la nueva PC.
- [x] Instalación de Git.
- [x] Clonado del repositorio (`opps-one`) usando autenticación con token.
- [x] Verificación de variables en Doppler.

---

## 🔒 Análisis de Seguridad y Plan de Rotación de Claves

He realizado un análisis profundo de la base de código y detectado "agujeros" donde se están filtrando o exponiendo claves críticas. 

### 🕵️ Detección de Agujeros de Seguridad (Etapas)

1. **Etapa de Pruebas / Scripts Utilitarios (Alta Vulnerabilidad):**
   - **Agujero:** Los scripts de prueba y validación manual como `test_webhook_manual.js` y `verify_pushover.js` contienen secretos *hardcodeados* (el secreto de webhooks de ElevenLabs y el JWT de autenticación de Supabase, respectivamente).
   - **Impacto:** Si un desarrollador empuja accidentalmente estos archivos a GitHub o alguien con acceso de lectura examina el código, obtiene acceso total a tu base de datos de Supabase y puede falsificar interacciones de llamadas de IA.
   - **Solución:** Limpiar los scripts para que consuman `process.env.ELEVENLABS_WEBHOOK_SECRET` y `process.env.SUPABASE_ANON_KEY`, forzando el uso de Doppler (`doppler run -- node ...`).

2. **Etapa Backend Edge Functions (Media Vulnerabilidad):**
   - **Agujero:** En la función de Supabase `whatsapp-webhook/index.ts`, la variable `VERIFY_TOKEN` tenía un valor de respaldo expuesto en texto plano.
   - **Impacto:** Si la variable de entorno no se inyecta correctamente al desplegar la función, el webhook podría aceptar una contraseña predecible para suscribirse a eventos de WhatsApp.
   - **Solución:** Eliminar el respaldo en texto plano y forzar que arroje error si no se pasa la configuración secreta por consola (`supabase secrets set`).

3. **Etapa Configuración General de Base de Datos y APIs (Baja Vulnerabilidad, pero riesgoso):**
   - **Observación:** Muchos scripts como `check-db.js`, `scripts/audit-leads.js`, etc., usan correctamente `process.env.NEXT_PUBLIC_SUPABASE_URL` y `process.env.SUPABASE_SERVICE_ROLE_KEY`. Sin embargo, dependen de `.env` locales que pueden filtrarse si no están bien en el `.gitignore`.
   - **Solución:** Reemplazar el flujo de trabajo para que ninguna configuración resida en un archivo `.env` local, sino que se gestione el 100% mediante Doppler CLI durante el desarrollo local.

4. **Etapa Base de Datos y Tipos (Correcto):**
   - **Observación:** Los tokens de usuarios (como `pushover_user_1_token`) están guardados en la base de datos (se refleja en `src/types/database.types.ts`). Esto es correcto a nivel de arquitectura, pero se recomienda asegurar las políticas RLS (Row Level Security) para que nadie no autorizado lea la tabla de agentes.

### 📝 Propuesta de Ejecución (Plan de Cierre de Filtros)

**Fase 1: Modificación de Código (Lo que yo haré)**
1. Limpiaré de inmediato `test_webhook_manual.js` para usar `process.env.ELEVENLABS_WEBHOOK_SECRET` y agregaré una capa de validación para lanzar error si falta.
2. Limpiaré `verify_pushover.js` para usar `process.env.SUPABASE_ANON_KEY` o el `SERVICE_ROLE` según corresponda.
3. Actualizaré `supabase/functions/whatsapp-webhook/index.ts` para eliminar el fallback en texto plano y hacer la función estricta con sus secretos.

**Fase 2: Rotación de Claves (Lo que tú harás en Doppler)**
*NOTA: Dado que las claves actuales están en el código, deben considerarse comprometidas. No basta con borrarlas, hay que rotarlas.*
1. **ElevenLabs:** Generarás un nuevo Webhook Secret en su plataforma y lo pegarás en tu proyecto Doppler como `ELEVENLABS_WEBHOOK_SECRET`.
2. **Supabase:** Si el proyecto está en producción y es crítico, regenerarás las llaves JWT (ANON y SERVICE ROLE) en el dashboard de Supabase (Settings > API) y actualizarás tu Doppler.
3. **Meta / WhatsApp:** Crearás un Verify Token completamente aleatorio y largo, actualizarás la consola de Meta Developers con él, y luego lo asignarás a la variable `WHATSAPP_VERIFY_TOKEN` en tus secretos de Supabase Functions usando el CLI.

**Fase 3: Limpieza en GitHub y Despliegue en Vercel (Paso Final)**
1. **Limpiar Historial/Código en Git:** Se deben hacer commits de los archivos `test_webhook_manual.js`, `verify_pushover.js` e `index.ts` ya limpios, y hacer un `git push` a la rama principal para que GitHub deje de tener las contraseñas en su código fuente actual.
2. **Rotación obligatoria (ElevenLabs):** Puesto que la clave de ElevenLabs quedó guardada en el historial de Git antiguo, es obligatorio generar una llave nueva en ElevenLabs y actualizar Doppler.
3. **Despliegue automático (Vercel):** Al hacer el `git push`, Vercel se actualizará automáticamente. Sin embargo, para que funcione, Doppler debe estar integrado a Vercel (Doppler > Project > Integrations > Vercel).

---

## 🤖 Estado del Webhook de ElevenLabs (Omar)

Tras la auditoría y restauración del 21/04/2026:
- **ID Webhook Actual:** `7af551ec40b44520b623d866a787c2d9`
- **Estado:** ✅ OPERATIVO (Leads llegando correctamente).
- **Seguridad:** ✅ HMAC estricto en código. Falta verificar despliegue y configuración en ElevenLabs/Vercel.

---

## 🛠️ Plan de Implementación: Cierre de Seguridad (ElevenLabs First)

Este plan detalla los pasos para pasar de "Modo Depuración" a "Producción Segura".

### Fase A: Blindaje de ElevenLabs
1. **[x] Re-activar Bloqueo Estricto (HMAC):**
   - `src/app/api/webhooks/elevenlabs/route.ts` retorna `401 Unauthorized` si la firma es inválida o falta.
   - La firma esperada usa el formato oficial de ElevenLabs: `t=timestamp,v0=hash`.
   - El hash se valida contra `timestamp.body` y se rechazan timestamps fuera de tolerancia.
2. **[ ] Activar Rate Limiting:**
   - Preferir Redis/Upstash/Vercel KV para limitar a 20 peticiones/min.
   - Evitar `Map` en memoria para producción serverless porque no es consistente entre instancias.
   - Prevenir ataques de denegación de servicio (DoS) en el endpoint de leads.
3. **[ ] Unificar URL y secretos de producción:**
   - Usar `ELEVENLABS_WEBHOOK_URL` para evitar confusión entre `opps.one` y dominios de Vercel.
   - Confirmar que el `ELEVENLABS_WEBHOOK_SECRET` de ElevenLabs coincide con el secreto de Vercel/Doppler en producción. ✅ Validado con prueba HMAC firmada.
   - Ejecutar `powershell -ExecutionPolicy Bypass -File scripts/test_elevenlabs_hmac.ps1` como prueba controlada.

### Fase B: Estabilización de WhatsApp Webhook
4. **[ ] Re-activar Restricción CORS:**
   - Cambiar `Access-Control-Allow-Origin` de `*` a `https://graph.facebook.com` en `supabase/functions/whatsapp-webhook/index.ts`.
   - Nota: CORS no autentica webhooks server-to-server; para POST se debe añadir verificación de `X-Hub-Signature-256`.
5. **[ ] Rotación de Verify Token:**
   - Generar un token nuevo fuera del repositorio.
   - Aplicarlo en la consola de Meta y en Doppler/Supabase secrets sin pegarlo en archivos versionados.

### Fase C: Verificación Final
6. **[ ] Prueba de Fuego (E2E):**
   - Realizar una llamada real con Omar.
   - Verificar en logs de Vercel que aparezca "ElevenLabs signature verified".
   - Confirmar persistencia del lead en Supabase.

---

## 🛡️ Mejoras de Seguridad para Escalar (Pendientes)

Identificadas en auditoría del 21/04/2026. Implementar tras estabilizar ElevenLabs:

### 🔴 Alta Prioridad
1. **Limpiar Token de GitHub del remote:** ✅ COMPLETADO.
2. **Proteger rutas del frontend en el Middleware:** Requiere migración a `@supabase/ssr` para validación de cookies de sesión.

### 🟢 Mejoras Recomendadas
3. **Login con Google (OAuth):** Configurar en Supabase Auth.
4. **Auditoría de RLS:** Revisar políticas de seguridad por fila en tablas de `agentes` y `leads`.
