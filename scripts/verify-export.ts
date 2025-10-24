import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function verifyExport() {
  console.log('=== 驗證匯出檔案完整性 ===\n');

  try {
    // Check file exists
    if (!fs.existsSync('data_only.sql')) {
      throw new Error('❌ data_only.sql 不存在！');
    }

    const fileContent = fs.readFileSync('data_only.sql', 'utf-8');
    const lines = fileContent.split('\n');
    console.log(`✓ data_only.sql 存在：${lines.length} 行\n`);

    // Count INSERT statements per table
    const insertCounts: Record<string, number> = {};
    for (const line of lines) {
      const match = line.match(/INSERT INTO "(\w+)"/);
      if (match) {
        const table = match[1];
        insertCounts[table] = (insertCounts[table] || 0) + 1;
      }
    }

    console.log('=== 匯出檔案中的 INSERT 語句統計 ===');
    for (const [table, count] of Object.entries(insertCounts).sort()) {
      console.log(`  ${table.padEnd(25)} ${count.toString().padStart(5)} rows`);
    }
    console.log('');

    // Count actual database records
    console.log('=== 資料庫實際記錄數統計 ===');
    const dbCounts: Record<string, number> = {};

    dbCounts['User'] = await prisma.user.count();
    dbCounts['Category'] = await prisma.category.count();
    dbCounts['Unit'] = await prisma.unit.count();
    dbCounts['StandardItem'] = await prisma.standardItem.count();
    dbCounts['CustomItem'] = await prisma.customItem.count();
    dbCounts['Donor'] = await prisma.donor.count();
    dbCounts['RecipientUnit'] = await prisma.recipientUnit.count();
    dbCounts['ItemStock'] = await prisma.itemStock.count();
    dbCounts['DonationRecord'] = await prisma.donationRecord.count();
    dbCounts['DonationItem'] = await prisma.donationItem.count();
    dbCounts['Disbursement'] = await prisma.disbursement.count();
    dbCounts['DisbursementItem'] = await prisma.disbursementItem.count();
    dbCounts['ItemCondition'] = await prisma.itemCondition.count();
    dbCounts['InventoryLog'] = await prisma.inventoryLog.count();
    dbCounts['InventoryChangeReason'] = await prisma.inventoryChangeReason.count();
    dbCounts['ReceiptSeal'] = await prisma.receiptSeal.count();
    dbCounts['SerialNumberCounter'] = await prisma.serialNumberCounter.count();
    dbCounts['Supply'] = await prisma.supply.count();

    for (const [table, count] of Object.entries(dbCounts).sort()) {
      console.log(`  ${table.padEnd(25)} ${count.toString().padStart(5)} rows`);
    }
    console.log('');

    // Compare
    console.log('=== 差異檢查 ===');
    let hasError = false;
    for (const table of Object.keys(dbCounts).sort()) {
      const dbCount = dbCounts[table];
      const exportCount = insertCounts[table] || 0;

      if (dbCount !== exportCount) {
        console.log(`❌ ${table}: DB=${dbCount}, 匯出=${exportCount} (差異: ${dbCount - exportCount})`);
        hasError = true;
      } else {
        console.log(`✓ ${table}: ${dbCount} rows (一致)`);
      }
    }

    if (hasError) {
      throw new Error('\n❌ 匯出檔案與資料庫不一致！請重新匯出。');
    }

    console.log('\n✅ 驗證通過：所有資料已完整匯出！');

    // Calculate total records
    const totalRecords = Object.values(dbCounts).reduce((a, b) => a + b, 0);
    console.log(`\n📊 總計：${totalRecords} 筆記錄已備份`);

  } catch (error) {
    console.error('\n驗證失敗:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyExport().catch(console.error);
