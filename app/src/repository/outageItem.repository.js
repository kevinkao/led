const { prisma } = require('../lib/db');
const { Prisma } = require('@prisma/client');

/**
 * OutageItem Repository
 * Handles database operations for outages_items table using Raw SQL with Prisma.sql
 */

/**
 * Create a new outage item
 * @param {Object} data - Item data
 * @param {number} data.groupId - Group ID
 * @param {number} data.occurrenceTime - Occurrence time (unix timestamp in seconds)
 * @returns {Promise<Object>} Created item object with id
 */
const create = async ({ groupId, occurrenceTime }) => {
  const occurrenceDate = new Date(occurrenceTime * 1000);

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO outages_items (group_id, occurrence_time)
      VALUES (${groupId}, ${occurrenceDate})
    `
  );

  // Get the last inserted ID
  const lastInsert = await prisma.$queryRaw(
    Prisma.sql`SELECT LAST_INSERT_ID() as id`
  );
  const itemId = Number(lastInsert[0].id);

  // Return the created item
  return {
    id: itemId,
    group_id: groupId,
    occurrence_time: occurrenceDate
  };
};

/**
 * Find the last item by group_id (ordered by occurrence_time DESC)
 * @param {number} groupId - Group ID
 * @returns {Promise<Object|null>} Item object or null
 */
const findLastItemByGroupId = async (groupId) => {
  const result = await prisma.$queryRaw(
    Prisma.sql`
      SELECT id, group_id, occurrence_time
      FROM outages_items
      WHERE group_id = ${groupId}
      ORDER BY occurrence_time DESC
      LIMIT 1
    `
  );

  return result.length > 0 ? result[0] : null;
};

module.exports = {
  create,
  findLastItemByGroupId
};
