# TagSkip

A plain frontend for one job: upload an image, send it to the removal API, and download the
cleaned result.

The browser validates and decodes the image for a local preview, then posts the original
file as `multipart/form-data` with a single `file` field to:

```
POST http://127.0.0.1:8000/api/remove-watermark
```

The API returns the cleaned image, which the interface displays and offers for download.
The frontend does not run watermark removal locally or store media.

Only edit media you own or have permission to modify. Invisible provenance marks such as
SynthID are not targeted. TagSkip is not affiliated with Google or Gemini.

Video watermark removal is coming soon.

## Run

```bash
npm install
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000`. For a different API origin build with
`VITE_API_BASE_URL=https://your-api.example.com npm run build`.

Start the API separately. Its contract is:

| Field | Meaning |
| --- | --- |
| `file` | PNG, JPEG or WebP image |

Success returns the cleaned image; validation failures return `422` with a FastAPI
`HTTPValidationError` body, which the UI displays as an error.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite |
| `npm run dev:backend` | Start the FastAPI service on port 8000 |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Preview the production build; `/api` is proxied |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:backend` | Backend pytest suite |
| `npm run test:e2e` | Playwright tests (needs the API on port 8000) |

## Notes

- No account, analytics, telemetry or application media database.
- The uploaded file is sent only when you choose **Remove watermark**.
- `backend/` is a separate service and is not part of this frontend build.
