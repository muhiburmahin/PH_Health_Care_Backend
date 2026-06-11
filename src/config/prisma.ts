import 'dotenv/config';
import { PrismaClient } from '../generated/prisma';
import { config } from './index';

const prisma = new PrismaClient({
  datasources: {
    db: { url: config.DATABASE_URL },
  },
});

export { prisma };
