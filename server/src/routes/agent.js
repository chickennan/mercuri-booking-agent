const express = require('express');
const { handleAgentRequest } = require('../services/agentService');

const router = express.Router();

// POST /api/agent  { message, name }
router.post('/', async (req, res, next) => {
  const { message, name } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required.' });
  }

  try {
    const result = await handleAgentRequest({ message, name });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;