const { getRedisClient } = require('../lib/redis');
const outageGroupRepo = require('../repository/outageGroup.repository');
const outageItemRepo = require('../repository/outageItem.repository');

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
 * @param {number} ttl - TTL in seconds (default: 2 hours)
 * @returns {Promise<void>}
 */
const setCachedGroup = async (controllerId, eventType, group, ttl = 7200) => {
  const redis = await getRedisClient();
  const cacheKey = generateCacheKey(controllerId, eventType);
  //   Transform the bigint to string
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
  // Create new group with start_time and end_time both set to timestamp
  const newGroup = await outageGroupRepo.create({
    eventType,
    controllerId,
    startTime: timestamp,
    endTime: timestamp
  });

  // Create the first item
  await outageItemRepo.create({
    groupId: newGroup.id,
    occurrenceTime: timestamp
  });

  // Cache the new group
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
  // Create new item for this event
  await outageItemRepo.create({
    groupId: group.id,
    occurrenceTime: timestamp
  });

  // Find the last item to get the latest occurrence_time
  const lastItem = await outageItemRepo.findLastItemByGroupId(group.id);

  if (!lastItem) {
    throw new Error('Failed to find last item after creation');
  }

  // Convert occurrence_time to unix timestamp
  const lastOccurrenceTime = Math.floor(new Date(lastItem.occurrence_time).getTime() / 1000);

  // Update group's end_time to the last item's occurrence_time
  const updatedGroup = await outageGroupRepo.updateEndTime(group.id, lastOccurrenceTime);

  // Update cache with new end_time
  const groupToCache = {
    ...group,
    end_time: updatedGroup.end_time
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
