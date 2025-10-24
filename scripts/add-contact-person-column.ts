import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addColumn() {
  try {
    console.log('Adding contactPerson column to RecipientUnit...');
    await prisma.$executeRawUnsafe('ALTER TABLE "RecipientUnit" ADD COLUMN "contactPerson" TEXT;');
    console.log('✓ Column added successfully');
  } catch (error: any) {
    if (error.meta?.code === '42701') {
      console.log('✓ Column already exists, skipping');
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

addColumn().catch(console.error);
