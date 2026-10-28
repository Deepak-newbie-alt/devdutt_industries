# Devdutt Industries frontend

Vite + React app: the public site, customer enquiry and quotation pages, and the staff workspace.

## Local setup

1. Install dependencies from this folder:

   ```sh
   npm ci
   ```

2. Create your local env file and fill it in (see the comments in `.env.example`):

   ```sh
   cp .env.example .env.local
   ```

   - `VITE_CLERK_PUBLISHABLE_KEY`: the **publishable** key (`pk_test_...`) from the Clerk dashboard, Configure > API keys. It must come from the same Clerk instance as the backend's `CLERK_SECRET_KEY`.
   - Never put the Clerk secret key (`sk_...`) or any other backend secret in this file. Every `VITE_` value ends up in the public JavaScript.

3. Start the backend on port 8000 (or change `API_PROXY_TARGET`). For local development it should use `SMS_PROVIDER=console`.

4. Start the dev server:

   ```sh
   npm run dev
   ```

   Open http://localhost:5173. Requests to `/api` are forwarded to the backend.

## Other commands

- `npm run typecheck`: type-check only.
- `npm run build`: type-check and build into `dist/`.
- `npm run preview`: serve the built app.
