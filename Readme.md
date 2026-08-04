# Word Jungle 🌴

An AI-powered word puzzle game where you transform one word into another by changing one letter at a time!

**[🎮 Play Live Demo](https://word-jungle-x9dx.vercel.app/)**

---

## How to Play

Transform one word to another by changing exactly one letter at a time:

Example: **LOVE → HATE**
- LOVE → HOVE → HAVE → HATE ✅

---

## Features

- 🤖 **3 AI Algorithms** - BFS, A* Search, and Genetic Algorithm
- 📊 **Algorithm Comparison** - See which is fastest and smartest
- 💡 **Smart Hints** - Get suggestions for your next move
- 🎯 **Multiple Levels** - Easy (4 letters), Medium (5), Hard (6)

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+

### Frontend Setup
```bash
cd Word_Jungle_Project
npm install
npm run dev
```
Open: `http://localhost:3000`

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Open: `http://127.0.0.1:8000/docs`

---

## Tech Stack

- **Frontend:** React, Next.js, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Python
- **Deployment:** Vercel, Railway

---

## Algorithms Explained

### Bidirectional BFS
- Searches from start AND end simultaneously
- Guarantees shortest path
- Slower but always optimal

### A* Search
- Uses smart heuristics (Hamming distance)
- Fast and optimal
- Best for most puzzles

### Genetic Algorithm
- Evolutionary population-based approach
- Very fast
- Good for hard puzzles (doesn't guarantee shortest path)

---

## Author

**Samruddhi Jain**
- Student at NMIMS University
- GitHub: [Samruddhijain1](https://github.com/Samruddhijain1)
- Live Demo: [word-jungle-x9dx.vercel.app](https://word-jungle-x9dx.vercel.app/)

---
