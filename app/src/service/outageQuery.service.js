const outageGroupRepo = require('../repository/outageGroup.repository');

/**
 * Outage Query Service
 * Handles business logic for querying outage groups
 */

/**
 * Query outage groups with filters and pagination
 * @param {Object} queryParams - Query parameters
 * @param {string} queryParams.outageType - Event type
 * @param {string} [queryParams.controllerId] - Controller ID (optional)
 * @param {number} queryParams.startTime - Start time (unix timestamp in seconds)
 * @param {number} queryParams.endTime - End time (unix timestamp in seconds)
 * @param {number} [queryParams.offset] - Pagination offset (default: 0)
 * @param {number} [queryParams.limit] - Pagination limit (default: 20)
 * @returns {Promise<Object>} Query results with pagination
 */
const queryOutageGroups = async (queryParams) => {
  const {
    outageType,
    controllerId,
    startTime,
    endTime,
    offset = 0,
    limit = 20
  } = queryParams;

  // Build filters object
  const filters = {
    outageType,
    startTime,
    endTime
  };

  // Add optional controller_id if provided
  if (controllerId) {
    filters.controllerId = controllerId;
  }

  // Build pagination object
  const pagination = {
    offset,
    limit
  };

  // Query database for groups and total count using optimized function
  const { data: groups, total } = await outageGroupRepo.findAndCountByQueryCriteria(filters, pagination);

  // Transform data for response
  const transformedData = groups.map(group => ({
    id: Number(group.id),
    outage_type: group.eventType,
    controller_id: group.controllerId,
    start_time: String(Math.floor(group.startTime.getTime() / 1000)),
    end_time: String(Math.floor(group.endTime.getTime() / 1000))
  }));

  // Return formatted response
  return {
    data: transformedData,
    pagination: {
      total,
      offset,
      limit
    }
  };
};

module.exports = {
  queryOutageGroups
};
