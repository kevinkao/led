const dataProcessService = require('../../service/dataProcess.service');
const outageGroupRepo = require('../../repository/outageGroup.repository');
const outageItemRepo = require('../../repository/outageItem.repository');
const { getRedisClient } = require('../../lib/redis');

// Mock dependencies
jest.mock('../../repository/outageGroup.repository');
jest.mock('../../repository/outageItem.repository');
jest.mock('../../lib/redis');

describe('DataProcessService', () => {
  let mockRedisClient;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      setEx: jest.fn()
    };
    getRedisClient.mockResolvedValue(mockRedisClient);
  });

  describe('processOutageEvent', () => {
    const baseEventData = {
      controller_id: 'AOT1D-25090001',
      event_type: 'led_outage',
      timestamp: 1756665796 // Example timestamp
    };

    describe('Scenario 1: Create new group (no cache, no DB match)', () => {
      it('should create a new group when no existing group is found', async () => {
        // Arrange
        const mockNewGroup = {
          id: 1,
          event_type: 'led_outage',
          controller_id: 'AOT1D-25090001',
          start_time: new Date(baseEventData.timestamp * 1000),
          end_time: new Date(baseEventData.timestamp * 1000)
        };

        mockRedisClient.get.mockResolvedValue(null); // No cache
        outageGroupRepo.findByControllerAndEventType.mockResolvedValue(null); // No DB match
        outageGroupRepo.create.mockResolvedValue(mockNewGroup);
        outageItemRepo.create.mockResolvedValue({
          id: 1,
          group_id: 1,
          occurrence_time: new Date(baseEventData.timestamp * 1000)
        });

        // Act
        const result = await dataProcessService.processOutageEvent(baseEventData);

        // Assert
        expect(result).toEqual({
          success: true,
          action: 'created_new_group',
          group_id: 1
        });
        expect(outageGroupRepo.create).toHaveBeenCalledWith({
          eventType: baseEventData.event_type,
          controllerId: baseEventData.controller_id,
          startTime: baseEventData.timestamp,
          endTime: baseEventData.timestamp
        });
        expect(outageItemRepo.create).toHaveBeenCalledWith({
          groupId: 1,
          occurrenceTime: baseEventData.timestamp
        });
        expect(mockRedisClient.setEx).toHaveBeenCalled();
      });
    });

    describe('Scenario 2: Add to cached group (cache hit, within time range)', () => {
      it('should add event to cached group when found in cache and within time range', async () => {
        // Arrange
        const cachedGroup = {
          id: 1,
          event_type: 'led_outage',
          controller_id: 'AOT1D-25090001',
          start_time: new Date((baseEventData.timestamp - 600) * 1000), // 10 minutes before
          end_time: new Date((baseEventData.timestamp - 600) * 1000)
        };

        const mockLastItem = {
          id: 2,
          group_id: 1,
          occurrence_time: new Date(baseEventData.timestamp * 1000)
        };

        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedGroup));
        outageItemRepo.create.mockResolvedValue({
          id: 2,
          group_id: 1,
          occurrence_time: new Date(baseEventData.timestamp * 1000)
        });
        outageItemRepo.findLastItemByGroupId.mockResolvedValue(mockLastItem);
        outageGroupRepo.updateEndTime.mockResolvedValue({
          id: 1,
          end_time: new Date(baseEventData.timestamp * 1000)
        });

        // Act
        const result = await dataProcessService.processOutageEvent(baseEventData);

        // Assert
        expect(result).toEqual({
          success: true,
          action: 'added_to_cached_group',
          group_id: 1
        });
        expect(outageItemRepo.create).toHaveBeenCalledWith({
          groupId: 1,
          occurrenceTime: baseEventData.timestamp
        });
        expect(outageGroupRepo.updateEndTime).toHaveBeenCalledWith(1, baseEventData.timestamp);
      });
    });

    describe('Scenario 3: Add to DB group (cache miss, DB hit)', () => {
      it('should add event to DB group when not in cache but found in DB', async () => {
        // Arrange
        const dbGroup = {
          id: 2,
          event_type: 'led_outage',
          controller_id: 'AOT1D-25090001',
          start_time: new Date((baseEventData.timestamp - 1200) * 1000), // 20 minutes before
          end_time: new Date((baseEventData.timestamp - 1200) * 1000)
        };

        const mockLastItem = {
          id: 3,
          group_id: 2,
          occurrence_time: new Date(baseEventData.timestamp * 1000)
        };

        mockRedisClient.get.mockResolvedValue(null); // No cache
        outageGroupRepo.findByControllerAndEventType.mockResolvedValue(dbGroup);
        outageItemRepo.create.mockResolvedValue({
          id: 3,
          group_id: 2,
          occurrence_time: new Date(baseEventData.timestamp * 1000)
        });
        outageItemRepo.findLastItemByGroupId.mockResolvedValue(mockLastItem);
        outageGroupRepo.updateEndTime.mockResolvedValue({
          id: 2,
          end_time: new Date(baseEventData.timestamp * 1000)
        });

        // Act
        const result = await dataProcessService.processOutageEvent(baseEventData);

        // Assert
        expect(result).toEqual({
          success: true,
          action: 'added_to_db_group',
          group_id: 2
        });
        expect(outageGroupRepo.findByControllerAndEventType).toHaveBeenCalledWith(
          baseEventData.controller_id,
          baseEventData.event_type,
          baseEventData.timestamp
        );
      });
    });

    describe('Scenario 4: Time gap exceeds 60 minutes, create new group', () => {
      it('should create new group when cached group exists but time gap exceeds 60 minutes', async () => {
        // Arrange
        const cachedGroup = {
          id: 1,
          event_type: 'led_outage',
          controller_id: 'AOT1D-25090001',
          start_time: new Date((baseEventData.timestamp - 7200) * 1000), // 2 hours before (120 minutes)
          end_time: new Date((baseEventData.timestamp - 7200) * 1000)
        };

        const mockNewGroup = {
          id: 3,
          event_type: 'led_outage',
          controller_id: 'AOT1D-25090001',
          start_time: new Date(baseEventData.timestamp * 1000),
          end_time: new Date(baseEventData.timestamp * 1000)
        };

        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedGroup));
        outageGroupRepo.findByControllerAndEventType.mockResolvedValue(null); // No DB match
        outageGroupRepo.create.mockResolvedValue(mockNewGroup);
        outageItemRepo.create.mockResolvedValue({
          id: 4,
          group_id: 3,
          occurrence_time: new Date(baseEventData.timestamp * 1000)
        });

        // Act
        const result = await dataProcessService.processOutageEvent(baseEventData);

        // Assert
        expect(result).toEqual({
          success: true,
          action: 'created_new_group',
          group_id: 3
        });
        expect(outageGroupRepo.create).toHaveBeenCalled();
      });
    });
  });

  describe('isEventInTimeRange', () => {
    it('should return true when event is within start_time - 60 minutes', async () => {
      // Arrange
      const group = {
        start_time: new Date('2025-01-01T10:00:00Z'),
        end_time: new Date('2025-01-01T10:00:00Z')
      };
      const eventTimestamp = Math.floor(new Date('2025-01-01T09:10:00Z').getTime() / 1000); // 50 minutes before

      // Act
      const result = dataProcessService.isEventInTimeRange(group, eventTimestamp);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when event is within end_time + 60 minutes', async () => {
      // Arrange
      const group = {
        start_time: new Date('2025-01-01T10:00:00Z'),
        end_time: new Date('2025-01-01T10:00:00Z')
      };
      const eventTimestamp = Math.floor(new Date('2025-01-01T10:50:00Z').getTime() / 1000); // 50 minutes after

      // Act
      const result = dataProcessService.isEventInTimeRange(group, eventTimestamp);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when event is beyond 60 minutes range', async () => {
      // Arrange
      const group = {
        start_time: new Date('2025-01-01T10:00:00Z'),
        end_time: new Date('2025-01-01T10:00:00Z')
      };
      const eventTimestamp = Math.floor(new Date('2025-01-01T12:00:00Z').getTime() / 1000); // 120 minutes after

      // Act
      const result = dataProcessService.isEventInTimeRange(group, eventTimestamp);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getCachedGroup and setCachedGroup', () => {
    it('should get cached group from Redis', async () => {
      // Arrange
      const mockGroup = {
        id: 1,
        event_type: 'led_outage',
        controller_id: 'AOT1D-25090001'
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockGroup));

      // Act
      const result = await dataProcessService.getCachedGroup('AOT1D-25090001', 'led_outage');

      // Assert
      expect(result).toEqual(mockGroup);
      expect(mockRedisClient.get).toHaveBeenCalledWith('outage_group:AOT1D-25090001:led_outage');
    });

    it('should return null when no cache exists', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);

      // Act
      const result = await dataProcessService.getCachedGroup('AOT1D-25090001', 'led_outage');

      // Assert
      expect(result).toBeNull();
    });

    it('should set group to Redis cache', async () => {
      // Arrange
      const mockGroup = {
        id: 1,
        event_type: 'led_outage',
        controller_id: 'AOT1D-25090001'
      };

      // Act
      await dataProcessService.setCachedGroup('AOT1D-25090001', 'led_outage', mockGroup);

      // Assert
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'outage_group:AOT1D-25090001:led_outage',
        7200,
        JSON.stringify(mockGroup)
      );
    });
  });
});
