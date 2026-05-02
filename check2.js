const http = require('http');
function get(opts) {
  return new Promise((resolve) => {
    http.get(opts, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: b }));
    }).on('error', e => resolve({ status: 0, body: e.message }));
  });
}
async function main() {
  const pages = ['/', '/login', '/dashboard', '/domains', '/alerts', '/settings', '/domains/calendar', '/domains/timeline'];
  console.log('=== Page Status ===');
  for (const p of pages) {
    const r = await get({ host: 'ngi-tracker.187.127.134.246.sslip.io', path: p });
    const loc = r.headers?.location ? ' -> ' + r.headers.location : '';
    console.log(' ', r.status, p, loc);
  }

  // Check if it's a JS error - get the actual HTML of /domains
  const d = await get({ host: 'ngi-tracker.187.127.134.246.sslip.io', path: '/domains' });
  console.log('\n=== /domains response body snippet ===');
  console.log(d.body.slice(0, 600));
}
main();
