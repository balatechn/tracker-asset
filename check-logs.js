const http = require('http');
function get(host, port, path, headers) {
  return new Promise((resolve) => {
    http.get({ host, port, path, headers }, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => resolve({ status: r.statusCode, body: b }));
    }).on('error', e => resolve({ status: 0, body: e.message }));
  });
}
async function main() {
  const h = { Authorization: 'Bearer 16|KrAaw6Dh3pXfktWggFKmrB3ZI3BeFR2b8Nm1C2iR1b8b0b41' };
  
  // Get deployment list
  const dep = await get('187.127.134.246', 8000, '/api/v1/deployments?uuid=l114410npggdvuhb97f4dvwa', h);
  let deployId = null;
  try {
    const j = JSON.parse(dep.body);
    const list = Array.isArray(j) ? j : [];
    console.log('Total deployments:', list.length);
    list.slice(0, 5).forEach((d, i) => {
      console.log(`[${i}] status=${d.status} sha=${d.commit_sha?.slice(0,7)} id=${d.id} uuid=${d.deployment_uuid}`);
      if (i === 0) deployId = d.deployment_uuid || d.id;
    });
  } catch(e) { console.log('dep parse error:', dep.body.slice(0,200)); return; }

  if (!deployId) { console.log('No deployment ID found'); return; }

  // Get deployment logs
  const logs = await get('187.127.134.246', 8000, `/api/v1/deployment/${deployId}`, h);
  try {
    const j = JSON.parse(logs.body);
    const logText = j.logs || JSON.stringify(j).slice(0, 2000);
    // Show last 3000 chars of logs (build errors appear near end)
    console.log('\n=== Build Logs (last 3000 chars) ===');
    console.log(logText.slice(-3000));
  } catch(e) { console.log('logs raw:', logs.body.slice(0, 500)); }
}
main();
