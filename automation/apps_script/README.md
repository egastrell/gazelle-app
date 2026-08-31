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

- Lee la carpeta de facturas, ignora lo que ya procesó (los archivos
  procesados se mueven a la subcarpeta **Procesadas**).
- Identifica proveedor, titular, monto y vencimiento por OCR.
- Excluye siempre a SEGOVIA MIRTA ELENA y GASTRELL ALFREDO EDUARDO.
- En Edenor y Gas Natural, si hay dos cuentas en el mismo lote, usa la de
  mayor monto.
- Si el proveedor ya existe en Config, actualiza el valor.
- Si el proveedor **no** existe en Config, NO crea la fila solo: la deja
  anotada en la pestaña **Pendientes_Confirmacion** del mismo Sheet y no
  la vuelve a tocar hasta que decidas.
- Todo movimiento queda en la pestaña **Log_Automatizacion** (proveedor,
  titular, estado, monto anterior/nuevo, archivo).
- Si actualizó algo, manda un mail a efgastrell@gmail.com con el resumen
  (proveedor, monto anterior → nuevo, % de variación).

## Ajustar la frecuencia

Por defecto corre cada 6 horas. Para cambiarla, editá en `Codigo.gs` la
línea `.everyHours(6)` dentro de `configurarTrigger` y volvé a correr esa
función (borra el trigger viejo y crea el nuevo).
