import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 允許的 Origin host 白名單。
// 可用環境變數 ALLOWED_ORIGIN_HOSTS（逗號分隔）擴充，例如加入 Zeabur 預設域名或其他正式域名。
const ALLOWED_ORIGIN_HOSTS = new Set(
  [
    ...(process.env.ALLOWED_ORIGIN_HOSTS ?? "system.miaolcare.com")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean),
    // 本機 / 容器內測試
    "localhost:8080",
    "localhost:3000",
  ]
);

// 擋掉反向代理鏡像站：瀏覽器帶的 Origin 才會洩漏真實來源域名，
// 鏡像 proxy 轉發時 Host 會被改成我方域名，所以只能靠 Origin 判斷。
// 伺服器對伺服器（webhook、健康檢查、Clerk API）不帶 Origin，會自動放行。
export default clerkMiddleware(async (auth, req) => {
  const origin = req.headers.get("origin");
  if (origin) {
    let host: string | null = null;
    try {
      host = new URL(origin).host;
    } catch {
      // 格式不合法的 Origin 一律擋下
    }
    if (!host || !ALLOWED_ORIGIN_HOSTS.has(host)) {
      return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
