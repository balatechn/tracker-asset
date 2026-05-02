const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  // Support both Mailgun-style names (EMAIL_SERVER/EMAIL_LOGIN/EMAIL_PASSWORD)
  // and generic names (EMAIL_HOST/EMAIL_USER/EMAIL_PASS) for flexibility
  const host = process.env.EMAIL_SERVER || process.env.EMAIL_HOST;
  const user = process.env.EMAIL_LOGIN || process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

  if (!transporter && host && user) {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: { user, pass },
    });
  }
  return transporter;
}

/** Reset cached transporter (used after config change) */
function resetTransporter() {
  transporter = null;
}

/** Build HTML email body for a list of expiring items */
function buildAlertHtml(items, recipientLabel) {
  const rows = items.map(item => `
    <tr style="background:${item.days_remaining <= 7 ? '#fee2e2' : item.days_remaining <= 15 ? '#fef3c7' : '#fefce8'}">
      <td style="padding:8px;border:1px solid #e5e7eb">${item.type === 'domain' ? '🌐' : '💻'} ${item.name}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${item.expiry_date}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;color:${item.days_remaining <= 7 ? '#dc2626' : '#d97706'}">${item.days_remaining} days</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${item.criticality}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${item.owner || '-'}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:sans-serif;max-width:700px">
      <h2 style="color:#1e40af">🔔 National Group IT Tracker — Expiry Alert</h2>
      ${recipientLabel ? `<p>Dear <strong>${recipientLabel}</strong>,</p>` : ''}
      <p>The following assets are expiring soon (as of ${new Date().toDateString()}). Please take action to renew them before they expire.</p>
      <table style="border-collapse:collapse;width:100%">
        <thead>
          <tr style="background:#1e40af;color:white">
            <th style="padding:8px;text-align:left">Asset</th>
            <th style="padding:8px;text-align:left">Expiry Date</th>
            <th style="padding:8px;text-align:left">Days Left</th>
            <th style="padding:8px;text-align:left">Criticality</th>
            <th style="padding:8px;text-align:left">Owner</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:16px">
        This alert will repeat daily until the asset is renewed.<br>
        Login to <a href="${process.env.FRONTEND_URL || 'http://ngi-tracker.187.127.134.246.sslip.io'}">National Group IT Tracker</a> to take action.
      </p>
    </div>
  `;
}

/**
 * Send expiry alert to all relevant recipients.
 * @param {Array} items  - array of { name, type, expiry_date, days_remaining, criticality, owner, finance_email, admin_email, vendor_email }
 */
async function sendExpiryAlert(items) {
  const t = getTransporter();
  if (!t) {
    console.log('[Email] Not configured — skipping alert send.');
    return;
  }

  const from = process.env.EMAIL_FROM
    || process.env.EMAIL_LOGIN
    || process.env.EMAIL_USER;

  // ── 1. Global admin blast (ALERT_EMAILS env var) ──────────────────────────
  const globalRecipients = process.env.ALERT_EMAILS;
  if (globalRecipients) {
    try {
      await t.sendMail({
        from,
        to: globalRecipients,
        subject: `⚠️ IT Asset Expiry Alert — ${items.length} item(s) expiring soon`,
        html: buildAlertHtml(items, null),
      });
      console.log(`[Email] Global alert sent for ${items.length} item(s)`);
    } catch (err) {
      console.error('[Email] Global send failed:', err.message);
    }
  }

  // ── 2. Per-domain contact emails ──────────────────────────────────────────
  // Build a map: email -> [items that have this email as a contact]
  const perEmail = {};
  for (const item of items) {
    for (const [role, addr] of [
      ['Finance', item.finance_email],
      ['Admin', item.admin_email],
      ['Vendor', item.vendor_email],
    ]) {
      if (!addr) continue;
      const key = addr.toLowerCase().trim();
      if (!perEmail[key]) perEmail[key] = { address: addr, role, items: [] };
      perEmail[key].items.push(item);
    }
  }

  for (const { address, role, items: subset } of Object.values(perEmail)) {
    // Skip if already covered by global list
    const globals = (globalRecipients || '').toLowerCase().split(',').map(s => s.trim());
    if (globals.includes(address.toLowerCase().trim())) continue;

    try {
      await t.sendMail({
        from,
        to: address,
        subject: `⚠️ IT Asset Expiry Alert — ${subset.length} item(s) require renewal`,
        html: buildAlertHtml(subset, role),
      });
      console.log(`[Email] Alert sent to ${role} contact <${address}> for ${subset.length} item(s)`);
    } catch (err) {
      console.error(`[Email] Failed to send to ${address}:`, err.message);
    }
  }
}

module.exports = { sendExpiryAlert, resetTransporter };
