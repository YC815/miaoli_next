import prisma from '@/lib/prisma';

export async function generateDonationSerialNumber(): Promise<string> {
  try {
    const lastRecord = await prisma.donationRecord.findFirst({
      where: {
        serialNumber: {
          not: "",
          startsWith: "A"
        }
      },
      orderBy: { createdAt: 'desc' },
      select: { serialNumber: true }
    });

    if (!lastRecord || !lastRecord.serialNumber || lastRecord.serialNumber === "") {
      return 'A00001';
    }

    // Extract number from A00001 format
    const numberPart = lastRecord.serialNumber.substring(1);
    const lastNumber = parseInt(numberPart);
    
    if (isNaN(lastNumber)) {
      return 'A00001';
    }
    
    const nextNumber = lastNumber + 1;
    return `A${nextNumber.toString().padStart(5, '0')}`;
  } catch (error) {
    console.error('Error generating donation serial number:', error);
    // Fallback to a safe default
    return `A${Date.now().toString().slice(-5).padStart(5, '0')}`;
  }
}

export async function generateDisbursementSerialNumber(): Promise<string> {
  try {
    const lastRecord = await prisma.disbursement.findFirst({
      where: {
        serialNumber: {
          not: "",
          startsWith: "B"
        }
      },
      orderBy: { createdAt: 'desc' },
      select: { serialNumber: true }
    });

    if (!lastRecord || !lastRecord.serialNumber || lastRecord.serialNumber === "") {
      return 'B00001';
    }

    // Extract number from B00001 format
    const numberPart = lastRecord.serialNumber.substring(1);
    const lastNumber = parseInt(numberPart);
    
    if (isNaN(lastNumber)) {
      return 'B00001';
    }
    
    const nextNumber = lastNumber + 1;
    return `B${nextNumber.toString().padStart(5, '0')}`;
  } catch (error) {
    console.error('Error generating disbursement serial number:', error);
    // Fallback to a safe default
    return `B${Date.now().toString().slice(-5).padStart(5, '0')}`;
  }
}