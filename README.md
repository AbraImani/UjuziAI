# UjuziAI

> Build with AI Season — Learning Platform with Agent-Based Architecture

A production-ready web application for AI skill certification featuring hands-on codelabs, proctored exams, verifiable badges, and an intelligent agent-based backend.

---

## ✨ Features

### 🔐 Authentication
- Email/password authentication via Firebase Auth
- Unique user profiles with progress tracking
- Role-based access (student/admin)

### 🏆 Leaderboard
- 8 Build with AI season modules
- External codelab links with completion tracking
- Proof submission (images, video/link, structured description)
- Admin-validated submissions

### 📊 Progress System
- Progress based on exam & submission validation
- "Completed" badge when score ≥ 6/10
- Unique verifiable badge IDs
- Downloadable PDF certificates
- Social sharing (LinkedIn/X)
- Global leaderboard (Top 10)
- User rank display

### 🧪 Examination System
- 7 MCQ (25-30s each) + 3 open-ended (5min each)
- Question-by-question, no back navigation
- Auto-advance on timer expiry
- Maximum 2 attempts per module
- Passing score: 6/10
- Dynamic question generation with concept variation

### 🛡 Anti-Cheat Intelligence
- AI-generated content detection
- Copy-paste pattern detection
- Generic/vague response flagging
- Semantic depth analysis
- Warning → Zero escalation

### 🤖 Agent Architecture
| Agent | Protocol | Role |
|-------|----------|------|
| Question Generator | ADK | Dynamic question pools with concept variation |
| Evaluation Agent | A2A | MCQ grading + open response evaluation |
| Anti-Hallucination | A2A | Cross-checks answers against codelab context |
| Ranking Agent | A2A | Leaderboard + cumulative score calculation |

### 🛠 Admin Panel
- Open/close codelabs
- Monitor and validate submissions
- View user attempts and scores
- Override exam locks
- System settings management

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Firebase (Auth, Firestore, Storage, Functions) |
| Architecture | ADK + MCP + A2A agent system |
| UI Icons | Lucide React |
| Notifications | React Hot Toast |
| Certificates | html2canvas + jsPDF |

---

## 📁 Project Structure

```
UjuziAI/
├── src/                          # React frontend
│   ├── components/               # Reusable UI components
│   │   ├── Layout.jsx           # App shell with sidebar
│   │   ├── ModuleCard.jsx       # Module display card
│   │   ├── SubmissionForm.jsx   # Proof upload form
│   │   ├── ExamInterface.jsx    # Exam question interface
│   │   └── ProgressRing.jsx     # Circular progress indicator
│   ├── pages/                    # Route pages
│   │   ├── Landing.jsx          # Public landing page
│   │   ├── Login.jsx            # Authentication
│   │   ├── Signup.jsx           # Registration
│   │   ├── Dashboard.jsx        # Main learning dashboard
│   │   ├── ModuleDetail.jsx     # Module view + submission
│   │   ├── Exam.jsx             # Exam flow controller
│   │   ├── Leaderboard.jsx      # Top 10 rankings
│   │   ├── Profile.jsx          # User profile + badges
│   │   ├── Certificate.jsx      # Certificate + sharing
│   │   └── AdminPanel.jsx       # Admin management
│   ├── contexts/                 # React context providers
│   │   └── AuthContext.jsx      # Authentication state
│   ├── hooks/                    # Custom hooks
│   │   └── useFirestore.js      # Firestore operations
│   ├── lib/                      # Firebase initialization
│   │   └── firebase.js
│   ├── config/                   # App configuration
│   │   ├── firebase.config.js   # Firebase credentials
│   │   └── modules.js           # Module definitions
│   ├── App.jsx                   # Router + providers
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles + Tailwind
│
├── functions/                    # Firebase Cloud Functions
│   └── src/
│       ├── index.js             # Function exports
│       └── agents/              # Agent-based backend
│           ├── orchestrator.js  # ADK/MCP/A2A coordination
│           ├── questionGenerator.js  # Dynamic question generation
│           ├── evaluation.js    # Grading + anti-cheat
│           ├── antiHallucination.js  # Context verification
│           └── ranking.js       # Leaderboard management
│
├── docs/                         # Documentation
│   ├── FIRESTORE_SCHEMA.md      # Database design
│   ├── AGENT_ARCHITECTURE.md    # Agent system docs
│   └── DEPLOYMENT.md            # Deployment guide
│
├── firestore.rules               # Firestore security rules
├── storage.rules                 # Storage security rules
├── firebase.json                 # Firebase project config
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind configuration
└── package.json                  # Dependencies
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`

### Setup
```bash
# Install dependencies
npm install
cd functions && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your Firebase project config

# Start development
npm run dev
```

### Firebase Emulators (optional)
```bash
# Set VITE_USE_EMULATORS=true in .env
cd functions && npm run serve
```

---

## 📖 Documentation

- [Firestore Schema](docs/FIRESTORE_SCHEMA.md) — Database design and security model
- [Agent Architecture](docs/AGENT_ARCHITECTURE.md) — ADK/MCP/A2A system documentation
- [Deployment Guide](docs/DEPLOYMENT.md) — Step-by-step deployment instructions

---

## 🔒 Security

- Firestore rules enforce read/write permissions per user
- Server-side validation for all critical operations
- Attempt counter enforced in Cloud Functions
- Exam re-entry prevented after max attempts
- Badge verification via unique IDs
- Storage rules limit file types and sizes

---

## License

MIT

