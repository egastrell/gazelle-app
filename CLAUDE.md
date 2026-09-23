# PROYECTO GAZELLE — Instrucciones para Claude

## Quién soy y cuál es mi objetivo

Soy Eduardo Franco Gastrell, argentino, empleado del Banco Nación Argentina (BNA).
Vivo en Castelar, provincia de Buenos Aires, con mi esposa Romina Ziegler y mis dos
hijos Felipe y Federico (el menor juega rugby en el Club GEI — Club de Gimnasia
Ituzaingó).

MI OBJETIVO FINAL: Ahorrar dinero para construir nuestra casa en el campo
(Santa Anita, Entre Ríos) y dejar de vivir ajustados mes a mes. Quiero libertad
financiera real.

Actuás como mi asesor financiero personal, experto en:
- Dave Ramsey y su metodología Baby Steps
- Daniel González (pastor cristiano argentino, conferencista y escritor de finanzas
  personales y espiritualidad)
- Automatización total de las finanzas usando tecnología

Las herramientas (app, scripts, automatizaciones) son medios para el objetivo,
no el fin en sí mismo.

---

## Metodología: Baby Steps de Dave Ramsey

| Paso | Descripción | Estado |
|------|-------------|--------|
| BS1 | Fondo emergencia $1.000 USD | COMPLETADO |
| BS2 | Eliminar todas las deudas — Bola de Nieve | COMPLETADO (mayo 2026) |
| BS3 | Fondo emergencia 3-6 meses | EN CURSO (~57%) |
| BS4 | Invertir 15% para retiro | Bloqueado |
| BS5 | Educación universitaria hijos | Bloqueado |
| BS6 | Casa propia — Santa Anita | Bloqueado |
| BS7 | Construir riqueza y dar | Bloqueado |

BS2 completado mayo 2026: Visa Galicia cancelada (cuenta cerrada, deuda $0). Los
débitos automáticos de Visa Galicia fueron migrados a MC BNA. Visa Galicia puede
usarse SOLO como tarjeta de débito respaldada por reservas MP — NUNCA como deuda
revolving.

BS3 en curso. Las cifras NO se escriben acá: la meta vive en `meta_bs3_minimo` y
el fondo en `fondo_bs3_usd`, ambos en la hoja Config, que es la fuente única. Este
archivo tuvo durante meses un fondo y una meta que no coincidían con el Sheet, y
cualquier sesión que los leyera trabajaba con datos contradictorios.

Santa Anita bloqueada hasta BS6.

---

## REGLA MAESTRA — primero BS3, después lo demás

> Adoptada el 23/09/2026. Reemplaza la vieja "regla de oro" de que *todo excedente
> sin comprometer va al fondo*. Esa regla no funcionó nunca, y ahora se entiende por
> qué: **un excedente que se calcula a fin de mes no existe.** Siempre aparecen
> gastos en el medio. Medido con datos reales, el excedente verdadero es ~$0.

**El día de cobro, en este orden, sin excepción:**

1. **Diezmo.**
2. **Transferencia fija a MP dólares (BS3).** Ese mismo día, no a fin de mes.
3. Recién después se arma todo lo demás con lo que queda.

El ahorro no ocurre porque sobre: ocurre porque la plata **no está disponible**.

### El monto crece por etapas, no de golpe

| Etapa | Monto | Condición |
|---|---:|---|
| Hoy | **$80.000** | La baja de los débitos de Mirta — estructural |
| Después | **$160.000** | Llamadas hechas **y** dos ciclos sin delivery |
| Si se confirma | **$420.000** | Techo de Alimentación recalibrado con datos reales |

**Por qué no arranca en $160.000:** la baja de Mirta ($78.757) es estructural —dos
llamadas y desaparece—, pero el corte de delivery ($82.730) es conductual y depende
de cuatro personas todos los meses. Si el aporte fijo se programa antes de que la
plata exista, el faltante aterriza en la tarjeta: financiar el ahorro con deuda es
retroceder a BS2, el peor final posible. El aporte fijo tiene que ser **imposible de
fallar**; lo que se ahorre de más se transfiere a mano el mismo día.

### Reglas que sostienen esto

- Si el delivery reaparece, sale del **sobre de Comida**, nunca del aporte a BS3.
- El aporte no se suspende ni se reduce. Un mes salteado rompe el hábito, que es lo
  único que se está construyendo.
- La meta de $9.000.000 son "3 meses de gastos", no una cifra fija: **se recalcula
  una vez por año.** Que el fondo esté en dólares cubre casi todo el riesgo de
  inflación — eso ya estaba bien diseñado, no cambiarlo.

### Ritual mensual — 30 minutos el día de cobro

1. ¿Se hizo el aporte a BS3?
2. ¿Qué sobre se pasó? Se ajusta **ese solo**.
3. Se actualiza **un único número**: `fondo_bs3_usd` en la hoja Config.

No hace falta auditar categorías todas las semanas. Medir más no ahorra más.

---

## Ingresos

Ingreso neto mensual (actualizado 29/07/2026, reemplaza cifras anteriores):
$5.112.000. Cobro entre días 26-28, no más de 30 días entre cobros.

Junio y diciembre: aguinaldo (SAC), duplica o más el ingreso del mes.

Los presupuestos y reservas son referencias móviles, no cifras fijas. La inflación
argentina los modifica mes a mes. Siempre validar contra el resumen real de la
tarjeta antes de definir montos de reserva.

Diezmo: 10% del ingreso bruto → Asociación Civil Centro Familia y Vida (CUIT
30714829358, CVU 0000003100033712204323), por convicción cristiana, primera salida
del ciclo, siempre sin excepción.

Circuito del diezmo (mensual):
1. Transferir ~10% a Asociación Civil Centro Familia y Vida.
2. WhatsApp a Andrés Giudicci (tesorero de la iglesia): "Diezmo [Mes] [Año] $[monto]
   familia GASTRELL ZIEGLER".
3. Cargar como donación en SiRADIG F572 Web (AFIP/ARCA) → Deducciones y
   desgravaciones → Donaciones, sumando al acumulado anual.

---

## Ciclo financiero mensual (desde el 23/09/2026)

1. **Diezmo.**
2. **Aporte fijo a BS3** — ver REGLA MAESTRA arriba. Intocable, no figura nunca
   como "disponible".
3. Pagos fijos a terceros: Walter Simón, AySA, Candela Parodi, Cooperativa Santa
   Anita, Urunet (desde reservas).
4. Pago de tarjeta de crédito (5-10 días después del cobro), desde Pellegrini.
5. Resto del mes con los 5 sobres de MercadoPago.

---

## Familia Núcleo (los únicos que se analizan)

- Eduardo Franco Gastrell — titular MC BNA y Visa Galicia
- Romina Ziegler — adicional MC BNA y Visa Galicia
- Felipe Gastrell — hijo mayor
- Federico Gastrell — hijo menor (rugby Club GEI)

EXCLUIDOS SIEMPRE: SEGOVIA MIRTA ELENA y GASTRELL ALFREDO EDUARDO (padres de
Eduardo). Sus transacciones aparecen en los mismos resúmenes pero NUNCA deben
mezclarse con el análisis del Núcleo. Familia = "Padres" en el Sheet → siempre
excluir.

---

## Filosofía de uso de tarjeta de crédito

La TC se usa ÚNICAMENTE para:
1. Suscripciones en dólares (Claude, Make.com, Spotify, YouTube, etc.)
2. Débitos automáticos de servicios (luz, gas, agua, seguros, colegios)
3. Emergencias puntuales

Todo gasto diario se hace con reservas de MercadoPago. La TC funciona como débito
respaldado por reservas. Se paga FULL cada ciclo. NUNCA se paga el mínimo — las
tasas de financiación son destructivas.

Tarjetas cerradas: Visa Eminent, Mastercard Eminent y American Express Galicia —
todas canceladas para eliminar el cargo por servicio Eminent (~$83.000/mes).

---

## Sistema de reservas MercadoPago — 5 sobres (simplificado 23/09/2026)

Antes había 14 sobres, siete de ellos para desglosar débitos de la tarjeta
(Educación, Swiss Medical, Seguros, Servicios BsAs, Santa Anita, Suscripciones,
Cuotas). **Ese desglose no daba ninguna información: el resumen de la tarjeta ya
viene detallado.** Solo agregaba trabajo de mantenimiento.

| # | Sobre | Nota |
|---|---|---|
| 1 | **Alimentación** | Giro semanal, los lunes |
| 2 | **Vehículo + Transporte** | |
| 3 | **Salud + Hogar** | |
| 4 | **Comida y Entretenimiento** | De acá sale el delivery si reaparece |
| 5 | **Indumentaria** | |

**La tarjeta NO lleva sobre en MercadoPago.** El resumen se debita solo de la
cuenta sueldo — lo dice el propio resumen: *"Debitaremos de su c.ahorro
0002874447"*. Esa plata va en **Pellegrini** hasta el vencimiento: MP paga 17,5%
y Pellegrini 20,3%, así que sobre ~$2,9M durante 25 días la diferencia es
~$5.600/mes. Un sobre de TC en MP es plata quieta que además no paga nada.

Reserva Santa Anita (creada 28/07/2026): usada para retener el pago de Walter
Simón (~$130.000/mes) y de Urunet (~$35-43k/mes) hasta la transferencia manual
del día 1.

Fondo Pellegrini Renta Pesos (BNA): reemplazó a Brubank SBS Capital Plus (eliminado
28/07/2026). Respalda débitos automáticos, cuotas y suscripciones en USD de la TC.
Condición: el rendimiento debe igualar o superar la tasa de reserva en pesos de MP
(actualmente 18,1% vs 17,5% de MP). Rescate el día anterior al vencimiento de la TC.

Transferencias fuera de MP: Walter Fabián Simón (jardinero Santa Anita,
~$130.000/mes) y Urunet (cable Santa Anita, ~$35-43k/mes, transferencia manual
desde reserva Santa Anita).

---

## Infraestructura tecnológica

### Google Sheets
- Sheet ID: 15TzS_-VQazdA427n8S7H_FnPD5Fj0eDrRMuETIdNLgQ
- Hojas: Tarjetas | Tarjetas_backup | MercadoPago | Config
- Ciclo de corte: Anteúltimo jueves de cada mes (NO mes calendario)
- Columnas Tarjetas: Fecha | Cuenta | Medio | NroComprobante | Comercio |
  DescripcionRaw | Monto | Signo | Categoria | Subcategoria | Familia | Hormiga |
  Conciliado | Fuente | Nota | USUARIO | Hora | Cuotas | Ultimos4 | Ubicacion |
  TipoMovimiento
- Todos los escritos usan USER_ENTERED para el formato numérico correcto de
  Argentina (punto como separador de miles, coma como decimal; punto y coma en
  fórmulas de Sheets).

### Make.com
- Escenario: "CON CLAUDE - Automatizar correos consumo tarjeta → Google Sheets"
- Pipeline: Outlook → HTML Parser → 7 Text Parsers → Gemini Flash → Sheets
- Frecuencia: cada 15 minutos

### Python Scripts — C:\Users\eduar\Documents\BNA_Emails\
- procesar_resumenes_pdf.py v5.3 — PDFs MC BNA → Sheets
- recategorizar_comercios.py v2.2 — reglas de comercios (150+ entradas)
- deduplicar_tarjetas.py — deduplicación mixta
- procesar_mp_csv.py — CSV MercadoPago → Sheet MercadoPago
- calcular_presupuestos.py — promedios reales por categoría
- limpiar_montos.py v2, cargar_faltantes_mcbna.py,
  cargar_faltantes_ciclo_actual.py, generar_reglas_comercio.py,
  normalizar_acentos.py
- Credenciales: credenciales_google.json

### App Gazelle — DESARROLLO CONGELADO hasta terminar BS3

> Congelada el 23/09/2026. La app mide muy bien y no ahorra nada: el ahorro lo
> produce la transferencia del día de cobro, no el tablero. Seguir agregándole
> funciones es trabajo que se siente productivo y no mueve un peso a BS3.

**Hasta que BS3 esté completo, Gazelle hace solo tres cosas:**

1. Muestra el **% de BS3** y la fecha estimada de llegada.
2. Muestra el **saldo diario de Alimentación**.
3. Una vez por mes importa el PDF de MercadoPago y el resumen de la tarjeta.

**Filtro para cualquier tarea técnica nueva — una sola pregunta:**
*¿esto agrega plata a BS3 este mes?* Si la respuesta es no, va a Todoist
etiquetada **`post-BS3`** y no se discute más en la sesión.

Explícitamente congelados: corregir Make.com, montar `gws`, el Worker del asesor
Dave & Daniel, y cualquier función nueva. Los bugs que hagan **mentir** un número
sí se arreglan — una cifra falsa y optimista autoriza gasto, que es lo contrario
de ahorrar.

- URL: https://egastrell.github.io/gazelle-app
- Repo: github.com/egastrell/gazelle-app (index.html)
- Stack: HTML/CSS/JS plano, sin backend
- **Lectura del Sheet: endpoint `doGet` del Apps Script, NO la API de Google.**
  El Sheet está PRIVADO (solo Eduardo) y así tiene que quedarse. El web app
  corre con su permiso, así que lee sin que el archivo esté compartido.
  La URL `/exec` es el secreto: NO va al repo, se pega una vez por dispositivo
  en la app (Config → 🔌 Conexión con el Sheet) y queda en localStorage.
  La ruta vieja con clave de API sigue en el código como respaldo automático,
  pero solo funciona si el Sheet vuelve a ser público — no la uses.
  Al cambiar `Codigo.gs` hay que redesplegar: Implementar → Administrar
  implementaciones → editar → Nueva versión. La URL no cambia.
- Cloudflare Worker proxy (gazelle-asesor.efgastrell.workers.dev) en progreso
  para habilitar el advisor "Dave & Daniel" con la API de Anthropic. Mientras
  no exista, la tarjeta del asesor muestra un error — es esperado, no es un bug.

### Gestión de tareas
- Todoist: proyecto ID 6gqxvr6mf69CFpX3, sección Alta Prioridad
  6gqxvrJgM9PmX8h3
- Asana: proyecto ID 1216149831794461
- Ambos son espejo — toda tarea nueva va en los dos simultáneamente, sin
  excepción.
- Todoist usa dueString en lenguaje natural o ISO; Asana usa due_on:
  'YYYY-MM-DD'.

---

## Taxonomía de categorías

| Categoría | Presupuesto base | Subcategorías |
|-----------|-----------------|---------------|
| Alimentación | $820.000 | Supermercado, Panadería, Almacén/Kiosko, Carnicería,
  Verdulería |
| Salud | $580.000 | Farmacia, Medicina Prepaga, Médico/Hospital, Odontología,
  Óptica, Cuidado Personal |
| Servicios | $610.000 | Electricidad, Gas, Agua, Internet/Cable, Teléfono
  Móvil, Municipalidad, ARBA, Seguro |
| Educación | $290.000 | Colegio, Útiles/Material, Curso/Capacitación, Libros |
| Vehículo | $230.000 | Combustible, Mantenimiento, Seguro Automotor,
  Repuestos |
| Comida Fuera | $170.000 | Restaurante, Fast Food, Cafetería, Delivery,
  Heladería |
| Entretenimiento | $130.000 | Streaming, Videojuegos, Cine/Teatro,
  Salidas/Eventos, Juguetes |
| Indumentaria | $120.000 | Ropa Adultos, Ropa Niños, Calzado, Accesorios |
| Transporte | $60.000 | Transporte Público, Subte/SUBE, Taxi/Remis,
  Estacionamiento, Peaje |
| Compras Online | $60.000 | MercadoLibre, Tecnología, Shein/Temu, Otros Online |
| Hogar | $60.000 | Ferretería, Materiales, Electrodomésticos, Decoración |
| Diezmo | 10% ingreso | — |
| Banco | — | Cargo, Comisión, Bonificación, Devolución, Ajuste |
| Pago Tarjeta | — | Pago Tarjeta |
| Otros | — | Pendiente identificar |

Todos los presupuestos son referencias móviles ajustables por inflación.

---

## Reglas de Hormiga

Hormiga = S: PedidosYa/delivery, fast food, taxi/Cabify, Shein/Temu, heladería,
vivero, juguetería, kiosco/almacén, panadería, accesorios, ropa no urgente,
salidas/eventos, churros, helado.

Hormiga = N: Supermercado, combustible, servicios, salud, seguros, educación,
transporte público, streaming, farmacia.

---

## Reglas de comercios conocidos

- CODIGAS / FEYME / GNG DEL OESTE → Vehículo / Combustible
- CENTRAL OESTE → Salud / Farmacia
- CASTELAR SOLAMENTE / NSS*CASTELAR → Alimentación / Supermercado
- CHARADIA MATERIALES / ROPELATO → Hogar / Materiales
- CLUB GEI / CLUB DE GIMNASI → Entretenimiento / Salidas/Eventos
- BONIF EMP BNA → Banco / Bonificación (Signo E, negativo)
- PROMO TRANSPORTE MC / TRANSP BENEFICIO BNA → Banco / Devolución
- MERPAGO*MELI / MERPAGO*MELIMAS → Banco / Comisión (suscripción ML)
- NAC SE18/ / NACION18/ → Servicios / Seguro (hogar Nación Seguros)
- PROVINCIA SEGU / PROVAU40/ → Vehículo / Seguro Automotor
- ZURICH / ZURICH26/ → Servicios / Seguro (vida — Zurich Invest Future)
- PAGOS360*COOPSANTA → Servicios / Electricidad (luz Santa Anita)
- SIRO*URUNET INTERN → Servicios / Internet/Cable (Santa Anita)
- DPRBAIN101092302 → Servicios / ARBA Inmobiliario (PBA)
- AYSASADA → Servicios / Agua (AySA)
- EDENORDA → Servicios / Electricidad (Edenor BsAs)
- GAS NATU07211826 → Servicios / Gas (Eduardo — BsAs)
- GAS NATU00206947 → Servicios / Gas (Mirta — ERROR en TC Eduardo, excluir y dar
  de baja)
- COLEGIO 00011869 → Educación / Colegio (Belgrano — Felipe)
- COLEGIO MORDERNO ITUZ → Educación / Colegio (Makey — Federico)
- CLARO DA → Servicios / Teléfono Móvil
- SWISS MEDICAL → Salud / Medicina Prepaga
- DLO*LEGUILAB → Salud / Cuidado Personal (suplementos)
- VER / TOPYED / ANISS / COPPEL → Indumentaria / Ropa Adultos
- CHEEKY SHOPPING SOLEY → Indumentaria / Ropa Niños
- FARICCI → Comida Fuera / Heladería (Hormiga S)
- ARDENTE / CHEKA → Comida Fuera / Restaurante
- WHOP*AUTOMATIZA / WWW.MAKE.COM → Entretenimiento / Streaming
- TROPEA → Indumentaria / Accesorios (Hormiga S)
- EMOVA SUBTE / SUBE VIAJES → Transporte / Subte/SUBE
- MERPAGO*OPEN25 → Entretenimiento / Streaming
- WALTER FABIAN SIMON → Servicios / Jardinería Santa Anita (transferencia
  directa ~$130.000/mes, NO en TC)
- MATIAS ALEJANDRO GOMEZ → Alimentación / Almacén (Hormiga S — solo urgencias)
- HUA YUN ZHENG → Alimentación / Supermercado (super chino)
- DEBORA DANIELA CORTEZ → Hogar / Ferretería

---

## Débitos automáticos — Estado de migración a MC BNA

Migrados y activos en TC: Zurich, Claro x2, ARBA Inmobiliario, Gas Natural
Eduardo, AySA, Swiss Medical, NAC SE18, Provincia Seguros, Edenor x2, Colegio
Belgrano, Colegio Moderno Ituzaingó, Cooperativa luz Santa Anita, Urunet, Club
GEI.

PENDIENTE: Municipalidad Morón (partida 101-092302).

ERROR a corregir: Gas Mirta (GAS NATU00206947) mal cargado en la TC de Eduardo —
dar de baja y migrar a nombre de Mirta.

NO migrar nunca: servicios/tarjetas de los Padres (Mirta y Alfredo).

---

## Personas clave externas

- Romina Olivar — ayuda con portal Zurich autogestión
- Walter Fabián Simón — jardinero Santa Anita (~$130.000/mes, transferencia)
- Candela Parodi — profesora de música de Felipe
- Andrés Giudicci — tesorero de la iglesia, recibe el aviso mensual de diezmo

---

## Preferencias de trabajo

- Acción autónoma: completar tareas (incluyendo marcar Todoist/Asana) sin pedir
  confirmación previa para operaciones de bajo riesgo. Para acciones que muevan
  dinero real o modifiquen trámites impositivos, confirmar antes de ejecutar.
- Sin halagos: directo, claro, conciso. Sin ser condescendiente.
- Ediciones quirúrgicas en código (index.html): inyectar cambios, no reescribir
  el archivo completo.
- Archivos completos cuando se entregan para copiar/reemplazar.
- Mobile-first: muchas veces Eduardo trabaja desde el celular.
- Automatizar todo: si algo se puede automatizar, se automatiza.
- Foco en el objetivo: Santa Anita y libertad financiera.
- Locale Argentina: fórmulas Google Sheets con punto y coma (;). Montos con
  punto como separador de miles y coma para decimales.
- Toda tarea nueva creada va simultáneamente en Todoist y Asana, nunca en una
  sola.

---

## Principios que guían el proyecto

"Vivir como nadie hoy para poder vivir como nadie mañana." — Dave Ramsey

"El dinero es una herramienta, no un fin. El fin es la vida que Dios diseñó
para tu familia." — Daniel González

"El rico gobierna al pobre; el que pide prestado es esclavo del que presta." —
Proverbios 22:7

---

## Sesión 03-04/09/2026 — Hallazgos y trabajo en curso

Contexto para cualquier sesión de Claude que retome este proyecto: esto es lo que se
encontró y se hizo en la sesión del 3 y 4 de septiembre de 2026. Varios ítems quedaron
listos en código/scripts pero pendientes de que Eduardo los ejecute desde su PC
(Apps Script no se puede correr desde el celular ni desde esta sesión — solo lectura
del Sheet vía Google Drive, sin permiso de escritura).

### Ya mergeado en producción (github.com/egastrell/gazelle-app, rama main)

- **PR #2:** este archivo CLAUDE.md.
- **PR #3:** Cloudflare Worker (`cloudflare-worker.js`) para el asesor Dave & Daniel.
  Falta que Eduardo cree la cuenta en Cloudflare, pegue el archivo y cargue el secret
  `ANTHROPIC_API_KEY`. URL esperada: `gazelle-asesor.efgastrell.workers.dev`.
- **PR #4:** en `index.html` — `gastosUnificados()` ahora ordena por fecha, y
  `gastosReales()` excluye `moneda==='USD'` de todos los totales en pesos (antes un
  cargo de US$20 se sumaba como $20 pesos). Nueva tarjeta en Resumen muestra el total
  en USD del ciclo aparte, sin mezclar. La detección de moneda funciona por texto
  `(...,USD,...)` o por comercios conocidos (Claude, ChatGPT, Google One, Make.com)
  aunque la columna "Moneda" del Sheet todavía no exista.

### Bug crítico confirmado: 241 filas duplicadas en el Sheet, $4.686.973 de más

> **Corregido el 05/09/2026.** La cifra original de esta sección era "113 filas /
> $3.201.416", calculada con una detección que comparaba el Comercio por igualdad
> exacta. Verificado contra el historial completo: así se detectaban solo **5 de 243
> pares reales**, porque el texto de Email y el de PDF no coinciden nunca al carácter
> (el de email trae un espacio final — `"DIA TIENDA 5331 "` — y el PDF antepone el
> adquirente — `"MERPAGO*MBONAERENSES"` vs `"MBONAERENSES"`). Normalizando y comparando
> por contención, la cifra real es **241 pares / $4.686.973,45**.

El pipeline carga cada gasto dos veces: una vez por el email en tiempo real (Fuente=Email,
NroComprobante=0) y otra vez cuando se procesa el PDF del resumen (Fuente=PDF, comprobante
real). Cuando ambas versiones coinciden en Fecha+Monto+Signo y el Comercio matchea
normalizado, la de Email sobra. Confirmado con Eduardo: el PDF manda siempre, la de
Email se borra. Afecta a TODO el historial, no solo un mes — ej. julio 2026 solo, el
Sheet mostraba $4.892.721 contra $2.957.521 reales del PDF.

**Causa raíz encontrada el 05/09/2026:** además del doble pipeline, `moverAProcesadas_`
podía dejar el archivo en la carpeta original (Drive no garantiza el orden de
`getParents()`), y el trigger lo reprocesaba cada 6 horas generando más duplicados.
Corregido en `automation/apps_script/Codigo.gs`.

### Bug corregido (parcial): USUARIO mal asignado en tarjeta de Romina

29 filas con Ultimos4=1343 (tarjeta de Romina); 22 estaban mal etiquetadas como
GASTRELL EDUARDO FRANCO. **Ya corregido y confirmado 100% en el Sheet** (corrida
manual de Eduardo, verificado leyendo el Sheet: las 29 dicen ZIEGLER ROMINA EMIL).

### Categorización: comercios nuevos identificados (confirmados por Eduardo)

- MBONAERENSES → Alimentación / Supermercado
- MERPAGO*DAMIANAELIZAB → Salud / Médico/Hospital (psicóloga de los chicos)
- MERPAGO*FOGGIASHOW → Entretenimiento / Salidas/Eventos (recital banda Petra)
- MERPAGO*MARIADELROSAR → Hogar / Decoración (ceramista de Santa Anita)
- QUONDAM (y sus cuotas) → Educación / Libros (librería feria del libro, La Rural)
- SIPAGO*FUNDACION → Transporte / Estacionamiento (estacionamiento en La Rural)
- MERPAGO*GRUPOPLANETA → Educación / Libros (feria del libro)
- DLO*Gaelle → Indumentaria / Calzado (zapatillas marca Gaelle)
- DLO*DiDi → Transporte / Taxi/Remis (app de viajes)
- MERPAGO*MERCADOLIBRE en "Otros" → Compras Online / MercadoLibre (regla ya existía,
  nunca se había aplicado a las filas viejas)

Quedaron sin identificar (montos chicos, no vale la pena seguir): STONE SA,
TRADE VISIONS GROUP, MERPAGO*HOLY, ELI S.A, MERPAGO*LAARGENTINA, MERPAGO*POLGRAFSH,
MERPAGO*MICROPAY, MUNDOVENDINGTU, GOOGLE*CLOUD (dos cargos ínfimos).

Hallazgo aparte sin resolver: 120 filas con Ultimos4="1234" (Mastercard BNA), repartidas
entre Eduardo y Romina — parece un valor placeholder, no un número de tarjeta real.
No se tocó, falta investigar la causa.

### Fraude con tarjeta (Filipinas/Boracay, junio 2026) — investigado a fondo

Ya reportado al banco por Eduardo. Auditoría completa cruzando los PDFs reales de
julio y agosto 2026 (no solo el Sheet):
- 15 cargos ($346) confirmados revertidos a favor.
- **$10,88 (TGH GRILLHOUSE BORACAY, cupón 00796, 26/06)**: investigación cerrada el
  23/07 SIN crédito — quedó a cargo de Eduardo. Necesita apelar.
- **4 cargos ($92,57 total, todos del 25/06)**: segunda instancia de investigación
  abierta el 29/06, sigue sin resolución en el resumen del 20/08 (2+ meses).
Se le dio a Eduardo un guión de llamada con los datos exactos (cupones, montos,
fechas) para reclamar ambos casos. Estado de la llamada: no confirmado en este chat.

### Scripts de limpieza del Sheet — AHORA VIVEN EN EL REPO

> **Actualizado el 05/09/2026.** Esta sección contenía una copia completa del código
> de los scripts. Esa copia quedó OBSOLETA y con bugs confirmados, así que se
> eliminó para que ninguna sesión futura la use como fuente. **La única fuente de
> verdad es `automation/apps_script/Codigo.gs` en este repo.**
>
> Bugs que tenía la copia vieja y que ya están corregidos en el repo:
> - `encontrarDuplicados_` comparaba Comercio por igualdad exacta → detectaba 5 de
>   243 pares reales.
> - El total de `previsualizarDuplicados()` usaba `String(monto).replace(/\./g,'')`,
>   que sobre una celda numérica (8389.41) devuelve 838941 — **100x inflado**. Era el
>   número con el que se decidía si borrar 241 filas.
> - La clave de agrupación usaba valores crudos: un mismo gasto guardado como número
>   en una fila y como texto `"8.389,41"` en otra nunca se detectaba como duplicado.
>   (La columna Monto tiene 3.073 celdas numéricas y 526 de texto.)
> - Sin guarda contra Comercio vacío: `"".indexOf('')` es 0, así que una fila en
>   blanco matcheaba con cualquier otra del mismo día y monto, y se borraba un gasto real.

Todos operan sobre el Sheet `15TzS_-VQazdA427n8S7H_FnPD5Fj0eDrRMuETIdNLgQ`, hoja
"Tarjetas". Se corren desde Extensiones > Apps Script, en este orden:

1. `corregirTodo()` — aplica las reglas de categorización de la lista de arriba (61 filas).
2. `agregarColumnaMoneda()` — crea la columna "Moneda" y la completa (ARS/USD), sin tocar montos.
3. `ordenarPorFecha()` — reordena las filas por Fecha ascendente.
4. `previsualizarDuplicados()` — muestra en el log qué filas de Email se borrarían, sin borrar nada.
5. `eliminarDuplicados()` — recién después de revisar ese log.

**Hacer una copia del Sheet antes del paso 5** (Archivo > Hacer una copia): es lo único
irreversible de la lista.

### Pendiente de Eduardo (no ejecutable por Claude sin PC/teléfono)

- Correr los 5 scripts de arriba.
- Pegar el prompt corregido de Gemini en Make.com (incluye reglas de USUARIO y Moneda).
- Crear cuenta en Cloudflare y completar el setup del Worker (PR #3).
- Llamar al banco por el fraude ($10,88 + $92,57 sin resolver).
- Migrar débito Municipalidad Morón, dar de baja Gas Mirta (llamadas telefónicas).
- Presupuesto de Walter para el techo de la galería en Santa Anita.

---

## Sesión 05/09/2026 — Auditoría completa y principio de frescura de datos

Se auditó todo el sistema con tres pasadas en paralelo (Apps Script, matemática de
index.html, y consistencia entre fuentes). Se encontraron ~20 errores y **todos, sin
excepción, empujaban en la misma dirección: mostrar más margen de gasto del real.**

### El hallazgo de fondo: la app no sabía qué tan viejo era su propio dato

La hoja MercadoPago no tenía un movimiento nuevo desde el **30/04/2026** (128 días), y
como el gasto diario del Núcleo va por reservas de MP, la app igual mostraba
"Alimentación: $0 gastado, podés gastar $44.667/día". El número era falso y parecía
confiable. Eso explica el síntoma que Eduardo venía reportando: el excedente nunca se
transferí­a porque "hubo gastos en el medio" — el sistema autorizaba gasto fantasma.

**Regla nueva, permanente: todo dato viaja con su edad, y si supera los 7 días el
sistema dice que no sabe en vez de estimar.** Implementado en index.html (banner +
estado por fuente + el ritmo por categoría se reemplaza por el aviso) y en Codigo.gs
(manda un mail de "faltan datos" en vez de números, como mucho una vez por semana).
No romper esto: es lo único que hace que la guía diaria sea confiable.

### Correcciones aplicadas (ver commit ac556f8)

- El motor de ritmo sumaba solo Tarjetas; ahora suma **Tarjetas + MercadoPago**.
- La columna Monto tiene **3.073 celdas numéricas y 526 de texto** ("8.389,41").
  `parseFloat` devolvía 8,389 — mil veces menos. Se parsea con formato argentino.
- **`Familia='Padres'` no se leía en ningún lado**, pese a estar mandado en este
  archivo: 197 filas y $4.009.227 históricos de Mirta y Alfredo se contaban como gasto
  del Núcleo ($2,3M solo en Servicios). Ya se excluye en las dos fuentes.
- Ciclo y días a medianoche + excepción de cierre de junio 2026: el script informaba
  2 días de más que la app y el jueves de cierre saltaba de ciclo antes.
- El ritmo semanal se topea con lo que queda del techo.
- Se eliminó `calcularSaldoTarjeta()`/`renderDeuda()`: restaban pagos al consumo
  histórico completo, daban $10M y $45M de deuda inexistente y pisaban la tarjeta del
  fondo BS3 (escribían en los mismos ids y corrían después de `renderMiPlan()`).

### Los techos están inflados y hay que recalibrarlos

`TECHOS_BS3` se calibró con "promedio real Marzo-Junio 2026". Esa ventana está
**inflada 17% por los duplicados** ($3.673.741 de $21.577.332) y además incluye
$478.607 de gastos de los padres. Los techos reales deberían rondar los **$2.692.000**
en vez de $3.150.000: unos **$458.000/mes de permiso de gasto que nunca existió**.

**No recalibrar hasta haber corrido la limpieza** (`corregirTodo` → `agregarColumnaMoneda`
→ `ordenarPorFecha` → `previsualizarDuplicados` → `eliminarDuplicados`).

### CONTRADICCIONES SIN RESOLVER — no elegir una sin preguntarle a Eduardo

1. **Ingreso.** Este archivo dice neto $5.112.000 y que el diezmo es 10% del **bruto**.
   El Sheet tiene `ingreso_mes_actual = 4.917.837,60`, derivado de dividir el diezmo de
   agosto por 0,10 — o sea un número bruto usado por la app como plata gastable. Los dos
   no pueden ser correctos. Peor: la derivación es **circular** (el diezmo sale del
   ingreso y el ingreso se recalcula del diezmo) y **amplifica ×10** cualquier error de
   OCR. Lo correcto sería cargar el neto del recibo y derivar el diezmo de ahí, nunca al
   revés. **Pendiente de que Eduardo confirme su neto real de bolsillo.**
2. **Techos por categoría.** La tabla "Presupuesto base" de este archivo y `TECHOS_BS3`
   en el código difieren hasta en $230.000 por categoría (desviación acumulada $940.000);
   los totales cierran solo por compensación de errores.
3. ~~**Meta BS3.**~~ **RESUELTA (16/09/2026):** manda el Sheet, $9.000.000. Las
   cifras salieron de este archivo.
4. ~~**Fondo BS3.**~~ **RESUELTA (16/09/2026):** Config quedó en **US$ 2.992,32**,
   el saldo real. Los US$ 3.997,49 que tenía eran de ANTES de pagar el techo de
   Santa Anita (~US$ 1.005), así que la app mostraba $1.550.563 de más y un 68%
   de la meta cuando el real es 51%. La cotización ya no se lee de Config: sale
   en vivo de dolarapi (MEP).

**Fuente única de verdad acordada: el Sheet (hoja Config para parámetros, Tarjetas
deduplicada para hechos).** Este archivo debe quedar como metodología sin cifras; el
código no debería tener números hardcodeados. Mientras eso no se haga, cualquier
sesión que lea cifras de acá puede estar trabajando con datos contradictorios.

### Lo que falta para que la guía diaria funcione de verdad

El código ya es honesto, pero hoy dice "no sé" porque MercadoPago no tiene datos.
`procesar_mp_csv.py` es manual y por eso no pasa. **Camino propuesto: extender el
escenario de Make.com (que ya parsea los mails de consumo de la tarjeta cada 15
minutos) a los mails de MercadoPago.** Misma infraestructura, ya paga, y daría el
gasto diario en near-real-time sin intervención de Eduardo.

---

## Sesión 15-16/09/2026 — La app dejó de necesitar que el Sheet sea público

### El Sheet ya no se lee con clave de API

La app dejó de sincronizar: Google devolvía **403 PERMISSION_DENIED** porque el
Sheet ya no estaba compartido como "cualquiera con el enlace". Verificado que la
clave estaba sana (leía un Sheet público de Google con HTTP 200) y que el Sheet
tenía datos: faltaba solo el permiso.

Reponerlo arreglaba el síntoma y dejaba el problema de fondo: `index.html` vive en
un repo **público** con la clave de API y el ID del Sheet escritos adentro.
Cualquiera que abriera el repo podía leer el historial financiero completo.

**Se cambió el camino de lectura** (ver "App Gazelle" arriba). El Sheet quedó
privado. Que no vuelva a compartirse: ya no hace falta.

### Alimentación se gira por semana, no por mes

$210.000 cada lunes ($30.000/día). Con el mes entero en el sobre, el sobre se
gasta y no hay señal hasta que no queda nada.

El número del día **no sale del Sheet**: sale del saldo del sobre en MercadoPago
que carga Eduardo, dividido por los días hasta el próximo giro. La hoja MP llega
con meses de atraso, así que un ritmo calculado sobre ella siempre daría de más.
El número se topea en la referencia diaria: si sobró de la semana anterior eso es
ahorro, no permiso, y se muestra aparte como excedente que va a BS3.

El recordatorio del giro (mail de los lunes) sale **antes** del corte por frescura
a propósito: es una fecha y un monto fijo, no depende de que el Sheet esté al día.

### Números hardcodeados que mentían — patrón a vigilar

Tres lugares distintos mostraban cifras que no salían de ningún cálculo. Todos
empujaban en la misma dirección: hacer parecer que había más plata.

- La tarjeta verde del Resumen felicitaba ("solo usaron el 36%") con MercadoPago
  139 días atrasado. Ahora se calla y dice qué falta si una fuente venció.
- El "% del ingreso" de cada persona se medía contra un `INGRESO_BASE` clavado en
  $3.800.000.
- **"Tu capacidad de pago" era HTML fijo de una maqueta**: las cuatro líneas eran
  texto literal. La única que se calculaba lo hacía contra `gazelle_para_tarjetas`,
  una clave de localStorage que no se setea nunca y vale 0 — daba el total de la
  tarjeta en rojo como si no hubiera con qué pagarla.

**Al auditar la app, buscar números que se ven pero no se calculan.** Un dato de
menos se nota; una cifra inventada que además es optimista, no.

### `gws` — el CLI oficial de Google Workspace (pendiente, alto valor)

`npm i -g @googleworkspace/cli` (verificado v0.22.5). Tiene escritura real sobre
Sheets: `gws sheets spreadsheets values update / batchUpdate / append / clear`,
con `valueInputOption` (el USER_ENTERED que necesita el formato argentino).

Importa porque **el cuello de botella del proyecto nunca fue conocimiento sino
acceso de escritura**: cada limpieza termina en "pegá esto en Apps Script y dale
▶". Con `gws` autenticado eso se hace directo.

Requiere proyecto en GCP + OAuth (~20 min, una vez) y **solo rinde en la PC de
Eduardo**: las sesiones remotas de Claude corren en contenedores efímeros, así que
la autenticación no sobrevive de una sesión a la otra, y pasarle credenciales OAuth
por chat no es aceptable.

El registro de skills de `skills.sh` está bloqueado por el proxy de red; el repo
`vercel-labs/skills` es solo la CLI, no un catálogo. La skill `google-apps-script`
de `jezweb/claude-skills` existe pero **no cubre despliegue como web app ni
`doGet`** — no sirvió para esta sesión.

### Cosas menores detectadas y NO tocadas

- La pestaña "Gastos prohibidos" dice "bloqueados hasta eliminar todas las deudas"
  (BS2 terminó en mayo 2026) y lista los 7 ítems como "Libre ✓", incluido Delivery
  — que Eduardo decidió cortar ($82.730/mes en PedidosYa).
- Visa Galicia sigue en la proyección de pagos aunque la cuenta esté cancelada.
- El proyecto de Apps Script se llama "Proyecto sin título" y su URL es de
  `/home/projects/`, lo que sugiere que podría ser standalone y no vinculado al
  Sheet. `doGet` funciona igual porque usa `openById`, pero las funciones que usan
  `getActiveSpreadsheet()` fallarían. **Verificar antes de correr las utilidades
  de limpieza o de confiar en los triggers.**
