---
name: auditoria-gastos
description: Audits Eduardo's household spending in the Gazelle Google Sheet ("Tarjetas") to find concrete savings — duplicate/erroneous charge entries, recurring services whose price jumped, and expenses of his parents (Familia=Padres) accidentally billed to his own card. Use this whenever Eduardo asks to find savings ("buscá ahorros", "dónde puedo ahorrar"), audit or review spending in any category (Servicios, Salud, Alimentación, Vehículo, etc.), check if something "está caro" or subió de precio, look for duplicate or wrong charges, or wants a spending checkup — even if he doesn't name a specific category, doesn't say "audit", or just asks something like "che, revisá los gastos de luz y gas" or "¿hay algo raro en la tarjeta este mes?". Always use this instead of writing ad-hoc Python to parse the Sheet — the bundled script already handles the Argentina locale number parsing, the Familia=Padres exclusion rule, and known Sheet duplicate-entry patterns correctly.
---

# Auditoría de gastos (Gazelle)

Encuentra ahorros reales en la hoja "Tarjetas" del Sheet de Eduardo: duplicados de
carga, subas de precio en servicios recurrentes, y gastos de sus padres mal
cargados en su propia tarjeta. Ver `/home/user/gazelle-app/CLAUDE.md` para el
contexto completo del proyecto (metodología Baby Steps, esquema del Sheet, reglas
de exclusión de Familia=Padres).

## Por qué existe un script en vez de analizar a mano

La hoja tiene 3000+ filas y viene con problemas de datos conocidos y recurrentes
(montos como texto en formato argentino, duplicados Email/PDF/Manual, cargos de
Mirta y Alfredo con `Familia` mal seteado). Reescribir esta lógica desde cero cada
vez es lento y fácil de hacer mal — ya pasó: un análisis manual anterior se perdió
varios cargos mal ruteados que el script sí detecta. Usá siempre
`scripts/analizar_gastos.py`.

## Paso 1: bajar la hoja "Tarjetas"

Llamá a la tool `mcp__Google_Drive__download_file_content` con:
- `fileId`: `15TzS_-VQazdA427n8S7H_FnPD5Fj0eDrRMuETIdNLgQ`
- `exportMimeType`: `text/csv`

Esto exporta la primera hoja del spreadsheet (que es "Tarjetas") como CSV en
base64. El resultado casi siempre supera el límite de tokens de una tool call y la
plataforma lo guarda automáticamente en un archivo `.txt` con formato JSON
`{"content": "<base64>", ...}` — el mensaje de error te da la ruta exacta. Usá esa
ruta directamente como input del script, no hace falta decodificar nada vos mismo.

Si por algún motivo el resultado NO se auto-guarda (poco probable dado el tamaño
de la hoja), guardá el JSON completo de la respuesta en un archivo con `Write` y
usá esa ruta.

## Paso 2: correr el script

```
python3 /home/user/gazelle-app/.claude/skills/auditoria-gastos/scripts/analizar_gastos.py \
  <ruta_al_archivo_del_paso_1> \
  [--categoria "Servicios"] \
  [--meses 12]
```

- `--categoria`: nombre exacto de la Categoria del Sheet (Servicios, Salud,
  Alimentación, Vehículo, Educación, Entretenimiento, Indumentaria, Transporte,
  Compras Online, Hogar, Diezmo, Banco, Otros). Sin este flag audita **todas** las
  categorías del Núcleo de una — útil para un chequeo general o cuando Eduardo no
  especifica dónde mirar.
- `--meses`: ventana de meses hacia atrás (default 12).

El script ya excluye siempre `Familia=Padres` (no hace falta pedirlo) y ya avisa
si los últimos 1-2 meses de datos están incompletos (ciclo del Sheet sin cerrar,
PDF sin procesar) — cuando avise esto, no lo interpretes como que bajó el gasto.

## Paso 3: leer el output y escribir la respuesta

El script imprime cuatro secciones: hallazgos prioritarios (rankeados por
impacto en pesos), resumen por categoría/subcategoría con run-rate mensual,
detalle de duplicados, y detalle de cargos de Padres mal ruteados.

**No le pegues el output crudo a Eduardo.** Él pidió "buscar ahorros", no un
volcado de un script. Con la lista de hallazgos:

1. Quedate con los que tengan impacto real en pesos y descartá ruido (un solo
   evento de $2.000 no amerita un punto en la respuesta).
2. Para cada suba de precio marcada con "cotizar alternativas o confirmar la
   causa del aumento": usá criterio. Un impuesto o percepción de AFIP no se
   cotiza — se explica que subió por norma vigente. Un seguro o un servicio sí se
   puede cotizar. El script no distingue esto, vos sí.
3. Para cada duplicado: dejá claro que es un error de carga en la Sheet (no un
   cobro doble real del banco), y que conviene correr `eliminarDuplicados()` (via
   Apps Script, `automation/apps_script/Codigo.gs`) después de que Eduardo lo
   revise — nunca lo borres vos de la Sheet directamente.
4. Para cada cargo de Padres mal ruteado: es plata que Eduardo puso por sus
   padres sin darse cuenta — señalalo como algo para corregir en la fila (cambiar
   `Familia` a `Padres`) y, si es un débito recurrente, migrarlo a nombre de
   Mirta/Alfredo.
5. Respondé en español, directo y conciso (así prefiere Eduardo que le hablen),
   priorizado por plata en juego, con fechas y comercios concretos — no
   generalidades.

## Lo que esta skill NO hace

No escribe nada en el Sheet, no borra filas, no corrige categorías, y no crea
tareas en Todoist/Asana automáticamente. Es de solo lectura. Si después de
mostrarle los hallazgos a Eduardo él quiere que corrijas algo en el Sheet o que
cargues tareas de seguimiento, hacelo como una acción aparte y explícita — no
asumas que "buscar ahorros" incluye permiso para escribir.

## Límite conocido del detector de subas de precio

Compara el promedio mensual de la primera mitad del período contra la segunda
mitad, por Subcategoria (no por Comercio: muchos débitos automáticos cambian el
número de comprobante en el texto del Comercio cada mes, así que agrupar por
comercio exacto pierde la recurrencia). Esto es confiable para detectar una
tendencia clara, pero puede diluir una suba si la Subcategoria mezcla varios
proveedores con montos muy distintos (ej. "Seguro" mezcla Zurich, NAC SE18 y
Provincia Seguros). Si el resumen por subcategoría muestra un comercio con un
salto llamativo que el detector automático no marcó como hallazgo, mencionalo
igual — mirá la sección de resumen, no solo la lista de hallazgos.
