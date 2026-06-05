"use client"

import * as React from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { usePathname } from "next/navigation"
import { useUser, useAuth } from "@clerk/clerk-react"
import { api } from "@/lib/api"

export function OnboardingTour() {
  const pathname = usePathname()
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [hasStarted, setHasStarted] = React.useState(false)

  const startTour = React.useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      doneBtnText: "Terminer",
      closeBtnText: "Fermer",
      nextBtnText: "Suivant",
      prevBtnText: "Précédent",
      popoverClass: "whappi-tour-popover",
      steps: [
        {
          element: "#nav--dashboard",
          popover: {
            title: "Bienvenue sur Whappi",
            description: "Votre premier objectif : connecter un numéro WhatsApp dédié, puis tester une règle simple sur un groupe réel.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#new-session-btn",
          popover: {
            title: "Créez votre première session",
            description: "Une session représente le numéro WhatsApp que Whappi utilisera comme co-admin de vos groupes.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: "#connection-area",
          popover: {
            title: "Connectez WhatsApp",
            description: "Scannez le QR code ou utilisez le code d'appairage. Pour réduire les risques, privilégiez un numéro dédié au bot.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#nav--dashboard-moderation",
          popover: {
            title: "Activez une règle de groupe",
            description: "Commencez simple : message de bienvenue, blocage des liens ou avertissements. Une règle active suffit pour voir la valeur.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#nav--dashboard-activities",
          popover: {
            title: "Vérifiez les actions",
            description: "Le journal montre ce que Whappi a fait. C'est votre preuve de contrôle : règles appliquées, messages filtrés, actions visibles.",
            side: "right",
            align: "start",
          },
        },
      ],
    })

    driverObj.drive()
  }, [])

  React.useEffect(() => {
    const checkTour = async () => {
      if (!isLoaded || !user || hasStarted || pathname !== "/dashboard") return

      try {
        const token = await getToken()
        const sessions = await api.sessions.list(token || undefined)
        const tourSeen = localStorage.getItem("whappi_tour_seen")

        if ((!sessions || sessions.length === 0) && !tourSeen) {
          setHasStarted(true)
          localStorage.setItem("whappi_tour_seen", "true")
          setTimeout(startTour, 1000)
        }
      } catch (error) {
        console.error("Tour check failed", error)
      }
    }

    checkTour()
  }, [isLoaded, user, pathname, getToken, hasStarted, startTour])

  React.useEffect(() => {
    ;(window as Window & { startWhappiTour?: () => void }).startWhappiTour = startTour
    return () => {
      delete (window as Window & { startWhappiTour?: () => void }).startWhappiTour
    }
  }, [startTour])

  return null
}
