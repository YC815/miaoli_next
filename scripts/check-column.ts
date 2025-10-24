import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkColumn() {
  try {
    // Check if contactPerson column exists
    const result = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'RecipientUnit'
      ORDER BY ordinal_position;
    `;

    console.log('RecipientUnit 表格的欄位：');
    result.forEach((row, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(2)}. ${row.column_name}`);
    });

    const hasContactPerson = result.some(r => r.column_name === 'contactPerson');
    console.log(`\ncontactPerson 欄位存在：${hasContactPerson ? '✅' : '❌'}`);

    if (hasContactPerson) {
      // Test query
      const units = await prisma.recipientUnit.findMany({
        select: { name: true, contactPerson: true }
      });
      console.log('\n可以正常查詢：');
      units.forEach(u => console.log(`  - ${u.name}: ${u.contactPerson || '(無)'}`));
    }

  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumn().catch(console.error);
