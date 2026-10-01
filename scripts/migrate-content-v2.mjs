// One-off migration: data/portfolio.json (French strings + translations hardcoded in src/i18n.js)
// → content v2 where every translatable field is { fr, en, de, it } and lives in the JSON only.
// Safe to re-run: it refuses to touch a file that is already v2.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataFile = path.join(root, 'data/portfolio.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
if (data.version === 2) { console.log('Already v2, nothing to do.'); process.exit(0); }

const { messages } = await import(pathToFileURL(path.join(root, 'src/i18n.js')).href);
const LOCALES = ['fr', 'en', 'de', 'it'];

// Build { fr, en, de, it } from a translation group in i18n.js, falling back to the JSON value for French.
const T = (value, group, id) => Object.fromEntries(LOCALES.map((lc) => [lc, messages[lc]?.[group]?.[id] ?? (lc === 'fr' ? value ?? '' : '')]));
// Same, for a top-level interface key (e.g. heroTitle1).
const K = (key) => Object.fromEntries(LOCALES.map((lc) => [lc, messages[lc]?.[key] ?? '']));

// Exactly the keyword rules the gallery used before, so every project keeps its current filters.
const legacyMatch = (item, filter) => {
  const id = item.id.toLowerCase();
  const text = `${id} ${item.category} ${item.title}`.toLowerCase();
  if (filter === 'cloud') return /cloud|gcp|agent|ia|ai|ki/.test(text) && !id.includes('zabbix');
  if (filter === 'infra') return /infra|zabbix|network|réseau|monitoring|supervision/.test(text);
  return /workflow|joot|ewave|mobile|full.stack|application/.test(text);
};
const groupsOf = (item) => ['cloud', 'infra', 'apps'].filter((f) => legacyMatch(item, f));

const p = data.profile;
const v2 = {
  version: 2,
  profile: {
    name: p.name,
    role: { fr: p.role, en: p.role, de: p.role, it: p.role },
    tagline: T(p.tagline, 'profileTagline', 'main'),
    about: T(p.about, 'profileAbout', 'main'),
    status: K('availabilityTag'),
    availability: K('availability'),
    location: K('location'),
    education: T(p.education, 'profileEducation', 'main'),
    school: T(p.school, 'school', 'main'),
    graduation: T(p.graduation, 'graduation', 'main'),
    email: p.email,
    linkedin: p.linkedin,
    github: p.github || '',
    cv: p.cv,
    portrait: p.portrait,
    heroChips: ['Kubernetes', 'Google Cloud', 'Docker', 'Grafana'],
  },
  copy: Object.fromEntries([
    'heroEyebrow', 'heroSpecialties', 'heroTitle1', 'heroTitle2', 'heroIntro',
    'aboutKicker', 'country', 'aboutTitle1', 'aboutTitle2',
    'experienceTitle', 'experienceNote', 'projectsTitle', 'projectsNote',
    'expertiseTitle', 'expertiseNote',
    'beyondKicker', 'beyondTitle1', 'beyondTitle2', 'beyondCopy',
    'contactKicker', 'contactTitle1', 'contactTitle2', 'contactCopy',
  ].map((key) => [key, K(key)])),
  experiences: data.experiences.map((x) => ({
    id: x.id,
    company: T(x.company, 'expCompany', x.id),
    role: T(x.role, 'expRole', x.id),
    place: T(x.place, 'expPlace', x.id),
    period: T(x.period, 'expPeriod', x.id),
    summary: T(x.summary, 'expSummary', x.id),
    details: T(x.details, 'expDetails', x.id),
    metrics: (x.metrics || []).map((m) => T(m, 'metrics', m)),
    stack: x.stack || [],
  })),
  projects: data.projects.map((x) => ({
    id: x.id,
    title: T(x.title, 'projectTitle', x.id),
    category: T(x.category, 'projectCategory', x.id),
    period: T(x.period, 'projectPeriod', x.id),
    description: T(x.description, 'projectDescription', x.id),
    details: T(x.details, 'projectDetails', x.id),
    groups: groupsOf(x),
    featured: Boolean(x.featured),
    device: x.id === 'project-joot' ? 'phone' : 'desktop',
    stack: x.stack || [],
    images: Array.isArray(x.images) ? x.images : x.image ? [x.image] : [],
  })),
  skills: data.skills.map((g) => ({ id: g.id, name: T(g.name, 'skillNames', g.name), items: g.items })),
  activities: data.activities.map((a) => ({
    id: a.id,
    organization: a.organization,
    role: T(a.role, 'activityRoles', a.id),
    period: a.period,
    description: T(a.description, 'activityDescriptions', a.id),
  })),
  languages: [['lang-ar', 'ar', 'مرحبا', 4], ['lang-fr', 'fr', 'Bonjour', 4], ['lang-en', 'en', 'Hello', 3], ['lang-it', 'it', 'Ciao', 1]].map(([id, code, greeting, score], i) => {
    const parts = Object.fromEntries(LOCALES.map((lc) => [lc, (messages[lc].languages[i] || '').split('·').map((s) => s.trim())]));
    return {
      id, code, greeting, score,
      name: Object.fromEntries(LOCALES.map((lc) => [lc, parts[lc][0] || ''])),
      level: Object.fromEntries(LOCALES.map((lc) => [lc, parts[lc][1] || ''])),
    };
  }),
};

fs.writeFileSync(dataFile, `${JSON.stringify(v2, null, 2)}\n`);
console.log('Migrated to v2:', {
  experiences: v2.experiences.length, projects: v2.projects.map((x) => `${x.id}→${x.groups.join('+')}`), skills: v2.skills.length,
  activities: v2.activities.length, languages: v2.languages.length, copyKeys: Object.keys(v2.copy).length,
});
