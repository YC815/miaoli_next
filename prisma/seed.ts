import { PrismaClient, ChangeType } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始種子數據填充...')

  // 清理現有數據 (按依賴關係順序)
  await prisma.inventoryChangeReason.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.category.deleteMany()
  // 不清理 StandardItem、RecipientUnit、Donor，使用 upsert 更新

  console.log('📦 創建物資類別...')
  const categories = [
    { name: '食品', sortOrder: 1 },
    { name: '衛生用品', sortOrder: 2 },
    { name: '清潔用品', sortOrder: 3 },
    { name: '衛生用品.', sortOrder: 4 },
  ]

  for (const category of categories) {
    await prisma.category.create({
      data: {
        id: randomUUID(),
        name: category.name,
        sortOrder: category.sortOrder,
        updatedAt: new Date(),
      },
    })
  }

  console.log('📏 創建計量單位...')
  const units = [
    { name: '包', sortOrder: 1 },
    { name: '罐', sortOrder: 2 },
    { name: '盒', sortOrder: 3 },
    { name: '瓶', sortOrder: 4 },
    { name: '個', sortOrder: 5 },
    { name: '公斤', sortOrder: 6 },
    { name: '片', sortOrder: 7 },
    { name: '支', sortOrder: 8 },
    { name: '條', sortOrder: 9 },
  ]

  for (const unit of units) {
    await prisma.unit.create({
      data: {
        id: randomUUID(),
        name: unit.name,
        sortOrder: unit.sortOrder,
        updatedAt: new Date(),
      },
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
        id: randomUUID(),
        reason: reason.reason,
        changeType: reason.changeType as ChangeType,
        sortOrder: reason.sortOrder,
        updatedAt: new Date(),
      },
    })
  }

  // 🆕 種子 StandardItem（從 item_list.json）
  console.log('📦 創建標準物資品項（StandardItem）...')
  const itemListPath = join(process.cwd(), 'public', 'item_list.json')
  const itemListData = JSON.parse(readFileSync(itemListPath, 'utf8'))

  // 先收集 JSON 中所有的品項,用於判斷哪些需要軟刪除
  const jsonItems = new Set<string>()
  for (const [category, items] of Object.entries(itemListData)) {
    for (const item of items as Array<{ item: string; units: string[]; defaultUnit: string }>) {
      jsonItems.add(`${category}::${item.item}`)
    }
  }

  // 軟刪除不在 JSON 中的項目
  const existingItems = await prisma.standardItem.findMany()
  for (const existing of existingItems) {
    const key = `${existing.category}::${existing.name}`
    if (!jsonItems.has(key)) {
      await prisma.standardItem.update({
        where: { id: existing.id },
        data: { isActive: false }
      })
      console.log(`   ⚠️  軟刪除: ${existing.category} - ${existing.name}`)
    }
  }

  // 按照 JSON 順序建立或更新品項
  let standardItemCount = 0
  for (const [category, items] of Object.entries(itemListData)) {
    for (const item of items as Array<{ item: string; units: string[]; defaultUnit: string }>) {
      await prisma.standardItem.upsert({
        where: {
          name_category: {
            name: item.item,
            category: category
          }
        },
        create: {
          id: randomUUID(),
          name: item.item,
          category: category,
          units: item.units,
          defaultUnit: item.defaultUnit,
          isActive: true,
          sortOrder: standardItemCount
        },
        update: {
          units: item.units,
          defaultUnit: item.defaultUnit,
          isActive: true,
          sortOrder: standardItemCount
        }
      })
      standardItemCount++
      console.log(`   ✓ ${category} - ${item.item} (單位: ${item.units.join('/')}, sortOrder: ${standardItemCount - 1})`)
    }
  }

  // 🆕 種子 RecipientUnit（從 mechanism_list.json）
  console.log('\n🏢 創建受贈單位（RecipientUnit）...')
  const mechanismListPath = join(process.cwd(), 'public', 'mechanism_list.json')
  const mechanismListData = JSON.parse(readFileSync(mechanismListPath, 'utf8')) as Array<{
    name: string
    adult?: number
    child?: number
    elderly?: number
    family?: number
    service?: string
  }>

  let recipientUnitCount = 0
  for (const mechanism of mechanismListData) {
    // 計算服務人數總計
    const serviceCount = (mechanism.adult || 0) + (mechanism.child || 0) + (mechanism.elderly || 0) + (mechanism.family || 0)

    await prisma.recipientUnit.upsert({
      where: { name: mechanism.name },
      create: {
        id: randomUUID(),
        name: mechanism.name,
        serviceCount: serviceCount > 0 ? serviceCount : null,
        isActive: true,
        sortOrder: recipientUnitCount,
        updatedAt: new Date()
      },
      update: {
        serviceCount: serviceCount > 0 ? serviceCount : null,
        isActive: true
      }
    })
    recipientUnitCount++
    console.log(`   ✓ ${mechanism.name}${serviceCount > 0 ? ` (服務人數: ${serviceCount})` : ''}`)
  }

  console.log('\n✅ 種子數據填充完成！')

  // 顯示填充結果
  const categoryCount = await prisma.category.count()
  const unitCount = await prisma.unit.count()
  const reasonCount = await prisma.inventoryChangeReason.count()
  const recipientCount = await prisma.recipientUnit.count()

  console.log(`\n📊 填充結果:`)
  console.log(`   - 物資類別: ${categoryCount} 筆`)
  console.log(`   - 計量單位: ${unitCount} 筆`)
  console.log(`   - 庫存變更原因: ${reasonCount} 筆`)
  console.log(`   - 標準物資品項: ${standardItemCount} 筆`)
  console.log(`   - 受贈單位: ${recipientCount} 筆`)
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
