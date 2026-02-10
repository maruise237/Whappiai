"use client"

import * as React from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"

interface CampaignsTourProps {
  enabled: boolean
  onExit: () => void
}

export function CampaignsTour({ enabled, onExit }: CampaignsTourProps) {
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
            element: '.campaigns-header',
            popover: {
              title: 'Gestion des Campagnes',
              description: 'C\'est ici que vous gérez vos envois massifs de messages WhatsApp.',
              side: "bottom",
              align: 'center'
            }
          },
          {
            element: '.create-campaign-btn',
            popover: {
              title: 'Créer une Campagne',
              description: 'Cliquez ici pour lancer une nouvelle campagne de diffusion.',
              side: "left",
              align: 'center'
            }
          },
          {
            element: '.campaigns-table',
            popover: {
              title: 'Liste des Campagnes',
              description: 'Suivez l\'état d\'avancement, les succès et les échecs de vos campagnes en temps réel.',
              side: "top",
              align: 'center'
            }
          },
          {
            element: '.campaign-stats',
            popover: {
              title: 'Statistiques Rapides',
              description: 'Un aperçu global de vos performances d\'envoi sur cette session.',
              side: "bottom",
              align: 'center'
            }
          }
        ],
        onDestroyStarted: () => {
          onExit()
        }
      })

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
