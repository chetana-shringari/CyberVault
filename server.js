require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const upload = multer({ dest: UPLOADS_DIR });

// multer storage for profile image directly into public folder
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public')),
  filename: (req, file, cb) => cb(null, 'profile.jpg')
});
const uploadProfile = multer({ storage: profileStorage });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== Crypto functions =====
function deriveKey(password, salt) {
  return crypto.scryptSync(password, salt, 32);
}

function encryptBuffer(buffer, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

function decryptBuffer(encBuffer, password) {
  const salt = encBuffer.slice(0,16);
  const iv = encBuffer.slice(16,28);
  const authTag = encBuffer.slice(28,44);
  const ciphertext = encBuffer.slice(44);
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ===== Routes =====
app.get('/', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));

app.post('/encrypt', upload.single('file'), (req,res)=>{
  try {
    const password = req.body.password;
    const file = req.file;
    if(!file) return res.status(400).json({message:'No file uploaded'});
    if(!password) return res.status(400).json({message:'No password provided'});

    const buffer = fs.readFileSync(file.path);
    const encrypted = encryptBuffer(buffer, password);
    const outPath = path.join(DATA_DIR, file.originalname + '.enc');
    fs.writeFileSync(outPath, encrypted);
    fs.unlinkSync(file.path);

    res.json({message:`File encrypted! Saved as ${file.originalname}.enc`});
  } catch(err) {
    console.error(err);
    res.status(500).json({message:'Encryption failed'});
  }
});

app.post('/decrypt', upload.single('file'), (req,res)=>{
  try {
    const password = req.body.password;
    const file = req.file;
    if(!file) return res.status(400).json({message:'No file uploaded'});
    if(!password) return res.status(400).json({message:'No password provided'});

    const buffer = fs.readFileSync(file.path);
    let decrypted;
    try { decrypted = decryptBuffer(buffer,password); }
    catch { 
      fs.unlinkSync(file.path);
      return res.status(400).json({message:'Decryption failed. Wrong password or corrupted file'}); 
    }

  // Preserve original filename (remove .enc) so decrypted files keep their original extension
  const originalName = file.originalname.replace(/\.enc$/i, '');
  const outPath = path.join(DATA_DIR, originalName + '.dec');
    fs.writeFileSync(outPath, decrypted);
    fs.unlinkSync(file.path);

    res.json({message:`File decrypted! Saved as ${path.basename(outPath)}`});
  } catch(err) {
    console.error(err);
    res.status(500).json({message:'Decryption failed'});
  }
});

// List encrypted files available in the data directory
app.get('/files', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.enc'));
    res.json({ files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not list files' });
  }
});

// Decrypt a file that already exists on the server (by filename)
app.post('/decrypt-file', express.json(), (req, res) => {
  try {
    const { filename, password } = req.body;
    if (!filename) return res.status(400).json({ message: 'No filename provided' });
    if (!password) return res.status(400).json({ message: 'No password provided' });

    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

    const buffer = fs.readFileSync(filePath);
    let decrypted;
    try { decrypted = decryptBuffer(buffer, password); }
    catch {
      return res.status(400).json({ message: 'Decryption failed. Wrong password or corrupted file' });
    }

  // Preserve original filename (remove .enc) so decrypted files keep their original extension
  const originalName = filename.replace(/\.enc$/i, '');
  const outPath = path.join(DATA_DIR, originalName + '.dec');
    fs.writeFileSync(outPath, decrypted);

    res.json({ message: `File decrypted! Saved as ${path.basename(outPath)}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Decryption failed' });
  }
});

// List decrypted (.dec) files available in the data directory
app.get('/dec-files', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.dec'));
    res.json({ files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not list decrypted files' });
  }
});

// Download a file from the data directory safely
app.get('/download', (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).send('Missing name');
    // prevent path traversal
    if (name.includes('..') || path.isAbsolute(name)) return res.status(400).send('Invalid name');
    const filePath = path.join(DATA_DIR, name);
    if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Download failed');
  }
});

// Upload profile image (saved as public/profile.jpg)
app.post('/upload-profile', uploadProfile.single('profile'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    res.json({ message: 'Profile uploaded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Get social links (server-stored)
app.get('/social', (req, res) => {
  try {
    const file = path.join(DATA_DIR, 'social.json');
    if (!fs.existsSync(file)) return res.json({ github: '', linkedin: '' });
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw || '{}');
    res.json({ github: data.github || '', linkedin: data.linkedin || '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ github: '', linkedin: '' });
  }
});

// Save social links (server-stored)
app.post('/save-social', express.json(), (req, res) => {
  try {
    const { github, linkedin } = req.body || {};
    const file = path.join(DATA_DIR, 'social.json');
    const payload = { github: github || '', linkedin: linkedin || '' };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    res.json({ message: 'Saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Save failed' });
  }
});

app.listen(PORT, ()=>console.log(`🚀 Server running on http://localhost:${PORT}`));

// Export for Vercel serverless deployment
module.exports = app;
