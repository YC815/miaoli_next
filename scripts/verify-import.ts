import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyImport() {
  console.log('=== 驗證資料匯入完整性 ===\n');

  try {
    // Count all records
    const counts = {
      User: await prisma.user.count(),
      Category: await prisma.category.count(),
      Unit: await prisma.unit.count(),
      StandardItem: await prisma.standardItem.count(),
      CustomItem: await prisma.customItem.count(),
      Donor: await prisma.donor.count(),
      RecipientUnit: await prisma.recipientUnit.count(),
      ItemStock: await prisma.itemStock.count(),
      DonationRecord: await prisma.donationRecord.count(),
      DonationItem: await prisma.donationItem.count(),
      Disbursement: await prisma.disbursement.count(),
      DisbursementItem: await prisma.disbursementItem.count(),
      ItemCondition: await prisma.itemCondition.count(),
      InventoryLog: await prisma.inventoryLog.count(),
      InventoryChangeReason: await prisma.inventoryChangeReason.count(),
      ReceiptSeal: await prisma.receiptSeal.count(),
      SerialNumberCounter: await prisma.serialNumberCounter.count(),
      Supply: await prisma.supply.count(),
    };

    console.log('資料表記錄數統計：\n');
    let total = 0;
    for (const [table, count] of Object.entries(counts).sort()) {
      console.log(`  ${table.padEnd(25)} ${count.toString().padStart(5)} 筆`);
      total += count;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`  總計：${total} 筆記錄`);
    console.log('='.repeat(50));

    // Expected counts (from backup)
    const expected = {
      User: 7,
      Category: 6,
      Unit: 13,
      StandardItem: 30,
      CustomItem: 3,
      Donor: 2,
      RecipientUnit: 4,
      ItemStock: 17,
      DonationRecord: 23,
      DonationItem: 27,
      Disbursement: 9,
      DisbursementItem: 27,
      ItemCondition: 0,
      InventoryLog: 2,
      InventoryChangeReason: 5,
      ReceiptSeal: 2,
      SerialNumberCounter: 3,
      Supply: 0,
    };

    console.log('\n=== 比對預期數量 ===\n');
    let hasDifference = false;
    for (const table of Object.keys(expected).sort()) {
      const current = counts[table as keyof typeof counts];
      const expectedCount = expected[table as keyof typeof expected];

      if (current !== expectedCount) {
        console.log(`⚠️  ${table}: 預期 ${expectedCount}, 實際 ${current} (差異: ${current - expectedCount})`);
        hasDifference = true;
      } else {
        console.log(`✓ ${table}: ${current} 筆 (正確)`);
      }
    }

    if (!hasDifference) {
      console.log('\n✅ 資料匯入完全正確！所有資料都已成功恢復。');
    } else {
      console.log('\n⚠️  某些表格數量有差異（可能因為 seed 資料）');
    }

    // Check specific important data
    console.log('\n=== 抽查重要資料 ===\n');

    // Check RecipientUnit with contactPerson
    const recipientWithContact = await prisma.recipientUnit.findFirst({
      where: { contactPerson: { not: null } }
    });
    if (recipientWithContact) {
      console.log(`✓ RecipientUnit.contactPerson 欄位已正確匯入：`);
      console.log(`  ${recipientWithContact.name}: ${recipientWithContact.contactPerson}`);
    } else {
      console.log(`⚠️  沒有找到有 contactPerson 的 RecipientUnit`);
    }

    // Check Users
    const users = await prisma.user.findMany({ select: { nickname: true } });
    console.log(`\n✓ 使用者列表 (${users.length} 位):`);
    users.forEach(u => console.log(`  - ${u.nickname}`));

    // Check SerialNumberCounter
    const counters = await prisma.serialNumberCounter.findMany();
    console.log(`\n✓ 序號計數器 (${counters.length} 個):`);
    counters.forEach(c => console.log(`  - ${c.type}: ${c.counter} (前綴: ${c.prefix})`));

    console.log('\n✅ 所有驗證完成！');

  } catch (error) {
    console.error('\n❌ 驗證失敗:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyImport().catch(console.error);
