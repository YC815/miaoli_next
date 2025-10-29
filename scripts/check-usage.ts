import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 檢查「衛生用品_補充」類別的使用狀況...\n')

  // 檢查 ItemStock
  const stocks = await prisma.itemStock.findMany({
    where: { itemCategory: '衛生用品_補充' }
  })
  console.log(`📦 ItemStock: ${stocks.length} 筆`)
  stocks.forEach(s => console.log(`  - ${s.itemName} (庫存: ${s.totalStock})`))

  // 檢查 DonationItem
  const donations = await prisma.donationItem.findMany({
    where: { itemCategory: '衛生用品_補充' },
    include: { donation: true }
  })
  console.log(`\n📥 DonationItem: ${donations.length} 筆`)
  donations.forEach(d => console.log(`  - ${d.itemName} x${d.quantity} (${d.donation.serialNumber})`))

  // 檢查 DisbursementItem
  const disbursements = await prisma.disbursementItem.findMany({
    where: { itemCategory: '衛生用品_補充' },
    include: { disbursement: true }
  })
  console.log(`\n📤 DisbursementItem: ${disbursements.length} 筆`)
  disbursements.forEach(d => console.log(`  - ${d.itemName} x${d.quantity} (${d.disbursement.serialNumber})`))

  // 檢查 CustomItem
  const customItems = await prisma.customItem.findMany({
    where: { category: '衛生用品_補充' }
  })
  console.log(`\n🔧 CustomItem: ${customItems.length} 筆`)
  customItems.forEach(c => console.log(`  - ${c.name} (${c.isActive ? '啟用' : '停用'})`))

  const totalUsage = stocks.length + donations.length + disbursements.length + customItems.length

  console.log(`\n📊 總計使用次數: ${totalUsage}`)

  if (totalUsage === 0) {
    console.log('\n✅ 安全刪除:「衛生用品_補充」類別沒有任何引用,可以直接移除')
  } else {
    console.log('\n⚠️  注意:「衛生用品_補充」類別有歷史資料引用,建議軟刪除')
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ 檢查失敗:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
