"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      closeButton
      position="top-right"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-emerald-500" />
        ),
        info: (
          <InfoIcon className="size-4 text-blue-500" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-500" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-rose-500" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-primary" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:gap-3",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-[11px] group-[.toast]:font-medium",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-black group-[.toast]:text-[10px] group-[.toast]:uppercase group-[.toast]:tracking-widest",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-black group-[.toast]:text-[10px] group-[.toast]:uppercase group-[.toast]:tracking-widest",
          success: "group-[.toaster]:border-emerald-500/20 group-[.toaster]:bg-emerald-500/[0.02]",
          error: "group-[.toaster]:border-rose-500/20 group-[.toaster]:bg-rose-500/[0.02]",
          warning: "group-[.toaster]:border-amber-500/20 group-[.toaster]:bg-amber-500/[0.02]",
          info: "group-[.toaster]:border-blue-500/20 group-[.toaster]:bg-blue-500/[0.02]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
