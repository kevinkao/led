/**
 * Outage Query Validation Middleware Tests
 */

const { validateOutageQueryRequest } = require('../../middleware/outageQueryValidation');

describe('OutageQueryValidation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('outage_type validation', () => {
    it('should return 400 when outage_type is missing', () => {
      // Arrange
      mockReq.query = {
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'outage_type is required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when outage_type is not a string', () => {
      // Arrange
      mockReq.query = {
        outage_type: 123,
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'outage_type must be a string'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when outage_type is not one of allowed types', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'invalid_type',
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'outage_type must be one of: panel_outage, temperature_outage, led_outage'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass when outage_type is panel_outage', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'panel_outage',
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass when outage_type is temperature_outage', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'temperature_outage',
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass when outage_type is led_outage', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('start_time validation', () => {
    it('should return 400 when start_time is missing', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'start_time is required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when start_time is not a valid number', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: 'invalid',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'start_time must be a valid number'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when start_time is not a positive integer', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '-100',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'start_time must be a valid unix timestamp (positive integer)'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when start_time is a decimal number', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796.5',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'start_time must be a valid unix timestamp (positive integer)'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when start_time is out of valid range (too early)', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '100000', // Before 2000-01-01
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'start_time is out of valid range (must be between 2000-01-01 and 2100-01-01)'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when start_time is out of valid range (too late)', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '5000000000', // After 2100-01-01
        end_time: '5000000100'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'start_time is out of valid range (must be between 2000-01-01 and 2100-01-01)'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('end_time validation', () => {
    it('should return 400 when end_time is missing', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'end_time is required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when end_time is not a valid number', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: 'invalid'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'end_time must be a valid number'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when end_time is not a positive integer', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '-100'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'end_time must be a valid unix timestamp (positive integer)'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when end_time is out of valid range', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '100000'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'end_time is out of valid range (must be between 2000-01-01 and 2100-01-01)'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('start_time and end_time relationship validation', () => {
    it('should return 400 when start_time is greater than end_time', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665896',
        end_time: '1756665796'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'start_time cannot be greater than end_time'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass when start_time equals end_time', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665796'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('controller_id validation (optional)', () => {
    it('should pass when controller_id is not provided', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 when controller_id is not a string', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        controller_id: 123,
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'controller_id must be a string'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when controller_id is an empty string', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        controller_id: '',
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'controller_id cannot be empty'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass when controller_id is a valid string', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        controller_id: 'AOT1D-25090001',
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('offset validation (optional)', () => {
    it('should pass when offset is not provided (default 0)', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 when offset is not a valid number', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896',
        offset: 'invalid'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'offset must be a valid number'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when offset is negative', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896',
        offset: '-1'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'offset must be a non-negative integer'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when offset is a decimal number', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896',
        offset: '5.5'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'offset must be a non-negative integer'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass when offset is 0', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896',
        offset: '0'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass when offset is a valid positive integer', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896',
        offset: '10'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('limit validation (optional)', () => {
    it('should pass when limit is not provided (default 20)', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 when limit is not a valid number', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896',
        limit: 'invalid'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'limit must be a valid number'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when limit is 0', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896',
        limit: '0'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'limit must be a positive integer'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when limit is negative', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896',
        limit: '-1'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'limit must be a positive integer'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when limit is a decimal number', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896',
        limit: '20.5'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'limit must be a positive integer'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass when limit is a valid positive integer', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        start_time: '1756665796',
        end_time: '1756665896',
        limit: '50'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('complete valid request', () => {
    it('should pass with all required and optional parameters', () => {
      // Arrange
      mockReq.query = {
        outage_type: 'led_outage',
        controller_id: 'AOT1D-25090001',
        start_time: '1756665796',
        end_time: '1756665896',
        offset: '0',
        limit: '20'
      };

      // Act
      validateOutageQueryRequest(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
