import prisma from '@/lib/prisma';

export async function generateDonationSerialNumber(): Promise<string> {
  const lastRecord = await prisma.donationRecord.findFirst({
    where: {
      serialNumber: {
        not: "",
      }
    },
    orderBy: { createdAt: 'desc' },
    select: { serialNumber: true }
  });

  if (!lastRecord) {
    return 'A00001';
  }

  // Extract number from A00001 format
  const lastNumber = parseInt(lastRecord.serialNumber.substring(1));
  const nextNumber = lastNumber + 1;
  
  return `A${nextNumber.toString().padStart(5, '0')}`;
}

export async function generateDisbursementSerialNumber(): Promise<string> {
  const lastRecord = await prisma.disbursement.findFirst({
    where: {
      serialNumber: {
        not: "",
      }
    },
    orderBy: { createdAt: 'desc' },
    select: { serialNumber: true }
  });

  if (!lastRecord) {
    return 'B00001';
  }

  // Extract number from B00001 format
  const lastNumber = parseInt(lastRecord.serialNumber.substring(1));
  const nextNumber = lastNumber + 1;
  
  return `B${nextNumber.toString().padStart(5, '0')}`;
}