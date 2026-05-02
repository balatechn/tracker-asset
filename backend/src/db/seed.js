require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./index');

async function seed() {
  console.log('Seeding database...');

  try {
    const passwordHash = await bcrypt.hash('Admin@1234', 12);

    // Create default users
    await pool.query(`
      INSERT INTO users (username, email, password_hash, role, full_name)
      VALUES
        ('admin', 'admin@nationalgroup.com', $1, 'admin', 'System Admin'),
        ('bala', 'bala@nationalgroup.com', $1, 'it_manager', 'Balasubramanian P'),
        ('viewer', 'viewer@nationalgroup.com', $1, 'viewer', 'View Only User')
      ON CONFLICT (username) DO NOTHING
    `, [passwordHash]);

    // Insert domains based on the tracker spreadsheet
    const domains = [
      { sr: 1, domain: 'iskytransport.com', registrar: 'CloudFlare', expiry: '2027-04-28', criticality: 'High', remarks: 'Renewed & Moved Domain to CloudFlare-27-4-2026' },
      { sr: 2, domain: 'nationalconsultingindia.com', registrar: null, expiry: '2026-05-17', criticality: 'High', remarks: '17 May 2026 (Renewed)' },
      { sr: 3, domain: 'nationalgroupindia.com', registrar: 'GoDaddy.com, LLC', expiry: '2026-09-03', criticality: 'High', annual_cost: 1617, last_renewal: '2026-04-18', renewal_period: 1 },
      { sr: 4, domain: 'nationalresourcesindia.com', registrar: null, expiry: '2026-05-17', criticality: 'High' },
      { sr: 5, domain: 'rainlandautocorp.com', registrar: null, expiry: '2026-05-17', criticality: 'High' },
      { sr: 6, domain: 'āpa.com', registrar: null, expiry: '2026-06-18', criticality: 'Low' },
      { sr: 7, domain: 'pāna.com', registrar: null, expiry: '2026-06-18', criticality: 'Low' },
      { sr: 8, domain: 'nationalinfrabuild.com', registrar: null, expiry: '2030-11-01', criticality: 'High' },
    ];

    for (const d of domains) {
      await pool.query(`
        INSERT INTO domains (sr_no, domain_name, registrar, expiry_date, criticality,
          annual_cost_inr, last_renewal_date, renewal_period, remarks, owner)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `, [d.sr, d.domain, d.registrar, d.expiry, d.criticality,
          d.annual_cost || null, d.last_renewal || null, d.renewal_period || 1,
          d.remarks || null, 'Balasubramanian P']);
    }

    // Insert software licenses
    const software = [
      { sr: 9, product: 'Tacitine FireWall', vendor: 'Tacitine', criticality: 'High' },
      { sr: 10, product: 'Microsoft 365 Mail (Rainland)', vendor: 'PaceInfo', criticality: 'High' },
      { sr: 11, product: 'Microsoft 365 Mail (National Consulting)', vendor: 'PaceInfo', criticality: 'High' },
      { sr: 12, product: 'Microsoft Business app (Word Excel PPT)', vendor: 'PaceInfo', criticality: 'High' },
      { sr: 13, product: 'Sophos XD', vendor: null, criticality: 'High' },
    ];

    for (const s of software) {
      await pool.query(`
        INSERT INTO software_licenses (sr_no, product_name, vendor, criticality, owner)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [s.sr, s.product, s.vendor, s.criticality, 'Balasubramanian P']);
    }

    console.log('Seed completed successfully!');
    console.log('Default credentials:');
    console.log('  Admin:      admin / Admin@1234');
    console.log('  IT Manager: bala / Admin@1234');
    console.log('  Viewer:     viewer / Admin@1234');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
