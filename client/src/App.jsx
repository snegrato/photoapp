import { useState } from "react";
import { useDropzone } from "react-dropzone";
import CheckIcon from "@mui/icons-material/Check";
import axios from "axios";
import "./App.css";

// === PROMPT STYLE NAMES ===
const stylePrompts = [
  { id: "headshot", name: "Headshot", emoji: "💅", desc: "Glitter Portrait" },
  { id: "dolphin", name: "Dolphin", emoji: "🐬", desc: "Tropical Mermaid" },
  { id: "meadow", name: "Meadow", emoji: "🧚", desc: "Meadow Fairy" },
];

// === MAIN APP ===
export default function App() {
  // App state
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null); // for upload
  const [selectedStyle, setSelectedStyle] = useState("headshot");
  const [genImage, setGenImage] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // HANDLERS
  const onDrop = accepted => {
    if (!accepted.length) return;
    setError("");
    setImageFile(accepted[0]);
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(accepted[0]);
    setStep(2);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  });

  // UPLOAD to BACKEND
  async function uploadAndGenerate() {
    try {
      setLoading(true);
      setError("");
      setGenImage(null);

      // Upload image first
      const form = new FormData();
      form.append("image", imageFile);
      const uploadRes = await axios.post("/api/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      const imageId = uploadRes.data.imageId;

      // Call AI generate endpoint
      const generateRes = await axios.post("/api/generate", { imageId, style: selectedStyle });
      const styledUrl = generateRes.data.styledUrl;

      setGenImage(styledUrl);
      setStep(3);
    } catch (err) {
      setError("Failed to generate image: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }

  // DISPLAY COMPONENTS
  function UploadStep() {
    return (
      <div className="upload-container">
        <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`}>
          <input {...getInputProps()} />
          <div className="dropzone-content">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="dropzone-text">{isDragActive ? "Drop your photo here" : "Drag & drop your photo here"}</p>
            <p className="dropzone-subtext">or click to browse</p>
            <p className="dropzone-hint">JPEG or PNG, max 10MB</p>
          </div>
        </div>
        {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
      </div>
    );
  }

  function StyleStep() {
    return (
      <div>
        <div className="style-grid" style={{ display: "flex", gap: 24, justifyContent: "center" }}>
          {stylePrompts.map((s) => (
            <div key={s.id} className={`style-card ${selectedStyle === s.id ? "selected" : ""}`} onClick={() => setSelectedStyle(s.id)}>
              <div style={{ fontSize: 48, background: "#FFF0F5", borderRadius: 8, margin: "0 auto 10px", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.emoji}</div>
              <h3>{s.name}</h3>
              <div style={{ fontSize: 14, color: "#999" }}>{s.desc}</div>
              <input type="radio" name="style" checked={selectedStyle === s.id} readOnly />
            </div>
          ))}
        </div>
        <button
          className="generate-btn"
          style={{
            display: "block", margin: "32px auto 0", padding: "16px 32px", background: "white", color: "#FF1493",
            fontWeight: 600, borderRadius: 50, fontSize: 18, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: "none"
          }}
          onClick={uploadAndGenerate}
          disabled={isLoading}
        >Generate Picture</button>
        {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
      </div>
    );
  }

  function ResultStep() {
    return (
      <div>
        {isLoading
          ? (<div style={{ textAlign: "center", margin: "48px 0" }}>
              <div className="spinner" />
              <p style={{ color: "white" }}>Generating your Y2K masterpiece...</p>
              <p className="loading-time">Estimated time: ~25 seconds</p>
            </div>)
          : (<>
              <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 32 }}>
                <div className="image-box">{image && <><img src={image} alt="Original" className="result-image" /><p className="image-label">Original</p></>}</div>
                <div className="image-box">{genImage && <><img src={genImage} alt="Styled" className="result-image" /><p className="image-label">Styled</p></>}</div>
              </div>
              <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
                <a href={genImage} className="action-btn download-btn" style={{ textDecoration: "none" }} download={`y2k-${Date.now()}.png`}>Download</a>
                <button className="action-btn secondary-btn" onClick={() => setStep(2)}>Change Style</button>
                <button className="action-btn secondary-btn" onClick={() => { setImage(null); setGenImage(null); setStep(1); setImageFile(null); }}>New Photo</button>
              </div>
            </>)}
        {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1 className="title">Midnight Sun Photo</h1>
          <p className="subtitle">Transform any photo into the Midnight Sun tour aesthetic</p>
          <div className="progress-steps">
            {[1,2,3].map((n,i) => (
              <span key={i}>
                <div className={`step-item`}>
                  <div className={`step-circle ${step>=n ? "active" : ""}`}>
                    {step>n ? <CheckIcon sx={{ fontSize: 20 }}/> : n}
                  </div>
                  <span className="step-label">{["Upload","Style","Result"][i]}</span>
                </div>
                {i<2 && <div className={`step-line ${step>n ? "active" : ""}`}/>}
              </span>
            ))}
          </div>
        </div>
        <div className="content">
          {step===1 && <UploadStep />}
          {step===2 && <StyleStep />}
          {step===3 && <ResultStep />}
        </div>
      </div>
    </div>
  );
}
