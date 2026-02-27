import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// We use DATABASE_URL from env so we can talk to PostgreSQL.
const connectionString =
  process.env.DATABASE_URL || "postgresql://USER:PASSWORD@localhost:5432/tutorhub";

const adapter = new PrismaPg({ connectionString });
export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
