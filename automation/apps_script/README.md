# Apps Script — 100% automático, sin terminal

Este es el camino recomendado: corre adentro del mismo Google Sheet, no
necesita `credenciales_google.json`, gcloud, ni nada instalado. El único
paso manual es un click de autorización de Google (ver punto 5) — eso no
lo puede hacer nadie más que el dueño de la cuenta, ni yo con "todos los
permisos" del mundo: Google exige que sea la propia cuenta la que apriete
"Permitir" la primera vez, así evita que cualquier script (mío o de
cualquiera) se autoconceda acceso a tu Drive y tu Sheet sin que lo veas.
Después de ese único click, no volvés a tocar nada nunca más.

## Instalación (una sola vez, ~2 minutos)

1. Abrí el Sheet `15TzS_-VQazdA427n8S7H_FnPD5Fj0eDrRMuETIdNLgQ`.
2. Menú **Extensiones → Apps Script**.
3. Borrá todo el contenido de `Código.gs` y pegá el contenido de
   [`Codigo.gs`](./Codigo.gs) de esta carpeta.
4. En el panel izquierdo, **Servicios** (ícono +) → buscá **Drive API** →
   Agregar (esto habilita el OCR para leer los PDF).
5. Arriba, en el selector de funciones, elegí **`configurarTrigger`** y
   apretá **▶ Ejecutar**.
   - Va a aparecer "Se requiere autorización" → **Revisar permisos** →
     elegí tu cuenta → si dice "Google no verificó esta app", click en
     **Avanzado** → **Ir a (nombre del proyecto), no seguro** → **Permitir**.
   - Esto es normal: es TU script, en TU cuenta, corriendo solo para vos —
     el aviso aparece porque no está publicado en la tienda de Google
     Workspace, no porque haga algo raro.
6. Listo. Queda un trigger corriendo cada 6 horas. Además hizo una
   primera corrida ya mismo.

## Qué hace cada vez que corre

Con las facturas (PDF de Swiss Medical, Edenor, Gas Natural, Urunet):

- Lee la carpeta, ignora lo que ya procesó (los archivos procesados se
  mueven a la subcarpeta **Procesadas**).
- Identifica proveedor, titular, monto y vencimiento por OCR.
- Excluye siempre a SEGOVIA MIRTA ELENA y GASTRELL ALFREDO EDUARDO.
- En Edenor y Gas Natural, si hay dos cuentas en el mismo lote, usa la de
  mayor monto.
- Si el proveedor ya existe en Config, actualiza el valor.
- Si el proveedor **no** existe en Config, NO crea la fila solo: la deja
  anotada en la pestaña **Pendientes_Confirmacion** y no la vuelve a
  tocar hasta que decidas.

Con comprobantes de transferencia (fotos o PDF: diezmo, etc.):

- También lee fotos (JPG/PNG), no solo PDF.
- Reconoce quién la hizo con la misma lógica de nombre que ya usa la
  pestaña Tarjetas (USUARIO): si el que transfiere es SEGOVIA MIRTA ELENA
  o GASTRELL ALFREDO EDUARDO, la descarta directo; si dice ZIEGLER
  ROMINA EMILIA, queda a nombre de Romina; si no dice nada distinto,
  asume Eduardo (es su Drive).
  Reconoce a quién fue la transferencia por el nombre del beneficiario,
  CUIT o CVU (hoy solo "Asociación Civil Centro Familia Y Vida" → 
  categoría **Diezmo**; se puede sumar más beneficiarios en
  `BENEFICIARIOS_TRANSFERENCIA` dentro de `Codigo.gs`).
- Si reconoce el beneficiario, agrega una fila nueva en la pestaña
  **Tarjetas** con Medio = "Transferencia" (nunca "Tarjeta Crédito", para
  no mezclarla con consumos de tarjeta) y Categoria = "Diezmo" — la app
  ya tiene un techo de presupuesto para Diezmo, así que aparece sola en
  Mi Plan y en el resumen del ciclo/mes que corresponda según la fecha
  de la transferencia.
- Si el beneficiario no lo reconoce, lo anota en **Pendientes_Confirmacion**
  como `transferencia_sin_clasificar` en vez de adivinar la categoría.

En ambos casos:

- Todo movimiento queda en la pestaña **Log_Automatizacion** (proveedor o
  categoría, titular, estado, monto, fecha, archivo).
- Si actualizó algo, manda un mail a efgastrell@gmail.com con el resumen
  (facturas: monto anterior → nuevo y % de variación; transferencias:
  categoría, monto y fecha).

## Ajustar la frecuencia

Por defecto corre cada 6 horas. Para cambiarla, editá en `Codigo.gs` la
línea `.everyHours(6)` dentro de `configurarTrigger` y volvé a correr esa
función (borra el trigger viejo y crea el nuevo).

## Ritmo semanal (reservas de MP)

Ya no hay sangrado fijo a Romina — se maneja con reservas dentro de
Mercado Pago, en espejo con los techos de cada categoría en Gazelle. Para
saber cuánto conviene tener reservado por categoría y a qué ritmo gastar
por día/semana (sobre todo en Alimentación), hay una segunda función,
independiente de `configurarTrigger`:

1. En el mismo selector de funciones, elegí **`configurarTriggerRitmo`** y
   apretá **▶ Ejecutar** (una sola vez).
2. Queda un trigger corriendo todos los días a las 7am que:
   - Recalcula, con los gastos reales de Tarjetas, cuánto queda de techo
     por categoría y a qué ritmo diario/semanal hay que gastar para
     llegar holgado al fin del ciclo.
   - Deja esos números siempre actualizados en una pestaña nueva,
     **Ritmo_Semanal** — ahí podés mirar en cualquier momento cuánto
     reservar en cada categoría de MP.
   - Manda un mail resumen todos los lunes, y además cualquier día que
     alguna categoría empiece a gastarse más rápido de lo que corresponde
     según cuánto pasó del ciclo (para ajustar la reserva de MP antes de
     que sea tarde, no después).
