# TruthLens — AI-Generated Media Detection Platform

TruthLens is a full-stack digital forensics web platform designed to detect synthetic and AI-generated media across images, video, audio, and text. In an era where generative AI models (Midjourney, Flux, Stable Diffusion, Sora, ElevenLabs, GPT-4, Claude) produce hyper-realistic content, distinguishing truth from manipulation is critical for journalists, researchers, content moderators, and everyday citizens verifying digital information.

Unlike single-model detectors that suffer from high false-positive rates, TruthLens introduces a **Dual-Engine Consensus Architecture** combining low-level neural frequency probing with high-level multimodal semantic reasoning.

---

## 🌟 Why TruthLens Matters

- **For Journalists & Fact-Checkers**: Instantly audit user-generated media, breaking news imagery, or viral recordings before publication with traceable audit IDs.
- **For Researchers & Content Moderators**: Receive transparent, plain-language forensic explanations instead of black-box confidence scores.
- **For Everyday Citizens**: Verify suspicious images, audio clips, text documents, or social media links to protect against disinformation and scam campaigns.

---

## ⚙️ How Dual-Engine Consensus Works

TruthLens evaluates media assets through two independent detection signals operating in parallel:

1. **Sightengine GenAI Probe (~70% Weight)**: Scans low-level spatial pixel frequencies, noise distributions, spectral GAN footprints, and diffusion model artifacts. Real-world benchmark testing demonstrated Sightengine's high precision on synthetic images, making it our primary weighted signal.
2. **Google Gemini Multimodal Model (~30% Weight)**: Conducts high-level semantic, physical, and contextual reasoning (e.g., anatomical coherence, lighting physics, background geometry, reflection logic) and generates human-readable forensic explanations.
3. **Automatic Fallback Mechanism**: If Gemini is unavailable (rate-limited or offline), TruthLens automatically falls back to a 100% Sightengine-weighted assessment accompanied by an automated, rule-based forensic explanation derived from Sightengine's signal breakdown.

```
                          ┌────────────────────────┐
                          │   Media Asset Input    │
                          │ (Image / Video / Audio / Text) │
                          └───────────┬────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
                 ▼                                         ▼
   ┌───────────────────────────┐             ┌───────────────────────────┐
   │ Signal 1: Sightengine     │             │ Signal 2: Google Gemini   │
   │ GenAI Neural Probe (70%)  │             │ Multimodal Vision/LLM(30%)│
   │ • Spatial noise probe     │             │ • Semantic reasoning      │
   │ • Spectral GAN footprints │             │ • Plain-language findings │
   └─────────────┬─────────────┘             └─────────────┬─────────────┘
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    assessmentService.js       │
                      │ • 70/30 weighted consensus    │
                      │ • Automatic engine fallback   │
                      └───────────────┬───────────────┘
                                      │
                       ┌──────────────┴──────────────┐
                       ▼                             ▼
         ┌───────────────────────────┐ ┌───────────────────────────┐
         │   Supabase Postgres       │ │   TruthLens React UI      │
         │   Source-Traceable Audit  │ │ • Side-by-Side Breakdown  │
         │   analyses table          │ │ • Audit Trail Record ID   │
         └───────────────────────────┘ └───────────────────────────┘
```

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, Vite, Custom dark-mode glassmorphism design system, Lucide icons.
- **Backend**: Vercel Serverless Functions (`api/analyze.js`, `api/analyze/[id].js`).
- **Database**: Supabase (PostgreSQL `analyses` table).
- **Engine 1**: Sightengine API (`genai` model).
- **Engine 2**: Google Gemini API (`gemini-3.6-flash`).
- **Testing**: Vitest unit test suite covering scoring fusion, service mocks, and API input validation.

---

## 🔑 Environment Variables

Set the following keys in `.env` locally or in your **Vercel Dashboard > Project Settings > Environment Variables**:

| Variable | Description |
| :--- | :--- |
| `SIGHTENGINE_API_USER` | Sightengine API User ID |
| `SIGHTENGINE_API_SECRET` | Sightengine API Secret Key |
| `GEMINI_API_KEY` | Google Gemini API Key |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase Anonymous Key |

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/alan-k-albin/aidetector.git
cd aidetector
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory with the environment variables listed above.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run Test Suite
```bash
npm run test
```

### 5. Production Build
```bash
npm run build
```

---

## ⚠️ Known Limitations & MVP Tradeoffs

- **Supabase RLS Policy**: Row Level Security is currently disabled for MVP demonstration speed. Production deployment requires enabling RLS policies scoped to authenticated user sessions.
- **Text AI Detection Imprecision**: AI text detection is inherently probabilistic across the software industry due to varying human writing styles, non-native English phrasings, and model overlapping.
- **Experimental Audio & Video Probing**: Audio deepfake and video frame inspection models are experimental and provide heuristic signals rather than absolute proof.
