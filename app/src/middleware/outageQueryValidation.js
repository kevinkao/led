/**
 * Outage Query Validation Middleware
 * Validates incoming request query parameters for outage query API
 */

/**
 * Allowed event types
 */
const ALLOWED_EVENT_TYPES = ['panel_outage', 'temperature_outage', 'led_outage'];

/**
 * Valid timestamp range
 * Minimum: 2000-01-01 (946684800)
 * Maximum: 2100-01-01 (4102444800)
 */
const MIN_TIMESTAMP = 946684800;
const MAX_TIMESTAMP = 4102444800;

/**
 * Validate outage query request parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateOutageQueryRequest = (req, res, next) => {
  const { outage_type, controller_id, start_time, end_time, offset, limit } = req.query;

  // Validate outage_type
  if (!outage_type) {
    return res.status(400).json({
      success: false,
      error: 'outage_type is required'
    });
  }

  if (typeof outage_type !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'outage_type must be a string'
    });
  }

  if (!ALLOWED_EVENT_TYPES.includes(outage_type)) {
    return res.status(400).json({
      success: false,
      error: `outage_type must be one of: ${ALLOWED_EVENT_TYPES.join(', ')}`
    });
  }

  // Validate start_time
  if (start_time === undefined || start_time === null) {
    return res.status(400).json({
      success: false,
      error: 'start_time is required'
    });
  }

  const parsedStartTime = Number(start_time);
  if (isNaN(parsedStartTime)) {
    return res.status(400).json({
      success: false,
      error: 'start_time must be a valid number'
    });
  }

  if (!Number.isInteger(parsedStartTime) || parsedStartTime < 0) {
    return res.status(400).json({
      success: false,
      error: 'start_time must be a valid unix timestamp (positive integer)'
    });
  }

  if (parsedStartTime < MIN_TIMESTAMP || parsedStartTime > MAX_TIMESTAMP) {
    return res.status(400).json({
      success: false,
      error: 'start_time is out of valid range (must be between 2000-01-01 and 2100-01-01)'
    });
  }

  // Validate end_time
  if (end_time === undefined || end_time === null) {
    return res.status(400).json({
      success: false,
      error: 'end_time is required'
    });
  }

  const parsedEndTime = Number(end_time);
  if (isNaN(parsedEndTime)) {
    return res.status(400).json({
      success: false,
      error: 'end_time must be a valid number'
    });
  }

  if (!Number.isInteger(parsedEndTime) || parsedEndTime < 0) {
    return res.status(400).json({
      success: false,
      error: 'end_time must be a valid unix timestamp (positive integer)'
    });
  }

  if (parsedEndTime < MIN_TIMESTAMP || parsedEndTime > MAX_TIMESTAMP) {
    return res.status(400).json({
      success: false,
      error: 'end_time is out of valid range (must be between 2000-01-01 and 2100-01-01)'
    });
  }

  // Validate start_time <= end_time
  if (parsedStartTime > parsedEndTime) {
    return res.status(400).json({
      success: false,
      error: 'start_time cannot be greater than end_time'
    });
  }

  // Validate controller_id (optional)
  if (controller_id !== undefined) {
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
  }

  // Validate offset (optional)
  if (offset !== undefined) {
    const parsedOffset = Number(offset);
    if (isNaN(parsedOffset)) {
      return res.status(400).json({
        success: false,
        error: 'offset must be a valid number'
      });
    }

    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        success: false,
        error: 'offset must be a non-negative integer'
      });
    }
  }

  // Validate limit (optional)
  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (isNaN(parsedLimit)) {
      return res.status(400).json({
        success: false,
        error: 'limit must be a valid number'
      });
    }

    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({
        success: false,
        error: 'limit must be a positive integer'
      });
    }
  }

  // All validations passed, proceed to next middleware
  next();
};

module.exports = {
  validateOutageQueryRequest
};
