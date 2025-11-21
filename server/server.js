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
  headshot: `Generate a single ultra-realistic Y2K beauty portrait, tightly cropped to the face and upper shoulders, with just a minimal hint of colorful strappy or flowy Y2K clothing. Pose at a dynamic 3/4 angle (alternating left or right from image to image), hair softly moving. Hands/nails are only shown occasionally and never as the focus.
Makeup:
Eyeshadow must be expertly blended with clear gradation, highly saturated pastel or metallic hues—lime green, lilac, pink, soft blue, or yellow—true to runway/festival styles. There should never be harsh edges or blocky color; aim for smooth transitions and a ‘halo’ effect reminiscent of 2000s star looks.
Rhinestones/gems: use an abundant number of very small, sparkling, multicoloured rhinestones, micro-gems, or tiny glitters, densely clustered near the eyes, on lids, and organically scattered at the outer corners or temples. The effect should echo fine face art/jewelers’ work, never using large or widely spaced stones; rhinestones must twinkle, not dominate.
Add fine, iridescent micro-glitter (not chunky, not obvious flecks) along the eyes and cheeks for subtle festival sheen.
Blush: true Y2K—strong, lifted and swept well past the cheeks onto the temples.
Lips: accurately replicate the shape and texture from reference images—high-contrast, juicy lips, using a visibly darker outline blended into bright, bold, glossy berry, pink, or frosty center. Finish should look maximally reflective, ‘glass lips’ effect, not soft gloss.
Brows: shaped, gently arched, softly feathered, never flat or graphic.
Skin: glowy with authentic, visible texture and highlight. Dusting of micro-glitter or shimmer on shoulders and collarbone.
Earrings:
Earrings are never the focal point or oversized statement but simply present as subtle, colorful accents.
If hoops: make them slender, shimmering or sparkly, catching light delicately—never thick or dominating.
If flowers: style as hibiscus/tropical blooms in translucent, see-through plastic, always colorful and ultra-glossy, with gentle reflection and 3D petal detail (not chunky, not opaque, not cartoonish).
Their color can be pink, blue, turquoise, purple, or other Y2K tones, always with realistic dimension—earrings should feel airy and flattering, “just there,” never drawing focus from the face.
Clothing:
Only a hint—thin, colorful straps, or occasional glimpse of flowy chiffon, iridescent, or shimmer fabric, never distracting from the main portrait.
Lighting & background:
Use direct flash or bright studio lighting. Keep the background deep or softly blurred to enhance colors and shine on both makeup and accessories.
Each portrait is unique, focusing on authentic makeup art, nuanced lip shape, dozens of tiny sparkling gems, and realistically rendered translucent flower earrings, just as in the provided references.`,
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
