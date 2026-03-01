"use client"

import React, { ErrorInfo, ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[400px] w-full items-center justify-center p-6">
          <Card className="max-w-md border-destructive/20 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl font-bold">Oups ! Quelque chose a mal tourné</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Une erreur inattendue est survenue lors de l"affichage de cette page.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="rounded-md bg-muted p-3 text-left">
                  <p className="text-[10px] font-mono text-destructive break-all uppercase font-bold mb-1">Détails techniques :</p>
                  <p className="text-[11px] font-mono text-muted-foreground line-clamp-4">{this.state.error.message}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full h-10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Actualiser la page
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="w-full text-xs"
                >
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
