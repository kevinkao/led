const dataProcessService = require('../../service/dataProcess.service');
const outageGroupRepo = require('../../repository/outageGroup.repository');
const outageItemRepo = require('../../repository/outageItem.repository');
const { getRedisClient } = require('../../lib/redis');
const { prisma } = require('../../lib/db');

// Mock dependencies
jest.mock('../../repository/outageGroup.repository');
jest.mock('../../repository/outageItem.repository');
jest.mock('../../lib/redis');
jest.mock('../../lib/db', () => ({
  prisma: {
    $transaction: jest.fn()
  }
}));

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

        // Mock transaction
        prisma.$transaction.mockImplementation(async (callback) => {
          return await callback(prisma);
        });

        outageGroupRepo.createWithTx.mockResolvedValue(mockNewGroup);
        outageItemRepo.createWithTx.mockResolvedValue({
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
        expect(outageGroupRepo.createWithTx).toHaveBeenCalledWith({
          eventType: baseEventData.event_type,
          controllerId: baseEventData.controller_id,
          startTime: baseEventData.timestamp,
          endTime: baseEventData.timestamp
        }, prisma);
        expect(outageItemRepo.createWithTx).toHaveBeenCalledWith({
          groupId: 1,
          occurrenceTime: baseEventData.timestamp
        }, prisma);
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

        // Mock transaction
        prisma.$transaction.mockImplementation(async (callback) => {
          return await callback(prisma);
        });

        outageItemRepo.createWithTx.mockResolvedValue({
          id: 2,
          group_id: 1,
          occurrence_time: new Date(baseEventData.timestamp * 1000)
        });
        outageItemRepo.findLastItemByGroupIdWithTx.mockResolvedValue(mockLastItem);
        outageGroupRepo.updateEndTimeWithTx.mockResolvedValue({
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
        expect(outageItemRepo.createWithTx).toHaveBeenCalledWith({
          groupId: 1,
          occurrenceTime: baseEventData.timestamp
        }, prisma);
        expect(outageGroupRepo.updateEndTimeWithTx).toHaveBeenCalledWith(1, baseEventData.timestamp, prisma);
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

        // Mock transaction
        prisma.$transaction.mockImplementation(async (callback) => {
          return await callback(prisma);
        });

        outageItemRepo.createWithTx.mockResolvedValue({
          id: 3,
          group_id: 2,
          occurrence_time: new Date(baseEventData.timestamp * 1000)
        });
        outageItemRepo.findLastItemByGroupIdWithTx.mockResolvedValue(mockLastItem);
        outageGroupRepo.updateEndTimeWithTx.mockResolvedValue({
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

        // Mock transaction
        prisma.$transaction.mockImplementation(async (callback) => {
          return await callback(prisma);
        });

        outageGroupRepo.createWithTx.mockResolvedValue(mockNewGroup);
        outageItemRepo.createWithTx.mockResolvedValue({
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
        expect(outageGroupRepo.createWithTx).toHaveBeenCalled();
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
        id: "1",
        event_type: 'led_outage',
        controller_id: 'AOT1D-25090001'
      };

      // Act
      await dataProcessService.setCachedGroup('AOT1D-25090001', 'led_outage', mockGroup);

      // Assert
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'outage_group:AOT1D-25090001:led_outage',
        3600,
        JSON.stringify(mockGroup)
      );
    });
  });

  describe('Transaction support - createNewGroup', () => {
    const baseData = {
      controllerId: 'AOT1D-25090001',
      eventType: 'led_outage',
      timestamp: 1756665796
    };

    it('should rollback transaction when item creation fails', async () => {
      // Arrange
      const mockGroup = {
        id: 1,
        event_type: 'led_outage',
        controller_id: 'AOT1D-25090001',
        start_time: new Date(baseData.timestamp * 1000),
        end_time: new Date(baseData.timestamp * 1000)
      };

      // Mock transaction to execute the callback
      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      outageGroupRepo.createWithTx.mockResolvedValue(mockGroup);
      outageItemRepo.createWithTx.mockRejectedValue(new Error('Item creation failed'));

      // Act & Assert
      await expect(
        dataProcessService.createNewGroup(baseData.controllerId, baseData.eventType, baseData.timestamp)
      ).rejects.toThrow('Item creation failed');

      // Verify transaction was called
      expect(prisma.$transaction).toHaveBeenCalled();
      // Cache should not be updated due to transaction failure
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should commit transaction when both group and item creation succeed', async () => {
      // Arrange
      const mockGroup = {
        id: 1,
        event_type: 'led_outage',
        controller_id: 'AOT1D-25090001',
        start_time: new Date(baseData.timestamp * 1000),
        end_time: new Date(baseData.timestamp * 1000)
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      outageGroupRepo.createWithTx.mockResolvedValue(mockGroup);
      outageItemRepo.createWithTx.mockResolvedValue({
        id: 1,
        group_id: 1,
        occurrence_time: new Date(baseData.timestamp * 1000)
      });

      // Act
      const result = await dataProcessService.createNewGroup(
        baseData.controllerId,
        baseData.eventType,
        baseData.timestamp
      );

      // Assert
      expect(result).toEqual(mockGroup);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(outageGroupRepo.createWithTx).toHaveBeenCalled();
      expect(outageItemRepo.createWithTx).toHaveBeenCalled();
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it('should handle cache failure gracefully after successful transaction', async () => {
      // Arrange
      const mockGroup = {
        id: 1,
        event_type: 'led_outage',
        controller_id: 'AOT1D-25090001',
        start_time: new Date(baseData.timestamp * 1000),
        end_time: new Date(baseData.timestamp * 1000)
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      outageGroupRepo.createWithTx.mockResolvedValue(mockGroup);
      outageItemRepo.createWithTx.mockResolvedValue({
        id: 1,
        group_id: 1,
        occurrence_time: new Date(baseData.timestamp * 1000)
      });
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis connection error'));

      // Act & Assert
      // Cache failure should propagate the error
      await expect(
        dataProcessService.createNewGroup(baseData.controllerId, baseData.eventType, baseData.timestamp)
      ).rejects.toThrow('Redis connection error');

      // Transaction should have been committed before cache failure
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(outageGroupRepo.createWithTx).toHaveBeenCalled();
      expect(outageItemRepo.createWithTx).toHaveBeenCalled();
    });
  });

  describe('Transaction support - addEventToGroup', () => {
    const baseGroup = {
      id: 1,
      event_type: 'led_outage',
      controller_id: 'AOT1D-25090001',
      start_time: new Date('2025-01-01T10:00:00Z'),
      end_time: new Date('2025-01-01T10:00:00Z')
    };
    const timestamp = 1756665796;

    it('should rollback transaction when updateEndTime fails', async () => {
      // Arrange
      const mockLastItem = {
        id: 2,
        group_id: 1,
        occurrence_time: new Date(timestamp * 1000)
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      outageItemRepo.createWithTx.mockResolvedValue({
        id: 2,
        group_id: 1,
        occurrence_time: new Date(timestamp * 1000)
      });
      outageItemRepo.findLastItemByGroupIdWithTx.mockResolvedValue(mockLastItem);
      outageGroupRepo.updateEndTimeWithTx.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(
        dataProcessService.addEventToGroup(baseGroup, timestamp)
      ).rejects.toThrow('Update failed');

      // Verify transaction was called
      expect(prisma.$transaction).toHaveBeenCalled();
      // Cache should not be updated due to transaction failure
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should commit transaction when all operations succeed', async () => {
      // Arrange
      const mockLastItem = {
        id: 2,
        group_id: 1,
        occurrence_time: new Date(timestamp * 1000)
      };
      const mockUpdatedGroup = {
        id: 1,
        end_time: new Date(timestamp * 1000)
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      outageItemRepo.createWithTx.mockResolvedValue({
        id: 2,
        group_id: 1,
        occurrence_time: new Date(timestamp * 1000)
      });
      outageItemRepo.findLastItemByGroupIdWithTx.mockResolvedValue(mockLastItem);
      outageGroupRepo.updateEndTimeWithTx.mockResolvedValue(mockUpdatedGroup);

      // Act
      const result = await dataProcessService.addEventToGroup(baseGroup, timestamp);

      // Assert
      expect(result).toEqual(mockUpdatedGroup);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(outageItemRepo.createWithTx).toHaveBeenCalled();
      expect(outageItemRepo.findLastItemByGroupIdWithTx).toHaveBeenCalled();
      expect(outageGroupRepo.updateEndTimeWithTx).toHaveBeenCalled();
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it('should rollback when findLastItem returns null after creation', async () => {
      // Arrange
      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      outageItemRepo.createWithTx.mockResolvedValue({
        id: 2,
        group_id: 1,
        occurrence_time: new Date(timestamp * 1000)
      });
      outageItemRepo.findLastItemByGroupIdWithTx.mockResolvedValue(null);

      // Act & Assert
      await expect(
        dataProcessService.addEventToGroup(baseGroup, timestamp)
      ).rejects.toThrow('Failed to find last item after creation');

      // Verify transaction was called
      expect(prisma.$transaction).toHaveBeenCalled();
      // Cache should not be updated
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should handle cache failure after successful transaction', async () => {
      // Arrange
      const mockLastItem = {
        id: 2,
        group_id: 1,
        occurrence_time: new Date(timestamp * 1000)
      };
      const mockUpdatedGroup = {
        id: 1,
        end_time: new Date(timestamp * 1000)
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      outageItemRepo.createWithTx.mockResolvedValue({
        id: 2,
        group_id: 1,
        occurrence_time: new Date(timestamp * 1000)
      });
      outageItemRepo.findLastItemByGroupIdWithTx.mockResolvedValue(mockLastItem);
      outageGroupRepo.updateEndTimeWithTx.mockResolvedValue(mockUpdatedGroup);
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(
        dataProcessService.addEventToGroup(baseGroup, timestamp)
      ).rejects.toThrow('Redis error');

      // Transaction should have been committed
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
