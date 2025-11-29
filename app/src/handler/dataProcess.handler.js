const dataProcessService = require('../service/dataProcess.service');

/**
 * Data Process Handler
 * Handles HTTP requests for data processing
 */

/**
 * Process outage event data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const processData = async (req, res, next) => {
  try {
    const { controller_id, event_type, timestamp } = req.body;

    // Process the outage event
    const result = await dataProcessService.processOutageEvent({
      controller_id,
      event_type,
      timestamp: Number(timestamp)
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Event processed successfully',
      data: result
    });
  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
};

module.exports = {
  processData
};
