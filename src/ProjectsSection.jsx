import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { tr } from './i18n.js';

// Each project lists the gallery filters it belongs to ('cloud' | 'infra' | 'apps'), set from the back office.
export function matchesProjectFilter(item, filter) {
  return filter === 'all' || (item.groups || []).includes(filter);
}

export default function ProjectsSection({ items, allItems, filter, filters, onFilter, locale, t, onOpenProject, SectionHeading }) {
  const stageRef = useRef(null);
  const railRef = useRef(null);
  const trackRef = useRef(null);
  const triggerRef = useRef(null);
  const activeRef = useRef(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const sceneKey = `${filter}:${items.map((item) => item.id).join('|')}`;
  const labels = {
    fr: { hint: 'Défilez pour découvrir les projets', rail: 'Galerie horizontale des projets', controls: 'Navigation des projets', project: 'Projet' },
    en: { hint: 'Scroll to explore the projects', rail: 'Horizontal project gallery', controls: 'Project navigation', project: 'Project' },
    de: { hint: 'Scrollen, um die Projekte zu entdecken', rail: 'Horizontale Projektgalerie', controls: 'Projektnavigation', project: 'Projekt' },
    it: { hint: 'Scorri per scoprire i progetti', rail: 'Galleria orizzontale dei progetti', controls: 'Navigazione progetti', project: 'Progetto' }
  }[locale] ?? { hint: 'Scroll to explore the projects', rail: 'Horizontal project gallery', controls: 'Project navigation', project: 'Project' };

  useEffect(() => {
    const rail = railRef.current;
    const stage = stageRef.current;
    const track = trackRef.current;
    if (!rail || !stage || !track) return undefined;

    let cancelled = false;
    let media = null;
    let frame = 0;
    // Each scene gets --focus (1 = centred, 0 = one full slide away) and --side (-1 left / 1 right),
    // which the CSS turns into the fade / blur / tilt of the cards leaving the centre.
    const applyFocus = () => {
      const railBox = rail.getBoundingClientRect();
      const railCenter = railBox.left + railBox.width / 2;
      track.querySelectorAll('[data-project-scene]').forEach((card) => {
        const box = card.getBoundingClientRect();
        const offset = (box.left + box.width / 2 - railCenter) / (box.width || 1);
        // Stay fully crisp within 12% of the centre, then ease out over the next 60%.
        const t = Math.min(1, Math.max(0, (Math.abs(offset) - .12) / .6));
        card.style.setProperty('--focus', (1 - t * t * (3 - 2 * t)).toFixed(3));
        card.style.setProperty('--side', offset < 0 ? -1 : 1);
      });
    };
    applyFocus();
    window.addEventListener('resize', applyFocus);
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        applyFocus();
        const railLeft = rail.getBoundingClientRect().left;
        const cards = [...(trackRef.current?.querySelectorAll('[data-project-scene]') ?? [])];
        if (!cards.length) return;
        let closest = 0;
        let distance = Number.POSITIVE_INFINITY;
        cards.forEach((card, index) => {
          const currentDistance = Math.abs(card.getBoundingClientRect().left - railLeft);
          if (currentDistance < distance) { distance = currentDistance; closest = index; }
        });
        if (closest !== activeRef.current) {
          activeRef.current = closest;
          setActiveSlide(closest);
        }
      });
    };
    rail.addEventListener('scroll', onScroll, { passive: true });

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([gsapModule, scrollModule]) => {
      if (cancelled) return;
      const gsap = gsapModule.gsap ?? gsapModule.default;
      const ScrollTrigger = scrollModule.ScrollTrigger ?? scrollModule.default;
      gsap.registerPlugin(ScrollTrigger);
      media = gsap.matchMedia();
      media.add('(min-width: 651px) and (min-height: 680px)', () => {
        const travel = () => Math.max(0, track.scrollWidth - rail.clientWidth);
        if (travel() <= 1) return undefined;

        const updateActive = (progress) => {
          const next = Math.min(items.length - 1, Math.max(0, Math.round(progress * (items.length - 1))));
          if (next !== activeRef.current) {
            activeRef.current = next;
            setActiveSlide(next);
          }
        };

        const tween = gsap.to(track, {
          x: () => -travel(),
          ease: 'none',
          onUpdate: applyFocus,
          scrollTrigger: {
            id: 'projects-horizontal-gallery',
            trigger: stage,
            pin: stage,
            start: 'top top+=88',
            end: () => `+=${Math.max(window.innerHeight * .75, travel() * .55)}`,
            scrub: .45,
            snap: items.length > 1 ? { snapTo: 1 / (items.length - 1), duration: { min: .25, max: .7 }, delay: .12, ease: 'power2.inOut' } : undefined,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => updateActive(self.progress),
            onRefresh: (self) => updateActive(self.progress)
          }
        });
        triggerRef.current = tween.scrollTrigger;
        requestAnimationFrame(() => ScrollTrigger.refresh());

        return () => {
          triggerRef.current = null;
          tween.scrollTrigger?.kill();
          tween.kill();
          gsap.set(track, { clearProps: 'transform' });
          applyFocus();
        };
      });
    }).catch(() => {
      // Keep the gallery usable if the animation chunks fail to load.
      rail.style.overflowX = 'auto';
    });

    return () => {
      cancelled = true;
      rail.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', applyFocus);
      cancelAnimationFrame(frame);
      media?.revert();
      triggerRef.current = null;
    };
  }, [sceneKey, items.length]);

  useEffect(() => {
    const rail = railRef.current;
    activeRef.current = 0;
    setActiveSlide(0);
    if (rail) rail.scrollLeft = 0;
  }, [sceneKey]);

  const goToSlide = (index) => {
    const rail = railRef.current;
    const card = trackRef.current?.querySelectorAll('[data-project-scene]')[index];
    if (!rail || !card) return;
    const trigger = triggerRef.current;
    if (trigger) {
      const progress = items.length <= 1 ? 0 : index / (items.length - 1);
      const top = trigger.start + (trigger.end - trigger.start) * progress;
      window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    const left = rail.scrollLeft + card.getBoundingClientRect().left - rail.getBoundingClientRect().left;
    rail.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const onRailKeyDown = (event) => {
    if (event.target.closest('button')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); goToSlide(Math.min(activeSlide + 1, items.length - 1)); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goToSlide(Math.max(activeSlide - 1, 0)); }
  };

  return <section className="projects" id="projects">
    <div className="projects-head section-wrap">
      <SectionHeading n="03" title={t.projectsTitle} note={t.projectsNote}/>
      <span className="project-count">{String(items.length).padStart(2, '0')} <small>{t.projectUnit}</small></span>
    </div>

    <div className="project-toolbar section-wrap">
      <div className="project-filters" role="group" aria-label={t.projectsTitle}>
        {filters.map(([id, label]) => <button type="button" key={id} className={filter === id ? 'active' : ''} aria-pressed={filter === id} onClick={() => onFilter(id)}>
          {label}<span>{String(allItems.filter((item) => matchesProjectFilter(item, id)).length).padStart(2, '0')}</span>
        </button>)}
      </div>
      <span className="gallery-note">{labels.hint} <i/></span>
    </div>

    <div className="project-horizontal-stage" ref={stageRef}>
      <div className="project-scenes section-wrap" ref={railRef} tabIndex={0} role="region" aria-label={labels.rail} onKeyDown={onRailKeyDown}>
        {/* Opacity only: GSAP owns this element's transform (horizontal scroll), Framer must not touch it. */}
        <motion.div ref={trackRef} key={filter} className="project-scenes-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .32, ease: 'easeOut' }}>
          {items.map((item, index) => <ProjectScene key={item.id} item={item} index={index} total={items.length} locale={locale} t={t} active={index === activeSlide} featured={filter === 'all' && (item.featured || index === 0)} onOpen={() => onOpenProject(item)}/>) }
        </motion.div>
      </div>
      <div className="project-rail-footer section-wrap">
        <div className="project-rail-dots" role="group" aria-label={labels.controls}>
          {items.map((item, index) => <button key={item.id} type="button" className={index === activeSlide ? 'active' : ''} aria-label={`${labels.project} ${index + 1}: ${tr(item.title, locale)}`} aria-current={index === activeSlide ? 'step' : undefined} onClick={() => goToSlide(index)}/>) }
        </div>
      </div>
    </div>
  </section>;
}

function ProjectScene({ item, index, total, locale, t, active, featured, onOpen }) {
  const ct = (_group, _id, value) => tr(value, locale);
  const images = Array.isArray(item.images) ? item.images : item.image ? [item.image] : [];
  const cover = images[0];
  const title = ct('projectTitle', item.id, item.title);
  const phone = item.device === 'phone';
  const prioritiseCover = index === 0 && typeof window !== 'undefined' && window.location.hash === '#projects';

  return <article className={`project-card project-scene ${featured ? 'featured' : ''} ${phone ? 'phone-project' : ''} ${active ? 'is-active' : ''}`} data-project-scene aria-roledescription="slide" aria-label={`${index + 1} / ${total}`}>
    <div className="project-media" data-project-media data-cursor="view" onClick={onOpen}>
      <span className="project-index" data-project-number>{String(index + 1).padStart(2, '0')}<i> / {String(total).padStart(2, '0')}</i></span>
      {cover ? <div className={`project-device ${phone ? 'phone-device' : 'desktop-device'}`}>
        {phone ? <div className="phone-frame" aria-label={`${title} · phone mockup`}>
          <span className="phone-speaker" aria-hidden="true"/>
          <div className="phone-screen"><img src={cover} alt={`${title} · ${locale === 'fr' ? 'aperçu' : locale === 'de' ? 'Vorschau' : locale === 'it' ? 'anteprima' : 'preview'}`} loading={prioritiseCover ? 'eager' : 'lazy'} fetchPriority={prioritiseCover ? 'high' : 'auto'}/></div>
          <span className="phone-homebar" aria-hidden="true"/>
        </div> : <div className="desktop-monitor" aria-label={`${title} desktop mockup`}>
          <div className="desktop-frame">
            <span className="desktop-camera" aria-hidden="true"/>
            <div className="desktop-screen"><img src={cover} alt={`${title} · ${locale === 'fr' ? 'aperçu complet' : locale === 'de' ? 'vollständige Vorschau' : locale === 'it' ? 'anteprima completa' : 'full preview'}`} loading={prioritiseCover ? 'eager' : 'lazy'} fetchPriority={prioritiseCover ? 'high' : 'auto'}/></div>
          </div>
          <span className="desktop-neck" aria-hidden="true"/>
          <span className="desktop-foot" aria-hidden="true"/>
        </div>}
      </div> : <div className="project-media-type" aria-hidden="true"><span className="project-media-type-grid"/><span className="project-media-type-name">{title.split(/[·—]/)[0].trim()}</span></div>}
    </div>
    <div className="project-copy">
      <div className="project-meta"><span>{ct('projectCategory', item.id, item.category)}</span><span>{ct('projectPeriod', item.id, item.period)}</span></div>
      <div className="project-copy-grid">
        <h3>{title}</h3>
        <div className="project-copy-aside">
          <p>{ct('projectDescription', item.id, item.description)}</p>
          <div className="chips project-technologies">{item.stack.slice(0, featured ? 6 : 4).map((skill) => <span key={skill}>{skill}</span>)}</div>
          <button className="project-open" type="button" onClick={onOpen}>{t.viewProject}</button>
        </div>
      </div>
    </div>
  </article>;
}
