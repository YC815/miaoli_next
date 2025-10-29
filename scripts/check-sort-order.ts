import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 檢查物資品項排序...\n')

  // 讀取 item_list.json 的順序
  const itemListPath = join(process.cwd(), 'public', 'item_list.json')
  const itemListData = JSON.parse(readFileSync(itemListPath, 'utf8'))

  console.log('📄 item_list.json 的順序:')
  let expectedOrder = 0
  const expectedMapping: Record<string, { order: number; category: string }> = {}

  for (const [category, items] of Object.entries(itemListData)) {
    console.log(`\n${category}:`)
    for (const item of items as Array<{ item: string; units: string[]; defaultUnit: string }>) {
      console.log(`  ${expectedOrder + 1}. ${item.item}`)
      expectedMapping[`${category}::${item.item}`] = { order: expectedOrder, category }
      expectedOrder++
    }
  }

  // 檢查資料庫的實際順序
  console.log('\n\n📦 資料庫的實際順序:')
  const dbItems = await prisma.standardItem.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  })

  let currentCategory = ''
  dbItems.forEach((item, index) => {
    if (item.category !== currentCategory) {
      console.log(`\n${item.category}:`)
      currentCategory = item.category
    }
    const key = `${item.category}::${item.name}`
    const expected = expectedMapping[key]
    const mismatch = expected && expected.order !== item.sortOrder ? ' ⚠️  順序不符' : ''
    console.log(`  ${index + 1}. ${item.name} (sortOrder: ${item.sortOrder}${mismatch})`)
  })

  // 找出順序不一致的項目
  console.log('\n\n🔍 順序分析:')
  const mismatches: Array<{ name: string; category: string; dbOrder: number; expectedOrder: number }> = []

  dbItems.forEach(item => {
    const key = `${item.category}::${item.name}`
    const expected = expectedMapping[key]
    if (expected && expected.order !== item.sortOrder) {
      mismatches.push({
        name: item.name,
        category: item.category,
        dbOrder: item.sortOrder,
        expectedOrder: expected.order
      })
    }
  })

  if (mismatches.length > 0) {
    console.log(`❌ 發現 ${mismatches.length} 項順序不符:`)
    mismatches.forEach(m => {
      console.log(`  ${m.category} - ${m.name}: DB=${m.dbOrder}, Expected=${m.expectedOrder}`)
    })
  } else {
    console.log('✅ 所有項目順序一致')
  }

  // 檢查是否有 DB 中有但 JSON 中沒有的項目
  console.log('\n\n🔍 額外項目檢查:')
  const extraItems = dbItems.filter(item => {
    const key = `${item.category}::${item.name}`
    return !expectedMapping[key]
  })

  if (extraItems.length > 0) {
    console.log(`⚠️  資料庫中有 ${extraItems.length} 項在 JSON 中不存在:`)
    extraItems.forEach(item => {
      console.log(`  ${item.category} - ${item.name} (sortOrder: ${item.sortOrder})`)
    })
  } else {
    console.log('✅ 沒有額外項目')
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
