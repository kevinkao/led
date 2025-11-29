/**
 * Health check handler
 */
const checkHealth = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkHealth
};
