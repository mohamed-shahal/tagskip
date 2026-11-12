# Deploying the backend to Azure

The backend is a single FastAPI service. It ships as a container image built from
`backend/Dockerfile` with the **repository root as the build context** (the app is imported as
`backend.main:app`).

## Build and run locally

```bash
docker build -f backend/Dockerfile -t tagskip-api .
docker run --rm -p 8000:8000 tagskip-api
curl http://127.0.0.1:8000/healthz
```

## Azure Container Apps (recommended)

Container Apps gives you HTTPS ingress, scale-to-zero, and a stable FQDN with no cluster to
manage. The deploy script is idempotent — re-run it after any code change.

```bash
az login
./backend/deploy-azure.sh
```

It creates the resource group, an ACR, the Container Apps environment, and the app; builds the
image inside ACR (no local Docker daemon needed); and grants the app's system-assigned managed
identity `AcrPull` on the registry, so no registry password is ever passed on the command line.

Override any of these with environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RESOURCE_GROUP` | `tagskip-rg` | Resource group name. |
| `LOCATION` | `uaenorth` | Azure region. This subscription is restricted by the `sys.regionrestriction` policy to `uaenorth`, `malaysiawest`, `eastasia`, `indonesiacentral`, `polandcentral`. `uaenorth` (Dubai) is closest to India. |
| `ACR_NAME` | `tagskipacr` | Registry name — must be globally unique, alphanumeric. Change it if the default is taken. |
| `APP_NAME` | `tagskip-api` | Container app name. |
| `ENV_NAME` | `tagskip-env` | Container Apps environment name. |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins. Set this to your frontend origin in production. |
| `MIN_REPLICAS` | `0` | `0` scales to zero; use `1` if cold starts matter. |
| `MAX_REPLICAS` | `3` | Upper replica bound. |
| `CPU` / `MEMORY` | `1` / `2Gi` | Container size. |

Example:

```bash
LOCATION=southindia \
ALLOWED_ORIGINS=https://tagskip.example.com \
MIN_REPLICAS=1 \
./backend/deploy-azure.sh
```

The script prints the public FQDN and the `VITE_API_BASE_URL` to build the frontend with:

```bash
VITE_API_BASE_URL="https://<fqdn>" npm run build
```

### Runtime configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8000` | Port uvicorn binds to. |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins. |
| `MAX_UPLOAD_BYTES` | `20971520` (20 MiB) | Rejects larger uploads with `413`. |

To change one without a full redeploy:

```bash
az containerapp update -n tagskip-api -g tagskip-rg \
  --set-env-vars ALLOWED_ORIGINS=https://your-frontend.example.com
```

### Notes

- `--min-replicas 0` scales to zero; the first request after idle pays a cold start. Use
  `MIN_REPLICAS=1` if latency matters.
- The image uses `opencv-python-headless`, so no X11/GL stack is required.
- The container runs as a non-root user and exposes `GET /healthz` for probes.
- Each deploy pushes a new timestamped image tag, so you can roll back with
  `az containerapp update --image <acr>.azurecr.io/tagskip-api:<older-tag>`.

## Alternative: Azure App Service (Linux container)

```bash
az appservice plan create -n tagskip-plan -g tagskip-rg --is-linux --sku B1
az webapp create -n tagskip-api -g tagskip-rg -p tagskip-plan \
  --deployment-container-image-name tagskipacr.azurecr.io/tagskip-api:latest
az webapp config appsettings set -n tagskip-api -g tagskip-rg \
  --settings WEBSITES_PORT=8000
```

App Service injects `PORT`; the image already honors it.
