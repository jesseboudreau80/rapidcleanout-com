# rapidcleanouts-landing

A complete landing-page + webhook backend project for `rapidcleanouts.com` handyman lead capture.

## What's included

- Responsive marketing landing page (`index.html` + `styles.css`).
- Client form handler with validation and webhook submit (`form.js`).
- Express backend with:
  - `POST /api/lead` endpoint.
  - Google Sheets lead storage.
  - Optional Zoho CRM lead push.
  - Optional Zoho SMTP notification emails.
  - Image upload handling to `uploads/`.
  - Honeypot anti-spam field + CORS + basic helmet security headers.

## Project structure

```bash
rapidcleanouts-landing/
├─ .env.example
├─ .gitignore
├─ README.md
├─ form.js
├─ index.html
├─ package.json
├─ server.js
├─ styles.css
└─ uploads/
   └─ .gitkeep
```

## Local setup

1. Install Node.js 18+.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment template:

   ```bash
   cp .env.example .env
   ```

4. Fill in your `.env` credentials.
5. Run locally:

   ```bash
   npm start
   ```

6. Visit:

   - Landing page: `http://localhost:3000/`
   - Health check: `http://localhost:3000/health`

## Google Sheets API setup

1. In Google Cloud Console, create/select a project.
2. Enable **Google Sheets API**.
3. Create a **Service Account** and generate a JSON key.
4. In your target spreadsheet:
   - Create a tab named `Leads`.
   - Share the spreadsheet with `GOOGLE_CLIENT_EMAIL` (Editor).
5. Copy these values into `.env`:
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (preserve newline escapes as `\n`)
   - `GOOGLE_SHEET_ID` (from sheet URL)

## Zoho CRM configuration (optional)

If Zoho CRM credentials are set, the server will also push each lead into Zoho `Leads`.

1. Create Zoho OAuth client credentials.
2. Generate a refresh token with CRM scopes.
3. Put values in `.env`:
   - `ZOHO_CRM_CLIENT_ID`
   - `ZOHO_CRM_CLIENT_SECRET`
   - `ZOHO_CRM_REFRESH_TOKEN`
4. Optional regional settings:
   - `ZOHO_CRM_ACCOUNTS_URL`
   - `ZOHO_CRM_API_DOMAIN`

If not configured, Zoho CRM submission is skipped.

## Zoho SMTP email notifications (optional)

If SMTP + notification email are set, each lead triggers an email alert.

Required:

- `ZOHO_SMTP_USER`
- `ZOHO_SMTP_PASS`
- `NOTIFICATION_EMAIL`

Optional:

- `ZOHO_SMTP_HOST` (default: `smtp.zoho.com`)
- `ZOHO_SMTP_PORT` (default: `465`)

## Linux VM deployment guide

Example for Ubuntu/Debian VM:

1. Install runtime:

   ```bash
   sudo apt update
   sudo apt install -y nodejs npm nginx
   ```

2. Deploy app:

   ```bash
   git clone <your-repo-url>
   cd rapidcleanouts-landing
   npm install --production
   cp .env.example .env
   # edit .env with production values
   ```

3. Run with PM2 (recommended):

   ```bash
   sudo npm i -g pm2
   pm2 start server.js --name rapidcleanouts-landing
   pm2 save
   pm2 startup
   ```

4. Configure Nginx reverse proxy (example server block):

   ```nginx
   server {
     listen 80;
     server_name rapidcleanouts.com www.rapidcleanouts.com;

     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```

5. Enable site and reload nginx:

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. Add TLS with Certbot (recommended for production).

## n8n webhook alternative

If you want n8n to orchestrate automations, you can forward leads from the backend or directly from the client:

- Keep current setup and add an n8n call inside `/api/lead` after validation.
- Or replace `/api/lead` URL in `form.js` with your n8n webhook endpoint.

Typical n8n flow:

1. **Webhook trigger** receives lead.
2. **Google Sheets node** appends row.
3. **Zoho CRM node or HTTP node** creates lead.
4. **Email node** sends internal notification.

## Security + anti-spam notes

- Honeypot field (`website`) blocks common bot submissions.
- Required field checks on client + server (`name`, `phone`, `photo`).
- CORS controls allowed origins (`CORS_ORIGIN`).
- `helmet` adds baseline HTTP security headers.
- Upload filter allows only images, max 10 MB.

## Form fields captured

- Name* (required)
- Phone* (required)
- Email
- Address
- Project Details
- Project Photo* (required)
- Desired Completion Timeline (ASAP, 1-2 weeks, 1 month, Flexible)

