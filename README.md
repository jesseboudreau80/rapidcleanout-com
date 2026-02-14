Rapid Cleanouts – Lead Capture Site

This repository contains the marketing landing page and lead capture system for Rapid Cleanouts & Handyman Services.

The goal of this project is simple:

Generate and capture local handyman and property improvement leads from platforms like Nextdoor and route them into Google Sheets and/or Zoho CRM for follow-up.

Overview

This project includes:

Responsive landing page optimized for townhouse, condo, and apartment owners

Lead capture form with required validation

Optional photo upload

Backend API endpoint (/api/lead)

Google Sheets integration for lead tracking

Zoho SMTP email notifications

Optional Zoho CRM lead creation

Basic spam protection (honeypot field)

This is designed to be lightweight, fast, and production-ready.

Services Promoted

Fireplace, door & window weather sealing

Door repair and upgrades

Ceiling fan installation

Microwave installation

Appliance replacement and upgrades

Patio, deck, and hardscaping improvements

Pressure washing

Junk removal

Primary audience:
Townhouse, condo, and apartment property owners — especially seniors and busy homeowners.

Tech Stack

Node.js

Express

Google Sheets API

Zoho SMTP

Optional Zoho CRM REST API

Vanilla HTML/CSS frontend

Minimal dependencies. Simple architecture.

Environment Variables

Create a .env file based on .env.example and configure:

GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
ZOHO_SMTP_USER=
ZOHO_SMTP_PASS=
ZOHO_CRM_CLIENT_ID=
ZOHO_CRM_CLIENT_SECRET=
ZOHO_CRM_REFRESH_TOKEN=
NOTIFICATION_EMAIL=
PORT=3000
UPLOAD_DIR=uploads

Local Development

Install dependencies:

npm install


Run the server:

npm run dev


Server will start on:

http://localhost:3000

Deployment Options

You can deploy this:

On a Linux VM (recommended for full control)

On Render or Railway

With a reverse proxy to rapidcleanouts.com

Or separate frontend + backend deployment

For static-only deployments, connect the form to an n8n webhook instead of the Express backend.

Lead Flow

Ad Platform (Nextdoor)
→ Landing Page
→ /api/lead
→ Google Sheets
→ Zoho CRM (optional)
→ Email Notification

Roadmap

Phase 1:

Validate demand with $3/day ad spend

Manual follow-up

Phase 2:

Auto SMS confirmation

CRM automation

Call scheduling

Phase 3:

Full Twilio integration

Automated qualification flows

License

MIT
