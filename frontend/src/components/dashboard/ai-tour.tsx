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
            title: '🚀 Centre de Commande IA',
            description: 'Bienvenue dans la configuration avancée. Ici, vous allez donner une âme à votre assistant WhatsApp.',
            side: "bottom",
            align: 'center'
          }
        },
        {
          element: '.ai-mode-selector',
          popover: {
            title: '🧠 Stratégie Opérationnelle',
            description: 'Choisissez comment l\'IA doit intervenir. **Autonome** pour une réactivité totale, ou **Hybride** pour garder le contrôle.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '.ai-prompt-area',
          popover: {
            title: '✍️ Matrice Neuronale',
            description: 'C\'est ici que tout se joue. Définissez l\'identité, le ton et les connaissances de votre assistant. Soyez aussi précis que possible !',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '.ai-model-selector',
          popover: {
            title: '⚡ Moteur d\'Intelligence',
            description: 'Sélectionnez la puissance de calcul. DeepSeek offre un excellent rapport performance/prix pour le support WhatsApp.',
            side: "left",
            align: 'center'
          }
        },
        {
          element: '.ai-save-button',
          popover: {
            title: '💾 Synchronisation',
            description: 'Une fois vos réglages terminés, cliquez ici pour déployer la nouvelle configuration sur votre numéro.',
            side: "left",
            align: 'center'
          }
        }
      ] : [
        {
          element: '.ai-page-header',
          popover: {
            title: '🤖 Vos Assistants IA',
            description: 'Gérez toute votre flotte d\'IA en un seul endroit. Chaque numéro WhatsApp peut avoir sa propre intelligence.',
            side: "bottom",
            align: 'center'
          }
        },
        {
          element: '.ai-session-card',
          popover: {
            title: '📱 Vos Instances',
            description: 'Chaque carte représente un numéro connecté. Vous pouvez voir en un coup d\'œil son statut et ses performances.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '.ai-quick-settings',
          popover: {
            title: '⚙️ Réglages Rapides',
            description: 'Modifiez les paramètres essentiels sans quitter la page principale.',
            side: "left",
            align: 'center'
          }
        },
        {
          element: '.ai-advanced-config',
          popover: {
            title: '💎 Configuration Pro',
            description: 'Accédez au "Command Center" pour personnaliser les règles de sécurité et la personnalité de l\'IA.',
            side: "left",
            align: 'center'
          }
        },
        {
          element: '.ai-toggle-switch',
          popover: {
            title: '⚡ Activation Instantanée',
            description: 'Basculez entre le mode manuel et l\'automatisation complète en un clic.',
            side: "top",
            align: 'center'
          }
        }
      ]

      const driverObj = driver({
        popoverClass: 'whappi-driver-theme',
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: 'rgba(0, 0, 0, 0.75)',
        nextBtnText: 'Suivant',
        prevBtnText: 'Précédent',
        doneBtnText: 'Terminé',
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
