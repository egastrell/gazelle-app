#!/usr/bin/env bash
# Crea (o reutiliza) un proyecto de Google Cloud, habilita las APIs de
# Drive y Sheets, crea un service account y descarga su clave como
# credenciales_google.json en esta misma carpeta.
#
# Requisitos previos (una sola vez, en tu máquina):
#   1. Instalar gcloud CLI: https://cloud.google.com/sdk/docs/install
#   2. Correr: gcloud auth login
#
# Uso:
#   cd automation
#   ./setup_service_account.sh [nombre-proyecto]
#
# Al terminar, imprime el email del service account. Compartíselo a
# Claude (o compartí vos mismo desde Drive) la carpeta de facturas y el
# Sheet con permiso de Editor para ese email.

set -euo pipefail

PROJECT_ID="${1:-gazelle-config-bot-$RANDOM}"
SA_NAME="gazelle-config-bot"
KEY_FILE="credenciales_google.json"

if ! command -v gcloud &>/dev/null; then
  echo "Falta gcloud CLI. Instalalo desde https://cloud.google.com/sdk/docs/install y corré 'gcloud auth login' primero." >&2
  exit 1
fi

echo "== Usando/creando proyecto: $PROJECT_ID =="
if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
  gcloud projects create "$PROJECT_ID" --name="Gazelle Config Bot"
fi
gcloud config set project "$PROJECT_ID"

echo "== Habilitando APIs de Drive y Sheets =="
gcloud services enable drive.googleapis.com sheets.googleapis.com

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "== Creando service account =="
if ! gcloud iam service-accounts describe "$SA_EMAIL" &>/dev/null; then
  gcloud iam service-accounts create "$SA_NAME" --display-name "Gazelle Config Bot"
fi

echo "== Generando clave $KEY_FILE =="
gcloud iam service-accounts keys create "$KEY_FILE" --iam-account="$SA_EMAIL"

echo ""
echo "Listo. Service account: $SA_EMAIL"
echo "Compartile con permiso de Editor:"
echo "  - La carpeta de Drive: https://drive.google.com/drive/folders/1AygsLwG30QaMfFNMuRXZVZNbN-_eANyf"
echo "  - El Sheet: https://docs.google.com/spreadsheets/d/15TzS_-VQazdA427n8S7H_FnPD5Fj0eDrRMuETIdNLgQ"
echo ""
echo "O pasale este email a Claude para que lo comparta por vos con la herramienta de Drive."
