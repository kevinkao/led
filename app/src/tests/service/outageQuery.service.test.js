const outageQueryService = require('../../service/outageQuery.service');
const outageGroupRepo = require('../../repository/outageGroup.repository');

// Mock dependencies
jest.mock('../../repository/outageGroup.repository');

describe('OutageQueryService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('queryOutageGroups', () => {
    const baseQueryParams = {
      outageType: 'led_outage',
      startTime: 1756665796,
      endTime: 1756665896,
      offset: 0,
      limit: 20
    };

    describe('successful query with results', () => {
      it('should return paginated results when groups are found', async () => {
        // Arrange
        const mockGroups = [
          {
            id: 1n,
            eventType: 'led_outage',
            controllerId: 'AOT1D-25090001',
            startTime: new Date('2025-01-01T10:00:00Z'),
            endTime: new Date('2025-01-01T10:30:00Z'),
            createdAt: new Date('2025-01-01T09:00:00Z'),
            updatedAt: new Date('2025-01-01T09:00:00Z')
          },
          {
            id: 2n,
            eventType: 'led_outage',
            controllerId: 'AOT1D-25090002',
            startTime: new Date('2025-01-01T11:00:00Z'),
            endTime: new Date('2025-01-01T11:30:00Z'),
            createdAt: new Date('2025-01-01T10:00:00Z'),
            updatedAt: new Date('2025-01-01T10:00:00Z')
          }
        ];

        outageGroupRepo.findAndCountByQueryCriteria.mockResolvedValue({
          data: mockGroups,
          total: 100
        });

        // Act
        const result = await outageQueryService.queryOutageGroups(baseQueryParams);

        // Assert
        expect(result).toEqual({
          data: [
            {
              id: 1,
              outage_type: 'led_outage',
              controller_id: 'AOT1D-25090001',
              start_time: '1735725600',
              end_time: '1735727400'
            },
            {
              id: 2,
              outage_type: 'led_outage',
              controller_id: 'AOT1D-25090002',
              start_time: '1735729200',
              end_time: '1735731000'
            }
          ],
          pagination: {
            total: 100,
            offset: 0,
            limit: 20
          }
        });

        expect(outageGroupRepo.findAndCountByQueryCriteria).toHaveBeenCalledWith(
          {
            outageType: 'led_outage',
            startTime: 1756665796,
            endTime: 1756665896
          },
          {
            offset: 0,
            limit: 20
          }
        );
      });

      it('should include controller_id in filters when provided', async () => {
        // Arrange
        const queryWithController = {
          ...baseQueryParams,
          controllerId: 'AOT1D-25090001'
        };

        const mockGroups = [
          {
            id: 1n,
            eventType: 'led_outage',
            controllerId: 'AOT1D-25090001',
            startTime: new Date('2025-01-01T10:00:00Z'),
            endTime: new Date('2025-01-01T10:30:00Z'),
            createdAt: new Date('2025-01-01T09:00:00Z'),
            updatedAt: new Date('2025-01-01T09:00:00Z')
          }
        ];

        outageGroupRepo.findAndCountByQueryCriteria.mockResolvedValue({
          data: mockGroups,
          total: 50
        });

        // Act
        const result = await outageQueryService.queryOutageGroups(queryWithController);

        // Assert
        expect(outageGroupRepo.findAndCountByQueryCriteria).toHaveBeenCalledWith(
          {
            outageType: 'led_outage',
            controllerId: 'AOT1D-25090001',
            startTime: 1756665796,
            endTime: 1756665896
          },
          {
            offset: 0,
            limit: 20
          }
        );
      });

      it('should use custom offset and limit when provided', async () => {
        // Arrange
        const queryWithPagination = {
          outageType: 'led_outage',
          startTime: 1756665796,
          endTime: 1756665896,
          offset: 40,
          limit: 10
        };

        const mockGroups = [];
        outageGroupRepo.findAndCountByQueryCriteria.mockResolvedValue({
          data: mockGroups,
          total: 100
        });

        // Act
        const result = await outageQueryService.queryOutageGroups(queryWithPagination);

        // Assert
        expect(outageGroupRepo.findAndCountByQueryCriteria).toHaveBeenCalledWith(
          {
            outageType: 'led_outage',
            startTime: 1756665796,
            endTime: 1756665896
          },
          {
            offset: 40,
            limit: 10
          }
        );

        expect(result.pagination).toEqual({
          total: 100,
          offset: 40,
          limit: 10
        });
      });
    });

    describe('empty results', () => {
      it('should return empty data array when no groups are found', async () => {
        // Arrange
        outageGroupRepo.findAndCountByQueryCriteria.mockResolvedValue({
          data: [],
          total: 0
        });

        // Act
        const result = await outageQueryService.queryOutageGroups(baseQueryParams);

        // Assert
        expect(result).toEqual({
          data: [],
          pagination: {
            total: 0,
            offset: 0,
            limit: 20
          }
        });
      });
    });

    describe('data transformation', () => {
      it('should convert BigInt id to number', async () => {
        // Arrange
        const mockGroups = [
          {
            id: 999999999999n,
            eventType: 'led_outage',
            controllerId: 'AOT1D-25090001',
            startTime: new Date('2025-01-01T10:00:00Z'),
            endTime: new Date('2025-01-01T10:30:00Z'),
            createdAt: new Date('2025-01-01T09:00:00Z'),
            updatedAt: new Date('2025-01-01T09:00:00Z')
          }
        ];

        outageGroupRepo.findAndCountByQueryCriteria.mockResolvedValue({
          data: mockGroups,
          total: 1
        });

        // Act
        const result = await outageQueryService.queryOutageGroups(baseQueryParams);

        // Assert
        expect(result.data[0].id).toBe(999999999999);
        expect(typeof result.data[0].id).toBe('number');
      });

      it('should convert Date objects to unix timestamp strings', async () => {
        // Arrange
        const mockGroups = [
          {
            id: 1n,
            eventType: 'led_outage',
            controllerId: 'AOT1D-25090001',
            startTime: new Date('2025-01-01T10:00:00Z'),
            endTime: new Date('2025-01-01T10:30:00Z'),
            createdAt: new Date('2025-01-01T09:00:00Z'),
            updatedAt: new Date('2025-01-01T09:00:00Z')
          }
        ];

        outageGroupRepo.findAndCountByQueryCriteria.mockResolvedValue({
          data: mockGroups,
          total: 1
        });

        // Act
        const result = await outageQueryService.queryOutageGroups(baseQueryParams);

        // Assert
        expect(result.data[0].start_time).toBe('1735725600');
        expect(result.data[0].end_time).toBe('1735727400');
        expect(typeof result.data[0].start_time).toBe('string');
        expect(typeof result.data[0].end_time).toBe('string');
      });

      it('should not include created_at and updated_at in response', async () => {
        // Arrange
        const mockGroups = [
          {
            id: 1n,
            eventType: 'led_outage',
            controllerId: 'AOT1D-25090001',
            startTime: new Date('2025-01-01T10:00:00Z'),
            endTime: new Date('2025-01-01T10:30:00Z'),
            createdAt: new Date('2025-01-01T09:00:00Z'),
            updatedAt: new Date('2025-01-01T09:00:00Z')
          }
        ];

        outageGroupRepo.findAndCountByQueryCriteria.mockResolvedValue({
          data: mockGroups,
          total: 1
        });

        // Act
        const result = await outageQueryService.queryOutageGroups(baseQueryParams);

        // Assert
        expect(result.data[0]).not.toHaveProperty('created_at');
        expect(result.data[0]).not.toHaveProperty('updated_at');
      });
    });

    describe('different outage types', () => {
      it('should query panel_outage type', async () => {
        // Arrange
        const queryParams = {
          ...baseQueryParams,
          outageType: 'panel_outage'
        };

        outageGroupRepo.findAndCountByQueryCriteria.mockResolvedValue({
          data: [],
          total: 0
        });

        // Act
        await outageQueryService.queryOutageGroups(queryParams);

        // Assert
        expect(outageGroupRepo.findAndCountByQueryCriteria).toHaveBeenCalledWith(
          expect.objectContaining({
            outageType: 'panel_outage'
          }),
          expect.any(Object)
        );
      });

      it('should query temperature_outage type', async () => {
        // Arrange
        const queryParams = {
          ...baseQueryParams,
          outageType: 'temperature_outage'
        };

        outageGroupRepo.findAndCountByQueryCriteria.mockResolvedValue({
          data: [],
          total: 0
        });

        // Act
        await outageQueryService.queryOutageGroups(queryParams);

        // Assert
        expect(outageGroupRepo.findAndCountByQueryCriteria).toHaveBeenCalledWith(
          expect.objectContaining({
            outageType: 'temperature_outage'
          }),
          expect.any(Object)
        );
      });
    });
  });
});
