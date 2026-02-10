"use client"

import * as React from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"

interface ModerationTourProps {
  enabled: boolean
  onExit: () => void
}

export function ModerationTour({ enabled, onExit }: ModerationTourProps) {
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
            element: '.moderation-header',
            popover: {
              title: 'Gestion des Groupes',
              description: 'Bienvenue dans l\'espace de modération et d\'animation. Ici, vous gérez vos groupes WhatsApp comme un pro.',
              side: "bottom",
              align: 'center'
            }
          },
          {
            element: '.session-selector',
            popover: {
              title: 'Sélection de Session',
              description: 'Choisissez la session WhatsApp dont vous souhaitez gérer les groupes.',
              side: "bottom",
              align: 'center'
            }
          },
          {
            element: '.group-list',
            popover: {
              title: 'Vos Groupes',
              description: 'Retrouvez ici tous les groupes où votre session est administratrice.',
              side: "top",
              align: 'center'
            }
          },
          {
            element: '.animation-config',
            popover: {
              title: 'Profil d\'Animation',
              description: 'Définissez la mission, les objectifs et les règles du groupe pour que l\'IA puisse générer des messages pertinents.',
              side: "left",
              align: 'center'
            }
          },
          {
            element: '.product-links',
            popover: {
              title: 'Liens Produits',
              description: 'Ajoutez vos liens et catalogues pour que l\'IA puisse les promouvoir naturellement dans ses messages.',
              side: "left",
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
