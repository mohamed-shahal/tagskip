#!/usr/bin/env bash
# Deploy the TagSkip backend to Azure Container Apps.
#
# Idempotent: safe to re-run. Builds the image inside ACR, so no local Docker
# daemon is required. Uses a system-assigned managed identity for registry
# pulls, so no registry password ever touches the command line or shell history.
#
# Usage:
#   ./backend/deploy-azure.sh
#   LOCATION=malaysiawest ALLOWED_ORIGINS=https://tagskip.example.com ./backend/deploy-azure.sh
#
# Overridable environment variables:
#   RESOURCE_GROUP   default: tagskip-rg
#   LOCATION         default: uaenorth        (closest allowed region to India)
#   ACR_NAME         default: tagskipacr   (globally unique, alphanumeric only)
#   APP_NAME         default: tagskip-api
#   ENV_NAME         default: tagskip-env
#   ALLOWED_ORIGINS  default: *            (comma-separated CORS origins)
#   MIN_REPLICAS     default: 0            (0 = scale to zero)
#   MAX_REPLICAS     default: 3
#   CPU              default: 1
#   MEMORY           default: 2Gi

set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-tagskip-rg}"
LOCATION="${LOCATION:-uaenorth}"
ACR_NAME="${ACR_NAME:-tagskipacr}"
APP_NAME="${APP_NAME:-tagskip-api}"
ENV_NAME="${ENV_NAME:-tagskip-env}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-*}"
MIN_REPLICAS="${MIN_REPLICAS:-0}"
MAX_REPLICAS="${MAX_REPLICAS:-3}"
CPU="${CPU:-1}"
MEMORY="${MEMORY:-2Gi}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

IMAGE_TAG="$(date -u +%Y%m%d%H%M%S)"
IMAGE="${ACR_NAME}.azurecr.io/${APP_NAME}:${IMAGE_TAG}"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

log "Registering required resource providers"
for provider in Microsoft.App Microsoft.ContainerRegistry Microsoft.OperationalInsights; do
  state="$(az provider show -n "$provider" --query registrationState -o tsv 2>/dev/null || echo Unknown)"
  if [ "$state" != "Registered" ]; then
    echo "  registering ${provider} (was: ${state})"
    az provider register -n "$provider" --wait -o none
  else
    echo "  ${provider} already registered"
  fi
done

log "Resource group: ${RESOURCE_GROUP} (${LOCATION})"
az group create -n "$RESOURCE_GROUP" -l "$LOCATION" -o none

log "Container registry: ${ACR_NAME}"
if ! az acr show -n "$ACR_NAME" -g "$RESOURCE_GROUP" -o none 2>/dev/null; then
  az acr create -n "$ACR_NAME" -g "$RESOURCE_GROUP" --sku Basic --admin-enabled false -o none
fi
ACR_ID="$(az acr show -n "$ACR_NAME" -g "$RESOURCE_GROUP" --query id -o tsv)"

log "Building image in ACR: ${IMAGE}"
az acr build -r "$ACR_NAME" -t "${APP_NAME}:${IMAGE_TAG}" -f backend/Dockerfile . -o none

log "Container Apps environment: ${ENV_NAME}"
if ! az containerapp env show -n "$ENV_NAME" -g "$RESOURCE_GROUP" -o none 2>/dev/null; then
  az containerapp env create -n "$ENV_NAME" -g "$RESOURCE_GROUP" -l "$LOCATION" -o none
fi

if az containerapp show -n "$APP_NAME" -g "$RESOURCE_GROUP" -o none 2>/dev/null; then
  log "Updating existing app: ${APP_NAME}"
  az containerapp update -n "$APP_NAME" -g "$RESOURCE_GROUP" \
    --image "$IMAGE" \
    --set-env-vars "ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
    -o none
else
  log "Creating app: ${APP_NAME}"
  # Start on a public placeholder image so the app exists before the ACR pull
  # permission is granted; the real image is applied at the end.
  az containerapp create -n "$APP_NAME" -g "$RESOURCE_GROUP" \
    --environment "$ENV_NAME" \
    --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
    --system-assigned \
    --target-port 8000 --ingress external \
    --cpu "$CPU" --memory "$MEMORY" \
    --min-replicas "$MIN_REPLICAS" --max-replicas "$MAX_REPLICAS" \
    --env-vars "ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
    -o none

  PRINCIPAL_ID="$(az containerapp show -n "$APP_NAME" -g "$RESOURCE_GROUP" \
    --query identity.principalId -o tsv)"
  log "Granting AcrPull to the app's managed identity"
  az role assignment create --assignee "$PRINCIPAL_ID" --role AcrPull --scope "$ACR_ID" -o none

  az containerapp registry set -n "$APP_NAME" -g "$RESOURCE_GROUP" \
    --server "${ACR_NAME}.azurecr.io" --identity system -o none

  az containerapp update -n "$APP_NAME" -g "$RESOURCE_GROUP" --image "$IMAGE" -o none
fi

FQDN="$(az containerapp show -n "$APP_NAME" -g "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)"

log "Deployed: https://${FQDN}"
echo "Health:         https://${FQDN}/healthz"
echo "Frontend build: VITE_API_BASE_URL=\"https://${FQDN}\" npm run build"
