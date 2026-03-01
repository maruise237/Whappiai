import * as React from "react"
import { Copy, Check } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { copyToClipboard as copyUtil } from "@/lib/utils"
import { toast } from "sonner"

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export function CodeBlock({ code, lang = "bash" }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    const success = await copyUtil(code)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Copié dans le presse-papier")
    } else {
      toast.error("Échec de la copie")
    }
  }

  return (
    <div className="relative group my-6">
      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
        <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg border-2 border-primary/10 shadow-sm">
          {lang}
        </span>
        <button
          onClick={handleCopy}
          className="p-2 bg-background/80 backdrop-blur-md border-2 border-primary/10 rounded-lg hover:bg-primary/10 hover:border-primary/20 transition-all duration-200 text-muted-foreground hover:text-primary shadow-sm active:scale-90"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <ScrollArea className="w-full rounded-lg border-2 border-primary/5 bg-[#0d1117] p-6 font-mono text-[11px] text-slate-300 leading-relaxed shadow-inner">
        <pre className="whitespace-pre">{code}</pre>
      </ScrollArea>
    </div>
  )
}
