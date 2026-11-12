# Third-party notices

TagSkip is an independent project and is not affiliated with, endorsed by, or
sponsored by Google. Gemini and Veo are trademarks of Google LLC.

The application code in this repository is licensed under the MIT License; see
[`LICENSE`](./LICENSE).

## Runtime dependencies

| Package | License | Project |
| --- | --- | --- |
| `react`, `react-dom` | MIT | <https://github.com/facebook/react> |
| `zustand` | MIT | <https://github.com/pmndrs/zustand> |
| `tailwindcss`, `@tailwindcss/vite` | MIT | <https://github.com/tailwindlabs/tailwindcss> |
| `lucide-react` | ISC | <https://github.com/lucide-icons/lucide> |
| `@radix-ui/*` | MIT | <https://github.com/radix-ui/primitives> |
| `clsx` | MIT | <https://github.com/lukeed/clsx> |
| `tailwind-merge` | MIT | <https://github.com/dcastil/tailwind-merge> |
| `class-variance-authority` | Apache-2.0 | <https://github.com/joe-bell/cva> |
| `@fontsource-variable/inter` | OFL-1.1 | <https://fontsource.org/fonts/inter> |
| `@fontsource-variable/space-grotesk` | OFL-1.1 | <https://fontsource.org/fonts/space-grotesk> |

The Inter and Space Grotesk font files are self-hosted through Fontsource under the SIL
Open Font License 1.1. They are not fetched from a third-party CDN at runtime.

## Development dependencies

Vite (MIT), Vitest (MIT), Playwright (Apache-2.0), TypeScript (Apache-2.0), ESLint (MIT),
Testing Library (MIT), jsdom (MIT), and their transitive dependencies are development-only
and are not shipped in the production bundle.

## E2E fixtures

All fixtures under `e2e/fixtures/` are project-owned synthetic images. They contain no
third-party media.

## Removal service

The removal API runs separately and is not bundled with this frontend. See the backend
project for its own notices and licenses.
