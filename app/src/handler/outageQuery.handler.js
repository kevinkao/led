const outageQueryService = require('../service/outageQuery.service');

/**
 * Outage Query Handler
 * Handles HTTP requests for querying outage groups
 */

/**
 * Query outage groups
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const queryOutageGroups = async (req, res, next) => {
  try {
    const {
      outage_type,
      controller_id,
      start_time,
      end_time,
      offset,
      limit
    } = req.query;

    // Prepare query parameters
    const queryParams = {
      outageType: outage_type,
      startTime: Number(start_time),
      endTime: Number(end_time)
    };

    // Add optional parameters
    if (controller_id) {
      queryParams.controllerId = controller_id;
    }

    if (offset !== undefined) {
      queryParams.offset = Number(offset);
    }

    if (limit !== undefined) {
      queryParams.limit = Number(limit);
    }

    // Query outage groups
    const result = await outageQueryService.queryOutageGroups(queryParams);

    // Return success response
    res.status(200).json(result);
  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
};

module.exports = {
  queryOutageGroups
};
