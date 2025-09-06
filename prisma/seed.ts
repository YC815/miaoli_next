import { PrismaClient, ChangeType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始種子數據填充...')

  // 清理現有數據 (按依賴關係順序)
  await prisma.inventoryChangeReason.deleteMany()
  await prisma.recipientUnit.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.category.deleteMany()

  console.log('📦 創建物資類別...')
  const categories = [
    { name: '生活用品', sortOrder: 1 },
    { name: '食品', sortOrder: 2 },
    { name: '衣物', sortOrder: 3 },
    { name: '醫療用品', sortOrder: 4 },
  ]

  for (const category of categories) {
    await prisma.category.create({
      data: category,
    })
  }

  console.log('🏢 創建領取單位...')
  const recipientUnits = [
    { name: '慈濟基金會', phone: '02-2898-9991', sortOrder: 1 },
    { name: '紅十字會', phone: '02-2365-2555', sortOrder: 2 },
    { name: '世界展望會', phone: '02-2175-1995', sortOrder: 3 },
    { name: '創世基金會', phone: '02-2835-7700', sortOrder: 4 },
  ]

  for (const unit of recipientUnits) {
    await prisma.recipientUnit.create({
      data: unit,
    })
  }

  console.log('📏 創建單位...')
  const units = [
    { name: '個', sortOrder: 1 },
    { name: '盒', sortOrder: 2 },
    { name: '包', sortOrder: 3 },
    { name: '罐', sortOrder: 4 },
    { name: '瓶', sortOrder: 5 },
    { name: '袋', sortOrder: 6 },
    { name: '件', sortOrder: 7 },
    { name: '組', sortOrder: 8 },
    { name: '公斤', sortOrder: 9 },
    { name: '公升', sortOrder: 10 },
  ]

  for (const unit of units) {
    await prisma.unit.create({
      data: unit,
    })
  }

  console.log('📝 創建庫存變更原因...')
  const inventoryReasons = [
    { reason: '其他（請說明）', changeType: 'INCREASE', sortOrder: 1 },
    { reason: '過期', changeType: 'DECREASE', sortOrder: 1 },
    { reason: '損壞', changeType: 'DECREASE', sortOrder: 2 },
    { reason: '遺失', changeType: 'DECREASE', sortOrder: 3 },
    { reason: '其他（請說明）', changeType: 'DECREASE', sortOrder: 4 },
  ]

  for (const reason of inventoryReasons) {
    await prisma.inventoryChangeReason.create({
      data: {
        reason: reason.reason,
        changeType: reason.changeType as ChangeType,
        sortOrder: reason.sortOrder,
      },
    })
  }

  console.log('✅ 種子數據填充完成！')
  
  // 顯示填充結果
  const categoryCount = await prisma.category.count()
  const recipientUnitCount = await prisma.recipientUnit.count()
  const unitCount = await prisma.unit.count()
  const reasonCount = await prisma.inventoryChangeReason.count()

  console.log(`📊 填充結果:`)
  console.log(`   - 物資類別: ${categoryCount} 筆`)
  console.log(`   - 領取單位: ${recipientUnitCount} 筆`)
  console.log(`   - 單位: ${unitCount} 筆`)
  console.log(`   - 庫存變更原因: ${reasonCount} 筆`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ 種子數據填充失敗:', e)
    await prisma.$disconnect()
    process.exit(1)
  })