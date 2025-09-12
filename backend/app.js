// ~/Documents/GitHub/GET-REECH/backend/app.js

const express = require('express');
const cors = require('cors');
const { logCatch, getCatch } = require('../fabric-service/fabric');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ----------- ROUTES -----------

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'GET-REECH backend' });
});

// Submit a catch to Fabric
app.post('/submit-catch', async (req, res) => {
  try {
    const { catchId, fisherId, species, weightKg, date } = req.body;
    if (!catchId || !fisherId || !species || !weightKg || !date) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: catchId, fisherId, species, weightKg, date' });
    }

    const result = await logCatch(catchId, fisherId, species, weightKg, date);
    res.json({ status: 'success', result });
  } catch (err) {
    console.error('[submit-catch] ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Query a catch from Fabric
app.get('/get-catch/:catchId', async (req, res) => {
  try {
    const catchId = req.params.catchId;
    if (!catchId) return res.status(400).json({ error: 'Missing catchId' });

    const result = await getCatch(catchId);
    res.json(result);
  } catch (err) {
    console.error('[get-catch] ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ----------- START SERVER -----------
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
