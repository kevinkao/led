const { PrismaClient } = require('@prisma/client');

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
const disconnect = async () => {
  try {
    await prisma.$disconnect();
    console.log('Prisma client disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting Prisma client:', error);
    throw error;
  }
};

module.exports = { prisma, disconnect };
