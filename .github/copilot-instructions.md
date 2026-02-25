# UjuziAI - Project Instructions

## Tech Stack
- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Architecture**: Agent-based (ADK, MCP, A2A)
- **State Management**: React Context + Custom Hooks

## Project Structure
- `/src` - React frontend application
- `/functions` - Firebase Cloud Functions (backend)
- `/firestore.rules` - Security rules
- `/docs` - Documentation

## Development
- Run `npm run dev` for local development
- Run `cd functions && npm run serve` for functions emulator
- Run `npm run build` for production build

## Conventions
- Use functional components with hooks
- Use TailwindCSS for styling
- All API calls go through Firebase Functions
- Agent logic lives in `/functions/src/agents/`

