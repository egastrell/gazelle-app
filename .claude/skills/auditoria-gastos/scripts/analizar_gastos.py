#!/usr/bin/env python3
"""
Analiza la hoja "Tarjetas" del proyecto Gazelle en busca de ahorros:
duplicados de carga, subas de precio, y cargos de Familia=Padres mal
ruteados. Ver ../SKILL.md para cómo obtener el archivo de entrada.

Uso:
    python3 analizar_gastos.py <archivo_sheet> [--categoria "Servicios"] [--meses 12]

<archivo_sheet> puede ser:
  - el .txt/.json que el tool download_file_content guarda automáticamente
    cuando el resultado excede el límite de tokens (formato {"content": "<base64 csv>", ...})
  - un CSV crudo (si se le pasa un export ya decodificado)
"""

import argparse
import base64
import csv
import io
import json
import sys
from collections import defaultdict
from datetime import datetime

PADRES_NOMBRES = ["SEGOVIA MIRTA ELENA", "GASTRELL ALFREDO EDUARDO"]
JUMP_THRESHOLD = 0.15  # 15% de suba dispara el flag
FRESHNESS_RATIO = 0.5  # si el mes reciente tiene <50% del promedio anterior, se marca incompleto


def cargar_filas(path):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    # Intento 1: JSON con {"content": "<base64 csv>"} (formato de download_file_content)
    try:
        data = json.loads(raw)
        if isinstance(data, dict) and "content" in data:
            csv_text = base64.b64decode(data["content"]).decode("utf-8")
        else:
            raise ValueError("JSON sin campo 'content'")
    except (json.JSONDecodeError, ValueError):
        # Intento 2: es CSV crudo
        csv_text = raw

    csv.field_size_limit(10_000_000)
    reader = csv.DictReader(io.StringIO(csv_text))
    return list(reader), reader.fieldnames


def parse_monto(s):
    if not s:
        return 0.0
    s = s.strip()
    neg = s.startswith("(") and s.endswith(")")
    s = s.strip("()")
    s = s.replace(".", "").replace(",", ".")
    try:
        v = float(s)
    except ValueError:
        return 0.0
    return -v if neg else v


def parse_fecha(s):
    try:
        return datetime.strptime(s.strip(), "%d/%m/%Y")
    except (ValueError, AttributeError):
        return None


def mes_key(d):
    return (d.year, d.month)


def mes_label(k):
    meses = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    return f"{meses[k[1]]}/{k[0]}"


def detectar_duplicados(filas):
    """Mismo Fecha+Monto redondeado, pero distinto Fuente o Comercio parecido.
    Esto es un error de carga en la Sheet (Email/PDF/Manual duplicados), no un cobro doble real.
    """
    por_clave = defaultdict(list)
    for r in filas:
        m = parse_monto(r.get("Monto", ""))
        if m == 0:
            continue
        clave = (r.get("Fecha", "").strip(), round(m, 0))
        por_clave[clave].append(r)

    hallazgos = []
    for (fecha, monto), grupo in por_clave.items():
        if len(grupo) < 2:
            continue
        comercios = set(x.get("Comercio", "").strip() for x in grupo)
        fuentes = set(x.get("Fuente", "").strip() for x in grupo)
        if len(comercios) > 1 or len(fuentes) > 1:
            hallazgos.append(
                {
                    "fecha": fecha,
                    "monto": monto,
                    "filas": [(x.get("Comercio", "").strip(), x.get("Fuente", "").strip()) for x in grupo],
                    "filas_obj": grupo,
                }
            )
    return hallazgos


def filas_sobrantes_por_duplicado(hallazgos_dup):
    """Devuelve el set de id() de las filas 'de más' en cada grupo duplicado, para
    excluirlas de cálculos de tendencia/run-rate (si no, un duplicado en el período
    viejo infla ese promedio y esconde una suba real, o al revés). Se queda con la
    fila de Fuente=PDF (el PDF manda siempre, por convención del proyecto); si no hay
    PDF en el grupo, se queda con la primera y descarta el resto."""
    sobrantes = set()
    for h in hallazgos_dup:
        grupo = h["filas_obj"]
        pdf = [r for r in grupo if (r.get("Fuente", "") or "").strip() == "PDF"]
        conservar = pdf[0] if pdf else grupo[0]
        for r in grupo:
            if r is not conservar:
                sobrantes.add(id(r))
    return sobrantes


def detectar_padres_mal_ruteados(filas):
    """Filas donde USUARIO es de la familia Padres pero Familia no dice 'Padres'."""
    hallazgos = []
    for r in filas:
        usuario = (r.get("USUARIO", "") or "").strip().upper()
        familia = (r.get("Familia", "") or "").strip()
        if familia == "Padres":
            continue
        if any(nombre in usuario for nombre in PADRES_NOMBRES):
            hallazgos.append(r)
    return hallazgos


def detectar_subas_precio(filas):
    """Compara el promedio mensual de la primera vs segunda mitad del período
    observado, agrupado por Subcategoria (NO por Comercio: muchos débitos
    automáticos —Zurich, Edenor, Claro, Gas Natural— cambian el número de
    comprobante en el texto del Comercio cada mes, así que agrupar por comercio
    exacto pierde la recurrencia)."""
    por_subcat = defaultdict(list)
    for r in filas:
        d = parse_fecha(r.get("Fecha", ""))
        m = parse_monto(r.get("Monto", ""))
        if not d or m <= 0:
            continue
        subcat = r.get("Subcategoria", "").strip()
        if not subcat:
            continue
        por_subcat[subcat].append((d, m, r.get("Comercio", "").strip()))

    hallazgos = []
    for subcat, eventos in por_subcat.items():
        eventos.sort(key=lambda x: x[0])
        # Se compara el total mensual del primer vs segundo tramo del período
        # observado (mitad y mitad de los meses con datos), no "los últimos 3
        # meses" a fecha fija: varios débitos automáticos (seguros, sobre todo)
        # no caen todos los meses en la misma fecha, y un mes sin cobro en la
        # ventana fija arruina el promedio y esconde subas reales.
        totales_mes = defaultdict(float)
        for d, m, _ in eventos:
            totales_mes[mes_key(d)] += m
        meses_unicos = sorted(totales_mes.keys())
        if len(meses_unicos) < 6:
            continue
        mid = len(meses_unicos) // 2
        anteriores_keys = set(meses_unicos[:mid])
        recientes_keys = set(meses_unicos[mid:])
        anteriores = [totales_mes[k] for k in anteriores_keys]
        recientes = [totales_mes[k] for k in recientes_keys]
        avg_r = sum(recientes) / len(recientes)
        avg_a = sum(anteriores) / len(anteriores)
        if avg_a <= 0:
            continue
        delta = (avg_r - avg_a) / avg_a
        if delta >= JUMP_THRESHOLD:
            # comercio que más pesa en la ventana reciente, para dar contexto
            pesos_recientes = defaultdict(float)
            for d, m, com in eventos:
                if mes_key(d) in recientes_keys:
                    pesos_recientes[com] += m
            top_comercio = max(pesos_recientes.items(), key=lambda x: x[1])[0] if pesos_recientes else ""
            hallazgos.append(
                {
                    "comercio": top_comercio,
                    "subcategoria": subcat,
                    "promedio_anterior": avg_a,
                    "promedio_reciente": avg_r,
                    "delta_pct": delta * 100,
                    "delta_monto": avg_r - avg_a,
                }
            )
    hallazgos.sort(key=lambda h: -h["delta_monto"])
    return hallazgos


def chequear_frescura(filas):
    """Devuelve (meses_incompletos, promedio_previo) si los últimos 1-2 meses
    muestran mucho menos gasto que el promedio anterior."""
    totales = defaultdict(float)
    for r in filas:
        d = parse_fecha(r.get("Fecha", ""))
        if not d:
            continue
        totales[mes_key(d)] += parse_monto(r.get("Monto", ""))

    if len(totales) < 4:
        return [], 0

    meses_ordenados = sorted(totales.keys())
    ultimos = meses_ordenados[-2:]
    previos = meses_ordenados[-5:-2] if len(meses_ordenados) >= 5 else meses_ordenados[:-2]
    if not previos:
        return [], 0
    avg_previo = sum(totales[m] for m in previos) / len(previos)
    incompletos = [m for m in ultimos if avg_previo > 0 and totales[m] < avg_previo * FRESHNESS_RATIO]
    return incompletos, avg_previo


def resumen_por_grupo(filas, agrupar_por):
    grupos = defaultdict(lambda: {"total": 0.0, "count": 0, "comercios": defaultdict(float)})
    for r in filas:
        m = parse_monto(r.get("Monto", ""))
        clave = r.get(agrupar_por, "").strip() or "(sin clasificar)"
        grupos[clave]["total"] += m
        grupos[clave]["count"] += 1
        grupos[clave]["comercios"][r.get("Comercio", "").strip()] += m
    return grupos


def fmt(n):
    return f"${n:,.0f}".replace(",", ".")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("archivo_sheet")
    ap.add_argument("--categoria", default=None, help="Filtra por Categoria exacta (ej: Servicios). Si se omite, analiza todas.")
    ap.add_argument("--meses", type=int, default=12, help="Ventana de meses hacia atrás para el resumen (default 12).")
    args = ap.parse_args()

    filas, columnas = cargar_filas(args.archivo_sheet)
    if not filas:
        print("No se pudieron leer filas del archivo. Verificá el formato de entrada.")
        sys.exit(1)

    total_filas = len(filas)
    nucleo = [r for r in filas if (r.get("Familia", "") or "").strip() != "Padres"]
    excluidas_padres = total_filas - len(nucleo)

    if args.categoria:
        objetivo = [r for r in nucleo if (r.get("Categoria", "") or "").strip().lower() == args.categoria.lower()]
    else:
        objetivo = nucleo

    # Filas sin Fecha parseable (encabezados de otra hoja arrastrados, filas vacías)
    # se descartan acá de una vez; el resto del script asume Fecha válida.
    objetivo = [r for r in objetivo if parse_fecha(r.get("Fecha", ""))]
    fechas = [parse_fecha(r.get("Fecha", "")) for r in objetivo]
    if not fechas:
        print(f"No hay filas para la categoría '{args.categoria}'. Revisá el nombre exacto (case-sensitive en el Sheet, no en este filtro).")
        sys.exit(1)

    if args.meses:
        # ventana simple: quedarse con filas de los últimos N meses calendario
        meses_validos = set(sorted(set(mes_key(d) for d in fechas))[-args.meses:])
        objetivo_ventana = [r for r in objetivo if mes_key(parse_fecha(r.get("Fecha", ""))) in meses_validos]
    else:
        objetivo_ventana = objetivo

    print(f"=== AUDITORÍA DE GASTOS: {args.categoria or 'TODAS LAS CATEGORÍAS'} ===")
    print(f"Filas totales en Tarjetas: {total_filas} | excluidas por Familia=Padres: {excluidas_padres}")
    print(f"Filas analizadas: {len(objetivo_ventana)} | rango: {min(fechas).strftime('%d/%m/%Y')} - {max(fechas).strftime('%d/%m/%Y')}")
    print()

    # --- Frescura de datos ---
    incompletos, avg_previo = chequear_frescura(objetivo_ventana)
    if incompletos:
        etiquetas = ", ".join(mes_label(m) for m in incompletos)
        print(f"⚠ DATOS RECIENTES POSIBLEMENTE INCOMPLETOS ({etiquetas}): muy por debajo del promedio de meses previos ({fmt(avg_previo)}/mes).")
        print("  No uses esto como señal de que bajó el gasto — probablemente falta procesar el PDF del ciclo.")
        print()

    # --- Hallazgos ---
    dup = detectar_duplicados(objetivo_ventana)
    padres = detectar_padres_mal_ruteados(objetivo_ventana)

    # Meses incompletos y filas duplicadas distorsionan la comparación de tendencias
    # (un mes a medio cargar parece una baja de precio; un duplicado en el período
    # viejo infla ese promedio y esconde una suba real) — se excluyen ambos del
    # cálculo de subas y run-rate, pero no de la detección en sí: los duplicados y
    # los mal ruteados son errores puntuales que hay que mostrar igual, estén donde estén.
    incompletos_set = set(incompletos)
    sobrantes_dup = filas_sobrantes_por_duplicado(dup)
    objetivo_calc = [
        r
        for r in objetivo_ventana
        if mes_key(parse_fecha(r.get("Fecha", ""))) not in incompletos_set and id(r) not in sobrantes_dup
    ]

    subas = detectar_subas_precio(objetivo_calc)

    hallazgos_rankeados = []
    for h in padres:
        hallazgos_rankeados.append(
            {
                "impacto": parse_monto(h.get("Monto", "")),
                "texto": f"Cargo de {h.get('USUARIO','').strip()} (Padres) sin marcar Familia=Padres: {h.get('Comercio','').strip()} {fmt(parse_monto(h.get('Monto','')))} el {h.get('Fecha','').strip()} — corregir la fila en la Sheet, esa plata no debería contarse como gasto del Núcleo.",
            }
        )
    for s in subas:
        hallazgos_rankeados.append(
            {
                "impacto": s["delta_monto"],
                "texto": f"{s['comercio']} ({s['subcategoria']}) subió {s['delta_pct']:.0f}%: {fmt(s['promedio_anterior'])} → {fmt(s['promedio_reciente'])}/mes (+{fmt(s['delta_monto'])}/mes) — cotizar alternativas o confirmar la causa del aumento.",
            }
        )
    for d in dup:
        pares = "; ".join(f"{c} ({f})" for c, f in d["filas"])
        hallazgos_rankeados.append(
            {
                "impacto": d["monto"],
                "texto": f"Posible carga duplicada en la Sheet el {d['fecha']}, {fmt(d['monto'])}: {pares} — no es cobro doble real, es error de carga que infla el presupuesto.",
            }
        )

    hallazgos_rankeados.sort(key=lambda h: -h["impacto"])

    print("--- HALLAZGOS PRIORITARIOS (por impacto) ---")
    if not hallazgos_rankeados:
        print("Sin hallazgos automáticos en esta ventana. Puede ser una categoría chica o estable.")
    for i, h in enumerate(hallazgos_rankeados[:15], 1):
        print(f"{i}. {h['texto']}")
    print()

    # --- Resumen por grupo (run-rate sobre meses completos, no cuenta los incompletos) ---
    agrupar_por = "Subcategoria" if args.categoria else "Categoria"
    grupos = resumen_por_grupo(objetivo_calc, agrupar_por)
    meses_en_ventana = len(set(mes_key(parse_fecha(r.get("Fecha", ""))) for r in objetivo_calc))
    meses_en_ventana = max(meses_en_ventana, 1)

    print(f"--- RESUMEN POR {agrupar_por.upper()} (run-rate mensual aprox., {meses_en_ventana} meses completos) ---")
    for clave, data in sorted(grupos.items(), key=lambda x: -x[1]["total"]):
        mensual = data["total"] / meses_en_ventana
        print(f"{clave}: {fmt(data['total'])} total ({fmt(mensual)}/mes, {data['count']} filas)")
        top = sorted(data["comercios"].items(), key=lambda x: -x[1])[:5]
        for com, tot in top:
            if com:
                print(f"   - {com}: {fmt(tot)}")
    print()

    if dup:
        print("--- DETALLE: POSIBLES DUPLICADOS EN LA SHEET ---")
        for d in dup:
            pares = "; ".join(f"{c} ({f})" for c, f in d["filas"])
            print(f"{d['fecha']} | {fmt(d['monto'])} | {pares}")
        print()

    if padres:
        print("--- DETALLE: CARGOS DE PADRES MAL RUTEADOS (Familia != 'Padres') ---")
        for r in padres:
            print(f"{r.get('Fecha','').strip()} | {r.get('Comercio','').strip()} | {fmt(parse_monto(r.get('Monto','')))} | {r.get('USUARIO','').strip()}")
        print()


if __name__ == "__main__":
    main()
