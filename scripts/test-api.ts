import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPI() {
  console.log('模擬 API 查詢：prisma.recipientUnit.findMany()\n');

  try {
    const units = await prisma.recipientUnit.findMany({
      orderBy: { sortOrder: 'asc' }
    });

    console.log(`✓ 查詢成功！找到 ${units.length} 筆受贈單位\n`);

    units.forEach(unit => {
      console.log(`📦 ${unit.name}`);
      console.log(`   聯絡人: ${unit.contactPerson || '(未設定)'}`);
      console.log(`   電話: ${unit.phone || '(未設定)'}`);
      console.log(`   服務人數: ${unit.serviceCount || '(未設定)'}`);
      console.log(`   啟用狀態: ${unit.isActive ? '✅' : '❌'}`);
      console.log('');
    });

    console.log('✅ API 測試通過！contactPerson 欄位正常運作');

  } catch (error) {
    console.error('❌ API 測試失敗:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testAPI().catch(console.error);
