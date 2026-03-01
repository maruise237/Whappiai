"use client"

import * as React from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"

export function OnboardingTour() {
  const pathname = usePathname()
  const router = useRouter()
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
            title: "Bienvenue sur Whappi !",
            description: "Voici votre nouveau centre de commande WhatsApp. Une interface pensée pour la performance et la simplicité.",
            side: "right",
            align: "start"
          }
        },
        {
          element: "#performance-charts",
          popover: {
            title: "Analyses en temps réel",
            description: "Suivez votre volume de messages, le taux de réussite de l\"IA et votre consommation de crédits au jour le jour.",
            side: "bottom",
            align: "center"
          }
        },
        {
          element: "#new-session-btn",
          popover: {
            title: "Connectez vos comptes",
            description: "Commencez ici en créant une session. Vous pourrez ensuite scanner le QR code pour lier votre instance WhatsApp.",
            side: "bottom",
            align: "end"
          }
        },
        {
          element: "#connection-area",
          popover: {
            title: "Scanner et Connecter",
            description: "Scannez le QR Code avec votre téléphone ou utilisez un code d\"appairage (via votre numéro de téléphone) pour activer votre session.",
            side: "top",
            align: "center"
          }
        },
        {
          element: "#nav--dashboard-ai",
          popover: {
            title: "Intelligence Artificielle",
            description: "Donnez un cerveau à votre WhatsApp. Configurez les modèles, les prompts et les règles d\"automatisation intelligentes.",
            side: "right",
            align: "start"
          }
        },
        {
          element: "#nav--dashboard-moderation",
          popover: {
            title: "Gestion des Groupes",
            description: "Protégez vos communautés. Anti-spam, filtres de mots-clés et messages de bienvenue automatisés se configurent ici.",
            side: "right",
            align: "start"
          }
        },
        {
          element: "#nav--dashboard-credits",
          popover: {
            title: "Portefeuille de Crédits",
            description: "Gardez un oeil sur votre solde. Chaque message envoyé consomme 1 crédit. Réclamez vos 60 crédits offerts ici !",
            side: "right",
            align: "start"
          }
        },
        {
          element: "#nav--dashboard-activities",
          popover: {
            title: "Journal d\"activités",
            description: "Transparence totale. Consultez l\"historique détaillé de chaque action effectuée par le système.",
            side: "right",
            align: "start"
          }
        },
        {
          element: "#nav--dashboard-ai-models",
          popover: {
            title: "Moteurs IA",
            description: "Section Admin : Configurez les différents modèles (DeepSeek, OpenAI, etc.) disponibles pour vos sessions.",
            side: "right",
            align: "start"
          }
        },
        {
          element: "#nav--dashboard-billing",
          popover: {
            title: "Abonnements",
            description: "Gérez vos plans et factures en toute simplicité. Changez de formule selon vos besoins.",
            side: "right",
            align: "start"
          }
        },
        {
          element: "#nav--dashboard-profile",
          popover: {
            title: "Configuration Finale",
            description: "Réglez votre fuseau horaire, activez les notifications sonores et gérez les infos de votre organisation.",
            side: "right",
            align: "start"
          }
        }
      ]
    });

    driverObj.drive();
  }, []);

  React.useEffect(() => {
    const checkTour = async () => {
      if (!isLoaded || !user || hasStarted || pathname !== "/dashboard") return

      try {
        const token = await getToken()
        const sessions = await api.sessions.list(token || undefined)

        // Only auto-start if user has no sessions and hasn"t seen the tour yet
        const tourSeen = localStorage.getItem("whappi_tour_seen")
        if ((!sessions || sessions.length === 0) && !tourSeen) {
          setHasStarted(true)
          localStorage.setItem("whappi_tour_seen", "true")
          // Small delay to ensure elements are rendered
          setTimeout(startTour, 1000)
        }
      } catch (e) {
        console.error("Tour check failed", e)
      }
    }

    checkTour()
  }, [isLoaded, user, pathname, getToken, hasStarted, startTour])

  // Expose a way to manually start the tour
  React.useEffect(() => {
    (window as any).startWhappiTour = startTour
    return () => { delete (window as any).startWhappiTour }
  }, [startTour])

  return null
}
