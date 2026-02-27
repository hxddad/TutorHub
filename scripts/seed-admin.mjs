import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from '@prisma/client';

// Replace the explicit datasource option with the default client (uses DATABASE_URL from env)
const connectionString =
  process.env.DATABASE_URL || "postgresql://USER:PASSWORD@localhost:5432/tutorhub";

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrator';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      fullName: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashed,
      role: 'ADMIN',
    },
  });

  console.log('Created admin:', user.email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());