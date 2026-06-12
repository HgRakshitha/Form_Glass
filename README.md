# Form_Glass 🧪✨

A premium, glassmorphic passwordless survey builder clone of Typeform/Tally. Build interactive, branded surveys, share public links, and view detailed response analytics.

---

## 🚀 Live Demo & Walkthrough

- **Live Deployed App:** [Insert Deployed URL here]
---

## 🎨 Key Features

### 🛠️ Interactive Survey Builder
- **Add / Remove / Reorder:** Easily structure questions with real-time preview.
- **Multiple Question Types:**
  - Short Text & Long Text
  - Multiple Choice & Single Select
  - Rating (1–5 slider / buttons)
  - Date Picker

### 🔮 Custom Brand Visualizer
- Real-time theme customizer.
- Configurable **Primary Brand Color** (applies instantly to buttons, borders, and UI accents).
- Embeddable **Corporate Logo URL** with high-fidelity branding headers.

### 👥 Seamless Respondent Flow
- Responsive, clean, glassmorphic layout tailored to mobile and desktop browsers.
- Progressive field validation with clear indicators.
- Persisted server-side responses.

### 📊 Owner Dashboard & Analytics
- Complete list of created surveys.
- **Per-Question Analytics:** Automatic average calculations for ratings, counts, and response distribution.
- **CSV Data Export:** One-click CSV generation for downstream data analysis.

### 🔑 Secure passwordless login
- Email-based magic link login.
- **Dynamic Origin Matching:** The URL adapts dynamically to localhost or deployed environments.
- **Security Check:** Prevents magic tokens from exposing in production response payloads.

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite + TanStack Router (Client-side routing)
- **Backend:** Hono running on Cloudflare Workers
- **Persistence:** Cloudflare D1 (SQLite-compatible relational database)
- **Code Quality:** Biome (Linting & Formatting)
- **Language:** TypeScript (Strictly typed backend and frontend)

---

## 💻 Local Development

### 1. Installation
Install all dependencies at the root directory:
```bash
pnpm install
```

### 2. Database Setup
Ensure D1 local database is initialized (run migrations or bootstrap schemas):
```bash
pnpm --filter sde-intern-task-api cf-typegen
```

### 3. Run Dev Server
Launch both the API and Vite Web servers concurrently:
```bash
pnpm dev
```
- **Web App:** http://localhost:5173
- **API Worker:** http://localhost:8787

### 4. Code Quality Checks
Verify code guidelines and type safety before submitting:
```bash
pnpm check       # Runs Biome lint and format checks
pnpm typecheck   # Runs tsc compilation checks across packages
```
