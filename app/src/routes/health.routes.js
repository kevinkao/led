const express = require('express');
const router = express.Router();
const healthHandler = require('../handler/health.handler');
const { requestLogger } = require('../middleware/logger');

// GET /api/health
router.get('/', healthHandler.checkHealth);

module.exports = router;
