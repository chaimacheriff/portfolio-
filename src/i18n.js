// Interface strings only (menus, buttons, labels).
// All portfolio content — texts, translations, languages, section titles — lives in data/portfolio.json
// and is edited from the back office (/admin).
export const locales = ['fr','en','de','it'];
export const localeNames = { fr: 'FR', en: 'EN', de: 'DE', it: 'IT' };
export const localeLabels = { fr: 'Français', en: 'English', de: 'Deutsch', it: 'Italiano' };

export const messages = {
  fr: {
    language: 'Langue',
    navAbout: 'À propos',
    navExperience: 'Expériences',
    navProjects: 'Projets',
    navExpertise: 'Expertise',
    navContact: 'Me contacter',
    menuButton: 'Ouvrir le menu',
    portraitAlt: 'Portrait de Chaima Cherif',
    themeLight: 'Mode clair',
    themeDark: 'Mode nuit',
    close: 'Fermer',
    viewProject: 'Explorer le projet',
    projectsCta: 'Découvrir mon travail',
    cv: 'Télécharger mon CV',
    scroll: 'DÉFILER POUR EXPLORER',
    education: 'FORMATION',
    projectUnit: 'PROJETS',
    filterAll: 'Tout',
    filterCloud: 'Cloud & IA',
    filterInfra: 'Infrastructure',
    filterApps: 'Applications',
    projectContext: 'LE PROJET',
    emailMe: 'Écrivez-moi',
    footer: 'CONÇU AVEC CURIOSITÉ',
    admin: 'ADMIN',
  },
  en: {
    language: 'Language',
    navAbout: 'About',
    navExperience: 'Experience',
    navProjects: 'Projects',
    navExpertise: 'Expertise',
    navContact: 'Contact me',
    menuButton: 'Open menu',
    portraitAlt: 'Portrait of Chaima Cherif',
    themeLight: 'Light mode',
    themeDark: 'Night mode',
    close: 'Close',
    viewProject: 'Explore project',
    projectsCta: 'Explore my work',
    cv: 'Download my CV',
    scroll: 'SCROLL TO EXPLORE',
    education: 'EDUCATION',
    projectUnit: 'PROJECTS',
    filterAll: 'All work',
    filterCloud: 'Cloud & AI',
    filterInfra: 'Infrastructure',
    filterApps: 'Applications',
    projectContext: 'THE PROJECT',
    emailMe: 'Get in touch',
    footer: 'BUILT WITH CURIOSITY',
    admin: 'ADMIN',
  },
  de: {
    language: 'Sprache',
    navAbout: 'Über mich',
    navExperience: 'Erfahrung',
    navProjects: 'Projekte',
    navExpertise: 'Kompetenzen',
    navContact: 'Kontakt',
    menuButton: 'Menü öffnen',
    portraitAlt: 'Porträt von Chaima Cherif',
    themeLight: 'Heller Modus',
    themeDark: 'Nachtmodus',
    close: 'Schließen',
    viewProject: 'Projekt ansehen',
    projectsCta: 'Projekte ansehen',
    cv: 'Lebenslauf herunterladen',
    scroll: 'WEITER SCROLLEN',
    education: 'AUSBILDUNG',
    projectUnit: 'PROJEKTE',
    filterAll: 'Alle Projekte',
    filterCloud: 'Cloud & KI',
    filterInfra: 'Infrastruktur',
    filterApps: 'Anwendungen',
    projectContext: 'DAS PROJEKT',
    emailMe: 'Kontakt aufnehmen',
    footer: 'MIT NEUGIER ENTWICKELT',
    admin: 'ADMIN',
  },
  it: {
    language: 'Lingua',
    navAbout: 'Chi sono',
    navExperience: 'Esperienze',
    navProjects: 'Progetti',
    navExpertise: 'Competenze',
    navContact: 'Contattami',
    menuButton: 'Apri il menu',
    portraitAlt: 'Ritratto di Chaima Cherif',
    themeLight: 'Modalità chiara',
    themeDark: 'Modalità notte',
    close: 'Chiudi',
    viewProject: 'Scopri il progetto',
    projectsCta: 'Scopri i miei progetti',
    cv: 'Scarica il CV',
    scroll: 'SCORRI PER ESPLORARE',
    education: 'FORMAZIONE',
    projectUnit: 'PROGETTI',
    filterAll: 'Tutti',
    filterCloud: 'Cloud e IA',
    filterInfra: 'Infrastruttura',
    filterApps: 'Applicazioni',
    projectContext: 'IL PROGETTO',
    emailMe: 'Scrivimi',
    footer: 'CREATO CON CURIOSITÀ',
    admin: 'ADMIN',
  },
};

// A content field is either a plain string (same in every language) or { fr, en, de, it }.
// Missing translations fall back to French, then to the first filled language.
export function tr(value, locale) {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  return value[locale] || value.fr || Object.values(value).find(Boolean) || '';
}

// Interface strings for a locale, overlaid with the editable section texts from the content file.
export function textsFor(locale, copy = {}) {
  const base = messages[locale] ?? messages.fr;
  return { ...base, ...Object.fromEntries(Object.entries(copy).map(([key, value]) => [key, tr(value, locale)])) };
}
