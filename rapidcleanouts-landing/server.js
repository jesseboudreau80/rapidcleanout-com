require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const app = express();
const port = Number(process.env.PORT) || 3000;
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    methods: ['GET', 'POST'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sanitizeFilename = (name) => name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 120);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const stamp = Date.now();
    const ext = path.extname(file.originalname || '').slice(0, 10);
    const base = sanitizeFilename(path.basename(file.originalname || 'upload', ext));
    cb(null, `${stamp}-${base}${ext || ''}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed.'));
    }
    cb(null, true);
  },
});

app.use('/uploads', express.static(uploadDir));
app.use(express.static(__dirname));

const buildLead = (req) => {
  const body = req.body || {};
  const file = req.file;
  const host = `${req.protocol}://${req.get('host')}`;

  return {
    submittedAt: new Date().toISOString(),
    firstName: (body.firstName || '').toString().trim(),
    lastName: (body.lastName || '').toString().trim(),
    phone: (body.phone || '').toString().trim(),
    email: (body.email || '').toString().trim(),
    address: (body.address || '').toString().trim(),
    city: (body.city || '').toString().trim(),
    state: (body.state || '').toString().trim(),
    zip: (body.zip || '').toString().trim(),
    timeline: (body.timeline || 'Flexible').toString().trim(),
    projectDetails: (body.projectDetails || '').toString().trim(),
    smsConsent: (body.smsConsent || '').toString().trim(),
    honeypot: (body.website || '').toString().trim(),
    photoUrl: file ? `${host}/uploads/${file.filename}` : '',
  };
};

const appendToGoogleSheet = async (lead) => {
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID } = process.env;
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    throw new Error('Google Sheets credentials are not fully configured.');
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Primary lead storage destination: each valid form submission is appended to Google Sheets.
  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: 'Leads!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          lead.submittedAt,
          lead.firstName,
          lead.lastName,
          lead.phone,
          lead.email,
          lead.address,
          lead.city,
          lead.state,
          lead.zip,
          lead.timeline,
          lead.smsConsent,
          lead.projectDetails,
          lead.photoUrl,
        ],
      ],
    },
  });
};

const getZohoAccessToken = async () => {
  const {
    ZOHO_CRM_CLIENT_ID,
    ZOHO_CRM_CLIENT_SECRET,
    ZOHO_CRM_REFRESH_TOKEN,
    ZOHO_CRM_ACCOUNTS_URL = 'https://accounts.zoho.com',
  } = process.env;

  if (!ZOHO_CRM_CLIENT_ID || !ZOHO_CRM_CLIENT_SECRET || !ZOHO_CRM_REFRESH_TOKEN) {
    return null;
  }

  const url = `${ZOHO_CRM_ACCOUNTS_URL}/oauth/v2/token`;
  const params = new URLSearchParams({
    refresh_token: ZOHO_CRM_REFRESH_TOKEN,
    client_id: ZOHO_CRM_CLIENT_ID,
    client_secret: ZOHO_CRM_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Zoho CRM token.');
  }

  const payload = await response.json();
  return payload.access_token || null;
};

const sendToZohoCRM = async (lead) => {
  // Optional integration: disable by leaving Zoho env vars unset.
  const token = await getZohoAccessToken();
  if (!token) return;

  const apiDomain = process.env.ZOHO_CRM_API_DOMAIN || 'https://www.zohoapis.com';

  // Zoho CRM push happens here after successful Google Sheets append.
  const response = await fetch(`${apiDomain}/crm/v2/Leads`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [
        {
          First_Name: lead.firstName || '',
          Last_Name: lead.lastName || 'Website Lead',
          Company: 'Rapid Services of NC',
          Phone: lead.phone,
          Email: lead.email,
          Street: lead.address,
          City: lead.city,
          State: lead.state,
          Zip_Code: lead.zip,
          Description: `Timeline: ${lead.timeline}\nSMS Consent: ${lead.smsConsent ? 'Yes' : 'No'}\n${lead.projectDetails}\nPhoto: ${lead.photoUrl}`,
          Lead_Source: 'Website Form',
        },
      ],
      trigger: ['workflow'],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zoho CRM lead create failed: ${text}`);
  }
};

const sendNotificationEmail = async (lead) => {
  const { ZOHO_SMTP_USER, ZOHO_SMTP_PASS, NOTIFICATION_EMAIL } = process.env;
  if (!ZOHO_SMTP_USER || !ZOHO_SMTP_PASS || !NOTIFICATION_EMAIL) return;

  const transporter = nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
    port: Number(process.env.ZOHO_SMTP_PORT) || 465,
    secure: true,
    auth: { user: ZOHO_SMTP_USER, pass: ZOHO_SMTP_PASS },
  });

  const text = [
    'New lead submitted from rapidcleanouts.com',
    `First Name: ${lead.firstName}`,
    `Last Name: ${lead.lastName}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    `Address: ${lead.address}`,
    `City: ${lead.city}`,
    `State: ${lead.state}`,
    `ZIP: ${lead.zip}`,
    `Timeline: ${lead.timeline}`,
    `SMS Consent: ${lead.smsConsent ? 'Yes' : 'No'}`,
    `Project: ${lead.projectDetails}`,
    `Photo URL: ${lead.photoUrl || 'n/a'}`,
    `Submitted At: ${lead.submittedAt}`,
  ].join('\n');

  await transporter.sendMail({
    from: ZOHO_SMTP_USER,
    to: NOTIFICATION_EMAIL,
    subject: `New Handyman Lead: ${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
    text,
  });
};

app.post('/api/lead', upload.single('photo'), async (req, res) => {
  try {
    const lead = buildLead(req);

    if (lead.honeypot) {
      return res.status(202).json({ ok: true });
    }

    if (!lead.firstName || !lead.lastName || !lead.phone) {
      return res.status(400).json({ error: 'First name, last name, and phone are required.' });
    }

    if (!lead.smsConsent) {
      return res.status(400).json({ error: 'SMS consent is required.' });
    }

    if (!lead.photoUrl) {
      return res.status(400).json({ error: 'A project photo is required.' });
    }

    console.log('Incoming lead payload:', {
      submittedAt: lead.submittedAt,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zip: lead.zip,
      timeline: lead.timeline,
      smsConsent: lead.smsConsent,
      projectDetails: lead.projectDetails,
      photoUrl: lead.photoUrl,
    });

    await appendToGoogleSheet(lead);

    const optionalTasks = [sendToZohoCRM(lead), sendNotificationEmail(lead)];
    const optionalResults = await Promise.allSettled(optionalTasks);

    const warnings = optionalResults
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason?.message || 'Optional integration failed.');

    return res.status(201).json({ ok: true, photoUrl: lead.photoUrl, warnings });
  } catch (error) {
    console.error('Lead submission error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process lead.' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`rapidcleanouts-landing server listening on port ${port}`);
});
