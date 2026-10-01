import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) throw new Error('Set ADMIN_PASSWORD before starting in production.');
const dataFile = path.join(root, 'data/portfolio.json');
const app = express();
const sessions = new Set();
const uploadDir = path.join(root, 'public/uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use(express.json({ limit: '4mb' }));
app.use('/uploads', express.static(uploadDir));
app.use('/media', express.static(path.join(root, 'public/media')));

const backupDir = path.join(root, 'data/backups');
const readData = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'));
// Every save first copies the current file to data/backups (the 20 most recent are kept),
// so a mistaken deletion in the back office can always be recovered.
const writeData = (value) => {
  fs.mkdirSync(backupDir, { recursive: true });
  if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, path.join(backupDir, `portfolio-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
  fs.readdirSync(backupDir).filter((f) => f.endsWith('.json')).sort().reverse().slice(20).forEach((f) => fs.unlinkSync(path.join(backupDir, f)));
  const tmp = `${dataFile}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, dataFile);
};

// Content v2: translatable fields are { fr, en, de, it }; lists are arrays of objects with unique ids.
const LISTS = ['experiences', 'projects', 'skills', 'activities', 'languages'];
const validate = (value) => {
  if (!value || typeof value !== 'object') return 'Contenu invalide.';
  if (value.version !== 2) return 'Format de contenu inattendu (version 2 attendue).';
  if (!value.profile || typeof value.profile.name !== 'string' || !value.profile.name.trim()) return 'Le nom du profil est obligatoire.';
  if (value.copy && typeof value.copy !== 'object') return 'Les textes du site sont invalides.';
  for (const key of LISTS) {
    if (!Array.isArray(value[key])) return `La liste « ${key} » est manquante.`;
    const ids = value[key].map((item) => item?.id);
    if (ids.some((id) => typeof id !== 'string' || !id)) return `Un élément de « ${key} » n’a pas d’identifiant.`;
    if (new Set(ids).size !== ids.length) return `Deux éléments de « ${key} » ont le même identifiant.`;
  }
  return null;
};
const cookieToken = (req) => (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith('portfolio_admin='))?.split('=')[1];
const isAdmin = (req) => sessions.has(cookieToken(req));
const requireAdmin = (req, res, next) => isAdmin(req) ? next() : res.status(401).json({ error: 'Authentification requise.' });

app.get('/api/portfolio', (_req, res) => res.json(readData()));
app.get('/api/auth/status', (req, res) => res.json({ authenticated: isAdmin(req) }));
app.post('/api/auth/login', (req, res) => {
  const expected = process.env.ADMIN_PASSWORD || 'chaima2027';
  const supplied = String(req.body?.password || '');
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Mot de passe incorrect.' });
  const token = crypto.randomBytes(32).toString('hex');
  sessions.add(token);
  res.setHeader('Set-Cookie', `portfolio_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.json({ authenticated: true });
});
app.post('/api/auth/logout', (req, res) => {
  sessions.delete(cookieToken(req));
  res.setHeader('Set-Cookie', 'portfolio_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ authenticated: false });
});
app.put('/api/portfolio', requireAdmin, (req, res) => {
  const value = req.body;
  const error = validate(value);
  if (error) return res.status(400).json({ error });
  writeData(value);
  res.json({ saved: true, data: value });
});
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /^(image\/|application\/pdf)/.test(file.mimetype)) });
app.post('/api/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choisis une image ou un PDF.' });
  res.json({ url: `/uploads/${req.file.filename}` });
});
app.post('/api/uploads', requireAdmin, upload.array('files', 20), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Choisis au moins une image.' });
  res.json({ urls: req.files.map((file) => `/uploads/${file.filename}`) });
});

const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Portfolio API disponible sur http://localhost:${port}`));
