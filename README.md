# SystemX - Real-Time Accent Translation

A real-time web application that transcribes your speech and plays it back in different English accents. Built for our capstone project, SystemX uses speaker diarization to identify multiple speakers and lets you choose between American, British, Australian, and Indian accents.

## System Architecture

![System Architecture](system-architecture.png)

The application is entirely client-side, with the React frontend communicating directly with three cloud services:
- **Firebase** for authentication and storing transcripts
- **Speechmatics** for real-time speech-to-text with speaker identification
- **Azure TTS** for synthesizing speech in different accents

## Features

- **Real-time transcription** - See what you're saying as you speak
- **Speaker diarization** - Automatically identifies up to 5 different speakers (S1, S2, S3, S4, S5)
- **Multi-speaker voice assignment** - Each speaker gets a unique voice from the selected accent pool
- **Accent translation** - Convert to American, British, Australian, or Indian accents
- **Voice options** - Choose male or female voices (5 voice variants per accent/gender)
- **Transcript management** - Save, edit, rename, and delete transcripts in Firebase
- **Enhanced accuracy** - Uses Speechmatics "enhanced" mode with 3-second max delay for better context

## Tech Stack

- **Frontend**: React 19.1.1 + TypeScript 5.8.3 + Vite 7.1.7
- **Styling**: Tailwind CSS 4.1.14
- **Speech-to-Text**: Speechmatics Real-time Client 7.0.2
- **Text-to-Speech**: Azure Speech SDK 1.46.0
- **Backend Services**: Firebase 12.3.0 (Auth + Firestore)
- **Routing**: React Router 7.9.3

## Quick Start

### Prerequisites

- Node.js 22+
- A Speechmatics API key
- An Azure Cognitive Services API key
- Firebase project credentials

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd capstone-project-25t3-9900-h11a-bread
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   ```
   VITE_SPEECHMATICS_API_KEY=your_speechmatics_key
   VITE_AZURE_SPEECH_API_KEY=your_azure_key
   VITE_AZURE_REGION=eastus
   VITE_FIREBASE_API_KEY=your_firebase_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Docker Setup

### Development

```bash
cd frontend
docker-compose up systemx-dev
```

Runs on `http://localhost:3000` with hot reload enabled.

### Production

```bash
cd frontend
docker-compose --profile production up systemx-prod
```

Runs on `http://localhost:8080` served by Nginx.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Home.tsx              # Main app logic (707 lines)
│   │   ├── Login.tsx             # Login page
│   │   ├── NotesPage.tsx         # Saved transcripts viewer
│   │   ├── AccentDropdown.tsx    # Accent/gender selector
│   │   ├── Button.tsx            # Reusable button
│   │   └── Header.tsx            # App header
│   ├── context/
│   │   └── AuthContext.tsx       # Firebase auth state
│   ├── firebase/
│   │   └── firebase.ts           # Firebase config
│   ├── hooks/
│   │   ├── useAuth.ts            # Auth hook
│   │   └── useTranscripts.ts     # Firestore operations
│   └── App.tsx                   # Main app component
├── public/
│   └── audio-processor.js        # Audio worklet for processing
├── Dockerfile                    # Production image
├── Dockerfile.dev                # Development image
├── docker-compose.yml            # Docker orchestration
└── package.json                  # Dependencies
```

## How It Works

1. **Audio Capture**: Browser captures audio at 16kHz using Web Audio API
2. **Processing**: Audio is chunked into 20ms frames by an AudioWorklet
3. **Transcription**: Frames stream to Speechmatics WebSocket API (enhanced mode, 3s max delay), which returns transcripts with speaker labels
4. **Speaker Voice Assignment**: Each new speaker gets assigned a unique voice from the selected accent/gender pool (rotates through 5 available voices)
5. **Sentence Detection**: Words buffer until punctuation (`.`, `!`, `?`) is detected
6. **Synthesis**: Complete sentences are sent to Azure TTS with the speaker's assigned voice (non-blocking)
7. **Playback**: Synthesized audio plays through a separate AudioContext to prevent interference

### Key Implementation Details

**Multi-Speaker Voice Assignment**: When a new speaker is detected, they're automatically assigned the next available voice from the accent pool. For example, with American Male selected: S1 gets "Guy", S2 gets "Davis", S3 gets "Tony", etc. This assignment persists throughout the session, and the UI displays each speaker's voice (e.g., "S1 (Guy):").

**Speaker Diarization**: Speechmatics identifies up to 5 speakers and returns labels (S1, S2, S3, S4, S5). We merge consecutive utterances from the same speaker and color-code them (S1=blue, S2=green, S3=purple, S4=orange, S5=pink).

**Echo Prevention**: Browser's built-in echo cancellation is disabled to avoid interference with our real-time processing.

Soon-to-be implemented: Headphones mode (no mute when AI voice is speaking) and Speaker mode (mutes when AI voice is speaking)

**De-duplication**: We track processed message IDs from Speechmatics and normalize text to prevent speaking the same sentence twice.

**Non-Blocking TTS**: Speech synthesis runs asynchronously without blocking transcription processing, ensuring smooth real-time performance even during playback.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Support

Only works on **Chrome** and **Edge** due to AudioWorklet API requirements.

## Known Limitations

- Requires stable internet connection
- 1-3 second latency due to STT + TTS processing
- API costs (Speechmatics charges per hour, Azure per character)
- Transcription quality depends on microphone and background noise

## Why No Backend?

We originally had a Python FastAPI backend for noise reduction and proxying Speechmatics, but removed it to simplify deployment. The Speechmatics and Azure SDKs work great in the browser, eliminating the need for a server. This also means:
- ✅ Simpler deployment (just static hosting)
- ✅ No server costs
- ✅ Faster development
- ⚠️ API keys in client environment (fine for a demo)

For production, you'd want a thin backend to protect API keys and add usage tracking.

## Team

Capstone Project 25T3-9900-H11A-BREAD

## License

This project is for academic purposes.
