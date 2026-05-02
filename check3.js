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
  // Get the /domains page HTML and look for error indicators
  const r = await get({ host: 'ngi-tracker.187.127.134.246.sslip.io', path: '/domains' });
  const body = r.body;

  // Check for Next.js error markers
  const hasError = body.includes('__next_error__') || body.includes('Application error');
  const hasNextData = body.includes('__NEXT_DATA__') || body.includes('_next/static');
  console.log('HTTP Status:', r.status);
  console.log('Has error marker:', hasError);
  console.log('Has Next.js scripts:', hasNextData);
  
  // Extract script tags to see what bundles are loaded
  const scripts = (body.match(/<script[^>]+src="[^"]+"/g) || []).map(s => s.match(/src="([^"]+)"/)?.[1]);
  console.log('\nScript bundles:', scripts.length);
  scripts.forEach(s => console.log(' ', s));

  // Look for inline error data
  const errorMatch = body.match(/globalError[^{]*\{[^}]+\}/);
  if (errorMatch) console.log('\nGlobal error found:', errorMatch[0]);

  // Check if it looks like the old or new layout (sidebar width)
  const hasBrandColor = body.includes('brand-') || body.includes('slate-900');
  console.log('\nHas brand/slate CSS refs in HTML:', hasBrandColor);
  
  // Check if id="__next_error__" present (server crash indicator)
  if (body.includes('id="__next_error__"')) {
    console.log('\n!! SERVER-SIDE ERROR DETECTED !!');
    const errStart = body.indexOf('id="__next_error__"');
    console.log(body.slice(errStart, errStart + 500));
  }
}
main();
