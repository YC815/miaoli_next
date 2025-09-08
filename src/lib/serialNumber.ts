import prisma from '@/lib/prisma';

async function ensureCounter(type: string, prefix: string) {
  const existing = await prisma.serialNumberCounter.findUnique({
    where: { type }
  });
  
  if (!existing) {
    await prisma.serialNumberCounter.create({
      data: {
        type,
        prefix,
        counter: 0
      }
    });
  }
}

async function getNextSerialNumber(type: string): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    const counter = await tx.serialNumberCounter.findUnique({
      where: { type }
    });
    
    if (!counter) {
      throw new Error(`Counter for type ${type} not found`);
    }
    
    const nextCounter = counter.counter + 1;
    
    await tx.serialNumberCounter.update({
      where: { type },
      data: { counter: nextCounter }
    });
    
    return `${counter.prefix}${nextCounter.toString().padStart(6, '0')}`;
  });
}

export async function generateDonationSerialNumber(): Promise<string> {
  try {
    await ensureCounter('donation', 'DN');
    return await getNextSerialNumber('donation');
  } catch (error) {
    console.error('Error generating donation serial number:', error);
    throw new Error('無法生成捐贈記錄流水號');
  }
}

export async function generateDisbursementSerialNumber(): Promise<string> {
  try {
    await ensureCounter('disbursement', 'DS');
    return await getNextSerialNumber('disbursement');
  } catch (error) {
    console.error('Error generating disbursement serial number:', error);
    throw new Error('無法生成發放記錄流水號');
  }
}

export async function generateReportId(): Promise<string> {
  try {
    await ensureCounter('report', '');
    const reportId = await getNextSerialNumber('report');
    // For reports, we want format 00001, 00002, etc. (without prefix)
    // Extract just the number part
    const numberPart = reportId.replace(/^\D+/, ''); // Remove any non-digit prefix
    return numberPart.padStart(5, '0');
  } catch (error) {
    console.error('Error generating report ID:', error);
    throw new Error('無法生成報表ID');
  }
}