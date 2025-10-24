import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function importData() {
  console.log('=== 開始匯入資料 ===\n');

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('data_only.sql', 'utf-8');
    const lines = sqlContent.split('\n').filter(line => line.trim());

    console.log(`讀取 ${lines.length} 行 SQL 語句\n`);

    // Disable FK constraints temporarily
    console.log('⏸️  暫時關閉外鍵約束...');
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');

    // Execute each INSERT statement
    let insertCount = 0;
    let skipCount = 0;
    let currentTable = '';

    for (const line of lines) {
      if (line.startsWith('--') || line.trim() === '' || line.includes('SET session_replication_role')) {
        continue;
      }

      // Detect table name
      const tableMatch = line.match(/INSERT INTO "(\w+)"/);
      if (tableMatch && tableMatch[1] !== currentTable) {
        currentTable = tableMatch[1];
        console.log(`\n📥 匯入 ${currentTable}...`);
      }

      try {
        await prisma.$executeRawUnsafe(line);
        insertCount++;
        process.stdout.write(`\r   已匯入: ${insertCount} 筆 (跳過: ${skipCount})`);
      } catch (error: any) {
        // Skip if record already exists (from seed data)
        if (error.code === 'P2010' && error.meta?.code === '23505') {
          skipCount++;
          process.stdout.write(`\r   已匯入: ${insertCount} 筆 (跳過: ${skipCount})`);
        } else {
          console.error(`\n❌ 錯誤於: ${line.substring(0, 100)}...`);
          console.error(`   錯誤訊息: ${error.message}`);
          throw error;
        }
      }
    }

    console.log(`\n\n✓ 資料匯入完成`);
    console.log(`  - 成功匯入: ${insertCount} 筆`);
    console.log(`  - 跳過重複: ${skipCount} 筆`);

    // Re-enable FK constraints
    console.log('\n✓ 恢復外鍵約束...');
    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');

    console.log('\n✅ 匯入流程完成！');

  } catch (error) {
    console.error('\n❌ 匯入失敗:', error);
    // Try to restore constraints even on failure
    try {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    } catch {}
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData().catch(console.error);
