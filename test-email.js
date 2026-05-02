const http = require('http');
function req(method, host, path, headers, body) {
  return new Promise((resolve) => {
    const opts = { host, path, method, headers: { 'Content-Type': 'application/json', ...headers } };
    const r = http.request(opts, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    r.on('error', e => resolve({ status: 0, body: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  // 1. Login
  const login = await req('POST', 'ngi-backend.187.127.134.246.sslip.io', '/api/auth/login', {}, { username: 'bala.admin', password: 'Nzt@2025' });
  const token = JSON.parse(login.body).token;
  console.log('Login:', token ? 'OK' : 'FAILED', login.body.slice(0, 100));

  const auth = { Authorization: 'Bearer ' + token };

  // 2. Check email config
  const cfg = await req('GET', 'ngi-backend.187.127.134.246.sslip.io', '/api/settings/email-config', auth);
  console.log('\n=== Email Config ===');
  console.log(cfg.body);

  // 3. Check what domains are expiring (alerts endpoint)
  const alerts = await req('GET', 'ngi-backend.187.127.134.246.sslip.io', '/api/dashboard/alerts', auth);
  const alertData = JSON.parse(alerts.body);
  console.log('\n=== Expiring Assets (should trigger emails) ===');
  console.log('Count:', alertData.alerts?.length);
  alertData.alerts?.forEach(a => console.log(` - [${a.type}] ${a.name} | days: ${a.days_remaining} | finance: ${a.finance_email || 'none'} | admin: ${a.admin_email || 'none'}`));

  // 4. Send test alert
  console.log('\n=== Sending Test Alert ===');
  const test = await req('POST', 'ngi-backend.187.127.134.246.sslip.io', '/api/settings/test-email', auth);
  console.log('Status:', test.status, test.body);
}
main();
