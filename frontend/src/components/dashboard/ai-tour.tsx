"use client"

import * as React from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"

interface AITourProps {
  enabled: boolean
  onExit: () => void
  isConfigPage?: boolean
}

export function AITour({ enabled, onExit, isConfigPage = false }: AITourProps) {
  React.useEffect(() => {
    if (enabled) {
      const steps = isConfigPage ? [
        {
          element: '.ai-config-header',
          popover: {
            title: '🚀 Command Center 2025',
            description: 'Bienvenue dans l\'interface de pilotage neuronal. Ici, vous allez donner vie à votre assistant.',
            side: "bottom",
            align: 'center'
          }
        },
        {
          element: '#intelligence',
          popover: {
            title: '🧠 Neural Engine',
            description: 'Choisissez le cerveau de votre bot. Mode autonome pour une gestion totale, ou hybride pour garder le contrôle.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '#automation',
          popover: {
            title: '🛡️ Safety Guard',
            description: 'Configurez les barrières de sécurité : pause automatique quand vous écrivez, anti-bouclage, et protection contre les appels.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '.ai-prompt-area',
          popover: {
            title: '🎭 Personality Logic',
            description: 'C\'est ici que tout se joue. Définissez qui est votre IA, ce qu\'elle vend, et comment elle doit s\'adresser à vos clients.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '#advanced',
          popover: {
            title: '⚙️ Advanced Tuning',
            description: 'Pour les experts : ajustez la température (créativité) et changez de modèle de langage à la volée.',
            side: "left",
            align: 'center'
          }
        }
      ] : [
        {
          element: '.ai-page-header',
          popover: {
            title: '✨ AI Intelligence Hub',
            description: 'Découvrez la version 6.0 du centre d\'intelligence. Gérez vos bots WhatsApp avec une précision chirurgicale.',
            side: "bottom",
            align: 'center'
          }
        },
        {
          element: '.ai-session-card',
          popover: {
            title: '🤖 Instance Matrix',
            description: 'Chaque carte représente un cerveau distinct connecté à l\'un de vos numéros WhatsApp.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '.ai-quick-settings',
          popover: {
            title: '⚡ Quick Tuning',
            description: 'Ajustez les paramètres vitaux sans quitter le hub principal.',
            side: "left",
            align: 'center'
          }
        },
        {
          element: '.ai-advanced-config',
          popover: {
            title: '🚀 Advanced Matrix',
            description: 'Plongez dans les réglages profonds pour configurer le prompt système et la sécurité.',
            side: "left",
            align: 'center'
          }
        }
      ]

      const driverObj = driver({
        popoverClass: 'whappi-driver-theme',
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: 'rgba(15, 23, 42, 0.85)',
        nextBtnText: 'Suivant',
        prevBtnText: 'Précédent',
        doneBtnText: 'C\'est parti !',
        steps: steps,
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
  }, [enabled, onExit, isConfigPage])

  return null
}
