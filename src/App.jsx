import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Check, ChevronDown, Copy, Download, Globe2, Layers3, Mail, Moon, Sparkles, Sun, X } from 'lucide-react';
import { flushSync } from 'react-dom';
import { localeLabels, localeNames, locales, textsFor, tr } from './i18n.js';
import ProjectsSection, { matchesProjectFilter } from './ProjectsSection.jsx';

// The content studio is only downloaded when someone opens /admin.
const Admin = lazy(() => import('./admin/Admin.jsx'));

const getPortfolio = async () => { const response = await fetch('/api/portfolio'); if (!response.ok) throw new Error('Impossible de charger le portfolio.'); return response.json(); };

function Orb() {
  const mount = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const host = mount.current; if (!host) return;
    let renderer; let frame; let resize; let disposed = false; let scene;
    import('three').then(({ Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, IcosahedronGeometry, MeshBasicMaterial, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial }) => {
      if (disposed) return;
      try {
        const THREE = { Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, IcosahedronGeometry, MeshBasicMaterial, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial };
        scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100); camera.position.z = 5;
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)); renderer.setSize(host.clientWidth, host.clientHeight); host.appendChild(renderer.domElement);
        const group = new THREE.Group(); scene.add(group);
        group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.42, 3), new THREE.MeshBasicMaterial({ color: '#9edcf3', wireframe: true, transparent: true, opacity: .32 })));
        group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.95, 2), new THREE.MeshBasicMaterial({ color: '#b6a7e1', wireframe: true, transparent: true, opacity: .36 })));
        const points = new THREE.BufferGeometry(); const positions = [];
        for (let i = 0; i < 420; i++) { const phi = Math.acos(-1 + (2 * i) / 420); const theta = Math.sqrt(420 * Math.PI) * phi; positions.push(1.48 * Math.cos(theta) * Math.sin(phi), 1.48 * Math.sin(theta) * Math.sin(phi), 1.48 * Math.cos(phi)); }
        points.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); group.add(new THREE.Points(points, new THREE.PointsMaterial({ color: '#e4efff', size: .014, transparent: true, opacity: .76 })));
        resize = () => { if (!host.clientWidth) return; camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); };
        window.addEventListener('resize', resize);
        const tick = () => { frame = requestAnimationFrame(tick); group.rotation.y += .0018; group.rotation.x = Math.sin(Date.now() * .00035) * .08; renderer.render(scene, camera); }; tick();
      } catch { renderer?.dispose(); host.replaceChildren(); }
    }).catch(() => {});
    return () => {
      disposed = true; cancelAnimationFrame(frame); if (resize) window.removeEventListener('resize', resize);
      scene?.traverse((object) => { object.geometry?.dispose(); if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose()); else object.material?.dispose(); });
      renderer?.dispose(); host.replaceChildren();
    };
  }, []);
  return <div className="orb" ref={mount} aria-hidden="true" />;
}

function useMotionSetup() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let cancelled = false; let cleanup = () => {};
    Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('lenis')]).then(([gsapModule, scrollModule, lenisModule]) => {
      if (cancelled) return;
      const gsap = gsapModule.gsap ?? gsapModule.default;
      const ScrollTrigger = scrollModule.ScrollTrigger ?? scrollModule.default;
      const Lenis = lenisModule.default;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ duration: 1.05, smoothWheel: true }); window.__lenis = lenis;
      let raf; const tick = (time) => { lenis.raf(time); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.lagSmoothing(0);
      const items = gsap.utils.toArray('[data-reveal]');
      // Reveals are tied to the scroll position (scrub): scrolling down fades/slides an element in,
      // scrolling back up visibly plays it out again. The small scrub lag keeps it smooth.
      items.forEach((item) => {
        const chip = item.dataset.reveal === 'chip';
        const lag = Math.round((Number(item.dataset.revealDelay) || 0) * 20);
        gsap.fromTo(item, { y: chip ? 14 : 48, scale: chip ? .88 : 1, opacity: 0 }, {
          y: 0, scale: 1, opacity: 1, ease: 'power2.out',
          scrollTrigger: { trigger: item, start: `top ${98 - lag}%`, end: `top ${chip ? 82 - lag : 68 - lag}%`, scrub: .6 },
        });
      });
      cleanup = () => { cancelAnimationFrame(raf); if (window.__lenis === lenis) delete window.__lenis; lenis.destroy(); ScrollTrigger.getAll().forEach((trigger) => trigger.kill()); };
    }).catch(() => {});
    return () => { cancelled = true; cleanup(); };
  }, []);
}

/* ─── Enhancement: Cursor glow follower ─── */
function CursorGlow() {
  const glowRef = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;
    const glow = glowRef.current;
    if (!glow) return;
    let x = 0, y = 0, cx = 0, cy = 0, frame;
    const lerp = (a, b, t) => a + (b - a) * t;
    const onMove = (e) => { x = e.clientX; y = e.clientY; glow.classList.add('visible'); };
    const onLeave = () => glow.classList.remove('visible');
    const tick = () => {
      cx = lerp(cx, x, 0.12); cy = lerp(cy, y, 0.12);
      glow.style.left = `${cx}px`; glow.style.top = `${cy}px`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseleave', onLeave); };
  }, []);
  return <div className="cursor-glow" ref={glowRef} aria-hidden="true" />;
}

/* ─── Hero ─── */

function RotatingWord({ words }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (words.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), 2400);
    return () => clearInterval(id);
  }, [words.length]);
  if (!words.length) return null;
  // Guard against a shorter list after a language switch.
  const word = words[index % words.length];
  return <span className="landing-rotator" aria-label={words.join(', ')}>
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={word} aria-hidden="true" initial={{ y: '100%', opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={{ y: '-100%', opacity: 0 }} transition={{ duration: .45, ease: [.22, 1, .36, 1] }}>{word}</motion.span>
    </AnimatePresence>
  </span>;
}

function Hero({ data, t, ct, locale }) {
  const { profile: p } = data;
  const visualRef = useRef(null);
  const ctaRef = useRef(null);
  const specialties = (t.heroSpecialties || '').split('·').map((word) => word.trim()).filter(Boolean);
  const chips = (p.heroChips || []).filter(Boolean).slice(0, 4);

  // Portrait tilt + chip parallax + glare, driven by CSS variables on the visual.
  useEffect(() => {
    const el = visualRef.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame;
    const onMove = (event) => {
      const box = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(-1, ((event.clientX - box.left) / box.width) * 2 - 1));
      const y = Math.min(1, Math.max(-1, ((event.clientY - box.top) / box.height) * 2 - 1));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { el.style.setProperty('--mx', x.toFixed(3)); el.style.setProperty('--my', y.toFixed(3)); });
    };
    const onLeave = () => { el.style.setProperty('--mx', 0); el.style.setProperty('--my', 0); };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', onLeave); };
  }, []);

  // Magnetic primary button.
  const onCtaMove = (event) => {
    const el = ctaRef.current; if (!el) return;
    const box = el.getBoundingClientRect();
    el.style.setProperty('--tx', `${((event.clientX - box.left) / box.width - .5) * 10}px`);
    el.style.setProperty('--ty', `${((event.clientY - box.top) / box.height - .5) * 8}px`);
  };
  const onCtaLeave = () => { ctaRef.current?.style.setProperty('--tx', '0px'); ctaRef.current?.style.setProperty('--ty', '0px'); };

  return <section className="landing" id="top">
    <HeroParticles/>
    <div className="hero-grid" aria-hidden="true"/>

    <div className="landing-copy">
      <div className="landing-status landing-in" style={{ '--d': '.05s' }}><i/><span>{tr(p.status, locale)}<em> · </em><span className="landing-status-extra">{tr(p.availability, locale)}</span></span></div>
      <p className="landing-eyebrow landing-in" style={{ '--d': '.15s' }}>{t.heroEyebrow} <b>✳</b> <RotatingWord words={specialties}/></p>
      <h1 className="landing-title">
        <span className="landing-line"><span style={{ '--d': '.25s' }}>{t.heroTitle1}</span></span>
        <span className="landing-line"><em style={{ '--d': '.38s' }}>{t.heroTitle2}</em></span>
      </h1>
      <p className="landing-intro landing-in" style={{ '--d': '.55s' }}>{ct('profileTagline', 'main', p.tagline)} {t.heroIntro}</p>
      <div className="landing-actions landing-in" style={{ '--d': '.65s' }}>
        <a ref={ctaRef} className="landing-cta" href="#projects" onClick={(e) => scrollToSection(e, 'projects')} onPointerMove={onCtaMove} onPointerLeave={onCtaLeave}>
          <span>{t.projectsCta}</span><ArrowDownRight size={17}/>
        </a>
        <a className="landing-ghost" href={p.cv} target="_blank" rel="noreferrer"><span>{t.cv}</span><Download size={15}/></a>
      </div>
      <a className="landing-scroll landing-in" style={{ '--d': '.8s' }} href="#about" onClick={(e) => scrollToSection(e, 'about')}>
        <span className="landing-mouse" aria-hidden="true"><i/></span>{t.scroll}
      </a>
    </div>

    <div className="landing-visual" ref={visualRef}>
      <Orb/>
      <div className="landing-portrait landing-in" style={{ '--d': '.3s' }}>
        <div className="landing-frame">
          <img src={p.portrait} alt={t.portraitAlt} fetchPriority="high"/>
          <span className="landing-glare" aria-hidden="true"/>
          <span className="landing-name">CHAIMA CHERIF<small>TUNIS · 36°48′N</small></span>
        </div>
        {chips.map((label, i) => <span key={`${label}-${i}`} className={`landing-chip landing-chip-${i + 1}`} style={{ '--d': `${.7 + i * .12}s` }}><i/>{label}</span>)}
      </div>
    </div>

    <div className="landing-side" aria-hidden="true">PORTFOLIO · 2026</div>

  </section>;
}

/* Both versions are rendered; CSS shows the one matching the current theme (no flash on switch). */
function BrandLogo() {
  return <>
    <img className="brand-logo brand-logo-dark" src="/media/brand/logo_darkmode.png" alt=""/>
    <img className="brand-logo brand-logo-light" src="/media/brand/logo_lightmode.png" alt=""/>
  </>;
}

/* ─── Footer: one quiet line ─── */
function SiteFooter({ profile: p, t }) {
  const links = [['LinkedIn', p.linkedin], ...(p.github ? [['GitHub', p.github]] : []), ['Email', `mailto:${p.email}`]];
  return <footer className="foot section-wrap">
    <a href="#top" className="foot-brand" onClick={(e) => scrollToSection(e, 'top')}><BrandLogo/>Chaima Cherif</a>
    <nav className="foot-links" aria-label="Social">{links.map(([label, href]) => <a key={label} href={href} target={href.startsWith('mailto') ? undefined : '_blank'} rel="noreferrer">{label}</a>)}</nav>
    <span className="foot-meta">© {new Date().getFullYear()} · <a href="/admin">{t.admin}</a></span>
  </footer>;
}

/* ─── Contact: a terminal that types out how to reach me ─── */
const CONTACT_LABELS = {
  fr: { copy: 'Copier l’email', copied: 'Copié !', subject: 'Opportunité PFE · Cloud & DevOps', opening: 'Votre messagerie s’ouvre… L’adresse est aussi copiée, au cas où.' },
  en: { copy: 'Copy email', copied: 'Copied!', subject: 'Internship opportunity · Cloud & DevOps', opening: 'Your mail app is opening… The address is copied too, just in case.' },
  de: { copy: 'E-Mail kopieren', copied: 'Kopiert!', subject: 'Praktikumsangebot · Cloud & DevOps', opening: 'Ihr Mailprogramm öffnet sich… Die Adresse ist sicherheitshalber kopiert.' },
  it: { copy: 'Copia email', copied: 'Copiata!', subject: 'Opportunità di tirocinio · Cloud & DevOps', opening: 'Si apre la tua app di posta… L’indirizzo è stato copiato, per sicurezza.' },
};
const handleOf = (url, prefix) => { try { return prefix + new URL(url).pathname.replace(/^\/|\/$/g, '').replace(/^in\//, ''); } catch { return url; } };

function Contact({ profile: p, t, locale }) {
  const L = CONTACT_LABELS[locale] ?? CONTACT_LABELS.en;
  const termRef = useRef(null);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  // Terminal script: commands are typed, outputs appear at once.
  const lines = [
    { cmd: 'whoami' },
    { out: [['', `${p.name.toLowerCase().replace(/\s+/g, '-')} — ${tr(p.role, locale)}`]] },
    { cmd: 'cat contact.yaml' },
    { out: [
      ['email', p.email, `mailto:${p.email}?subject=${encodeURIComponent(L.subject)}`],
      ['linkedin', handleOf(p.linkedin, ''), p.linkedin],
      ...(p.github ? [['github', handleOf(p.github, '@'), p.github]] : []),
      ['location', tr(p.location, locale).toLowerCase()],
      ['status', tr(p.status, locale).toLowerCase()],
    ] },
  ];
  useEffect(() => {
    const el = termRef.current; if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setStep(lines.length); return undefined; }
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setStep((s) => s || 1); io.disconnect(); } }, { threshold: .4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (step === 0 || step > lines.length) return undefined;
    const current = lines[step - 1];
    const delay = current.cmd ? current.cmd.length * 55 + 450 : 380;
    const id = setTimeout(() => setStep((s) => s + 1), delay);
    return () => clearTimeout(id);
  }, [step]);
  const [opening, setOpening] = useState(false);
  const copyText = async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(p.email); ok = true; } catch {
      // Fallback for browsers/iframes that block the async clipboard API.
      const area = document.createElement('textarea');
      area.value = p.email; area.setAttribute('readonly', ''); area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(area); area.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      area.remove();
    }
    return ok;
  };
  const copyEmail = async () => {
    if (await copyText()) { setCopied(true); setTimeout(() => setCopied(false), 1800); } else window.location.href = `mailto:${p.email}`;
  };
  // mailto opens the visitor's mail app; when none is configured nothing visible happens,
  // so the address is copied as well and a short note says so.
  const onWrite = () => { copyText(); setOpening(true); setTimeout(() => setOpening(false), 5000); };
  const mailto = `mailto:${p.email}?subject=${encodeURIComponent(L.subject)}`;
  return <section className="reach section-wrap" id="contact">
    <div className="reach-kicker"><span>{t.contactKicker}</span><span>{tr(p.location, locale)}</span></div>
    <div className="reach-grid">
      <div className="reach-copy" data-reveal>
        <h2>{t.contactTitle1}<br/><em>{t.contactTitle2}</em></h2>
        <p>{t.contactCopy}</p>
        <div className="reach-actions">
          <a className="landing-cta" href={mailto} onClick={onWrite}><Mail size={16}/><span>{t.emailMe}</span><ArrowUpRight size={16}/></a>
          <button type="button" className={`landing-ghost reach-copy-btn${copied ? ' is-copied' : ''}`} onClick={copyEmail} aria-live="polite">
            {copied ? <Check size={15}/> : <Copy size={15}/>}<span>{copied ? L.copied : L.copy}</span>
          </button>
        </div>
        <p className={`reach-note${opening ? ' is-visible' : ''}`} aria-live="polite">{opening ? L.opening : ''}</p>
      </div>

      <div className="reach-term" ref={termRef} data-reveal data-reveal-delay=".1">
        <div className="reach-term-bar"><i/><i/><i/><span>chaima@cloud: ~</span></div>
        <div className="reach-term-body">
          {lines.slice(0, step).map((line, i) => line.cmd
            ? <div className="reach-line" key={i}><b>❯</b> <span className={i === step - 1 ? 'is-typing' : ''} style={{ '--n': line.cmd.length }}>{line.cmd}</span></div>
            : <div className="reach-out" key={i}>{line.out.map(([key, value, href]) => <div key={key || value}>
                {key && <span className="reach-key">{key}:</span>} {href ? <a href={href} target={href.startsWith('mailto') ? undefined : '_blank'} rel="noreferrer">{value} <ArrowUpRight size={12}/></a> : <span className="reach-val">{value}</span>}
              </div>)}</div>)}
          {step > lines.length - 1 && <div className="reach-line"><b>❯</b> <span className="reach-caret"/></div>}
        </div>
      </div>
    </div>
  </section>;
}

/* ─── Beyond the terminal: associations as tilted tickets + spoken languages ─── */
const BEYOND_LABELS = { fr: 'LANGUES PARLÉES', en: 'LANGUAGES', de: 'SPRACHEN', it: 'LINGUE' };
function Beyond({ activities, languages = [], t, ct, locale }) {
  return <section className="beyond2 section-wrap">
    <div className="beyond2-top">
      <div className="beyond2-copy" data-reveal>
        <p className="beyond2-kicker">{t.beyondKicker}</p>
        <h2>{t.beyondTitle1}<br/><em>{t.beyondTitle2}</em></h2>
        <p className="beyond2-text">{t.beyondCopy}</p>
      </div>
      <div className="beyond2-tickets">
        {activities.map((a, i) => <article key={a.id} className={`beyond2-ticket beyond2-ticket-${i % 2 ? 'b' : 'a'}`} data-reveal data-reveal-delay={i * .1} onPointerMove={spotlight}>
          <span className="beyond2-mono" aria-hidden="true">{a.organization.trim()[0]}</span>
          <div className="beyond2-ticket-head">
            <span className="beyond2-stamp">{a.period}</span>
            <Sparkles size={16}/>
          </div>
          <h3>{a.organization}</h3>
          <p className="beyond2-role">{ct('activityRoles', a.id, a.role)}</p>
          <p className="beyond2-desc">{ct('activityDescriptions', a.id, a.description)}</p>
          <span className="beyond2-perf" aria-hidden="true"/>
        </article>)}
      </div>
    </div>

    <div className="beyond2-langs" data-reveal>
      <p className="beyond2-kicker"><Globe2 size={14}/> {BEYOND_LABELS[locale] ?? BEYOND_LABELS.en}</p>
      <ul className="beyond2-lang-list">{languages.map((lang) => {
        const score = Math.min(4, Math.max(0, Number(lang.score) || 0));
        return <li key={lang.id}>
          <span className="beyond2-hello" lang={lang.code} dir={lang.code === 'ar' ? 'rtl' : undefined}>{lang.greeting}</span>
          <strong>{tr(lang.name, locale)}</strong>
          <span className="beyond2-level">{tr(lang.level, locale)}<span className="beyond2-dots" aria-label={`${score}/4`}>{[0, 1, 2, 3].map((d) => <i key={d} className={d < score ? 'on' : ''}/>)}</span></span>
        </li>;
      })}</ul>
    </div>
  </section>;
}

/* ─── Expertise: "stack galaxy" — each skill group is an orbit, each skill a planet ─── */
const STACK_LABELS = {
  fr: { tools: 'outils', hint: 'Survolez une catégorie · la galaxie s’arrête au survol' },
  en: { tools: 'tools', hint: 'Hover a category · the galaxy pauses on hover' },
  de: { tools: 'Tools', hint: 'Kategorie überfahren · die Galaxie pausiert beim Hover' },
  it: { tools: 'strumenti', hint: 'Passa su una categoria · la galassia si ferma al passaggio' },
};
function StackGalaxy({ skills, t, ct, locale }) {
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const L = STACK_LABELS[locale] ?? STACK_LABELS.en;
  // Inner orbits hold the smallest groups so every ring has room for its planets.
  const rings = useMemo(() => skills.map((group, index) => ({ ...group, index })).sort((a, b) => a.items.length - b.items.length), [skills]);
  useEffect(() => {
    if (interacting || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setActive((i) => (i + 1) % skills.length), 3800);
    return () => clearInterval(id);
  }, [interacting, skills.length]);
  const group = skills[active];
  return <section className="stack section-wrap" id="expertise">
    <SectionHeading n="04" title={t.expertiseTitle} note={t.expertiseNote}/>
    <div className="stack-body">
      <div className="stack-list" role="tablist" aria-label={t.expertiseTitle} onPointerEnter={() => setInteracting(true)} onPointerLeave={() => setInteracting(false)}>
        {skills.map((g, i) => <button key={g.id} type="button" role="tab" aria-selected={i === active} className={`stack-tab${i === active ? ' is-active' : ''}`} onPointerEnter={() => setActive(i)} onFocus={() => { setActive(i); setInteracting(true); }} onBlur={() => setInteracting(false)} onClick={() => setActive(i)} data-reveal data-reveal-delay={i * .06}>
          <span className="stack-tab-index">0{i + 1}</span>
          <span className="stack-tab-name">{ct('skillNames', g.name, g.name)}</span>
          <span className="stack-tab-count">{String(g.items.length).padStart(2, '0')}</span>
          <span className="stack-tab-bar" aria-hidden="true"/>
        </button>)}
        <p className="stack-hint">{L.hint}</p>
      </div>

      <div className="stack-galaxy" aria-hidden="true">
        {rings.map((ring, r) => <div key={ring.id} className={`stack-ring${ring.index === active ? ' is-active' : ''}`} style={{ '--r': `${40 + r * 19.5}%`, '--dur': `${70 + r * 25}s`, '--dir': r % 2 ? 'reverse' : 'normal' }}>
          {ring.items.map((skill, k) => <span key={skill} className="stack-planet" style={{ '--a': `${(360 / ring.items.length) * k + r * 23}deg` }}>
            <span className="stack-pill">{skill}</span>
          </span>)}
        </div>)}
        <div className="stack-core">
          <AnimatePresence mode="wait">
            <motion.div key={active} className="stack-core-text" initial={{ opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .9 }} transition={{ duration: .3, ease: [.22, 1, .36, 1] }}>
              <b>{String(group.items.length).padStart(2, '0')}</b>
              <span>{ct('skillNames', group.name, group.name)}</span>
              <small>{L.tools}</small>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="stack-mobile" aria-live="polite">
        <motion.div key={active} className="stack-mobile-chips" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, ease: [.22, 1, .36, 1] }}>
          {group.items.map((skill) => <span key={skill}>{skill}</span>)}
        </motion.div>
      </div>
    </div>
  </section>;
}

/* ─── About ─── */
const ABOUT_LABELS = {
  fr: { stats: 'EN CHIFFRES', internships: 'Stages', projects: 'Projets', languages: 'Langues', clubs: 'Associations', status: 'STATUT' },
  en: { stats: 'IN NUMBERS', internships: 'Internships', projects: 'Projects', languages: 'Languages', clubs: 'Associations', status: 'STATUS' },
  de: { stats: 'IN ZAHLEN', internships: 'Praktika', projects: 'Projekte', languages: 'Sprachen', clubs: 'Vereine', status: 'STATUS' },
  it: { stats: 'IN NUMERI', internships: 'Tirocini', projects: 'Progetti', languages: 'Lingue', clubs: 'Associazioni', status: 'STATO' },
};

// Words light up one by one as the paragraph scrolls through the viewport (and dim again on the way back).
function ScrollRevealText({ text }) {
  const ref = useRef(null);
  const words = text.split(/\s+/).filter(Boolean);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const spans = [...el.querySelectorAll('span')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { spans.forEach((w) => w.classList.add('is-lit')); return undefined; }
    let frame;
    const update = () => {
      const box = el.getBoundingClientRect(); const vh = window.innerHeight;
      // 0 when the paragraph top reaches 85% of the viewport, 1 when its bottom reaches 55%.
      const progress = Math.min(1, Math.max(0, (vh * .85 - box.top) / (box.height + vh * .3)));
      const lit = Math.round(progress * spans.length);
      spans.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
      frame = null;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); update();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [text]);
  return <p className="about-story" ref={ref}>{words.map((w, i) => <span key={i}>{w} </span>)}</p>;
}

// Counts up from 0 each time it scrolls into view.
function CountUp({ value }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const el = ref.current; if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame;
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (!entry.isIntersecting) { setShown(0); return; }
      const start = performance.now();
      const step = (now) => { const t = Math.min(1, (now - start) / 1100); setShown(Math.round(value * (1 - (1 - t) ** 3))); if (t < 1) frame = requestAnimationFrame(step); };
      frame = requestAnimationFrame(step);
    }, { threshold: .6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return <b ref={ref}>{String(shown).padStart(2, '0')}</b>;
}

// Spotlight that follows the pointer inside a card.
const spotlight = (event) => {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--sx', `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty('--sy', `${event.clientY - box.top}px`);
};

function About({ data, t, ct, locale }) {
  const { profile: p } = data;
  const L = ABOUT_LABELS[locale] ?? ABOUT_LABELS.en;
  const stats = [[data.experiences.length, L.internships], [data.projects.length, L.projects], [data.languages.length, L.languages], [data.activities.length, L.clubs]];
  return <section className="about" id="about">
    <div className="section-kicker"><span>{t.aboutKicker}</span><span>{t.country}</span></div>
    <div className="about-head">
      <h2 className="about-title" data-reveal>{t.aboutTitle1}<br/><em>{t.aboutTitle2}</em></h2>
      <ScrollRevealText text={ct('profileAbout', 'main', p.about)}/>
    </div>
    <div className="about-bento">
      <article className="about-card about-edu" data-reveal onPointerMove={spotlight}>
        <div className="about-card-icon"><Layers3 size={20}/></div>
        <span className="about-label">{t.education}</span>
        <strong>{ct('profileEducation', 'main', p.education)}</strong>
        <small>{ct('school', 'main', p.school)} · {ct('graduation', 'main', p.graduation)}</small>
      </article>
      <article className="about-card about-stats" data-reveal data-reveal-delay=".08" onPointerMove={spotlight}>
        <span className="about-label">{L.stats}</span>
        <div className="about-stats-grid">{stats.map(([value, label]) => <div key={label}><CountUp value={value}/><span>{label}</span></div>)}</div>
      </article>
      <article className="about-card about-status" data-reveal data-reveal-delay=".16" onPointerMove={spotlight}>
        <span className="about-label">{L.status}</span>
        <strong><i/>{tr(p.status, locale)}</strong>
        <small>{tr(p.availability, locale)}</small>
      </article>
    </div>
  </section>;
}

/* ─── Animated background: soft aurora blobs drifting behind the whole page ───
   Drawn on a low-resolution canvas (upscaled by CSS, so it is naturally soft and cheap).
   Blobs drift over time, flow with the scroll, lean toward the pointer, and their palette
   shifts from the top of the page (ice / lilac) to the bottom (plum / rose). */
const AURORA_THEMES = {
  dark: {
    base: '#0a0e1d',
    alpha: .38,
    top: ['#2f6f9a', '#6b4fa3', '#1d3f73', '#9b5bc3', '#3b2a6e'],
    bottom: ['#8a3f86', '#c0508e', '#4a2f86', '#2f5f8f', '#6a2f6e'],
  },
  light: {
    base: '#f4f2f8',
    alpha: .55,
    top: ['#9fd6ea', '#cdb6ec', '#b7d3f2', '#e8b6d6', '#d9cdf3'],
    bottom: ['#f0b3d0', '#d7b3ec', '#a9d4e8', '#f5c6dc', '#c9b8ee'],
  },
};
const AURORA_BLOBS = [
  { x: .18, y: .22, r: .55, sx: .11, sy: .09, speed: .00028, phase: 0 },
  { x: .82, y: .3, r: .5, sx: .1, sy: .12, speed: .00022, phase: 1.7 },
  { x: .5, y: .78, r: .6, sx: .14, sy: .08, speed: .0002, phase: 3.1 },
  { x: .12, y: .85, r: .42, sx: .09, sy: .1, speed: .0003, phase: 4.4 },
  { x: .7, y: .6, r: .38, sx: .12, sy: .11, speed: .00025, phase: 5.6, follow: true },
];
const mixHex = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16); const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(((pa >> shift) & 255) + ((((pb >> shift) & 255) - ((pa >> shift) & 255)) * t));
  return `${ch(16)},${ch(8)},${ch(0)}`;
};
function AnimatedBackground({ theme }) {
  const canvasRef = useRef(null);
  const themeRef = useRef(theme);
  const repaintRef = useRef(() => {});
  themeRef.current = theme;
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SCALE = .25;
    let w = 0; let h = 0; let frame = 0; let running = true;
    let mx = .7; let my = .6; let fx = .7; let fy = .6; let flow = 0;
    const resize = () => { w = canvas.width = Math.max(1, Math.round(window.innerWidth * SCALE)); h = canvas.height = Math.max(1, Math.round(window.innerHeight * SCALE)); };
    const draw = (time) => {
      const palette = AURORA_THEMES[themeRef.current] ?? AURORA_THEMES.dark;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      flow += ((window.scrollY / window.innerHeight) - flow) * .06;
      fx += (mx - fx) * .03; fy += (my - fy) * .03;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = palette.base; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = themeRef.current === 'light' ? 'multiply' : 'lighter';
      const size = Math.max(w, h);
      AURORA_BLOBS.forEach((blob, i) => {
        const t = time * blob.speed + blob.phase;
        let x = blob.x + Math.sin(t) * blob.sx + Math.sin(flow * .9 + blob.phase) * .06;
        let y = blob.y + Math.cos(t * .8) * blob.sy + Math.cos(flow * .7 + blob.phase) * .08;
        if (blob.follow) { x = x * .45 + fx * .55; y = y * .45 + fy * .55; }
        const radius = blob.r * size * (1 + Math.sin(t * 1.3) * .08);
        const rgb = mixHex(palette.top[i], palette.bottom[i], progress);
        const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, radius);
        g.addColorStop(0, `rgba(${rgb},${.55 * palette.alpha})`);
        g.addColorStop(.45, `rgba(${rgb},${.2 * palette.alpha})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      });
      if (running && !reduce) frame = requestAnimationFrame(draw);
    };
    const onMove = (e) => { mx = e.clientX / window.innerWidth; my = e.clientY / window.innerHeight; };
    const onVisibility = () => {
      running = !document.hidden;
      cancelAnimationFrame(frame);
      if (running) frame = requestAnimationFrame(draw);
    };
    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    // With reduced motion only a single static frame is drawn; redraw it on scroll so the palette still follows the page.
    const onScrollStatic = () => { if (reduce) { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); } };
    repaintRef.current = () => { if (reduce || !running) { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); } };
    window.addEventListener('scroll', onScrollStatic, { passive: true });
    return () => {
      running = false; cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('scroll', onScrollStatic);
    };
  }, []);
  // Theme switches: repaint immediately even when the loop is paused (reduced motion).
  useEffect(() => { repaintRef.current(); }, [theme]);
  return <canvas className="aurora-bg" ref={canvasRef} aria-hidden="true"/>;
}

/* ─── Custom cursor: precise dot + trailing ring that morphs over interactive elements ─── */
const CURSOR_VIEW_LABEL = { fr: 'Voir', en: 'View', de: 'Ansehen', it: 'Vedi' };
function CustomCursor({ locale }) {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const dot = dotRef.current; const ring = ringRef.current;
    if (!dot || !ring) return undefined;
    const root = document.documentElement;
    root.classList.add('has-custom-cursor');
    let x = -100, y = -100, rx = -100, ry = -100, frame;
    const tick = () => {
      rx += (x - rx) * .2; ry += (y - ry) * .2;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      frame = requestAnimationFrame(tick);
    };
    const show = (on) => { dot.classList.toggle('is-visible', on); ring.classList.toggle('is-visible', on); };
    const onMove = (e) => { x = e.clientX; y = e.clientY; show(true); };
    const onOver = (e) => {
      const target = e.target.closest?.('[data-cursor], a, button, [role="button"], label, select, summary');
      const state = target ? (target.dataset.cursor || 'link') : '';
      ring.dataset.state = state; dot.dataset.state = state;
    };
    const onDown = () => ring.classList.add('is-pressed');
    const onUp = () => ring.classList.remove('is-pressed');
    const onLeave = () => show(false);
    frame = requestAnimationFrame(tick);
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onUp);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame); root.classList.remove('has-custom-cursor');
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerdown', onDown); document.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  return <>
    <div className="cursor-ring" ref={ringRef} aria-hidden="true"><span className="cursor-label">{CURSOR_VIEW_LABEL[locale] ?? CURSOR_VIEW_LABEL.en}</span></div>
    <div className="cursor-dot" ref={dotRef} aria-hidden="true"/>
  </>;
}

/* ─── Enhancement: Floating particles in hero ─── */
function HeroParticles() {
  const containerRef = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const container = containerRef.current;
    if (!container) return;
    const colors = ['#9edcf3', '#f078b5', '#c391e6', '#b9a3d8', '#a6e3f6'];
    const particles = [];
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'hero-particle';
      const size = 2 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const duration = 8 + Math.random() * 12;
      const delay = Math.random() * 6;
      const left = Math.random() * 100;
      particle.style.cssText = `width:${size}px;height:${size}px;background:${color};left:${left}%;bottom:-10px;animation-duration:${duration}s;animation-delay:${delay}s;box-shadow:0 0 ${size * 3}px ${color}88;`;
      container.appendChild(particle);
      particles.push(particle);
    };
    for (let i = 0; i < 18; i++) createParticle();
    return () => particles.forEach(p => p.remove());
  }, []);
  return <div className="hero-particles" ref={containerRef} aria-hidden="true" />;
}

/* ─── Enhancement: Active nav section tracker + sticky topbar ─── */
function useActiveSection() {
  const [active, setActive] = useState('');
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const sections = ['top', 'about', 'experience', 'projects', 'expertise', 'contact'];
    let ticking = false;
    const update = () => {
      setScrolled(window.scrollY > 24);
      const scrollPos = window.scrollY + window.innerHeight * 0.35;
      let current = '';
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) current = id;
      }
      setActive(current);
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return { active, scrolled };
}

/* ─── Enhancement: Noise texture overlay ─── */
function NoiseOverlay() {
  return <div className="noise-overlay" aria-hidden="true" />;
}

function App() {
  const [data, setData] = useState(null); const [failed, setFailed] = useState(false); const [admin, setAdmin] = useState(location.pathname === '/admin');
  const [locale, setLocale] = useState(() => locales.includes(localStorage.getItem('portfolio-locale')) ? localStorage.getItem('portfolio-locale') : 'fr');
  const [theme, setTheme] = useState(() => localStorage.getItem('portfolio-theme') === 'light' ? 'light' : 'dark');
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  useEffect(() => { getPortfolio().then(setData).catch(() => setFailed(true)); const onPop = () => setAdmin(location.pathname === '/admin'); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  useEffect(() => { const onClick = (event) => { const a = event.target.closest('a'); if (a?.getAttribute('href') === '/admin') { event.preventDefault(); history.pushState({}, '', '/admin'); setAdmin(true); window.scrollTo(0, 0); } if (a?.getAttribute('href') === '/') { event.preventDefault(); history.pushState({}, '', '/'); setAdmin(false); window.scrollTo(0, 0); } }; document.addEventListener('click', onClick); return () => document.removeEventListener('click', onClick); }, []);
  if (failed) return <div className="load-state">Le portfolio n’a pas pu charger son contenu. Démarrez le serveur avec <code>npm run dev</code>.</div>;
  if (!data) return <div className="load-state">Chargement du portfolio<span className="blink">.</span></div>;
  // Theme and language switches run inside a View Transition when the browser supports it:
  // the theme spreads as a circle from the toggle, the language cross-fades.
  const withTransition = (kind, update, origin) => {
    const root = document.documentElement;
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { update(); return; }
    const x = origin?.clientX ?? window.innerWidth - 80; const y = origin?.clientY ?? 40;
    root.style.setProperty('--vt-x', `${x}px`); root.style.setProperty('--vt-y', `${y}px`);
    root.style.setProperty('--vt-r', `${Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))}px`);
    root.dataset.vt = kind;
    const transition = document.startViewTransition(() => flushSync(update));
    // The browser may skip the animation (hidden tab, rapid clicks); the update itself still applies.
    transition.ready.catch(() => {}); transition.updateCallbackDone.catch(() => {});
    transition.finished.catch(() => {}).finally(() => { delete root.dataset.vt; });
  };
  const changeLocale = (value) => withTransition('locale', () => { setLocale(value); localStorage.setItem('portfolio-locale', value); });
  const changeTheme = (event) => withTransition('theme', () => setTheme((current) => { const next = current === 'dark' ? 'light' : 'dark'; localStorage.setItem('portfolio-theme', next); return next; }), event);
  return <AnimatePresence mode="wait">{admin ? <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Suspense fallback={<div className="load-state">Chargement du studio…</div>}><Admin data={data} onData={setData} /></Suspense></motion.div> : <Portfolio data={data} locale={locale} onLocale={changeLocale} theme={theme} onTheme={changeTheme} key="portfolio" />}</AnimatePresence>;
}

const NAV_ARIA = {
  fr: { home: 'Chaima Cherif — accueil', main: 'Navigation principale', mobile: 'Navigation mobile' },
  en: { home: 'Chaima Cherif — home', main: 'Main navigation', mobile: 'Mobile navigation' },
  de: { home: 'Chaima Cherif — Startseite', main: 'Hauptnavigation', mobile: 'Mobile Navigation' },
  it: { home: 'Chaima Cherif — home', main: 'Navigazione principale', mobile: 'Navigazione mobile' },
};
const NAV_LINKS = [['about', 'navAbout'], ['experience', 'navExperience'], ['projects', 'navProjects'], ['expertise', 'navExpertise']];

const scrollToSection = (event, id) => {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  if (window.__lenis) window.__lenis.scrollTo(target, { offset: id === 'top' ? 0 : -88, duration: 1.2 });
  else target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  history.replaceState(null, '', `#${id}`);
};

function useDismiss(open, onClose, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    const onPointer = (event) => { if (ref.current && !ref.current.contains(event.target)) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, [open, onClose, ref]);
}

function SiteHeader({ t, locale, onLocale, theme, onTheme, activeSection, scrolled }) {
  const [menu, setMenu] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const headerRef = useRef(null);
  const languageRef = useRef(null);
  const closeMenu = useCallback(() => setMenu(false), []);
  const closeLanguage = useCallback(() => setLanguageOpen(false), []);
  useDismiss(languageOpen, closeLanguage, languageRef);
  useDismiss(menu, closeMenu, headerRef);

  useEffect(() => {
    if (!menu) return undefined;
    window.__lenis?.stop(); document.documentElement.classList.add('nav-locked');
    const onResize = () => { if (window.innerWidth > 900) setMenu(false); };
    window.addEventListener('resize', onResize);
    return () => { window.__lenis?.start(); document.documentElement.classList.remove('nav-locked'); window.removeEventListener('resize', onResize); };
  }, [menu]);

  useEffect(() => {
    const el = headerRef.current; let frame;
    const update = () => { const max = document.documentElement.scrollHeight - window.innerHeight; el?.style.setProperty('--nav-progress', max > 0 ? Math.min(window.scrollY / max, 1) : 0); frame = null; };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true }); update();
    return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);

  const go = (event, id) => {
    if (!menu) return scrollToSection(event, id);
    // Let the sheet close (and Lenis restart) before scrolling, otherwise start() cancels the animation.
    event.preventDefault(); setMenu(false);
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToSection({ preventDefault() {} }, id)));
  };
  const highlight = hovered ?? (NAV_LINKS.some(([id]) => id === activeSection) ? activeSection : null);
  const themeLabel = theme === 'dark' ? t.themeLight : t.themeDark;

  return <header ref={headerRef} className={`navbar${scrolled ? ' is-scrolled' : ''}${menu ? ' is-open' : ''}`}>
    <div className="navbar-bar">
      <a href="#top" className="navbar-brand" onClick={(e) => go(e, 'top')} aria-label={(NAV_ARIA[locale] ?? NAV_ARIA.en).home}>
        <span className="navbar-logo"><BrandLogo/></span>
        <span className="navbar-name">Chaima Cherif<small>Cloud &amp; DevOps</small></span>
      </a>

      <nav className="navbar-links" aria-label={(NAV_ARIA[locale] ?? NAV_ARIA.en).main} onMouseLeave={() => setHovered(null)}>
        {NAV_LINKS.map(([id, key]) => <a key={id} href={`#${id}`} aria-current={activeSection === id ? 'location' : undefined} className={activeSection === id ? 'is-active' : ''} onMouseEnter={() => setHovered(id)} onFocus={() => setHovered(id)} onBlur={() => setHovered(null)} onClick={(e) => go(e, id)}>
          {highlight === id && <motion.span className="navbar-pill" layoutId="navbar-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }}/>}
          <span>{t[key]}</span>
        </a>)}
      </nav>

      <div className="navbar-tools">
        <div className="navbar-lang" ref={languageRef}>
          <button className="navbar-icon-btn navbar-lang-trigger" type="button" aria-label={t.language} aria-haspopup="menu" aria-expanded={languageOpen} onClick={() => setLanguageOpen((v) => !v)}>
            <Globe2 size={15}/><span>{localeNames[locale]}</span><ChevronDown size={12} className="navbar-chevron"/>
          </button>
          <AnimatePresence>{languageOpen && <motion.div className="navbar-lang-menu" role="menu" initial={{ opacity: 0, y: -8, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .98 }} transition={{ duration: .18, ease: [.22, 1, .36, 1] }}>
            {locales.map((code) => <button key={code} type="button" role="menuitemradio" aria-checked={locale === code} className={locale === code ? 'is-active' : ''} onClick={() => { onLocale(code); setLanguageOpen(false); }}>
              <span className="navbar-lang-code">{localeNames[code]}</span><span>{localeLabels[code]}</span>{locale === code && <Check size={13}/>}
            </button>)}
          </motion.div>}</AnimatePresence>
        </div>
        <button className="navbar-icon-btn navbar-theme" type="button" onClick={onTheme} aria-label={themeLabel} title={themeLabel}>
          <AnimatePresence mode="wait" initial={false}><motion.span key={theme} initial={{ rotate: -90, scale: .4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: .4, opacity: 0 }} transition={{ duration: .22 }}>{theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}</motion.span></AnimatePresence>
        </button>
        <a className={`navbar-cta${activeSection === 'contact' ? ' is-active' : ''}`} href="#contact" onClick={(e) => go(e, 'contact')}>
          <span className="navbar-cta-dot" aria-hidden="true"/><span className="navbar-cta-label">{t.navContact}</span><span className="navbar-cta-arrow" aria-hidden="true"><ArrowUpRight size={14}/><ArrowUpRight size={14}/></span>
        </a>
        <button className="navbar-burger" type="button" aria-label={menu ? t.close : t.menuButton} aria-expanded={menu} aria-controls="navbar-sheet" onClick={() => setMenu((v) => !v)}><span/><span/></button>
      </div>
      <span className="navbar-progress" aria-hidden="true"/>
    </div>

    <AnimatePresence>{menu && <motion.div id="navbar-sheet" className="navbar-sheet" initial={{ opacity: 0, y: -12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: .98 }} transition={{ duration: .28, ease: [.22, 1, .36, 1] }}>
      <nav aria-label={(NAV_ARIA[locale] ?? NAV_ARIA.en).mobile}>
        {[...NAV_LINKS, ['contact', 'navContact']].map(([id, key], i) => <motion.a key={id} href={`#${id}`} className={activeSection === id ? 'is-active' : ''} onClick={(e) => go(e, id)} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06 + i * .05, duration: .35, ease: [.22, 1, .36, 1] }}>
          <small>0{i + 1}</small><span>{t[key]}</span><ArrowUpRight size={18}/>
        </motion.a>)}
      </nav>
      <div className="navbar-sheet-foot">
        <div className="navbar-sheet-langs" role="radiogroup" aria-label={t.language}>{locales.map((code) => <button key={code} type="button" role="radio" aria-checked={locale === code} className={locale === code ? 'is-active' : ''} onClick={() => onLocale(code)}>{localeNames[code]}</button>)}</div>
        <button className="navbar-icon-btn" type="button" onClick={onTheme} aria-label={themeLabel}>{theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}</button>
      </div>
    </motion.div>}</AnimatePresence>
  </header>;
}

function Portfolio({ data, locale, onLocale, theme, onTheme }) {
  useMotionSetup();
  const t = textsFor(locale, data.copy);
  // Content fields are { fr, en, de, it } in data/portfolio.json; ct keeps the old call shape.
  const ct = (_group, _id, value) => tr(value, locale);
  const { profile: p } = data; const [projectFilter, setProjectFilter] = useState('all'); const [selectedProject, setSelectedProject] = useState(null);
  const visibleProjects = useMemo(() => data.projects.filter((item) => matchesProjectFilter(item, projectFilter)), [data.projects, projectFilter]);
  const projectFilters = [['all', t.filterAll], ['cloud', t.filterCloud], ['infra', t.filterInfra], ['apps', t.filterApps]];
  const { active: activeSection, scrolled } = useActiveSection();
  return <main className="site-shell" data-theme={theme}>
    <AnimatedBackground theme={theme}/>
    <CursorGlow/>
    <CustomCursor locale={locale}/>
    <NoiseOverlay/>
    <SiteHeader t={t} locale={locale} onLocale={onLocale} theme={theme} onTheme={onTheme} activeSection={activeSection} scrolled={scrolled}/>
    <Hero data={data} t={t} ct={ct} locale={locale}/>
    <About data={data} t={t} ct={ct} locale={locale}/>
    <hr className="section-separator"/>
    <section className="xp section-wrap" id="experience"><SectionHeading n="02" title={t.experienceTitle} note={t.experienceNote}/><XpTimeline>{data.experiences.map((item, i) => <Experience item={item} i={i} locale={locale} key={item.id}/>)}</XpTimeline></section>
    <ProjectsSection items={visibleProjects} allItems={data.projects} filter={projectFilter} filters={projectFilters} onFilter={setProjectFilter} locale={locale} t={t} onOpenProject={setSelectedProject} SectionHeading={SectionHeading}/>
    <StackGalaxy skills={data.skills} t={t} ct={ct} locale={locale}/>
    <Beyond activities={data.activities} languages={data.languages} t={t} ct={ct} locale={locale}/>
    <hr className="section-separator"/>
    <Contact profile={p} t={t} locale={locale}/>
    <SiteFooter profile={p} t={t}/>
    <AnimatePresence>{selectedProject && <ProjectDialog item={selectedProject} locale={locale} t={t} onClose={() => setSelectedProject(null)}/>}</AnimatePresence>
  </main>;
}

function SectionHeading({ n, title, note }) { return <div className="section-heading" data-reveal><div><span className="number">{n} / 04</span><h2>{title}</h2></div><p>{note}</p></div>; }
/* Winding experience line: an SVG path threaded through every dot, drawn with the scroll
   (and retracted on the way back up). Its glowing head follows the curve; dots light up
   as the head passes them and the latest reached row is marked current. */
function XpTimeline({ children }) {
  const ref = useRef(null);
  const railRef = useRef(null);
  const lineRef = useRef(null);
  const headRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0, d: '' });
  const geo = useRef({ len: 0, dots: [] });
  const progress = useRef({ now: 0, target: 0 });

  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const rows = () => [...el.querySelectorAll('.xp-row')];

    const paint = () => {
      const line = lineRef.current; const head = headRef.current; const { len, dots } = geo.current;
      if (!line || !len) return;
      const p = progress.current.now;
      line.style.strokeDashoffset = `${len * (1 - p)}`;
      const pt = line.getPointAtLength(len * p);
      head.setAttribute('cx', pt.x); head.setAttribute('cy', pt.y);
      head.style.opacity = p > .002 ? 1 : 0;
      let current = -1;
      rows().forEach((row, i) => { const reached = dots[i] !== undefined && dots[i] <= pt.y + 2; row.classList.toggle('is-reached', reached); if (reached) current = i; });
      rows().forEach((row, i) => row.classList.toggle('is-current', i === current));
    };

    const measure = () => {
      const dots = [...el.querySelectorAll('.xp-dot')].map((dot) => {
        let x = dot.offsetWidth / 2; let y = dot.offsetHeight / 2; let node = dot;
        while (node && node !== el) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
        return [x, y];
      });
      if (!dots.length) return;
      let d = `M ${dots[0][0]} ${dots[0][1]}`;
      for (let i = 1; i < dots.length; i++) {
        const [x0, y0] = dots[i - 1]; const [x1, y1] = dots[i]; const mid = (y1 - y0) / 2;
        d += ` C ${x0} ${y0 + mid}, ${x1} ${y1 - mid}, ${x1} ${y1}`;
      }
      geo.current.dots = dots.map(([, y]) => y);
      setSize({ w: el.offsetWidth, h: el.offsetHeight, d });
    };

    const tick = () => {
      const p = progress.current;
      p.now += (p.target - p.now) * .14;
      if (Math.abs(p.target - p.now) < .0005) p.now = p.target;
      paint();
      frame = p.now !== p.target ? requestAnimationFrame(tick) : 0;
    };
    const onScroll = () => {
      const box = el.getBoundingClientRect(); const { dots } = geo.current;
      if (!dots.length) return;
      // The head sits ~62% down the viewport: progress runs from the first dot to the last one.
      const first = box.top + dots[0]; const last = box.top + dots[dots.length - 1];
      progress.current.target = reduce ? 1 : Math.min(1, Math.max(0, (window.innerHeight * .62 - first) / Math.max(1, last - first)));
      if (!frame) frame = requestAnimationFrame(tick);
    };

    measure();
    const ro = new ResizeObserver(() => { measure(); onScroll(); });
    ro.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    geo.current.onScroll = onScroll; geo.current.paint = paint;
    return () => { ro.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  // After the path changes, remeasure its length and repaint at the current progress.
  useEffect(() => {
    const line = lineRef.current; if (!line || !size.d) return;
    const len = line.getTotalLength();
    geo.current.len = len;
    line.style.strokeDasharray = `${len}`;
    geo.current.onScroll?.(); geo.current.paint?.();
  }, [size]);

  return <div className="xp-timeline" ref={ref}>
    <svg className="xp-path" width={size.w} height={size.h} viewBox={`0 0 ${size.w || 1} ${size.h || 1}`} aria-hidden="true">
      <defs>
        <linearGradient id="xp-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={size.h || 1}>
          <stop offset="0" className="xp-stop-a"/><stop offset=".55" className="xp-stop-b"/><stop offset="1" className="xp-stop-c"/>
        </linearGradient>
      </defs>
      <path ref={railRef} className="xp-path-rail" d={size.d}/>
      <path ref={lineRef} className="xp-path-line" d={size.d} stroke="url(#xp-gradient)"/>
      <circle ref={headRef} className="xp-path-head" r="5" cx="0" cy="0"/>
    </svg>
    {children}
  </div>;
}

const XP_LABELS = { fr: ['Voir les détails', 'Masquer les détails'], en: ['Show details', 'Hide details'], de: ['Details anzeigen', 'Details ausblenden'], it: ['Mostra dettagli', 'Nascondi dettagli'] };
// "84 % de précision sur la criticité" → ["84 %", "précision sur la criticité"]
const splitMetric = (text) => {
  const match = text.match(/^([\d.,]+\s?%)\s*(.*)$/);
  return match ? [match[1].replace(' ', ' '), match[2].replace(/^(de |d’|d')/, '')] : [text, ''];
};
function Experience({ item, i, locale }) {
  const [open, setOpen] = useState(false);
  const tx = (_group, value) => tr(value, locale);
  const [company, ...group] = tx('expCompany', item.company).split('·').map((part) => part.trim());
  const labels = XP_LABELS[locale] ?? XP_LABELS.en;
  const detailsId = `${item.id}-details`;
  return <article className={`xp-row ${i % 2 ? 'is-right' : 'is-left'}`}>
    <div className="xp-meta" data-reveal>
      <span className="xp-index">{String(i + 1).padStart(2, '0')}</span>
      <span className="xp-period">{tx('expPeriod', item.period)}</span>
      <strong className="xp-company">{company}</strong>
      <span className="xp-where">{[...group, tx('expPlace', item.place)].filter(Boolean).join(' · ')}</span>
    </div>
    <span className="xp-dot" aria-hidden="true"/>
    <div className="xp-card" data-reveal onPointerMove={spotlight}>
      <h3>{tx('expRole', item.role)}</h3>
      <p className="xp-summary">{tx('expSummary', item.summary)}</p>
      {item.metrics && <div className="xp-metrics">{item.metrics.map((m, k) => { const [value, label] = splitMetric(tr(m, locale)); return <div key={k}><b>{value}</b><span>{label}</span></div>; })}</div>}
      <div className="xp-stack">{item.stack.map((s) => <span key={s}>{s}</span>)}</div>
      <button type="button" className="xp-more" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen((v) => !v)}>{labels[open ? 1 : 0]}<ChevronDown size={14}/></button>
      <AnimatePresence initial={false}>{open && <motion.div id={detailsId} className="xp-details" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .35, ease: [.22, 1, .36, 1] }}>
        <p>{tx('expDetails', item.details)}</p>
      </motion.div>}</AnimatePresence>
    </div>
  </article>;
}
function ProjectDialog({ item, locale, t, onClose }) {
  const [imageIndex, setImageIndex] = useState(0);
  const images = Array.isArray(item.images) ? item.images : item.image ? [item.image] : [];
  const tx = (_group, value) => tr(value, locale);
  useEffect(() => { const onKey = (event) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden'; return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; }; }, [onClose]);
  return <motion.div className="project-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.section className="project-dialog" role="dialog" aria-modal="true" aria-label={tx('projectTitle', item.title)} initial={{ opacity: 0, y: 28, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .985 }} transition={{ duration: .28 }}><button className="dialog-close" type="button" aria-label={t.close} onClick={onClose}><X size={18}/></button>{images.length > 0 && <div className="dialog-gallery"><img src={images[imageIndex]} alt={`${tx('projectTitle', item.title)} ${imageIndex + 1}/${images.length}`}/>{images.length > 1 && <><button type="button" className="dialog-gallery-control prev" aria-label={{ fr: 'Image précédente', en: 'Previous image', de: 'Vorheriges Bild', it: 'Immagine precedente' }[locale] ?? 'Previous image'} onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)}>‹</button><button type="button" className="dialog-gallery-control next" aria-label={{ fr: 'Image suivante', en: 'Next image', de: 'Nächstes Bild', it: 'Immagine successiva' }[locale] ?? 'Next image'} onClick={() => setImageIndex((imageIndex + 1) % images.length)}>›</button><span>{String(imageIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span></>}</div>}<div className="dialog-copy"><div className="project-meta"><span>{tx('projectCategory', item.category)}</span><span>{tx('projectPeriod', item.period)}</span></div><h2>{tx('projectTitle', item.title)}</h2><p className="dialog-kicker">{t.projectContext}</p><p className="dialog-description">{tr(item.details, locale) || tr(item.description, locale)}</p><div className="chips">{item.stack.map((skill) => <span key={skill}>{skill}</span>)}</div></div></motion.section></motion.div>;
}

export default App;
