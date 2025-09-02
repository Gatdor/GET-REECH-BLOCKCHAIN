const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabase');

router.post('/catch-logs', async (req, res) => {
  const data = req.body;
  const { error } = await supabase.from('catch_logs').insert(data);
  if (error) return res.status(500).json({ error });
  res.json({ success: true });
});