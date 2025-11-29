/**
 * Data Process Validation Middleware
 * Validates incoming request data for data process API
 */

/**
 * Allowed event types
 */
const ALLOWED_EVENT_TYPES = ['panel_outage', 'temperature_outage', 'led_outage'];

/**
 * Validate data process request body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateDataProcessRequest = (req, res, next) => {
  const { controller_id, event_type, timestamp } = req.body;

  // Validate controller_id
  if (!controller_id) {
    return res.status(400).json({
      success: false,
      error: 'controller_id is required'
    });
  }

  if (typeof controller_id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'controller_id must be a string'
    });
  }

  if (controller_id.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'controller_id cannot be empty'
    });
  }

  // Validate event_type
  if (!event_type) {
    return res.status(400).json({
      success: false,
      error: 'event_type is required'
    });
  }

  if (typeof event_type !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'event_type must be a string'
    });
  }

  if (!ALLOWED_EVENT_TYPES.includes(event_type)) {
    return res.status(400).json({
      success: false,
      error: `event_type must be one of: ${ALLOWED_EVENT_TYPES.join(', ')}`
    });
  }

  // Validate timestamp
  if (timestamp === undefined || timestamp === null) {
    return res.status(400).json({
      success: false,
      error: 'timestamp is required'
    });
  }

  // Check if timestamp is a number
  const parsedTimestamp = Number(timestamp);
  if (isNaN(parsedTimestamp)) {
    return res.status(400).json({
      success: false,
      error: 'timestamp must be a valid number'
    });
  }

  // Check if timestamp is a valid unix timestamp (positive integer)
  if (!Number.isInteger(parsedTimestamp) || parsedTimestamp < 0) {
    return res.status(400).json({
      success: false,
      error: 'timestamp must be a valid unix timestamp (positive integer)'
    });
  }

  // Check if timestamp is within a reasonable range (not too far in the past or future)
  // Unix timestamp 0 = 1970-01-01, let's say minimum is 2000-01-01 (946684800)
  // Maximum is 2100-01-01 (4102444800)
  const MIN_TIMESTAMP = 946684800;
  const MAX_TIMESTAMP = 4102444800;

  if (parsedTimestamp < MIN_TIMESTAMP || parsedTimestamp > MAX_TIMESTAMP) {
    return res.status(400).json({
      success: false,
      error: 'timestamp is out of valid range (must be between 2000-01-01 and 2100-01-01)'
    });
  }

  // All validations passed, proceed to next middleware
  next();
};

module.exports = {
  validateDataProcessRequest
};
