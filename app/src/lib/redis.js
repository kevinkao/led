const { createClient } = require('redis');

// Global Redis client instance
let redisClient = null;

const createRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis reconnection failed after 10 retries');
          return new Error('Too many retries');
        }
        const delay = Math.min(retries * 100, 3000);
        console.log(`Redis reconnecting in ${delay}ms...`);
        return delay;
      },
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  // Error handling
  client.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  client.on('connect', () => {
    console.log('Redis client connected');
  });

  client.on('ready', () => {
    console.log('Redis client ready');
  });

  client.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  client.on('end', () => {
    console.log('Redis client connection closed');
  });

  redisClient = client;
  return client;
};

// Initialize and connect
const getRedisClient = async () => {
  const client = createRedisClient();

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
};

// Graceful shutdown
const disconnect = async () => {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log('Redis client disconnected successfully');
      redisClient = null;
    } catch (error) {
      console.error('Error disconnecting Redis client:', error);
      await redisClient.disconnect();
      redisClient = null;
      throw error;
    }
  }
};

module.exports = { getRedisClient, disconnect };
