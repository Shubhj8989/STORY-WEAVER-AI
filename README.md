# Story-Weaver AI 🪄
### Knowledge-Graph-Powered Storytelling Copilot

> *"We don't use ChatGPT to write stories. We use it to remember stories — something ChatGPT alone cannot do."*

---

## What It Does

Story-Weaver AI transforms unstructured story text into a living, structured knowledge base that enables:

- **Automatic Story Bible generation** — characters, locations, events, world rules
- **Knowledge Graph visualization** — relationships as an interactive graph
- **Continuity validation** — detect contradictions in new chapter drafts
- **RAG-powered story chat** — ask questions grounded in your actual story content
- **Event timeline** — chronological view of story events
- **Creative guidance** — character arc intelligence, style profiling, foreshadowing, and scene suggestions
- **Universe rule tracking** — worldbuilding rules flow into the Story Bible and continuity context

---

## Architecture

```
Chapter Text
    ↓
Gemini 1.5 Flash (Entity Extraction)
    ↓
Knowledge Graph (NetworkX) + Story Bible (SQLite)
    ↓
ChromaDB (Vector Embeddings for RAG)
    ↓
Continuity Engine + Story Chat
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Custom CSS (dark theme) |
| Graph Visualization | React Flow |
| Backend | Python + FastAPI |
| AI | Google Gemini 1.5 Flash |
| Vector Store | ChromaDB |
| Database | SQLite (async) |
| Knowledge Graph | NetworkX |

---

## Quick Start

### 1. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate     # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Set your Gemini API key
copy .env.example .env
# Edit .env and add your GEMINI_API_KEY
# Optional: set STORYWEAVER_ENABLE_CREATIVE_AI=true to let Gemini enhance Creative Guidance.
# By default Creative Guidance uses fast deterministic insights from the extracted Story Bible.

# Run the backend
uvicorn main:app --reload --port 8000
```

Get a free Gemini API key at: https://aistudio.google.com/app/apikey

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173
Backend API at: http://localhost:8000

---

## Demo Flow (Buildathon)

1. **Create Story** → Click "+ New" in sidebar → "Chronicles of Aryan" / Fantasy
2. **Upload Chapters 1–10** → Use `/demo_story/chronicles_of_aryan.txt`
   - Upload chapter by chapter with chapter numbers 1-10
3. **Explore Story Bible** → View auto-extracted characters, locations, events
4. **View Knowledge Graph** → Interactive relationship visualization
5. **Continuity Check** → Paste Chapter 11 content → AI detects 3 errors:
   - Eye color contradiction (brown → green)
   - Missing eye continuity error
   - Location logic inconsistency
6. **AI Chat** → Ask: "Who is Aryan?" / "What happened to his eye?" / "Who is Rustam Beg?"

---

## Key Innovation Points

1. **Persistent memory** — solves ChatGPT's context window limitation
2. **Knowledge graph over text** — enables intelligent relational queries
3. **LLM as validator** — GPT used for detection, not generation
4. **RAG grounding** — answers cite specific chapters, no hallucination
5. **Enterprise applicability** — same architecture works for legal docs, game lore, etc.

---

## Judge Q&A

**"Can ChatGPT alone do this?"**
> No. ChatGPT generates text but loses context across chapters. Story-Weaver AI maintains persistent memory through a Story Bible + Knowledge Graph, enabling long-term consistency tracking and relationship management across hundreds of pages.

**"What's the business case?"**
> Fiction authors, game narrative designers, scriptwriters, legal document consistency validation, knowledge management systems.

---

## Team
Built at Capgemini Buildathon 2025 — 5-member team
