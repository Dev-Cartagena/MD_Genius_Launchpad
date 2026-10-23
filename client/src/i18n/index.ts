import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LOCALES, type Locale } from "@shared/schema";

import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enLanding from "./locales/en/landing.json";
import enAuth from "./locales/en/auth.json";
import enApplication from "./locales/en/application.json";
import enLegal from "./locales/en/legal.json";
import enDashboard from "./locales/en/dashboard.json";
import enCurriculum from "./locales/en/curriculum.json";
import enRoadmap from "./locales/en/roadmap.json";
import enProject from "./locales/en/project.json";
import enAdmin from "./locales/en/admin.json";
import enAdminCurriculum from "./locales/en/adminCurriculum.json";
import enAdminInvestors from "./locales/en/adminInvestors.json";
import enMentors from "./locales/en/mentors.json";
import enInvestors from "./locales/en/investors.json";
import enCoach from "./locales/en/coach.json";

import esCommon from "./locales/es/common.json";
import esHome from "./locales/es/home.json";
import esLanding from "./locales/es/landing.json";
import esAuth from "./locales/es/auth.json";
import esApplication from "./locales/es/application.json";
import esLegal from "./locales/es/legal.json";
import esDashboard from "./locales/es/dashboard.json";
import esCurriculum from "./locales/es/curriculum.json";
import esRoadmap from "./locales/es/roadmap.json";
import esProject from "./locales/es/project.json";
import esAdmin from "./locales/es/admin.json";
import esAdminCurriculum from "./locales/es/adminCurriculum.json";
import esAdminInvestors from "./locales/es/adminInvestors.json";
import esMentors from "./locales/es/mentors.json";
import esInvestors from "./locales/es/investors.json";
import esCoach from "./locales/es/coach.json";

/**
 * One catalog file per area so screens can be translated independently.
 * English is the source of truth for keys; the parity test checks Spanish has the same keys.
 */
export const resources = {
  en: {
    common: enCommon, home: enHome, landing: enLanding, auth: enAuth, application: enApplication,
    legal: enLegal, dashboard: enDashboard, curriculum: enCurriculum, roadmap: enRoadmap,
    project: enProject, admin: enAdmin, adminCurriculum: enAdminCurriculum,
    adminInvestors: enAdminInvestors, mentors: enMentors, investors: enInvestors, coach: enCoach,
  },
  es: {
    common: esCommon, home: esHome, landing: esLanding, auth: esAuth, application: esApplication,
    legal: esLegal, dashboard: esDashboard, curriculum: esCurriculum, roadmap: esRoadmap,
    project: esProject, admin: esAdmin, adminCurriculum: esAdminCurriculum,
    adminInvestors: esAdminInvestors, mentors: esMentors, investors: esInvestors, coach: esCoach,
  },
} as const;

const STORAGE_KEY = "lp.locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Saved choice, else the browser language, else English. */
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // Storage can be blocked; fall through to the browser language.
  }
  const browser = typeof navigator !== "undefined" ? navigator.language?.toLowerCase() ?? "" : "";
  return browser.startsWith("es") ? "es" : "en";
}

function applyDocumentLanguage(lng: string) {
  if (typeof document !== "undefined") document.documentElement.lang = lng === "es" ? "es" : "en";
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // Not persisted; the account setting still applies after sign-in.
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale(),
  fallbackLng: "en",
  supportedLngs: [...LOCALES],
  defaultNS: "common",
  ns: Object.keys(resources.en),
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDocumentLanguage(i18n.language);
i18n.on("languageChanged", applyDocumentLanguage);

export function currentLocale(): Locale {
  return isLocale(i18n.language) ? i18n.language : "en";
}

/** BCP 47 tag for Intl formatting: neutral Latin American Spanish or US English. */
export function intlLocale(locale: Locale = currentLocale()): string {
  return locale === "es" ? "es-419" : "en-US";
}

export default i18n;
