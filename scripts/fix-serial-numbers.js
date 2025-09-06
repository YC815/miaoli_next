import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSerialNumbers() {
  console.log('🔧 開始修復序列號...');

  try {
    // 修復捐贈記錄的序列號
    const donationRecordsWithoutSerial = await prisma.donationRecord.findMany({
      where: {
        serialNumber: ""
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📋 找到 ${donationRecordsWithoutSerial.length} 筆需要修復的捐贈記錄`);

    for (let i = 0; i < donationRecordsWithoutSerial.length; i++) {
      const record = donationRecordsWithoutSerial[i];
      const serialNumber = `A${(i + 1).toString().padStart(5, '0')}`;
      
      await prisma.donationRecord.update({
        where: { id: record.id },
        data: { serialNumber }
      });
      
      console.log(`✅ 更新捐贈記錄 ${record.id} 序列號為 ${serialNumber}`);
    }

    // 修復發放記錄的序列號
    const disbursementRecordsWithoutSerial = await prisma.disbursement.findMany({
      where: {
        serialNumber: ""
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📋 找到 ${disbursementRecordsWithoutSerial.length} 筆需要修復的發放記錄`);

    for (let i = 0; i < disbursementRecordsWithoutSerial.length; i++) {
      const record = disbursementRecordsWithoutSerial[i];
      const serialNumber = `B${(i + 1).toString().padStart(5, '0')}`;
      
      await prisma.disbursement.update({
        where: { id: record.id },
        data: { serialNumber }
      });
      
      console.log(`✅ 更新發放記錄 ${record.id} 序列號為 ${serialNumber}`);
    }

    console.log('🎉 序列號修復完成！');
  } catch (error) {
    console.error('❌ 修復序列號時發生錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSerialNumbers();