import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import frCommon from "./locales/fr/common.json"
import frNav from "./locales/fr/nav.json"
import frDashboard from "./locales/fr/dashboard.json"
import frLanding from "./locales/fr/landing.json"
import frBilling from "./locales/fr/billing.json"
import frModeration from "./locales/fr/moderation.json"
import frProfile from "./locales/fr/profile.json"
import frAuth from "./locales/fr/auth.json"

import enCommon from "./locales/en/common.json"
import enNav from "./locales/en/nav.json"
import enDashboard from "./locales/en/dashboard.json"
import enLanding from "./locales/en/landing.json"
import enBilling from "./locales/en/billing.json"
import enModeration from "./locales/en/moderation.json"
import enProfile from "./locales/en/profile.json"
import enAuth from "./locales/en/auth.json"

const resources = {
  fr: {
    common: frCommon,
    nav: frNav,
    dashboard: frDashboard,
    landing: frLanding,
    billing: frBilling,
    moderation: frModeration,
    profile: frProfile,
    auth: frAuth,
  },
  en: {
    common: enCommon,
    nav: enNav,
    dashboard: enDashboard,
    landing: enLanding,
    billing: enBilling,
    moderation: enModeration,
    profile: enProfile,
    auth: enAuth,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "fr",
    ns: ["common", "nav", "dashboard", "landing", "billing", "moderation", "profile", "auth"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "whappi_locale",
      caches: ["localStorage"],
    },
  })

export default i18n
