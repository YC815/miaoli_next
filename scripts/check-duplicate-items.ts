import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 檢查重複的物資品項...\n')

  // 檢查 StandardItem
  const standardItems = await prisma.standardItem.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }]
  })

  console.log('📦 StandardItem 統計:')
  const standardByCategory = standardItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item.name)
    return acc
  }, {} as Record<string, string[]>)

  for (const [category, items] of Object.entries(standardByCategory)) {
    console.log(`\n${category} (${items.length} 項):`)
    items.forEach(item => console.log(`  - ${item}`))
  }

  // 尋找重複項目
  const duplicates = standardItems.reduce((acc, item) => {
    const key = `${item.category}::${item.name}`
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, typeof standardItems>)

  const actualDuplicates = Object.entries(duplicates).filter(([, items]) => items.length > 1)

  if (actualDuplicates.length > 0) {
    console.log('\n⚠️  發現重複項目:')
    actualDuplicates.forEach(([key, items]) => {
      const [category, name] = key.split('::')
      console.log(`\n${category} - ${name} (${items.length} 筆):`)
      items.forEach(item => {
        console.log(`  ID: ${item.id}`)
        console.log(`  sortOrder: ${item.sortOrder}`)
        console.log(`  isActive: ${item.isActive}`)
      })
    })
  } else {
    console.log('\n✅ 沒有發現重複項目')
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
