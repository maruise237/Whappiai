"use client"

import { SignIn } from "@clerk/nextjs"
import { Logo } from "@/components/ui/logo"
import { InstallPrompt } from "@/components/InstallPrompt"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 relative overflow-hidden font-sans" suppressHydrationWarning>
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-primary/10 mb-4 border border-primary/5">
            <Logo size={64} showText={false} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Whappi</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 mt-2">Passerelle API WhatsApp Business</p>
        </div>

        <SignIn 
          path="/login"
          routing="path"
          fallbackRedirectUrl="/"
          signUpUrl="/register"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "border border-slate-200/50 dark:border-white/5 shadow-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl",
              headerTitle: "text-2xl font-black tracking-tight",
              headerSubtitle: "text-xs font-bold uppercase tracking-widest opacity-60",
              formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] h-12 rounded-xl transition-all shadow-lg shadow-primary/20",
              formFieldInput: "h-12 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 focus:ring-primary focus:border-primary transition-all text-xs font-bold",
              formFieldLabel: "text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1",
              footerActionLink: "text-primary hover:text-primary/80 font-black",
              identityPreviewText: "font-bold",
              identityPreviewEditButtonIcon: "text-primary"
            }
          }}
        />
        <InstallPrompt className="fixed bottom-4 right-4 top-auto" />
      </div>
    </div>
  )
}
