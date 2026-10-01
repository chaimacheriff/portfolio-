import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Check, Copy, ImagePlus, Languages, LockKeyhole, LogOut, Plus, RotateCcw, Save, Trash2, Upload, X } from 'lucide-react';
import { locales, localeLabels, localeNames, tr } from '../i18n.js';
import './admin.css';

/* ═══════════════════════════════════════════════════════════════
   CONTENT STUDIO — edits data/portfolio.json (content v2).
   Translatable fields are { fr, en, de, it }. The editor works in one
   "editing language" at a time and shows the French text as reference.
   ═══════════════════════════════════════════════════════════════ */

const blankT = () => ({ fr: '', en: '', de: '', it: '' });
const uid = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const isT = (v) => v && typeof v === 'object' && !Array.isArray(v) && 'fr' in v;

const FACTORIES = {
  experiences: () => ({ id: uid('exp'), company: blankT(), role: blankT(), place: blankT(), period: blankT(), summary: blankT(), details: blankT(), metrics: [], stack: [] }),
  projects: () => ({ id: uid('project'), title: blankT(), category: blankT(), period: blankT(), description: blankT(), details: blankT(), groups: ['cloud'], device: 'desktop', featured: false, stack: [], images: [] }),
  skills: () => ({ id: uid('skill'), name: blankT(), items: [] }),
  activities: () => ({ id: uid('activity'), organization: '', role: blankT(), period: '', description: blankT() }),
  languages: () => ({ id: uid('lang'), code: '', greeting: '', score: 2, name: blankT(), level: blankT() }),
};

const COPY_GROUPS = [
  ['Hero', [['heroEyebrow', 'Sur-titre'], ['heroSpecialties', 'Mots qui défilent (séparés par ·)'], ['heroTitle1', 'Titre · ligne 1'], ['heroTitle2', 'Titre · ligne 2 (italique)'], ['heroIntro', 'Phrase après l’accroche', true]]],
  ['À propos', [['aboutKicker', 'Sur-titre'], ['country', 'Mention à droite'], ['aboutTitle1', 'Titre · ligne 1'], ['aboutTitle2', 'Titre · ligne 2 (italique)']]],
  ['Expériences', [['experienceTitle', 'Titre'], ['experienceNote', 'Note à droite']]],
  ['Projets', [['projectsTitle', 'Titre'], ['projectsNote', 'Note à droite']]],
  ['Expertise', [['expertiseTitle', 'Titre'], ['expertiseNote', 'Note à droite']]],
  ['Au-delà du terminal', [['beyondKicker', 'Sur-titre'], ['beyondTitle1', 'Titre · ligne 1'], ['beyondTitle2', 'Titre · ligne 2 (italique)'], ['beyondCopy', 'Texte', true]]],
  ['Contact', [['contactKicker', 'Sur-titre'], ['contactTitle1', 'Titre · ligne 1'], ['contactTitle2', 'Titre · ligne 2 (italique)'], ['contactCopy', 'Texte', true]]],
];

const SECTIONS = [
  ['profile', 'Profil'], ['copy', 'Textes du site'], ['experiences', 'Expériences'], ['projects', 'Projets'],
  ['skills', 'Compétences'], ['activities', 'Engagement'], ['languages', 'Langues'],
];

const GROUP_LABELS = [['cloud', 'Cloud & IA'], ['infra', 'Infrastructure'], ['apps', 'Applications']];

// Count empty translations for one language anywhere under a value.
function countMissing(value, lang) {
  if (isT(value)) return value.fr && !value[lang] ? 1 : 0;
  if (Array.isArray(value)) return value.reduce((n, v) => n + countMissing(v, lang), 0);
  if (value && typeof value === 'object') return Object.values(value).reduce((n, v) => n + countMissing(v, lang), 0);
  return 0;
}

export default function Admin({ data, onData }) {
  const [saved, setSaved] = useState(() => structuredClone(data));
  const [draft, setDraft] = useState(() => structuredClone(data));
  const [auth, setAuth] = useState(null);
  const [password, setPassword] = useState('');
  const [section, setSection] = useState('profile');
  const [lang, setLang] = useState('fr');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const notify = (text, kind = 'ok') => { setToast({ text, kind }); setTimeout(() => setToast(null), 3200); };

  useEffect(() => { fetch('/api/auth/status').then((r) => r.json()).then((r) => setAuth(r.authenticated)).catch(() => setAuth(false)); }, []);
  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/portfolio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || 'Enregistrement impossible.');
      setSaved(structuredClone(result.data)); setDraft(structuredClone(result.data)); onData(result.data);
      notify('Modifications publiées sur le site.');
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  }, [draft, onData]);
  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (dirty && !busy) save(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, busy, save]);

  const login = async (e) => {
    e.preventDefault(); setBusy(true);
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    setBusy(false);
    if (r.ok) setAuth(true); else notify('Mot de passe incorrect.', 'error');
  };
  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); setAuth(false); };

  const upload = async (files) => {
    const form = new FormData(); [...files].forEach((f) => form.append('files', f));
    const r = await fetch('/api/uploads', { method: 'POST', body: form });
    const result = await r.json();
    if (!r.ok) { notify(result.error || 'Envoi impossible.', 'error'); return []; }
    return result.urls;
  };

  // ─── draft helpers ───
  const setPath = (path, value) => setDraft((d) => {
    const next = structuredClone(d); let node = next;
    for (let i = 0; i < path.length - 1; i++) node = node[path[i]];
    node[path[path.length - 1]] = value; return next;
  });
  const listOps = (key) => ({
    add: () => { const item = FACTORIES[key](); setDraft((d) => ({ ...d, [key]: [...d[key], item] })); return item.id; },
    remove: (i) => { const item = draft[key][i]; if (window.confirm(`Supprimer « ${tr(item.title || item.company || item.name || item.organization, 'fr') || 'cet élément'} » ?`)) setDraft((d) => ({ ...d, [key]: d[key].filter((_, k) => k !== i) })); },
    duplicate: (i) => setDraft((d) => { const copy = structuredClone(d[key][i]); copy.id = uid(key.slice(0, -1)); const list = [...d[key]]; list.splice(i + 1, 0, copy); return { ...d, [key]: list }; }),
    move: (i, dir) => setDraft((d) => { const list = [...d[key]]; const j = i + dir; if (j < 0 || j >= list.length) return d; [list[i], list[j]] = [list[j], list[i]]; return { ...d, [key]: list }; }),
  });

  const missing = useMemo(() => (lang === 'fr' ? 0 : countMissing(draft, lang)), [draft, lang]);
  const missingIn = (key) => (lang === 'fr' ? 0 : countMissing(key === 'profile' ? draft.profile : draft[key], lang));

  if (auth === null) return <div className="cms-loading">Chargement…</div>;
  if (!auth) return <div className="cms-login">
    <a href="/" className="cms-back"><ArrowLeft size={14}/> Retour au portfolio</a>
    <form className="cms-login-card" onSubmit={login}>
      <span className="cms-login-icon"><LockKeyhole size={20}/></span>
      <span className="cms-eyebrow">ESPACE PRIVÉ</span>
      <h1>Content <em>studio</em></h1>
      <p>Modifiez tout le contenu du portfolio, dans les 4 langues.</p>
      <label className="cms-field"><span>Mot de passe</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus placeholder="••••••••"/></label>
      <button className="cms-btn cms-btn-primary" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}<ArrowUpRight size={15}/></button>
    </form>
    {toast && <div className={`cms-toast is-${toast.kind}`}>{toast.text}</div>}
  </div>;

  const ctx = { lang, setPath, upload, notify };
  return <div className="cms">
    <aside className="cms-side">
      <a href="/" className="cms-brand"><img src="/media/brand/logo_darkmode.png" alt=""/><span>Chaima Cherif<small>CONTENT STUDIO</small></span></a>
      <nav>{SECTIONS.map(([id, label], i) => {
        const count = Array.isArray(draft[id]) ? draft[id].length : null; const todo = missingIn(id);
        return <button key={id} className={section === id ? 'is-active' : ''} onClick={() => setSection(id)}>
          <span className="cms-side-index">0{i + 1}</span>{label}
          {todo > 0 ? <span className="cms-badge is-todo" title={`${todo} traduction(s) manquante(s)`}>{todo}</span> : count !== null && <span className="cms-badge">{count}</span>}
        </button>;
      })}</nav>
      <div className="cms-side-foot">
        <a href="/" target="_blank" rel="noreferrer"><ArrowUpRight size={14}/> Voir le site</a>
        <button onClick={logout}><LogOut size={14}/> Déconnexion</button>
      </div>
    </aside>

    <main className="cms-main">
      <header className="cms-top">
        <div className="cms-langs" role="tablist" aria-label="Langue d’édition">
          <Languages size={15}/>
          {locales.map((lc) => <button key={lc} role="tab" aria-selected={lang === lc} className={lang === lc ? 'is-active' : ''} onClick={() => setLang(lc)} title={localeLabels[lc]}>{localeNames[lc]}</button>)}
        </div>
        <span className={`cms-missing${missing ? ' is-todo' : ''}`}>{lang === 'fr' ? 'Langue de référence' : missing ? `${missing} texte(s) à traduire en ${localeLabels[lang]}` : `Tout est traduit en ${localeLabels[lang]}`}</span>
      </header>

      <div className="cms-content">
        {section === 'profile' && <ProfileEditor p={draft.profile} skills={draft.skills} ctx={ctx}/>}
        {section === 'copy' && <CopyEditor copy={draft.copy || {}} ctx={ctx}/>}
        {section === 'experiences' && <ListEditor title="Expériences" desc="Affichées dans l’ordre de la liste, de haut en bas." items={draft.experiences} ops={listOps('experiences')} addLabel="Ajouter une expérience" label={(x) => tr(x.company, 'fr') || 'Nouvelle expérience'} sub={(x) => tr(x.period, 'fr')} render={(x, i) => <ExperienceEditor x={x} i={i} ctx={ctx}/>}/>}
        {section === 'projects' && <ListEditor title="Projets" desc="L’ordre ici est l’ordre de la galerie. La première image est la couverture." items={draft.projects} ops={listOps('projects')} addLabel="Ajouter un projet" label={(x) => tr(x.title, 'fr') || 'Nouveau projet'} sub={(x) => tr(x.category, 'fr')} render={(x, i) => <ProjectEditor x={x} i={i} ctx={ctx}/>}/>}
        {section === 'skills' && <ListEditor title="Compétences" desc="Chaque catégorie devient une orbite de la galaxie (section Expertise)." items={draft.skills} ops={listOps('skills')} addLabel="Ajouter une catégorie" label={(x) => tr(x.name, 'fr') || 'Nouvelle catégorie'} sub={(x) => `${x.items.length} outil(s)`} render={(x, i) => <>
          <TField label="Nom de la catégorie" value={x.name} path={['skills', i, 'name']} ctx={ctx}/>
          <TagField label="Outils" values={x.items} onChange={(v) => setPath(['skills', i, 'items'], v)}/>
        </>}/>}
        {section === 'activities' && <ListEditor title="Engagement" desc="Les associations affichées en « tickets » dans « Au-delà du terminal »." items={draft.activities} ops={listOps('activities')} addLabel="Ajouter une activité" label={(x) => x.organization || 'Nouvelle activité'} sub={(x) => x.period} render={(x, i) => <div className="cms-grid">
          <Field label="Organisation" value={x.organization} onChange={(v) => setPath(['activities', i, 'organization'], v)}/>
          <Field label="Période" value={x.period} onChange={(v) => setPath(['activities', i, 'period'], v)} placeholder="2023 – 2025"/>
          <TField label="Rôle" value={x.role} path={['activities', i, 'role']} ctx={ctx} wide/>
          <TField label="Description" value={x.description} path={['activities', i, 'description']} ctx={ctx} area wide/>
        </div>}/>}
        {section === 'languages' && <ListEditor title="Langues" desc="Les cartes « Langues parlées ». Le niveau en points va de 0 à 4." items={draft.languages} ops={listOps('languages')} addLabel="Ajouter une langue" label={(x) => tr(x.name, 'fr') || 'Nouvelle langue'} sub={(x) => tr(x.level, 'fr')} render={(x, i) => <div className="cms-grid">
          <TField label="Nom de la langue" value={x.name} path={['languages', i, 'name']} ctx={ctx}/>
          <TField label="Niveau (texte)" value={x.level} path={['languages', i, 'level']} ctx={ctx}/>
          <Field label="Salutation (dans cette langue)" value={x.greeting} onChange={(v) => setPath(['languages', i, 'greeting'], v)} placeholder="Bonjour"/>
          <Field label="Code langue (ISO)" value={x.code} onChange={(v) => setPath(['languages', i, 'code'], v.toLowerCase())} placeholder="fr, en, ar…"/>
          <div className="cms-field"><span>Niveau en points</span><div className="cms-dots">{[0, 1, 2, 3, 4].map((n) => <button key={n} type="button" className={n <= x.score && n > 0 ? 'on' : ''} onClick={() => setPath(['languages', i, 'score'], n)} aria-label={`${n}/4`}>{n === 0 ? '0' : ''}</button>)}<small>{x.score}/4</small></div></div>
        </div>}/>}
      </div>

      <footer className={`cms-savebar${dirty ? ' is-dirty' : ''}`}>
        <span>{dirty ? <><i/> Modifications non enregistrées</> : <><Check size={14}/> Tout est enregistré</>}</span>
        <div>
          <button className="cms-btn" disabled={!dirty || busy} onClick={() => { if (window.confirm('Annuler toutes les modifications non enregistrées ?')) setDraft(structuredClone(saved)); }}><RotateCcw size={14}/> Annuler</button>
          <button className="cms-btn cms-btn-primary" disabled={!dirty || busy} onClick={save}><Save size={14}/>{busy ? 'Publication…' : 'Enregistrer'}<kbd>⌘S</kbd></button>
        </div>
      </footer>
    </main>
    {toast && <div className={`cms-toast is-${toast.kind}`}>{toast.text}</div>}
  </div>;
}

/* ─── Section editors ─── */
function SectionHead({ title, desc, action }) {
  return <div className="cms-head"><div><span className="cms-eyebrow">ÉDITEUR</span><h2>{title}</h2>{desc && <p>{desc}</p>}</div>{action}</div>;
}

function ProfileEditor({ p, skills, ctx }) {
  const { setPath, upload } = ctx;
  const set = (key) => (v) => setPath(['profile', key], v);
  const allSkills = skills.flatMap((g) => g.items);
  return <>
    <SectionHead title="Profil" desc="Votre identité, votre statut et les informations visibles partout sur le site."/>
    <Card title="Identité & liens"><div className="cms-grid">
      <Field label="Nom complet" value={p.name} onChange={set('name')}/>
      <TField label="Titre professionnel" value={p.role} path={['profile', 'role']} ctx={ctx}/>
      <Field label="E-mail" value={p.email} onChange={set('email')} type="email"/>
      <Field label="LinkedIn" value={p.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/in/…"/>
      <Field label="GitHub" value={p.github} onChange={set('github')} placeholder="https://github.com/…"/>
      <TField label="Localisation" value={p.location} path={['profile', 'location']} ctx={ctx}/>
    </div></Card>
    <Card title="Hero & statut"><div className="cms-grid">
      <TField label="Statut (pastille)" value={p.status} path={['profile', 'status']} ctx={ctx} hint="ex. PFE · Janvier 2027"/>
      <TField label="Disponibilité" value={p.availability} path={['profile', 'availability']} ctx={ctx}/>
      <TField label="Phrase d’accroche" value={p.tagline} path={['profile', 'tagline']} ctx={ctx} area wide/>
      <TagField label="Badges autour du portrait (4 max.)" values={p.heroChips || []} max={4} suggestions={allSkills} onChange={set('heroChips')} wide/>
    </div></Card>
    <Card title="À propos & formation"><div className="cms-grid">
      <TField label="Texte « À propos »" value={p.about} path={['profile', 'about']} ctx={ctx} area wide rows={5}/>
      <TField label="Diplôme" value={p.education} path={['profile', 'education']} ctx={ctx} wide/>
      <TField label="Établissement" value={p.school} path={['profile', 'school']} ctx={ctx}/>
      <TField label="Date d’obtention" value={p.graduation} path={['profile', 'graduation']} ctx={ctx}/>
    </div></Card>
    <Card title="Fichiers"><div className="cms-grid">
      <AssetField label="Portrait" value={p.portrait} onChange={set('portrait')} upload={upload} image/>
      <AssetField label="CV (PDF)" value={p.cv} onChange={set('cv')} upload={upload} accept="application/pdf"/>
    </div></Card>
  </>;
}

function CopyEditor({ copy, ctx }) {
  return <>
    <SectionHead title="Textes du site" desc="Les titres et phrases de chaque section. Pour les mots qui défilent dans le hero, séparez-les par « · »."/>
    {COPY_GROUPS.map(([group, fields]) => <Card key={group} title={group}><div className="cms-grid">
      {fields.map(([key, label, area]) => <TField key={key} label={label} value={copy[key] || blankT()} path={['copy', key]} ctx={ctx} area={area} wide={area}/>)}
    </div></Card>)}
  </>;
}

function ExperienceEditor({ x, i, ctx }) {
  const { setPath } = ctx; const base = ['experiences', i];
  return <div className="cms-grid">
    <TField label="Entreprise" value={x.company} path={[...base, 'company']} ctx={ctx} hint="« Société · Groupe » affiche le groupe en petit"/>
    <TField label="Poste" value={x.role} path={[...base, 'role']} ctx={ctx}/>
    <TField label="Période" value={x.period} path={[...base, 'period']} ctx={ctx}/>
    <TField label="Lieu" value={x.place} path={[...base, 'place']} ctx={ctx}/>
    <TField label="Résumé" value={x.summary} path={[...base, 'summary']} ctx={ctx} area wide/>
    <TField label="Détails (« Voir les détails »)" value={x.details} path={[...base, 'details']} ctx={ctx} area wide rows={4}/>
    <div className="cms-field cms-wide"><span>Résultats chiffrés <small>commencez par le chiffre : « 84 % de précision… »</small></span>
      {x.metrics.map((m, k) => <div className="cms-row" key={k}>
        <TField value={m} path={[...base, 'metrics', k]} ctx={ctx} bare/>
        <button type="button" className="cms-icon" onClick={() => setPath([...base, 'metrics'], x.metrics.filter((_, j) => j !== k))} aria-label="Retirer"><X size={14}/></button>
      </div>)}
      <button type="button" className="cms-link" onClick={() => setPath([...base, 'metrics'], [...x.metrics, blankT()])}><Plus size={13}/> Ajouter un résultat</button>
    </div>
    <TagField label="Technologies" values={x.stack} onChange={(v) => setPath([...base, 'stack'], v)} wide/>
  </div>;
}

function ProjectEditor({ x, i, ctx }) {
  const { setPath, upload } = ctx; const base = ['projects', i];
  const toggleGroup = (g) => setPath([...base, 'groups'], x.groups.includes(g) ? x.groups.filter((v) => v !== g) : [...x.groups, g]);
  return <div className="cms-grid">
    <TField label="Titre" value={x.title} path={[...base, 'title']} ctx={ctx} wide/>
    <TField label="Catégorie" value={x.category} path={[...base, 'category']} ctx={ctx}/>
    <TField label="Période" value={x.period} path={[...base, 'period']} ctx={ctx}/>
    <TField label="Description courte" value={x.description} path={[...base, 'description']} ctx={ctx} area wide/>
    <TField label="Détails (fiche projet)" value={x.details} path={[...base, 'details']} ctx={ctx} area wide rows={4}/>
    <div className="cms-field"><span>Filtres de la galerie</span><div className="cms-chips">{GROUP_LABELS.map(([g, label]) => <button key={g} type="button" className={x.groups.includes(g) ? 'is-on' : ''} onClick={() => toggleGroup(g)}>{x.groups.includes(g) && <Check size={12}/>}{label}</button>)}</div></div>
    <div className="cms-field"><span>Mockup & mise en avant</span><div className="cms-chips">
      {[['desktop', 'Écran'], ['phone', 'Téléphone']].map(([d, label]) => <button key={d} type="button" className={x.device === d ? 'is-on' : ''} onClick={() => setPath([...base, 'device'], d)}>{label}</button>)}
      <button type="button" className={x.featured ? 'is-on' : ''} onClick={() => setPath([...base, 'featured'], !x.featured)}>{x.featured && <Check size={12}/>}Projet phare</button>
    </div></div>
    <TagField label="Technologies" values={x.stack} onChange={(v) => setPath([...base, 'stack'], v)} wide/>
    <Gallery images={x.images} onChange={(v) => setPath([...base, 'images'], v)} upload={upload}/>
  </div>;
}

function ListEditor({ title, desc, items, ops, addLabel, label, sub, render }) {
  const [open, setOpen] = useState(() => new Set());
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const add = () => { const id = ops.add(); setOpen((s) => new Set([...s, id])); };
  return <>
    <SectionHead title={title} desc={desc} action={<button className="cms-btn cms-btn-primary" onClick={add}><Plus size={14}/> {addLabel}</button>}/>
    {items.length === 0 && <div className="cms-empty">Rien pour l’instant. Ajoutez un premier élément.</div>}
    {items.map((x, i) => {
      const isOpen = open.has(x.id);
      return <section className={`cms-item${isOpen ? ' is-open' : ''}`} key={x.id}>
        <div className="cms-item-head">
          <button className="cms-item-toggle" onClick={() => toggle(x.id)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Replier' : 'Déplier'} : ${label(x)}`}>
            <span className="cms-item-index">{String(i + 1).padStart(2, '0')}</span>
            <span><strong>{label(x)}</strong><small>{sub(x)}</small></span>
          </button>
          <div className="cms-item-actions">
            <button className="cms-icon" onClick={() => ops.move(i, -1)} disabled={i === 0} title="Monter" aria-label="Monter"><ArrowUp size={14}/></button>
            <button className="cms-icon" onClick={() => ops.move(i, 1)} disabled={i === items.length - 1} title="Descendre" aria-label="Descendre"><ArrowDown size={14}/></button>
            <button className="cms-icon" onClick={() => ops.duplicate(i)} title="Dupliquer" aria-label="Dupliquer"><Copy size={14}/></button>
            <button className="cms-icon is-danger" onClick={() => ops.remove(i)} title="Supprimer" aria-label="Supprimer"><Trash2 size={14}/></button>
          </div>
        </div>
        {isOpen && <div className="cms-item-body">{render(x, i)}</div>}
      </section>;
    })}
  </>;
}

/* ─── Fields ─── */
function Card({ title, children }) { return <section className="cms-card"><h3>{title}</h3>{children}</section>; }

function Field({ label, value, onChange, area, wide, placeholder, type = 'text', rows = 3 }) {
  return <label className={`cms-field${wide ? ' cms-wide' : ''}`}><span>{label}</span>
    {area ? <textarea value={value || ''} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}/> : <input type={type} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}/>}
  </label>;
}

// Translatable field: edits the current editing language, shows French as reference.
function TField({ label, value, path, ctx, area, wide, hint, rows = 3, bare }) {
  const { lang, setPath } = ctx;
  const v = isT(value) ? value : { fr: value || '', en: '', de: '', it: '' };
  const current = v[lang] || '';
  const todo = lang !== 'fr' && v.fr && !current;
  const onChange = (text) => setPath(path, { ...v, [lang]: text });
  const input = area
    ? <textarea value={current} rows={rows} placeholder={lang === 'fr' ? '' : v.fr} onChange={(e) => onChange(e.target.value)}/>
    : <input value={current} placeholder={lang === 'fr' ? '' : v.fr} onChange={(e) => onChange(e.target.value)}/>;
  if (bare) return <div className={`cms-tinput${todo ? ' is-todo' : ''}`}>{input}<span className="cms-lang-pill">{lang.toUpperCase()}</span></div>;
  return <label className={`cms-field${wide ? ' cms-wide' : ''}`}>
    <span>{label} {todo && <em className="cms-todo">à traduire</em>}{hint && <small>{hint}</small>}</span>
    <div className={`cms-tinput${todo ? ' is-todo' : ''}`}>{input}<span className="cms-lang-pill">{lang.toUpperCase()}</span></div>
    {lang !== 'fr' && v.fr && <small className="cms-ref">FR · {v.fr.length > 140 ? `${v.fr.slice(0, 140)}…` : v.fr}</small>}
  </label>;
}

function TagField({ label, values = [], onChange, wide, max, suggestions = [] }) {
  const [text, setText] = useState('');
  const add = (raw) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean).filter((s) => !values.includes(s));
    if (!parts.length) return;
    onChange([...values, ...parts].slice(0, max || Infinity)); setText('');
  };
  const listId = useMemo(() => `tags-${Math.random().toString(36).slice(2)}`, []);
  return <div className={`cms-field${wide ? ' cms-wide' : ''}`}><span>{label}</span>
    <div className="cms-tags">
      {values.map((v, k) => <span key={v} className="cms-tag">{v}<button type="button" onClick={() => onChange(values.filter((_, j) => j !== k))} aria-label={`Retirer ${v}`}><X size={11}/></button></span>)}
      {(!max || values.length < max) && <input value={text} list={suggestions.length ? listId : undefined} placeholder="Ajouter… (Entrée)" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text); }
        if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1));
      }} onBlur={() => add(text)}/>}
      {suggestions.length > 0 && <datalist id={listId}>{suggestions.map((s) => <option key={s} value={s}/>)}</datalist>}
    </div>
  </div>;
}

function AssetField({ label, value, onChange, upload, accept = 'image/*', image }) {
  const [busy, setBusy] = useState(false);
  const onFile = async (files) => { if (!files?.length) return; setBusy(true); const [url] = await upload(files); setBusy(false); if (url) onChange(url); };
  return <div className="cms-field"><span>{label}</span>
    <div className="cms-asset">
      {image && value && <img src={value} alt=""/>}
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="/media/… ou /uploads/…"/>
      <label className="cms-btn">{busy ? '…' : <><Upload size={13}/> Importer</>}<input type="file" accept={accept} hidden onChange={(e) => onFile(e.target.files)}/></label>
    </div>
  </div>;
}

function Gallery({ images = [], onChange, upload }) {
  const [busy, setBusy] = useState(false);
  const onFiles = async (files) => { if (!files?.length) return; setBusy(true); const urls = await upload(files); setBusy(false); onChange([...images, ...urls]); };
  const move = (k, dir) => { const list = [...images]; const j = k + dir; if (j < 0 || j >= list.length) return; [list[k], list[j]] = [list[j], list[k]]; onChange(list); };
  return <div className="cms-field cms-wide"><span>Captures <small>la première est la couverture du projet</small></span>
    <div className="cms-gallery">
      {images.map((src, k) => <figure key={`${src}-${k}`} className={k === 0 ? 'is-cover' : ''}>
        <img src={src} alt=""/>
        {k === 0 && <span className="cms-cover">Couverture</span>}
        <div>
          <button type="button" onClick={() => move(k, -1)} disabled={k === 0} aria-label="Avant"><ArrowLeft size={12}/></button>
          <button type="button" onClick={() => move(k, 1)} disabled={k === images.length - 1} aria-label="Après"><ArrowRight size={12}/></button>
          <button type="button" onClick={() => onChange(images.filter((_, j) => j !== k))} aria-label="Retirer"><X size={12}/></button>
        </div>
      </figure>)}
      <label className="cms-gallery-add">{busy ? 'Envoi…' : <><ImagePlus size={18}/><span>Ajouter des images</span></>}<input type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)}/></label>
    </div>
  </div>;
}
