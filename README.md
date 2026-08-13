# Boss Project — Backend

Node.js + Express backend that serves the Bossy Company site, secure account login, and a shared public product catalog.

Quick start

```bash
npm install
npm start
```

Endpoints

- `GET /` — serves `boss.html`
- `GET /api/status` — returns a JSON status object

Local frontend and DB setup

1. Copy the local env file and edit it with your MySQL credentials:

```bash
copy .env .env.local
# then edit .env.local to set DB credentials if different
```

2. Initialize the MySQL schema (requires the `mysql` client). This creates the account and shared product tables:

```bash
# run this in a shell where mysql client is available
mysql -u root -p < db/init.sql
```

3. Start the server and open the frontend at http://localhost:3000

```bash
npm install
node server.js
```

The frontend can fetch safe runtime config from `/api/config` and interact with the backend via `/api`.

Google sign-in

To enable Google/Gmail sign-in, create a Web OAuth client in Google Cloud Console, add your deployed domain as an authorized JavaScript origin, and put its client ID in `.env`:

```env
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Restart the server after changing `.env`. The client secret is not used by this Google Identity Services flow and must never be added to frontend files.
