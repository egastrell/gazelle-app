# Actualización automática de montos de referencia (Config)

Monitorea la carpeta de Drive de facturas y actualiza la hoja `Config` del
Sheet de Gazelle con el monto de referencia de cada proveedor.

## Camino recomendado: Apps Script (sin terminal)

Ver **[`apps_script/`](./apps_script/)** — corre adentro del mismo Sheet,
no necesita instalar nada ni guardar credenciales. Es lo que está activo
hoy. El resto de este documento (script en Python + service account de
GCP) queda como alternativa para quien prefiera correrlo fuera de Sheets
(cron, GitHub Action, etc.).

## Setup (alternativa Python + gcloud)

1. Instalar gcloud CLI (una vez) y loguearte: `gcloud auth login`.
2. Correr `./setup_service_account.sh` — crea el proyecto de GCP, habilita
   Drive + Sheets, crea el service account y descarga su clave como
   `credenciales_google.json` (este archivo NO se commitea, ver
   `.gitignore`). Al final imprime el email del service account.
3. Compartir con permiso de **Editor** ese email en:
   - La carpeta de Drive `1AygsLwG30QaMfFNMuRXZVZNbN-_eANyf`.
   - El Sheet `15TzS_-VQazdA427n8S7H_FnPD5Fj0eDrRMuETIdNLgQ`.
   (o pasale el email a Claude para que lo comparta con la herramienta de Drive).
4. `pip install gspread google-api-python-client google-auth-httplib2 google-auth-oauthlib pdfplumber`

## Uso

```
python3 actualizar_montos_referencia.py --dry-run   # solo reporta, no escribe
python3 actualizar_montos_referencia.py              # escribe en Config
```

Se puede programar con cron o un GitHub Action con el secreto de las
credenciales inyectado como archivo en tiempo de ejecución.

## Reglas del negocio

- **Nunca** actualiza Config con facturas de SEGOVIA MIRTA ELENA ni de
  GASTRELL ALFREDO EDUARDO.
- En Edenor y Gas Natural, si en el mismo lote aparecen dos cuentas del
  mismo proveedor, se toma la de **mayor** monto (Eduardo) y se descarta
  la de menor monto (Mirta).
- Si un proveedor no existe todavía en Config, hoy el script lo agrega
  como fila nueva sin pedir confirmación — si preferís que avise antes de
  crear filas nuevas, ajustá `aplicar_actualizaciones` para no hacer
  `append_row` automáticamente.
- Cada archivo procesado (con o sin actualización) queda registrado en
  `procesadas.json` (solo los `fileId`, lo que lee el script) para no
  reprocesarlo en la próxima corrida. `historial.json` tiene el mismo
  registro con detalle humano (proveedor, monto, vencimiento, motivo) para
  auditoría — no lo lee el script.
- Corrida inicial (30/08/2026): ya se cargaron a mano en Config
  `swiss_medical` ($462.120,48), `edenor_eduardo` ($269.150,22),
  `gas_natural_eduardo` ($137.076,07) e `internet_urunet` ($35.382,00), y
  los 12 archivos de esa carpeta a esa fecha quedaron marcados como
  procesados en `procesadas.json` para que la primera corrida real del
  script no los vuelva a tocar.
