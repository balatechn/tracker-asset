const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter && process.env.EMAIL_HOST && process.env.EMAIL_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

async function sendExpiryAlert(items) {
  const t = getTransporter();
  if (!t) {
    console.log('[Email] Not configured — skipping alert send.');
    return;
  }

  const recipients = process.env.ALERT_EMAILS || process.env.EMAIL_USER;
  if (!recipients) return;

  const rows = items.map(item => `
    <tr style="background:${item.days_remaining <= 7 ? '#fee2e2' : item.days_remaining <= 15 ? '#fef3c7' : '#fefce8'}">
      <td style="padding:8px;border:1px solid #e5e7eb">${item.type === 'domain' ? '🌐' : '💻'} ${item.name}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${item.expiry_date}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;color:${item.days_remaining <= 7 ? '#dc2626' : '#d97706'}">${item.days_remaining} days</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${item.criticality}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:700px">
      <h2 style="color:#1e40af">🔔 National Group IT Tracker — Expiry Alert</h2>
      <p>The following assets are expiring soon (as of ${new Date().toDateString()}):</p>
      <table style="border-collapse:collapse;width:100%">
        <thead>
          <tr style="background:#1e40af;color:white">
            <th style="padding:8px;text-align:left">Asset</th>
            <th style="padding:8px;text-align:left">Expiry Date</th>
            <th style="padding:8px;text-align:left">Days Left</th>
            <th style="padding:8px;text-align:left">Criticality</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:16px">
        Login to <a href="${process.env.FRONTEND_URL}">National Group IT Tracker</a> to take action.
      </p>
    </div>
  `;

  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipients,
      subject: `⚠️ IT Asset Expiry Alert — ${items.length} item(s) expiring soon`,
      html,
    });
    console.log(`[Email] Alert sent for ${items.length} item(s)`);
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
  }
}

module.exports = { sendExpiryAlert };
