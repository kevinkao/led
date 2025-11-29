const express = require('express');
const router = express.Router();
const dataProcessHandler = require('../handler/dataProcess.handler');
const outageQueryHandler = require('../handler/outageQuery.handler');
const { validateDataProcessRequest } = require('../middleware/dataProcessValidation');
const { validateOutageQueryRequest } = require('../middleware/outageQueryValidation');

/**
 * POST /api/v1/data-process
 * Process outage event data
 */
router.post('/data-process', validateDataProcessRequest, dataProcessHandler.processData);

/**
 * GET /api/v1/outages/groups
 * Query outage groups with filters and pagination
 */
router.get('/outages/groups', validateOutageQueryRequest, outageQueryHandler.queryOutageGroups);

module.exports = router;
