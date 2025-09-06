import { SignIn } from '@clerk/nextjs'
 
export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mb-4 mx-auto">
            <span className="text-primary-foreground font-bold text-lg">苗</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">苗栗社福物資管理平台</h1>
          <p className="text-muted-foreground">請登入以繼續使用</p>
        </div>
        
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg border",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "w-full",
              formButtonPrimary: "w-full bg-primary hover:bg-primary/90",
              footerAction: "hidden", // 隱藏註冊連結
            }
          }}
        />
        
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            沒有帳號？系統會在您首次登入時自動為您建立帳號
          </p>
        </div>
      </div>
    </div>
  )
}