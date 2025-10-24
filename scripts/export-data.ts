import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function exportData() {
  const output: string[] = [];

  output.push('-- Data export from Miaoli Next');
  output.push('-- Generated at: ' + new Date().toISOString());
  output.push('');
  output.push('SET session_replication_role = replica;');
  output.push('');

  try {
    // Export tables in dependency order (parents first)

    // 1. Users (no dependencies)
    console.log('Exporting User...');
    const users = await prisma.user.findMany();
    for (const user of users) {
      output.push(`INSERT INTO "User" ("id", "clerkId", "email", "nickname", "role", "isFirstLogin", "createdAt", "updatedAt", "lastLoginAt") VALUES (${escape(user.id)}, ${escape(user.clerkId)}, ${escape(user.email)}, ${escape(user.nickname)}, ${escape(user.role)}, ${user.isFirstLogin}, ${escape(user.createdAt.toISOString())}, ${escape(user.updatedAt.toISOString())}, ${escape(user.lastLoginAt?.toISOString())});`);
    }
    output.push('');

    // 2. Categories
    console.log('Exporting Category...');
    const categories = await prisma.category.findMany();
    for (const cat of categories) {
      output.push(`INSERT INTO "Category" ("id", "name", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES (${escape(cat.id)}, ${escape(cat.name)}, ${cat.isActive}, ${cat.sortOrder}, ${escape(cat.createdAt.toISOString())}, ${escape(cat.updatedAt.toISOString())});`);
    }
    output.push('');

    // 3. Units
    console.log('Exporting Unit...');
    const units = await prisma.unit.findMany();
    for (const unit of units) {
      output.push(`INSERT INTO "Unit" ("id", "name", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES (${escape(unit.id)}, ${escape(unit.name)}, ${unit.isActive}, ${unit.sortOrder}, ${escape(unit.createdAt.toISOString())}, ${escape(unit.updatedAt.toISOString())});`);
    }
    output.push('');

    // 4. StandardItem
    console.log('Exporting StandardItem...');
    const standardItems = await prisma.standardItem.findMany();
    for (const item of standardItems) {
      output.push(`INSERT INTO "StandardItem" ("id", "name", "category", "units", "defaultUnit", "isActive", "sortOrder") VALUES (${escape(item.id)}, ${escape(item.name)}, ${escape(item.category)}, ${escape(JSON.stringify(item.units))}, ${escape(item.defaultUnit)}, ${item.isActive}, ${item.sortOrder});`);
    }
    output.push('');

    // 5. CustomItem
    console.log('Exporting CustomItem...');
    const customItems = await prisma.customItem.findMany();
    for (const item of customItems) {
      output.push(`INSERT INTO "CustomItem" ("id", "name", "category", "units", "defaultUnit", "isActive", "isHidden", "sortOrder", "createdAt", "createdBy") VALUES (${escape(item.id)}, ${escape(item.name)}, ${escape(item.category)}, ${escape(JSON.stringify(item.units))}, ${escape(item.defaultUnit)}, ${item.isActive}, ${item.isHidden}, ${item.sortOrder}, ${escape(item.createdAt.toISOString())}, ${escape(item.createdBy)});`);
    }
    output.push('');

    // 6. Donor
    console.log('Exporting Donor...');
    const donors = await prisma.donor.findMany();
    for (const donor of donors) {
      output.push(`INSERT INTO "Donor" ("id", "name", "phone", "taxId", "address", "isActive", "createdAt", "updatedAt") VALUES (${escape(donor.id)}, ${escape(donor.name)}, ${escape(donor.phone)}, ${escape(donor.taxId)}, ${escape(donor.address)}, ${donor.isActive}, ${escape(donor.createdAt.toISOString())}, ${escape(donor.updatedAt.toISOString())});`);
    }
    output.push('');

    // 7. RecipientUnit
    console.log('Exporting RecipientUnit...');
    const recipientUnits = await prisma.recipientUnit.findMany();
    for (const unit of recipientUnits) {
      output.push(`INSERT INTO "RecipientUnit" ("id", "name", "contactPerson", "phone", "address", "serviceCount", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES (${escape(unit.id)}, ${escape(unit.name)}, ${escape(unit.contactPerson)}, ${escape(unit.phone)}, ${escape(unit.address)}, ${escape(unit.serviceCount)}, ${unit.isActive}, ${unit.sortOrder}, ${escape(unit.createdAt.toISOString())}, ${escape(unit.updatedAt.toISOString())});`);
    }
    output.push('');

    // 8. ItemStock
    console.log('Exporting ItemStock...');
    const itemStocks = await prisma.itemStock.findMany();
    for (const stock of itemStocks) {
      output.push(`INSERT INTO "ItemStock" ("id", "itemName", "itemCategory", "itemUnit", "totalStock", "safetyStock", "isStandard", "createdAt", "updatedAt") VALUES (${escape(stock.id)}, ${escape(stock.itemName)}, ${escape(stock.itemCategory)}, ${escape(stock.itemUnit)}, ${stock.totalStock}, ${stock.safetyStock}, ${stock.isStandard}, ${escape(stock.createdAt.toISOString())}, ${escape(stock.updatedAt.toISOString())});`);
    }
    output.push('');

    // 9. DonationRecord
    console.log('Exporting DonationRecord...');
    const donationRecords = await prisma.donationRecord.findMany();
    for (const record of donationRecords) {
      output.push(`INSERT INTO "DonationRecord" ("id", "createdAt", "userId", "donorId", "serialNumber") VALUES (${escape(record.id)}, ${escape(record.createdAt.toISOString())}, ${escape(record.userId)}, ${escape(record.donorId)}, ${escape(record.serialNumber)});`);
    }
    output.push('');

    // 10. DonationItem
    console.log('Exporting DonationItem...');
    const donationItems = await prisma.donationItem.findMany();
    for (const item of donationItems) {
      output.push(`INSERT INTO "DonationItem" ("id", "donationId", "quantity", "expiryDate", "isStandard", "itemCategory", "itemName", "itemUnit", "notes", "isHandled") VALUES (${escape(item.id)}, ${escape(item.donationId)}, ${item.quantity}, ${escape(item.expiryDate?.toISOString())}, ${item.isStandard}, ${escape(item.itemCategory)}, ${escape(item.itemName)}, ${escape(item.itemUnit)}, ${escape(item.notes)}, ${item.isHandled});`);
    }
    output.push('');

    // 11. Disbursement
    console.log('Exporting Disbursement...');
    const disbursements = await prisma.disbursement.findMany();
    for (const disb of disbursements) {
      output.push(`INSERT INTO "Disbursement" ("id", "recipientPhone", "createdAt", "userId", "serialNumber", "recipientAddress", "recipientUnitId", "recipientUnitName") VALUES (${escape(disb.id)}, ${escape(disb.recipientPhone)}, ${escape(disb.createdAt.toISOString())}, ${escape(disb.userId)}, ${escape(disb.serialNumber)}, ${escape(disb.recipientAddress)}, ${escape(disb.recipientUnitId)}, ${escape(disb.recipientUnitName)});`);
    }
    output.push('');

    // 12. DisbursementItem
    console.log('Exporting DisbursementItem...');
    const disbursementItems = await prisma.disbursementItem.findMany();
    for (const item of disbursementItems) {
      output.push(`INSERT INTO "DisbursementItem" ("id", "disbursementId", "itemCategory", "itemName", "itemUnit", "quantity") VALUES (${escape(item.id)}, ${escape(item.disbursementId)}, ${escape(item.itemCategory)}, ${escape(item.itemName)}, ${escape(item.itemUnit)}, ${item.quantity});`);
    }
    output.push('');

    // 13. ItemCondition
    console.log('Exporting ItemCondition...');
    const itemConditions = await prisma.itemCondition.findMany();
    for (const cond of itemConditions) {
      output.push(`INSERT INTO "ItemCondition" ("id", "condition", "quantity", "notes", "createdAt", "donationItemId", "disbursementItemId") VALUES (${escape(cond.id)}, ${escape(cond.condition)}, ${cond.quantity}, ${escape(cond.notes)}, ${escape(cond.createdAt.toISOString())}, ${escape(cond.donationItemId)}, ${escape(cond.disbursementItemId)});`);
    }
    output.push('');

    // 14. InventoryLog
    console.log('Exporting InventoryLog...');
    const inventoryLogs = await prisma.inventoryLog.findMany();
    for (const log of inventoryLogs) {
      output.push(`INSERT INTO "InventoryLog" ("id", "itemStockId", "changeType", "changeAmount", "newQuantity", "reason", "createdAt", "userId", "previousQuantity") VALUES (${escape(log.id)}, ${escape(log.itemStockId)}, ${escape(log.changeType)}, ${log.changeAmount}, ${log.newQuantity}, ${escape(log.reason)}, ${escape(log.createdAt.toISOString())}, ${escape(log.userId)}, ${log.previousQuantity});`);
    }
    output.push('');

    // 15. InventoryChangeReason
    console.log('Exporting InventoryChangeReason...');
    const inventoryReasons = await prisma.inventoryChangeReason.findMany();
    for (const reason of inventoryReasons) {
      output.push(`INSERT INTO "InventoryChangeReason" ("id", "reason", "changeType", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES (${escape(reason.id)}, ${escape(reason.reason)}, ${escape(reason.changeType)}, ${reason.isActive}, ${reason.sortOrder}, ${escape(reason.createdAt.toISOString())}, ${escape(reason.updatedAt.toISOString())});`);
    }
    output.push('');

    // 16. ReceiptSeal
    console.log('Exporting ReceiptSeal...');
    const receiptSeals = await prisma.receiptSeal.findMany();
    for (const seal of receiptSeals) {
      output.push(`INSERT INTO "ReceiptSeal" ("id", "imageData", "mimeType", "isActive", "createdAt", "updatedAt", "userId", "nickname") VALUES (${escape(seal.id)}, ${escape(seal.imageData)}, ${escape(seal.mimeType)}, ${seal.isActive}, ${escape(seal.createdAt.toISOString())}, ${escape(seal.updatedAt.toISOString())}, ${escape(seal.userId)}, ${escape(seal.nickname)});`);
    }
    output.push('');

    // 17. SerialNumberCounter
    console.log('Exporting SerialNumberCounter...');
    const serialCounters = await prisma.serialNumberCounter.findMany();
    for (const counter of serialCounters) {
      output.push(`INSERT INTO "SerialNumberCounter" ("id", "type", "counter", "prefix", "updatedAt", "createdAt") VALUES (${escape(counter.id)}, ${escape(counter.type)}, ${counter.counter}, ${escape(counter.prefix)}, ${escape(counter.updatedAt.toISOString())}, ${escape(counter.createdAt.toISOString())});`);
    }
    output.push('');

    // 18. Supply (deprecated table but export anyway)
    console.log('Exporting Supply...');
    const supplies = await prisma.supply.findMany();
    for (const supply of supplies) {
      output.push(`INSERT INTO "Supply" ("id", "name", "category", "quantity", "safetyStock", "createdAt", "updatedAt", "isActive", "sortOrder", "unit") VALUES (${escape(supply.id)}, ${escape(supply.name)}, ${escape(supply.category)}, ${supply.quantity}, ${supply.safetyStock}, ${escape(supply.createdAt.toISOString())}, ${escape(supply.updatedAt.toISOString())}, ${supply.isActive}, ${supply.sortOrder}, ${escape(supply.unit)});`);
    }
    output.push('');

    output.push('SET session_replication_role = DEFAULT;');
    output.push('');

    // Write to file
    fs.writeFileSync('data_only.sql', output.join('\n'));
    console.log(`\n✓ 匯出完成：${output.length} 行寫入 data_only.sql`);

  } catch (error) {
    console.error('匯出失敗:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function escape(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value.toString().toUpperCase();
  if (typeof value === 'number') return value.toString();
  // Escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

exportData().catch(console.error);
