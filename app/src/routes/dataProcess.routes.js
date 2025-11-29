const express = require('express');
const router = express.Router();
const dataProcessHandler = require('../handler/dataProcess.handler');
const { validateDataProcessRequest } = require('../middleware/dataProcessValidation');

/**
 * POST /api/v1/data-process
 * Process outage event data
 */
router.post('/data-process', validateDataProcessRequest, dataProcessHandler.processData);

module.exports = router;
