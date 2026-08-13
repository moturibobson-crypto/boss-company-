# Boss Project — Backend

Minimal Node.js + Express backend to serve `boss.html` and provide a simple API.

Quick start

```bash
npm install
npm start
```

Endpoints

- `GET /` — serves `boss.html`
- `GET /api/status` — returns a JSON status object

Local frontend and DB setup

1. Copy the local env file and edit if needed:

```bash
copy .env .env.local
# then edit .env.local to set DB credentials if different
```

2. Initialize the MySQL schema (requires `mysql` client):

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
