const { prisma } = require('../lib/db');
const { Prisma } = require('@prisma/client');

/**
 * OutageGroup Repository
 * Handles database operations for outages_groups table using Raw SQL with Prisma.sql
 */

/**
 * Find outage group by controller_id and event_type within time range
 * @param {string} controllerId - Controller ID
 * @param {string} eventType - Event type
 * @param {number} timestamp - Unix timestamp to check against (seconds)
 * @returns {Promise<Object|null>} Group object or null
 */
const findByControllerAndEventType = async (controllerId, eventType, timestamp) => {
  // Convert timestamp to datetime string
  const eventTime = new Date(timestamp * 1000);
  const startRange = new Date(eventTime.getTime() - 60 * 60 * 1000); // -60 minutes
  const endRange = new Date(eventTime.getTime() + 60 * 60 * 1000); // +60 minutes

  const result = await prisma.$queryRaw(
    Prisma.sql`
      SELECT id, event_type, controller_id, start_time, end_time, created_at, updated_at
      FROM outages_groups
      WHERE controller_id = ${controllerId}
        AND event_type = ${eventType}
        AND start_time <= ${endRange}
        AND end_time >= ${startRange}
      ORDER BY end_time DESC
      LIMIT 1
    `
  );

  return result.length > 0 ? result[0] : null;
};

/**
 * Create a new outage group
 * @param {Object} data - Group data
 * @param {string} data.eventType - Event type
 * @param {string} data.controllerId - Controller ID
 * @param {number} data.startTime - Start time (unix timestamp in seconds)
 * @param {number} data.endTime - End time (unix timestamp in seconds)
 * @returns {Promise<Object>} Created group object with id
 */
const create = async ({ eventType, controllerId, startTime, endTime }) => {
  const startDate = new Date(startTime * 1000);
  const endDate = new Date(endTime * 1000);

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO outages_groups (event_type, controller_id, start_time, end_time)
      VALUES (${eventType}, ${controllerId}, ${startDate}, ${endDate})
    `
  );

  // Get the last inserted ID
  const lastInsert = await prisma.$queryRaw(
    Prisma.sql`SELECT LAST_INSERT_ID() as id`
  );
  const groupId = Number(lastInsert[0].id);

  // Return the created group
  return {
    id: groupId,
    event_type: eventType,
    controller_id: controllerId,
    start_time: startDate,
    end_time: endDate
  };
};

/**
 * Create a new outage group with transaction support
 * @param {Object} data - Group data
 * @param {string} data.eventType - Event type
 * @param {string} data.controllerId - Controller ID
 * @param {number} data.startTime - Start time (unix timestamp in seconds)
 * @param {number} data.endTime - End time (unix timestamp in seconds)
 * @param {Object} [tx] - Optional Prisma transaction client
 * @returns {Promise<Object>} Created group object with id
 */
const createWithTx = async ({ eventType, controllerId, startTime, endTime }, tx = null) => {
  const client = tx || prisma;
  const startDate = new Date(startTime * 1000);
  const endDate = new Date(endTime * 1000);

  await client.$executeRaw(
    Prisma.sql`
      INSERT INTO outages_groups (event_type, controller_id, start_time, end_time)
      VALUES (${eventType}, ${controllerId}, ${startDate}, ${endDate})
    `
  );

  // Get the last inserted ID
  const lastInsert = await client.$queryRaw(
    Prisma.sql`SELECT LAST_INSERT_ID() as id`
  );
  const groupId = Number(lastInsert[0].id);

  // Return the created group
  return {
    id: groupId,
    event_type: eventType,
    controller_id: controllerId,
    start_time: startDate,
    end_time: endDate
  };
};

/**
 * Update end_time of an outage group
 * @param {number} groupId - Group ID
 * @param {number} endTime - New end time (unix timestamp in seconds)
 * @returns {Promise<Object>} Updated group info
 */
const updateEndTime = async (groupId, endTime) => {
  const endDate = new Date(endTime * 1000);

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE outages_groups
      SET end_time = ${endDate}
      WHERE id = ${groupId}
    `
  );

  return { id: groupId, end_time: endDate };
};

/**
 * Update end_time of an outage group with transaction support
 * @param {number} groupId - Group ID
 * @param {number} endTime - New end time (unix timestamp in seconds)
 * @param {Object} [tx] - Optional Prisma transaction client
 * @returns {Promise<Object>} Updated group info
 */
const updateEndTimeWithTx = async (groupId, endTime, tx = null) => {
  const client = tx || prisma;
  const endDate = new Date(endTime * 1000);

  await client.$executeRaw(
    Prisma.sql`
      UPDATE outages_groups
      SET end_time = ${endDate}
      WHERE id = ${groupId}
    `
  );

  return { id: groupId, end_time: endDate };
};

/**
 * Find outage group by ID
 * @param {number} groupId - Group ID
 * @returns {Promise<Object|null>} Group object or null
 */
const findById = async (groupId) => {
  const result = await prisma.$queryRaw(
    Prisma.sql`
      SELECT id, event_type, controller_id, start_time, end_time, created_at, updated_at
      FROM outages_groups
      WHERE id = ${groupId}
      LIMIT 1
    `
  );

  return result.length > 0 ? result[0] : null;
};

/**
 * Find and count outage groups by query criteria with pagination (Prisma ORM version)
 * @param {Object} filters - Query filters
 * @param {string} filters.outageType - Event type
 * @param {string} [filters.controllerId] - Controller ID (optional)
 * @param {number} filters.startTime - Start time (unix timestamp in seconds)
 * @param {number} filters.endTime - End time (unix timestamp in seconds)
 * @param {Object} [pagination] - Pagination options
 * @param {number} [pagination.offset=0] - Offset for pagination (default: 0)
 * @param {number} [pagination.limit=20] - Limit for pagination (default: 20)
 * @returns {Promise<{data: Array, total: number}>} Object containing data array and total count
 */
const findAndCountByQueryCriteria = async (filters, pagination = {}) => {
  const { outageType, controllerId, startTime, endTime } = filters;
  const { offset = 0, limit = 20 } = pagination;

  // Convert unix timestamps to Date objects
  const queryStartTime = new Date(startTime * 1000);
  const queryEndTime = new Date(endTime * 1000);

  // Build where condition dynamically
  const where = {
    eventType: outageType,
    startTime: { lte: queryEndTime },
    endTime: { gte: queryStartTime }
  };

  // Add controllerId only if provided
  if (controllerId) {
    where.controllerId = controllerId;
  }

  // Execute findMany and count in parallel
  const [data, total] = await Promise.all([
    prisma.outagesGroup.findMany({
      where,
      orderBy: { startTime: 'desc' },
      skip: offset,
      take: limit
    }),
    prisma.outagesGroup.count({ where })
  ]);

  return { data, total };
};

module.exports = {
  findByControllerAndEventType,
  create,
  createWithTx,
  updateEndTime,
  updateEndTimeWithTx,
  findById,
  findAndCountByQueryCriteria
};
