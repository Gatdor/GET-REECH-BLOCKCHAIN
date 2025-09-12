const express = require('express');
const { invokeChaincode, queryChaincode } = require('./blockchain');
const app = express();
app.use(express.json());

// Register Fisher
app.post('/api/register-fisher', async (req, res) => {
    try {
        const { fisherID, name, govtID } = req.body;
        await invokeChaincode('RegisterFisher', fisherID, name, govtID);
        res.status(200).json({ message: 'Fisher registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Log Catch
app.post('/api/log-catch', async (req, res) => {
    try {
        const { catchID, fisherID, species, weightKg, date } = req.body;
        await invokeChaincode('LogCatch', catchID, fisherID, species, weightKg.toString(), date);
        res.status(200).json({ message: 'Catch logged successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Catch
app.get('/api/get-catch/:catchID', async (req, res) => {
    try {
        const result = await queryChaincode('GetCatch', req.params.catchID);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Batch
app.post('/api/create-batch', async (req, res) => {
    try {
        const { batchID, catchID, processorID, date } = req.body;
        await invokeChaincode('CreateBatch', batchID, JSON.stringify([catchID]), processorID, date);
        res.status(200).json({ message: 'Batch created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Track Batch
app.get('/api/track-batch/:batchID', async (req, res) => {
    try {
        const result = await queryChaincode('TrackBatch', req.params.batchID);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));