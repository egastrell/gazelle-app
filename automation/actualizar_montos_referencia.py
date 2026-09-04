"""
Actualiza los montos de referencia en la hoja Config del Sheet de Gazelle
a partir de las facturas nuevas subidas a una carpeta de Google Drive.

Uso:
    python3 actualizar_montos_referencia.py [--dry-run] [--credenciales ruta.json]

Requiere:
    pip install gspread google-api-python-client google-auth-httplib2 google-auth-oauthlib pdfplumber

Credenciales:
    Un service account con acceso de LECTURA a la carpeta de Drive y de
    EDICIÓN al Sheet (compartir el Sheet y la carpeta con el email del
    service account que figura en credenciales_google.json). El archivo
    de credenciales nunca se commitea (ver .gitignore).
"""
import argparse
import json
import re
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import gspread
import pdfplumber
import io

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
]

DRIVE_FOLDER_ID = "1AygsLwG30QaMfFNMuRXZVZNbN-_eANyf"
SHEET_ID = "15TzS_-VQazdA427n8S7H_FnPD5Fj0eDrRMuETIdNLgQ"
CONFIG_SHEET_NAME = "Config"
PROCESADAS_SUBFOLDER = "Procesadas"
LOG_PATH = Path(__file__).parent / "procesadas.json"

# Titulares cuyas facturas jamás deben tocar el Config, aunque coincidan
# con un proveedor monitoreado (ej. la cuenta de gas/luz de un familiar
# que comparte proveedor con Eduardo).
TITULARES_EXCLUIDOS = [
    "SEGOVIA MIRTA ELENA",
    "GASTRELL ALFREDO EDUARDO",
]

# clave en Config -> patrones que identifican al proveedor en el texto del PDF
PROVEEDORES = {
    "swiss_medical": [r"SWISS\s*MEDICAL"],
    "edenor_eduardo": [r"EDENOR"],
    "gas_natural_eduardo": [r"NATURGY", r"GAS\s*NATURAL"],
    "internet_urunet": [r"URUNET"],
}

# proveedores donde puede haber dos cuentas en el mismo lote (Eduardo/Mirta):
# la de mayor monto es Eduardo, se excluye la de menor monto.
PROVEEDORES_CON_PAR_MIRTA = {"edenor_eduardo", "gas_natural_eduardo"}


def cargar_log():
    if LOG_PATH.exists():
        return json.loads(LOG_PATH.read_text())
    return {"procesados": []}


def guardar_log(log):
    LOG_PATH.write_text(json.dumps(log, indent=2, ensure_ascii=False))


def extraer_texto_pdf(contenido_bytes):
    texto = []
    with pdfplumber.open(io.BytesIO(contenido_bytes)) as pdf:
        for pagina in pdf.pages:
            texto.append(pagina.extract_text() or "")
    return "\n".join(texto)


def identificar_proveedor(texto):
    for clave, patrones in PROVEEDORES.items():
        for patron in patrones:
            if re.search(patron, texto, re.IGNORECASE):
                return clave
    return None


def identificar_titular(texto):
    for titular in TITULARES_EXCLUIDOS:
        if titular in texto.upper():
            return titular
    match = re.search(r"GASTRELL?\s*,?\s*EDUARDO\s*FRANCO", texto, re.IGNORECASE)
    if match:
        return "GASTRELL EDUARDO FRANCO"
    match = re.search(r"ZIEGLER\s*ROMINA\s*EMILIA", texto, re.IGNORECASE)
    if match:
        return "ZIEGLER ROMINA EMILIA"
    return None


def extraer_monto_total(texto):
    candidatos = re.findall(
        r"TOTAL\s*A\s*PAGAR[^\d$]{0,40}\$?\s*([\d.]+,\d{2})", texto, re.IGNORECASE
    )
    if not candidatos:
        candidatos = re.findall(r"\$\s*([\d.]{4,}[.,]\d{2})", texto)
    if not candidatos:
        return None
    valor = candidatos[0].replace(".", "").replace(",", ".")
    return round(float(valor), 2)


def extraer_vencimiento(texto):
    match = re.search(
        r"Vencimiento[:\s]*([0-3]?\d[/-][01]?\d[/-]\d{2,4})", texto, re.IGNORECASE
    )
    return match.group(1) if match else None


def es_excluido(titular):
    return titular in TITULARES_EXCLUIDOS


def procesar_carpeta(drive_service, log, dry_run):
    query = f"'{DRIVE_FOLDER_ID}' in parents and trashed = false"
    resultados = (
        drive_service.files()
        .list(q=query, fields="files(id, name, mimeType)")
        .execute()
    )
    archivos = [f for f in resultados.get("files", []) if f["mimeType"] == "application/pdf"]

    procesados_ids = set(log["procesados"])
    hallazgos = []  # (clave_proveedor, titular, monto, vencimiento, file_id, file_name)

    for archivo in archivos:
        if archivo["id"] in procesados_ids:
            continue

        contenido = descargar_archivo(drive_service, archivo["id"])
        texto = extraer_texto_pdf(contenido)

        clave = identificar_proveedor(texto)
        if clave is None:
            log["procesados"].append(archivo["id"])
            continue

        titular = identificar_titular(texto)
        monto = extraer_monto_total(texto)
        vencimiento = extraer_vencimiento(texto)

        if monto is None:
            print(f"[AVISO] No se pudo extraer el monto de {archivo['name']}, se omite.")
            continue

        hallazgos.append((clave, titular, monto, vencimiento, archivo["id"], archivo["name"]))

    # Resolver pares Eduardo/Mirta dentro de un mismo proveedor: si hay más
    # de una factura para el mismo proveedor en este lote, la de mayor
    # monto se usa como referencia (Eduardo) y el resto se descarta.
    por_proveedor = {}
    for h in hallazgos:
        clave = h[0]
        por_proveedor.setdefault(clave, []).append(h)

    actualizaciones = {}
    for clave, items in por_proveedor.items():
        for h in items:
            _, titular, monto, vencimiento, file_id, file_name = h
            log["procesados"].append(file_id)

        if clave in PROVEEDORES_CON_PAR_MIRTA and len(items) > 1:
            items_ordenados = sorted(items, key=lambda x: x[2], reverse=True)
            elegido = items_ordenados[0]
        else:
            no_excluidos = [h for h in items if not es_excluido(h[1])]
            if not no_excluidos:
                continue
            elegido = max(no_excluidos, key=lambda x: x[2])

        _, titular, monto, vencimiento, file_id, file_name = elegido
        if es_excluido(titular):
            print(f"[EXCLUIDO] {file_name} ({titular}) — no se actualiza Config.")
            continue

        actualizaciones[clave] = {
            "monto": monto,
            "vencimiento": vencimiento,
            "titular": titular,
            "file_name": file_name,
        }

    return actualizaciones


def descargar_archivo(drive_service, file_id):
    request = drive_service.files().get_media(fileId=file_id)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buffer.getvalue()


def leer_config_actual(sheet):
    filas = sheet.get_all_values()
    valores = {}
    for i, fila in enumerate(filas):
        if len(fila) >= 2 and fila[0]:
            valores[fila[0]] = (i + 1, fila[1])
    return valores


def aplicar_actualizaciones(sheet, config_actual, actualizaciones, dry_run):
    reporte = []
    for clave, datos in actualizaciones.items():
        nuevo = datos["monto"]
        if clave in config_actual:
            fila, anterior_str = config_actual[clave]
            try:
                anterior = float(anterior_str.replace(".", "").replace(",", "."))
            except ValueError:
                anterior = None
        else:
            fila = None
            anterior = None

        if anterior:
            variacion = (nuevo - anterior) / anterior * 100
            variacion_str = f"{variacion:+.1f}%"
        else:
            variacion_str = "fila nueva"

        reporte.append(
            {
                "proveedor": clave,
                "anterior": anterior,
                "nuevo": nuevo,
                "variacion": variacion_str,
                "vencimiento": datos["vencimiento"],
                "archivo": datos["file_name"],
            }
        )

        if dry_run:
            continue

        if fila:
            sheet.update_cell(fila, 2, nuevo)
        else:
            sheet.append_row([clave, nuevo])

    return reporte


def imprimir_reporte(reporte):
    print("\n=== Reporte de actualización de montos de referencia ===")
    for r in reporte:
        anterior = f"${r['anterior']:,.2f}" if r["anterior"] else "— (fila nueva)"
        print(
            f"- {r['proveedor']}: {anterior} -> ${r['nuevo']:,.2f} "
            f"({r['variacion']}) | vto {r['vencimiento']} | {r['archivo']}"
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="No escribe en el Sheet, solo reporta")
    parser.add_argument("--credenciales", default="credenciales_google.json")
    args = parser.parse_args()

    creds = service_account.Credentials.from_service_account_file(
        args.credenciales, scopes=SCOPES
    )
    drive_service = build("drive", "v3", credentials=creds)
    gc = gspread.authorize(creds)
    sheet = gc.open_by_key(SHEET_ID).worksheet(CONFIG_SHEET_NAME)

    log = cargar_log()
    actualizaciones = procesar_carpeta(drive_service, log, args.dry_run)
    config_actual = leer_config_actual(sheet)
    reporte = aplicar_actualizaciones(sheet, config_actual, actualizaciones, args.dry_run)
    imprimir_reporte(reporte)

    if not args.dry_run:
        guardar_log(log)


if __name__ == "__main__":
    main()
