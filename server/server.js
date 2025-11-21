require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `upload-${unique}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG/PNG files'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

const prompts = {
  headshot: `PASTE YOUR FULL Y2K HEADSHOT PROMPT HERE`,
  dolphin: `PASTE YOUR FULL DOLPHIN/UNDERWATER PROMPT HERE`,
  meadow: `PASTE YOUR FULL MEADOW/FESTIVAL PROMPT HERE`
};

app.use('/uploads', express.static(uploadsDir));

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const imageId = req.file.filename;
  const originalUrl = `/uploads/${imageId}`;
  res.json({ imageId, originalUrl });
});

app.post('/api/generate', async (req, res) => {
  try {
    const { imageId, style } = req.body;
    if (!imageId || !style) return res.status(400).json({ error: 'Missing imageId or style' });
    const uploadPath = path.join(uploadsDir, imageId);
    if (!fs.existsSync(uploadPath)) return res.status(404).json({ error: 'Image not found' });

    const imageData = fs.readFileSync(uploadPath);
    const base64Image = imageData.toString('base64');
    const textPrompt = prompts[style];
    if (!textPrompt) return res.status(400).json({ error: 'Unknown style' });

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    const prompt = [
      { text: textPrompt },
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image
        }
      }
    ];
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt
    });

    const parts = response.candidates[0].content.parts;
    const imagePart = parts.find(p => p.inlineData);
    if (!imagePart) throw new Error('No image returned');
    const styledData = imagePart.inlineData.data;

    const styledFile = `styled-${Date.now()}-${style}.png`;
    const styledPath = path.join(uploadsDir, styledFile);
    fs.writeFileSync(styledPath, Buffer.from(styledData, 'base64'));

    const styledUrl = `/uploads/${styledFile}`;
    res.json({ status: 'success', styledUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
