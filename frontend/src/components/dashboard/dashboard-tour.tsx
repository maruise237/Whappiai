"use client"

import * as React from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"

interface DashboardTourProps {
  enabled: boolean
  onExit: () => void
}

export function DashboardTour({ enabled, onExit }: DashboardTourProps) {
  React.useEffect(() => {
    if (enabled) {
      const driverObj = driver({
        popoverClass: 'driverjs-theme',
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: 'rgba(0, 0, 0, 0.75)',
        nextBtnText: 'Suivant',
        prevBtnText: 'Précédent',
        doneBtnText: 'Terminé',
        steps: [
          {
            element: '.whappi-logo',
            popover: {
              title: 'Bienvenue sur Whappi',
              description: 'Votre passerelle WhatsApp ultra-légère et performante. Commençons par un petit tour guidé.',
              side: "right",
              align: 'start'
            }
          },
          {
            element: '.qr-scan-button',
            popover: {
              title: 'Scanner le QR Code',
              description: 'C\'est ici que tout commence. Cliquez sur ce bouton pour générer un QR code et scannez-le avec votre téléphone pour connecter votre compte WhatsApp.',
              side: "bottom",
              align: 'center'
            }
          },
          {
            element: '.messaging-tabs',
            popover: {
              title: 'Envoi de Messages',
              description: 'Une fois connecté, utilisez ces onglets pour envoyer des messages texte, des images ou des documents instantanément.',
              side: "top",
              align: 'center'
            }
          },
          {
            element: '.log-viewer',
            popover: {
              title: 'Zone des Logs',
              description: 'Suivez en temps réel tout ce qui se passe sur votre serveur. Idéal pour le débogage et le suivi des envois.',
              side: "top",
              align: 'center'
            }
          },
          {
            element: '.api-usage-card',
            popover: {
              title: 'Intégration API',
              description: 'Besoin d\'automatiser ? Copiez ces exemples de code pour intégrer Whappi dans vos propres applications.',
              side: "top",
              align: 'center'
            }
          }
        ],
        onDestroyStarted: () => {
          onExit()
        }
      })

      // Un petit délai pour s'assurer que le DOM est prêt
      const timer = setTimeout(() => {
        driverObj.drive()
      }, 500)

      return () => {
        clearTimeout(timer)
        driverObj.destroy()
      }
    }
  }, [enabled, onExit])

  return null
}
