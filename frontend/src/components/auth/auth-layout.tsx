import { Logo } from "@/components/ui/logo"
import Link from "next/link"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden font-sans text-white">
      {/* Background Decorative Elements - Subtle and Dark */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full opacity-50" />
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.03 }} />
      </div>

      <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center relative z-10">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link href="/" className="group mb-6 relative">
             <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
             <div className="relative bg-zinc-900/50 p-4 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-sm group-hover:scale-105 transition-transform duration-300">
                <Logo size={48} showText={false} />
             </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">{title}</h1>
          <p className="text-sm text-zinc-400 font-medium">{subtitle}</p>
        </div>

        {/* Card Content */}
        <div className="w-full bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl ring-1 ring-white/5">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-medium uppercase tracking-widest">
            <span>Secured by</span>
            <span className="flex items-center gap-1 text-zinc-500">
               <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3" aria-hidden="true"><path d="M8.76 5.8a2.97 2.97 0 0 0-3.69 2.15l-.06.27-.18 1.05h1.2l.14-.83a1.86 1.86 0 0 1 2.5-1.18 1.86 1.86 0 0 1 .53 2.92l-.65.65a.55.55 0 0 0-.16.39v.88h1.1v-.64a1.65 1.65 0 0 1 .49-1.17l.64-.64a2.95 2.95 0 0 0-1.86-3.8ZM12.03 0H3.97L0 3.3v9.4L3.97 16h8.06L16 12.7V3.3L12.03 0ZM11.1 14.9H4.9L1.1 11.8V4.2l3.8-3.1h6.2l3.8 3.1v7.6l-3.8 3.1Z"/></svg>
               Clerk
            </span>
          </div>
          <div className="text-[10px] text-zinc-700">
             Development mode
          </div>
        </div>
      </div>
    </div>
  )
}
