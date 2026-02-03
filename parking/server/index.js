const express = require('express');
const path = require('path');
const { pool } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

const lotSelectFields = `
  id,
  name,
  capacity,
  occupancy,
  is_open,
  updated_at,
  CASE WHEN is_open THEN capacity - occupancy ELSE 0 END AS available
`;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/lots', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${lotSelectFields} FROM lots ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/lots failed', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/lots/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid lot id' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT ${lotSelectFields} FROM lots WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/lots/:id failed', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/lots/:id/open', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid lot id' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE lots
       SET is_open = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING ${lotSelectFields}`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/lots/:id/open failed', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/lots/:id/close', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid lot id' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE lots
       SET is_open = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING ${lotSelectFields}`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/lots/:id/close failed', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/lots/:id/occupancy', async (req, res) => {
  const id = Number(req.params.id);
  const occupancy = Number(req.body.occupancy);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid lot id' });
  }

  if (!Number.isInteger(occupancy) || occupancy < 0) {
    return res.status(400).json({ error: 'Invalid occupancy' });
  }

  try {
    const { rows: lotRows } = await pool.query(
      'SELECT capacity FROM lots WHERE id = $1',
      [id]
    );

    if (lotRows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    const capacity = lotRows[0].capacity;
    if (occupancy > capacity) {
      return res.status(400).json({
        error: `Occupancy cannot exceed capacity (${capacity})`,
      });
    }

    const { rows } = await pool.query(
      `UPDATE lots
       SET occupancy = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING ${lotSelectFields}`,
      [id, occupancy]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/lots/:id/occupancy failed', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(port, () => {
  console.log(`Parking occupancy app listening on port ${port}`);
});
