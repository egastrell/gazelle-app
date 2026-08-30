# Actualización automática de montos de referencia (Config)

Monitorea la carpeta de Drive de facturas y actualiza la hoja `Config` del
Sheet de Gazelle con el monto de referencia de cada proveedor.

## Setup

1. Crear un service account de Google Cloud con la API de Drive y de
   Sheets habilitadas, y descargar su clave como `credenciales_google.json`
   (este archivo NO se commitea, ver `.gitignore`).
2. Compartir con el email del service account:
   - La carpeta de Drive `1AygsLwG30QaMfFNMuRXZVZNbN-_eANyf` (lectura).
   - El Sheet `15TzS_-VQazdA427n8S7H_FnPD5Fj0eDrRMuETIdNLgQ` (editor).
3. `pip install gspread google-api-python-client google-auth-httplib2 google-auth-oauthlib pdfplumber`
4. Colocar `credenciales_google.json` en esta carpeta (o pasar `--credenciales ruta`).

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
  `procesadas.json` para no reprocesarlo en la próxima corrida.
