import { Logo } from "@/components/ui/logo"
import Link from "next/link"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden font-sans text-foreground transition-colors duration-300">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Green glow effects */}
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-green-500/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-normal" />
        <div className="absolute bottom-[-20%] right-[20%] w-[500px] h-[500px] bg-green-500/5 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-normal" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.15] dark:opacity-[0.15] opacity-[0.05]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px' 
          }} 
        />
      </div>

      <div className="w-full max-w-[420px] flex flex-col items-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Section */}
        <div className="flex flex-col items-center mb-10 text-center w-full">
          <Link href="/" className="mb-8 hover:opacity-90 transition-opacity">
            <Logo size={40} showText={true} textClassName="text-foreground tracking-wide" />
          </Link>
          
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3 leading-tight">
            Créez votre <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 relative inline-block">
              Assistant IA
              <svg className="absolute w-full h-2 -bottom-1 left-0 text-green-500" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </span>
            <br />en quelques minutes
          </h1>
        </div>

        {/* Card Content - Transparent/Minimalist */}
        <div className="w-full space-y-6">
          <div className="text-center space-y-1 mb-6">
            <h2 className="text-xl font-semibold text-foreground/90">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          
          {children}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               Secured by Clerk
            </span>
          </div>
          <div className="text-xs text-muted-foreground/80 max-w-xs mx-auto leading-relaxed">
             En vous inscrivant, vous acceptez nos <Link href="/terms" className="text-green-600 dark:text-green-500 hover:underline">termes</Link> et <Link href="/privacy" className="text-green-600 dark:text-green-500 hover:underline">politique de confidentialité</Link>.
          </div>
        </div>
      </div>
    </div>
  )
}
