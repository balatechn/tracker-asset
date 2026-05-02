const { pool } = require('../db');
const { deleteCachePattern } = require('../config/redis');
const XLSX = require('xlsx');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const ALLOWED_SORT_COLS = ['sr_no', 'domain_name', 'expiry_date', 'criticality', 'registrar', 'annual_cost_inr'];

// GET /api/domains
const getDomains = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 50,
      search = '', criticality = '',
      sort = 'sr_no', order = 'ASC',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;
    const safeSort = ALLOWED_SORT_COLS.includes(sort) ? sort : 'sr_no';
    const safeOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const conditions = ['is_active = true'];
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(domain_name ILIKE $${params.length} OR registrar ILIKE $${params.length} OR owner ILIKE $${params.length})`);
    }

    if (criticality && ['High', 'Medium', 'Low'].includes(criticality)) {
      params.push(criticality);
      conditions.push(`criticality = $${params.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countParams = [...params];
    params.push(limitNum, offset);

    const [data, count] = await Promise.all([
      pool.query(
        `SELECT *, (expiry_date - CURRENT_DATE) AS days_to_expiry
         FROM domains ${where}
         ORDER BY ${safeSort} ${safeOrder}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      pool.query(`SELECT COUNT(*) FROM domains ${where}`, countParams),
    ]);

    res.json({
      data: data.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(count.rows[0].count),
        pages: Math.ceil(count.rows[0].count / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/domains/:id
const getDomain = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT *, (expiry_date - CURRENT_DATE) AS days_to_expiry
       FROM domains WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Domain not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/domains
const createDomain = async (req, res, next) => {
  try {
    const {
      domain_name, registrar, expiry_date, auto_renew, owner, criticality,
      last_renewal_date, renewal_period, annual_cost_inr, payment_method,
      invoice_reference, remarks,
    } = req.body;

    if (!domain_name) return res.status(400).json({ error: 'Domain name is required' });

    const { rows } = await pool.query(
      `INSERT INTO domains
         (domain_name, registrar, expiry_date, auto_renew, owner, criticality,
          last_renewal_date, renewal_period, annual_cost_inr, payment_method,
          invoice_reference, remarks, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *, (expiry_date - CURRENT_DATE) AS days_to_expiry`,
      [
        domain_name.trim(), registrar || null, expiry_date || null,
        auto_renew || false, owner || 'Balasubramanian P', criticality || 'High',
        last_renewal_date || null, renewal_period || 1, annual_cost_inr || null,
        payment_method || null, invoice_reference || null, remarks || null,
        req.user.id,
      ]
    );

    await deleteCachePattern('dashboard:*');
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/domains/:id
const updateDomain = async (req, res, next) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Viewers cannot edit records' });
    }

    const FIELDS = [
      'domain_name', 'registrar', 'expiry_date', 'auto_renew', 'owner',
      'criticality', 'last_renewal_date', 'renewal_period', 'annual_cost_inr',
      'payment_method', 'invoice_reference', 'remarks',
    ];

    const sets = [];
    const vals = [];

    for (const f of FIELDS) {
      if (req.body[f] !== undefined) {
        vals.push(req.body[f]);
        sets.push(`${f} = $${vals.length}`);
      }
    }

    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(req.user.id, req.params.id);
    const { rows } = await pool.query(
      `UPDATE domains SET ${sets.join(', ')}, updated_by = $${vals.length - 1}
       WHERE id = $${vals.length} AND is_active = true
       RETURNING *, (expiry_date - CURRENT_DATE) AS days_to_expiry`,
      vals
    );

    if (!rows[0]) return res.status(404).json({ error: 'Domain not found' });

    await deleteCachePattern('dashboard:*');
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/domains/:id  (soft delete)
const deleteDomain = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete records' });
    }

    const { rows } = await pool.query(
      'UPDATE domains SET is_active = false WHERE id = $1 AND is_active = true RETURNING id',
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Domain not found' });

    await deleteCachePattern('dashboard:*');
    res.json({ message: 'Domain deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/domains/export/excel
const exportExcel = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT sr_no, domain_name, registrar, TO_CHAR(expiry_date,'DD-Mon-YYYY') AS expiry_date,
             (expiry_date - CURRENT_DATE) AS days_to_expiry,
             CASE WHEN auto_renew THEN 'Yes' ELSE 'No' END AS auto_renew,
             owner, criticality, TO_CHAR(last_renewal_date,'DD-Mon-YYYY') AS last_renewal_date,
             renewal_period, annual_cost_inr, payment_method, invoice_reference, remarks
      FROM   domains WHERE is_active = true ORDER BY sr_no
    `);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
      'Sr No': r.sr_no,
      'Domain Name': r.domain_name,
      'Registrar': r.registrar,
      'Expiry Date': r.expiry_date,
      'Days to Expiry': r.days_to_expiry,
      'Auto Renew': r.auto_renew,
      'Owner (IT Person)': r.owner,
      'Criticality': r.criticality,
      'Last Renewal Date': r.last_renewal_date,
      'Renewal Period (Years)': r.renewal_period,
      'Annual Cost (INR)': r.annual_cost_inr,
      'Payment Method': r.payment_method,
      'Invoice Reference': r.invoice_reference,
      'Remarks': r.remarks,
    })));

    XLSX.utils.book_append_sheet(wb, ws, 'Domains');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="domains-${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
};

// POST /api/domains/import  (expects multipart/form-data with field "file")
const importExcel = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    let inserted = 0;
    const errors = [];

    for (const row of rows) {
      const name = row['Domain Name'] || row['domain_name'];
      if (!name) continue;

      try {
        await pool.query(
          `INSERT INTO domains
             (domain_name, registrar, expiry_date, auto_renew, owner, criticality,
              last_renewal_date, renewal_period, annual_cost_inr,
              payment_method, invoice_reference, remarks, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            name,
            row['Registrar'] || row['registrar'] || null,
            row['Expiry Date'] || row['expiry_date'] || null,
            (row['Auto Renew'] || row['auto_renew'] || '').toString().toLowerCase() === 'yes',
            row['Owner (IT Person)'] || row['owner'] || 'Balasubramanian P',
            row['Criticality'] || row['criticality'] || 'High',
            row['Last Renewal Date'] || row['last_renewal_date'] || null,
            row['Renewal Period (Years)'] || row['renewal_period'] || 1,
            row['Annual Cost (INR)'] || row['annual_cost_inr'] || null,
            row['Payment Method'] || row['payment_method'] || null,
            row['Invoice Reference'] || row['invoice_reference'] || null,
            row['Remarks'] || row['remarks'] || null,
            req.user.id,
          ]
        );
        inserted++;
      } catch (e) {
        errors.push({ row: name, error: e.message });
      }
    }

    await deleteCachePattern('dashboard:*');
    res.json({ inserted, errors, total: rows.length });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDomains, getDomain, createDomain, updateDomain, deleteDomain,
  exportExcel, importExcel, upload,
};
