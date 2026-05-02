const { pool } = require('../db');
const { deleteCachePattern } = require('../config/redis');
const XLSX = require('xlsx');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const ALLOWED_SORT_COLS = ['sr_no', 'product_name', 'expiry_date', 'criticality', 'vendor', 'annual_cost_inr'];

// GET /api/software
const getSoftware = async (req, res, next) => {
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
      conditions.push(`(product_name ILIKE $${params.length} OR vendor ILIKE $${params.length} OR assigned_to ILIKE $${params.length})`);
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
         FROM software_licenses ${where}
         ORDER BY ${safeSort} ${safeOrder}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      pool.query(`SELECT COUNT(*) FROM software_licenses ${where}`, countParams),
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

// GET /api/software/:id
const getSoftwareById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT *, (expiry_date - CURRENT_DATE) AS days_to_expiry
       FROM software_licenses WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Record not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/software
const createSoftware = async (req, res, next) => {
  try {
    const {
      product_name, vendor, license_type, license_count, expiry_date,
      auto_renew, criticality, annual_cost_inr, payment_method,
      invoice_reference, assigned_to, owner, remarks,
    } = req.body;

    if (!product_name) return res.status(400).json({ error: 'Product name is required' });

    const { rows } = await pool.query(
      `INSERT INTO software_licenses
         (product_name, vendor, license_type, license_count, expiry_date, auto_renew,
          criticality, annual_cost_inr, payment_method, invoice_reference,
          assigned_to, owner, remarks, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *, (expiry_date - CURRENT_DATE) AS days_to_expiry`,
      [
        product_name.trim(), vendor || null, license_type || null, license_count || 1,
        expiry_date || null, auto_renew || false, criticality || 'High',
        annual_cost_inr || null, payment_method || null, invoice_reference || null,
        assigned_to || null, owner || 'Balasubramanian P', remarks || null, req.user.id,
      ]
    );

    await deleteCachePattern('dashboard:*');
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/software/:id
const updateSoftware = async (req, res, next) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Viewers cannot edit records' });
    }

    const FIELDS = [
      'product_name', 'vendor', 'license_type', 'license_count', 'expiry_date',
      'auto_renew', 'criticality', 'annual_cost_inr', 'payment_method',
      'invoice_reference', 'assigned_to', 'owner', 'remarks',
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
      `UPDATE software_licenses SET ${sets.join(', ')}, updated_by = $${vals.length - 1}
       WHERE id = $${vals.length} AND is_active = true
       RETURNING *, (expiry_date - CURRENT_DATE) AS days_to_expiry`,
      vals
    );

    if (!rows[0]) return res.status(404).json({ error: 'Record not found' });

    await deleteCachePattern('dashboard:*');
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/software/:id  (soft delete)
const deleteSoftware = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete records' });
    }

    const { rows } = await pool.query(
      'UPDATE software_licenses SET is_active = false WHERE id = $1 AND is_active = true RETURNING id',
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Record not found' });

    await deleteCachePattern('dashboard:*');
    res.json({ message: 'Software license deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/software/export/excel
const exportExcel = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT sr_no, product_name, vendor, license_type, license_count,
             TO_CHAR(expiry_date,'DD-Mon-YYYY') AS expiry_date,
             (expiry_date - CURRENT_DATE) AS days_to_expiry,
             CASE WHEN auto_renew THEN 'Yes' ELSE 'No' END AS auto_renew,
             criticality, annual_cost_inr, payment_method, invoice_reference,
             assigned_to, owner, remarks
      FROM   software_licenses WHERE is_active = true ORDER BY sr_no
    `);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
      'Sr No': r.sr_no,
      'Product Name': r.product_name,
      'Vendor': r.vendor,
      'License Type': r.license_type,
      'License Count': r.license_count,
      'Expiry Date': r.expiry_date,
      'Days to Expiry': r.days_to_expiry,
      'Auto Renew': r.auto_renew,
      'Criticality': r.criticality,
      'Annual Cost (INR)': r.annual_cost_inr,
      'Payment Method': r.payment_method,
      'Invoice Reference': r.invoice_reference,
      'Assigned To': r.assigned_to,
      'Owner': r.owner,
      'Remarks': r.remarks,
    })));

    XLSX.utils.book_append_sheet(wb, ws, 'Software Licenses');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="software-${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSoftware, getSoftwareById, createSoftware, updateSoftware,
  deleteSoftware, exportExcel, upload,
};
