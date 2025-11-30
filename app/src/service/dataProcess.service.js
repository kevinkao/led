const { getRedisClient } = require('../lib/redis');
const outageGroupRepo = require('../repository/outageGroup.repository');
const outageItemRepo = require('../repository/outageItem.repository');
const { prisma } = require('../lib/db');

/**
 * DataProcess Service
 * Core business logic for processing outage events and aggregation
 */

/**
 * Generate Redis cache key for outage group
 * @param {string} controllerId - Controller ID
 * @param {string} eventType - Event type
 * @returns {string} Redis key
 */
const generateCacheKey = (controllerId, eventType) => {
  return `outage_group:${controllerId}:${eventType}`;
};

/**
 * Get cached group from Redis
 * @param {string} controllerId - Controller ID
 * @param {string} eventType - Event type
 * @returns {Promise<Object|null>} Cached group object or null
 */
const getCachedGroup = async (controllerId, eventType) => {
  const redis = await getRedisClient();
  const cacheKey = generateCacheKey(controllerId, eventType);

  const cached = await redis.get(cacheKey);

  if (!cached) {
    return null;
  }

  return JSON.parse(cached);
};

/**
 * Set group to Redis cache
 * @param {string} controllerId - Controller ID
 * @param {string} eventType - Event type
 * @param {Object} group - Group object to cache
 * @param {number} ttl - TTL in seconds (default: 1 hours)
 * @returns {Promise<void>}
 */
const setCachedGroup = async (controllerId, eventType, group, ttl = 3600) => {
  const redis = await getRedisClient();
  const cacheKey = generateCacheKey(controllerId, eventType);

  const groupWithStringId = {
    ...group,
    id: group.id.toString()
  };

  await redis.setEx(cacheKey, ttl, JSON.stringify(groupWithStringId));
};

/**
 * Check if event timestamp is within group's time range (±60 minutes)
 * @param {Object} group - Group object
 * @param {number} timestamp - Event timestamp (unix timestamp in seconds)
 * @returns {boolean} True if in range
 */
const isEventInTimeRange = (group, timestamp) => {
  const eventTime = timestamp * 1000; // Convert to milliseconds
  const startTime = new Date(group.start_time).getTime();
  const endTime = new Date(group.end_time).getTime();

  const sixtyMinutesInMs = 60 * 60 * 1000;

  const rangeStart = startTime - sixtyMinutesInMs;
  const rangeEnd = endTime + sixtyMinutesInMs;

  return eventTime >= rangeStart && eventTime <= rangeEnd;
};

/**
 * Find matching group from database
 * @param {string} controllerId - Controller ID
 * @param {string} eventType - Event type
 * @param {number} timestamp - Event timestamp (unix timestamp in seconds)
 * @returns {Promise<Object|null>} Group object or null
 */
const findMatchingGroup = async (controllerId, eventType, timestamp) => {
  return await outageGroupRepo.findByControllerAndEventType(controllerId, eventType, timestamp);
};

/**
 * Create new group and add first event item
 * @param {string} controllerId - Controller ID
 * @param {string} eventType - Event type
 * @param {number} timestamp - Event timestamp (unix timestamp in seconds)
 * @returns {Promise<Object>} Created group object
 */
const createNewGroup = async (controllerId, eventType, timestamp) => {
  // Use transaction to ensure atomicity of DB operations
  const newGroup = await prisma.$transaction(async (tx) => {
    // Create new group with start_time and end_time both set to timestamp
    const group = await outageGroupRepo.createWithTx({
      eventType,
      controllerId,
      startTime: timestamp,
      endTime: timestamp
    }, tx);

    // Create the first item
    await outageItemRepo.createWithTx({
      groupId: group.id,
      occurrenceTime: timestamp
    }, tx);

    return group;
  });

  // Cache the new group (outside transaction)
  await setCachedGroup(controllerId, eventType, newGroup);

  return newGroup;
};

/**
 * Add event to existing group
 * @param {Object} group - Group object
 * @param {number} timestamp - Event timestamp (unix timestamp in seconds)
 * @returns {Promise<Object>} Updated group object
 */
const addEventToGroup = async (group, timestamp) => {
  // Use transaction to ensure atomicity of DB operations
  const updatedGroup = await prisma.$transaction(async (tx) => {
    // Create new item for this event
    await outageItemRepo.createWithTx({
      groupId: group.id,
      occurrenceTime: timestamp
    }, tx);

    // Compare event timestamp with group's time range
    const eventTime = timestamp * 1000; // Convert to milliseconds
    const groupStartTime = new Date(group.start_time).getTime();
    const groupEndTime = new Date(group.end_time).getTime();

    let updated;

    if (eventTime < groupStartTime) {
      // Event is earlier than current start_time, update start_time
      updated = await outageGroupRepo.updateStartTimeWithTx(group.id, timestamp, tx);
    } else if (eventTime > groupEndTime) {
      // Event is later than current end_time, update end_time
      updated = await outageGroupRepo.updateEndTimeWithTx(group.id, timestamp, tx);
    } else {
      // Event is within the current time range, no update needed
      updated = group;
    }

    return updated;
  });

  // Update cache with new time range (outside transaction)
  const groupToCache = {
    ...group,
    ...(updatedGroup.start_time && { start_time: updatedGroup.start_time }),
    ...(updatedGroup.end_time && { end_time: updatedGroup.end_time })
  };
  await setCachedGroup(group.controller_id, group.event_type, groupToCache);

  return updatedGroup;
};

/**
 * Main process function to handle outage event
 * @param {Object} eventData - Event data
 * @param {string} eventData.controller_id - Controller ID
 * @param {string} eventData.event_type - Event type
 * @param {number} eventData.timestamp - Unix timestamp in seconds
 * @returns {Promise<Object>} Processing result
 */
const processOutageEvent = async ({ controller_id, event_type, timestamp }) => {
  // Step 1: Check Redis cache
  const cachedGroup = await getCachedGroup(controller_id, event_type);

  if (cachedGroup) {
    // Check if event is within cached group's time range
    if (isEventInTimeRange(cachedGroup, timestamp)) {
      // Add event to cached group
      await addEventToGroup(cachedGroup, timestamp);
      return {
        success: true,
        action: 'added_to_cached_group',
        group_id: cachedGroup.id
      };
    }
  }

  // Step 2: Check database for matching group
  const dbGroup = await findMatchingGroup(controller_id, event_type, timestamp);

  if (dbGroup) {
    // Add event to database group
    await addEventToGroup(dbGroup, timestamp);
    return {
      success: true,
      action: 'added_to_db_group',
      group_id: dbGroup.id
    };
  }

  // Step 3: Create new group
  const newGroup = await createNewGroup(controller_id, event_type, timestamp);
  return {
    success: true,
    action: 'created_new_group',
    group_id: newGroup.id
  };
};

module.exports = {
  processOutageEvent,
  getCachedGroup,
  setCachedGroup,
  isEventInTimeRange,
  findMatchingGroup,
  createNewGroup,
  addEventToGroup
};
