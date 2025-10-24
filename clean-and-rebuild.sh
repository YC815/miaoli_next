#!/bin/bash
set -e

echo "🧹 清理所有快取..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.prisma

echo "🔄 重新生成 Prisma Client..."
npx prisma generate

echo "✅ 清理完成！現在請重啟 dev server："
echo "   npm run dev"
