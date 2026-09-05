# TruthLens — AI-Generated Media Detection Platform

TruthLens is a full-stack, GenAI-powered web platform designed to detect synthetic and AI-generated media (images, audio, and video). Unlike traditional single-model detectors that suffer from high false-positive rates, TruthLens introduces a **dual-signal verification architecture** combining low-level pixel/frequency artifact analysis with high-level multimodal semantic reasoning.

---

## The Dual-Detection Reliability Approach

AI generators leave distinctive fingerprints across different levels of abstraction:
1. **Pixel Frequency & GAN/Diffusion Footprints**: Subtle noise distributions, high-frequency spectral artifacts, and generator-specific artifacts.
2. **Semantic, Anatomical & Contextual Inconsistencies**: Illogical reflections, warped background geometry, inconsistent lighting sources, and physical impossibilities.

TruthLens addresses this by orchestrating two independent AI models in parallel:

```
                          ┌────────────────────────┐
                          │   Media Asset Input    │
                          │ (Image / Video / Audio)│
                          └───────────┬────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
                 ▼                                         ▼
   ┌───────────────────────────┐             ┌───────────────────────────┐
   │ Detection Signal 1:       │             │ Detection Signal 2:       │
   │ Sightengine GenAI Model   │             │ Google Gemini Multimodal  │
   │                           │             │                           │
   │ • Frequency artifact scan │             │ • Semantic reasoning      │
   │ • Diffusion noise probe   │             │ • Cross-check consensus   │
   │ • Score: 0.0 - 1.0        │             │ • Plain-language forensic │
   └─────────────┬─────────────┘             │   explanation             │
                 │                           └─────────────┬─────────────┘
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    assessmentService.js       │
                      │ • Reliability-weighted fusion │
                      │ • Dynamic consensus scoring   │
                      │ • Conflict / anomaly detection│
                      └───────────────┬───────────────┘
                                      │
                       ┌──────────────┴──────────────┐
                       ▼                             ▼
         ┌───────────────────────────┐ ┌───────────────────────────┐
         │   Supabase Postgres       │ │   TruthLens React UI      │
         │   Persistent Audit Trail  │ │ • Side-by-Side Breakdown  │
         │   analyses table          │ │ • Confidence Meter        │
         └───────────────────────────┘ │ • Plain-Language Findings │
                                       └───────────────────────────┘
```

### Why Dual-Detection is Superior
- **Reduced False Positives**: Single detectors frequently mistake compressed or stylized authentic photography for AI art. Cross-checking pixel-level scores against semantic inspection dramatically eliminates false flags.
- **Explainability**: Rather than providing an opaque probability number, Google Gemini articulates exactly *why* the media is judged authentic or synthetic, detailing observable anomalies or genuine camera optics.
- **Fail-Safe Robustness**: If one engine experiences network disruption or rate limits, the assessment service dynamically adapts weights while flagging single-engine status to the user.

---

## Tech Stack & Architecture

- **Frontend**: React 18, Vite, Vanilla CSS (Custom dark-mode glassmorphism design system, Lucide icons).
- **Backend**: Vercel Serverless Functions (`api/analyze.js`, `api/analyze/[id].js`).
- **Database**: Supabase (PostgreSQL `analyses` table).
- **Detection Signal 1**: Sightengine API (`genai` model).
- **Detection Signal 2 + Reasoning**: Google Gemini API (multimodal flash vision).

---

## Folder Structure

```
truthlens/
├── api/
│   ├── analyze.js              # POST — runs both detections, saves to Supabase, returns result
│   └── analyze/[id].js         # GET — fetch a saved result by UUID
├── lib/
│   ├── sightengineService.js   # Calls Sightengine GenAI API (URL & multipart upload)
│   ├── geminiService.js        # Calls Gemini multimodal for independent assessment & reasoning
│   ├── assessmentService.js    # Merges both scores into reliability-weighted verdict
│   └── supabase.js             # Supabase client initialization and persistence
├── src/
│   ├── components/
│   │   ├── FileUpload.jsx      # Drag & drop upload, media link input, quick test presets
│   │   ├── AnalysisResult.jsx  # Side-by-side dual score cards, confidence meter, explanation
│   │   └── MediaPreview.jsx    # Audio, video, and image player/previewer
│   ├── pages/
│   │   ├── Home.jsx            # Landing page with scanner animation
│   │   └── Results.jsx         # Full analysis inspection & permalink retriever
│   ├── services/
│   │   └── api.js              # Frontend client service calling /api/analyze
│   ├── App.jsx                 # Main layout and view state manager
│   ├── main.jsx                # React mount entry point
│   └── index.css               # Design system, cyber-forensics theme, animations
├── package.json                # Project dependencies and build scripts
├── vite.config.js              # Vite React config with local serverless API bridge
├── vercel.json                 # Vercel deployment routing
├── .env                        # Local environment variables
└── README.md
```

---

## Environment Variables

TruthLens reads credentials via `process.env`. Set these in your `.env` file locally and in your **Vercel Project Settings > Environment Variables**:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `SIGHTENGINE_API_USER` | Sightengine API User ID | `293727023` |
| `SIGHTENGINE_API_SECRET` | Sightengine API Secret Key | `xn9k6fUZvP7PJnQSKawRdwHPxBCmf2YR` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSyA7LDeS...` |
| `SUPABASE_URL` | Supabase Project URL | `https://fmqhpqujlughgpkgbmpk.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Anonymous Key | `eyJhbGciOi...` |

---

## Getting Started

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd truthlens
npm install
```

### 2. Configure Environment
Create a `.env` file in the project root with the variables listed above.

### 3. Run Locally
TruthLens includes a built-in serverless bridge inside `vite.config.js` that executes the `/api/analyze` functions directly during local development:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## Deployment to Vercel

TruthLens is engineered to deploy seamlessly as a single Vercel project:

1. Push your repository to GitHub / GitLab.
2. Import the project in the **Vercel Dashboard**.
3. Framework Preset: **Vite** (detected automatically).
4. Add the 5 required environment variables in the Vercel dashboard.
5. Deploy! Vercel will build the frontend into static assets and deploy `/api/*` as edge/serverless functions.
