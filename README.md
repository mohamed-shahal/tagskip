# TagSkip

TagSkip is an open-source web app for removing a small, semi-transparent logo from an image. It includes a React frontend and a Python API that processes the image and returns a PNG.

Use TagSkip only on images you own or have permission to edit. It removes visible marks only; it does not remove invisible provenance or watermarks such as SynthID. TagSkip is not affiliated with Google, Gemini, or any image-generation service.

## What it does

- Accepts PNG, JPEG, and WebP images.
- Previews and validates images in your browser before upload.
- Sends the selected image to the TagSkip API when you choose **Remove watermark**.
- Shows the processed image and lets you download the PNG result.
- Processes images in memory; the app has no account system, analytics, or media library.

The current remover is designed for a small, light logo near the bottom-right corner. Results vary with the image and the mark. It cannot recover original detail where a mark is fully opaque, and the returned image is re-encoded as PNG. Video removal is not implemented.

## Quick start

You need Node.js 20.19+ (or 22.12+) and Python 3.10 or newer.

In one terminal, install and start the API:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
npm run dev:backend
```

In another terminal, install the frontend dependencies and start Vite:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. During development, Vite proxies `/api` to `http://127.0.0.1:8000`.

## Run with Docker

The whole stack — frontend and API — runs with one command:

```bash
docker compose up --build
```

Open <http://localhost:8080>. nginx serves the built frontend and proxies `/api` to the
backend container, so the browser only talks to one origin and no CORS setup is needed.

| Service | Image | Port |
| --- | --- | --- |
| `frontend` | `tagskip-web:local` (nginx) | `8080` on the host |
| `backend` | `tagskip-api:local` (FastAPI) | internal `8000` |

Stop with `docker compose down`; rebuild after code changes with `docker compose up --build`.

## How it works

The browser checks the image type and dimensions, then sends the original file as `multipart/form-data` in a `file` field:

```text
POST /api/remove-watermark
```

The API accepts PNG, JPEG, and WebP images up to 20 MiB by default. It returns the processed image as `image/png`. Errors use HTTP status codes and a FastAPI `detail` message. `GET /healthz` is available for a health check.

The frontend and API are separate services. To point a production frontend build at another API origin, set `VITE_API_BASE_URL`:

```bash
VITE_API_BASE_URL=https://api.example.com npm run build
```

## Configuration

| Variable | Default | Service | Description |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Same origin | Frontend build | API origin, without a trailing slash. |
| `PORT` | `8000` | API | Port used by Uvicorn. |
| `ALLOWED_ORIGINS` | `*` | API | Comma-separated browser origins allowed by CORS. Set this to your frontend origin in production. |
| `MAX_UPLOAD_BYTES` | `20971520` | API | Maximum API upload size in bytes (20 MiB). |

The browser has its own configurable upload limit in the interface. The API limit still applies when requests bypass the browser.

## Development commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run dev:backend` | Start the FastAPI service on port 8000. |
| `npm run build` | Type-check and build the frontend into `dist/`. |
| `npm run preview` | Preview the production frontend build. |
| `npm run typecheck` | Run the TypeScript check. |
| `npm run lint` | Run ESLint. |
| `npm run test` | Run frontend unit tests. |
| `npm run test:backend` | Run the backend pytest suite when `backend/tests` is present and pytest is installed. |
| `npm run test:e2e` | Run Playwright tests; start the API separately first. |

## Deploying

The backend includes a Dockerfile and an Azure Container Apps deployment script. See [backend/DEPLOY.md](backend/DEPLOY.md) for local container instructions, Azure setup, and deployment options.

The root `Dockerfile` builds the frontend and serves it with nginx; `docker-compose.yml` runs it alongside the API.

## Contributing

Issues and pull requests are welcome. For changes, please describe the problem or behavior being changed and include steps to reproduce or review it. Run the relevant checks from the development commands before opening a pull request.

## License

TagSkip is released under the [MIT License](LICENSE). Third-party notices are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
