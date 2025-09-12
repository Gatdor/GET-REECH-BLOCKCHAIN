const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/submit-catch', (req, res) => {
    const { catchId, fisherId, species, weightKg, date } = req.body;
    console.log(`Catch received: ${catchId}, ${fisherId}, ${species}, ${weightKg}kg on ${date}`);
    res.json({ status: 'success', transaction: `hash_${catchId}` });
});

app.post('/update-catch-status', (req, res) => {
    const { catchId, fisherId, status } = req.body;
    console.log(`Catch status updated: ${catchId}, ${status}`);
    res.json({ status: 'success', transaction: `hash_approval_${catchId}` });
});

app.get('/get-catch/:catchId', (req, res) => {
    const { catchId } = req.params;
    res.json({ catchId, species: 'Tilapia', weightKg: 12, date: '2025-09-08', status: 'Pending' });
});

app.listen(3000, () => {
    console.log('Fabric API server running on http://localhost:3000');
});

