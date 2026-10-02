# Chaima Cherif · Portfolio

Portfolio personnel avec site public et espace de gestion. Le contenu est enregistré dans `data/portfolio.json`; le back-office permet de modifier le profil, les expériences, les projets, les technologies, les activités et les langues, et d’importer des médias.

## Démarrer en local

```sh
npm install
npm run dev
```

Le site est servi sur `http://localhost:5173` et l’espace de gestion sur [`http://localhost:5173/admin`](http://localhost:5173/admin). En développement. Changez-le avant tout déploiement en définissant `ADMIN_PASSWORD` dans l’environnement du serveur.

## Contenu et traductions

Tout le contenu du site vit dans `data/portfolio.json` (format `version: 2`) et se modifie depuis `/admin` :

- chaque texte traduisible est un objet `{ fr, en, de, it }` ; une traduction vide retombe sur le français ;
- `profile` (identité, statut, badges du hero, à propos, formation, fichiers), `copy` (titres et phrases des sections), `experiences`, `projects` (filtres `groups`, mockup `device`, images), `skills`, `activities`, `languages` ;
- l’ordre des listes dans le JSON est l’ordre d’affichage sur le site.

`src/i18n.js` ne contient plus que les libellés d’interface (menus, boutons). Chaque enregistrement depuis le back-office sauvegarde d’abord la version précédente dans `data/backups/` (20 dernières conservées).

## Déploiement

Construire le front avec `npm run build`, puis lancer `npm start` avec `NODE_ENV=production` et un `ADMIN_PASSWORD` fort. Le serveur sert le site compilé, l’API, et les fichiers de `public/uploads`. Conservez `data/portfolio.json` et `public/uploads` sur un stockage persistant. Le serveur doit pouvoir écrire dans ces deux emplacements.

Les animations utilisent GSAP/ScrollTrigger, Lenis, Framer Motion et une scène Three.js légère. Pour le contenu média, les fichiers déjà présents dans `public/media` sont disponibles dans le back-office par chemin, et les nouveaux fichiers importés sont ajoutés à `public/uploads`.
