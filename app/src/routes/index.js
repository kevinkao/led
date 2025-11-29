const express = require('express');
const router = express.Router();

// Import route modules
const healthRoutes = require('./health.routes');
const dataProcessRoutes = require('./dataProcess.routes');

// Register routes
router.use('/health', healthRoutes);
router.use('/v1', dataProcessRoutes);

module.exports = router;
