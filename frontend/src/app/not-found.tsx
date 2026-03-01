import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft } from "lucide-react"

const ERROR_CODE_404 = "404";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="relative">
        <h1 className="relative text-9xl font-bold text-primary opacity-20">{ERROR_CODE_404}</h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Page introuvable</h2>
            <p className="text-muted-foreground max-w-xs mx-auto text-sm">
              Oups ! La page que vous recherchez semble avoir disparu ou n&apos;a jamais existé.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-12">
        <Button asChild variant="outline" className="rounded-full px-6">
          <Link href="javascript:history.back()">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
        <Button asChild className="rounded-full px-6 shadow-lg shadow-primary/20">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Accueil
          </Link>
        </Button>
      </div>

      <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 grayscale">
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
        <div className="h-8 w-24 bg-muted rounded animate-pulse delay-75" />
        <div className="h-8 w-24 bg-muted rounded animate-pulse delay-150" />
        <div className="h-8 w-24 bg-muted rounded animate-pulse delay-300" />
      </div>
    </div>
  )
}
