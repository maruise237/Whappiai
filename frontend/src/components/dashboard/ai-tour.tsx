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
            title: 'Configuration Avancée',
            description: 'Ici, vous pouvez affiner les réglages de l\'IA pour une session spécifique.',
            side: "bottom",
            align: 'center'
          }
        },
        {
          element: '.ai-mode-selector',
          popover: {
            title: 'Mode de Fonctionnement',
            description: 'Choisissez entre Robot (100% auto), Hybride (avec délai) ou Humain (suggestions uniquement).',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '.ai-prompt-area',
          popover: {
            title: 'Instructions Système',
            description: 'C\'est ici que vous définissez la personnalité et les connaissances de votre assistant. Soyez précis !',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '.ai-model-selector',
          popover: {
            title: 'Moteur d\'Intelligence',
            description: 'Sélectionnez le modèle d\'IA à utiliser pour cette session.',
            side: "left",
            align: 'center'
          }
        },
        {
          element: '.ai-save-button',
          popover: {
            title: 'Enregistrer',
            description: 'N\'oubliez pas de sauvegarder vos modifications pour les rendre effectives.',
            side: "left",
            align: 'center'
          }
        }
      ] : [
        {
          element: '.ai-page-header',
          popover: {
            title: 'Assistant IA',
            description: 'Bienvenue dans la gestion de vos assistants intelligents. Ici, vous pouvez automatiser vos interactions WhatsApp.',
            side: "bottom",
            align: 'center'
          }
        },
        {
          element: '.ai-session-card',
          popover: {
            title: 'Sessions WhatsApp',
            description: 'Chaque session connectée peut avoir son propre assistant configuré indépendamment.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '.ai-quick-settings',
          popover: {
            title: 'Réglages Rapides',
            description: 'Accédez rapidement aux paramètres essentiels comme le mode ou le modèle utilisé.',
            side: "left",
            align: 'center'
          }
        },
        {
          element: '.ai-advanced-config',
          popover: {
            title: 'Configuration Avancée',
            description: 'Cliquez ici pour accéder aux réglages détaillés, notamment le prompt système.',
            side: "left",
            align: 'center'
          }
        },
        {
          element: '.ai-toggle-switch',
          popover: {
            title: 'Activer / Désactiver',
            description: 'Activez ou désactivez l\'assistant instantanément avec ce commutateur.',
            side: "top",
            align: 'center'
          }
        }
      ]

      const driverObj = driver({
        popoverClass: 'driverjs-theme',
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
