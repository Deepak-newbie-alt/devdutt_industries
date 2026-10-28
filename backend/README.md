# Devdutt Industries backend

Express 5 + TypeScript API with PostgreSQL (Prisma 7). Staff sign in through Clerk; customers verify actions with an SMS code.

## Local setup

1. Install dependencies from this folder:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env` and fill it in. The comments in `.env.example` explain each value. For local development:
   - `DATABASE_URL`: your development database.
   - `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`: the Clerk **development** instance.
   - `OTP_SECRET`: a random value of at least 32 characters (the generator command is in `.env.example`).
   - `SMS_PROVIDER=console`: verification codes are printed in the server log instead of being sent.

3. Apply the database migrations and generate the Prisma client:

   ```sh
   npx prisma migrate deploy
   npx prisma generate
   ```

4. Build and start the API on `PORT` (default 8000):

   ```sh
   npm run build
   npm start
   ```

   Rebuild and restart after code changes. The frontend's dev server forwards `/api` to this port.

## Tests

```sh
npm test
```

Builds the app and the tests into `dist-test/`, then runs them with Node's built-in test runner. They cover request validation, inquiry submission, the customer's verified inquiry history (including the short-lived read token, inquiry details and issued PDFs), claiming, closing, closure requests and admin decisions, the quotation steps a closed inquiry blocks, and the races between them (for example a closure request against a quotation send).

- They run against the database in `DATABASE_URL`: **use the development database only**. They refuse to run when `NODE_ENV=production`.
- Each run creates its own users, products, inquiries and quotations, tagged with a run id, and deletes them at the end, including when a test fails.
- They always use the console SMS sender and read codes from its output, whatever `.env` says, so no real SMS is sent.
- Clerk isn't involved: the tests call the services directly.

## Sample catalog (development only)

```sh
npm run build
node dist/scripts/seedDevCatalog.js            # add or refresh the sample products
node dist/scripts/seedDevCatalog.js --remove   # remove them again
```

The sample rows are placeholders for building the website, not real product data. The script won't run with `NODE_ENV=production`.
