# ConcurseiroOS: User Experience (UX) & Interface (UI) Specification
**Author:** Senior UX/UI Designer (Inspirations: Linear, Notion, Raycast, Obsidian, GitHub)  
**Aesthetic Profile:** Ultra-Minimalist, High-Focus, Charcoal Slate (Monochrome Dark), Keyboard-Driven, 0ms Latency Feel.

---

## 1. Core Visual System & Design Pillars

### 1.1. Aesthetic Influences
- **Linear:** High-density, border-only interfaces, crisp keyboard-shortcut badges, custom status indicators, split-second transition micro-animations.
- **Notion / Obsidian:** Clean markdown canvases for summaries, document annotations, distraction-free reading modes, slash-commands (`/`) for adding elements.
- **Raycast:** Command Palette-first design. Pressing `Cmd+K` (or `Ctrl+K`) opens a global commander overlay to navigate, search subjects, start timers, or generate flashcards instantly.
- **GitHub:** Study contribution grids showing study frequency (heatmaps), streak indicators, and commit-like session tracking logs.

### 1.2. Typography System
- **Primary Interface Font:** **Inter** (sans-serif) for high legibility, clean numbers, and balanced density.
- **Display Typography (Headings):** **Space Grotesk** for tech-forward, high-contrast headings that build a solid architectural voice.
- **System / Data Font:** **JetBrains Mono** for status flags, study session stopwatch counters, Pomodoro times, keybindings, and statistics.

### 1.3. Elegant Charcoal Slate (Dark Theme Specs)
We employ a custom refined dark mode that avoids oversaturated blues and uses tactical contrast boundaries to prevent visual fatigue during long nights of study:
- **Canvas Base (`bg-background`):** `#09090b` (Deep obsidian black).
- **Surface Elevation (`bg-card`):** `#18181b` (Zinc-900).
- **Borders (`border-muted`):** `#27272a` (Zinc-800) – ultra-thin `1px` crisp lines.
- **Text Primary:** `#f4f4f5` (Zinc-100).
- **Text Muted:** `#71717a` (Zinc-500).
- **Accent High-Contrast (Brand Glow):** `#3b82f6` (Sapphire Blue) or `#10b981` (Emerald Green) used sparingly for active states and correct answers.

---

## 2. Layout & Shell Architecture

The application layout is structured as an immutable **Split Screen Console** divided into three global regions: the **Command Rail (Sidebar)**, the **Focus Center (Main Viewport)**, and the **Status Bar (Footer)**.

```text
+------------------------------------------------------------------------------------+
| [⌘] Search or press (⌘K)...                     [Streak: 42 Days 🔥] [Focus Mode]  | (Topbar)
+---------------------------------------------------+--------------------------------+
|  Sidebar (Command Rail)                           |  Focus Center (Main Viewport)  |
|                                                   |                                |
|  [⊞] Dashboard                                    |  [CONCURSO ATIVO]              |
|  [☲] Ciclo de Estudos                             |  Receita Federal do Brasil     |
|  [📝] Banco de Questões                           |                                |
|  [⚡] Flashcards Ativos                           |  +--------------------------+  |
|  [📂] Biblioteca PDF                              |  |    Bento Dashboard Info   |  |
|  [💬] Coach IA                                    |  +--------------------------+  |
|                                                   |  |   Progresso Geral: 82%   |  |
|  -------------------------                        |  +--------------------------+  |
|  [⚙] Configurações                                |                                |
+---------------------------------------------------+--------------------------------+
| [● Sync: Online]                                           [Pomodoro Timer: 24:18] | (Footer)
+------------------------------------------------------------------------------------+
```

### 2.1. Topbar
- **Aesthetic:** Completely transparent, separated by an ultra-thin line. 
- **Elements:**
  - *Left:* Unified Search / Command bar input field.
  - *Right:* Activity Streaks (GitHub-style fire icon) and a togglable "Focus Mode" shortcut.

### 2.2. Command Rail (Sidebar)
- **Aesthetic:** Fixed width `240px`, zero background fills (transparent over base dark background), only vertical typography lists with clean monochrome icon pairings.
- **Active State:** Represented by a Left Border Highlight (`border-l-2 border-primary`) and a subtle typography color shift from Zinc-400 to white, with zero flashy background shapes.

### 2.3. Focus Center (Main Viewport)
- **Aesthetic:** Spaced with generous negative space, layout structured in a modular, clean **Bento Grid** container.
- **Adaptive Spacing:** Margins scale fluidly (`p-4 md:p-8 lg:p-12`) to keep contents contained and visually beautiful on any device.

---

## 3. Screen-by-Screen UX Blueprint

### 3.1. Dashboard (The Control Deck)
The primary screen centers on study performance metrics, designed to look professional, honest, and analytical:
- **Header:** Large, elegant title displaying the active target concurso and remaining days to the exam date (e.g., "Auditor RFB • 142 dias para a prova").
- **Core Widgets (Bento Cards):**
  - **Contribution Matrix:** GitHub-style grid reflecting active minutes studied per day over the past 6 months. Colored in shades of emerald green depending on density.
  - **Overall Accuracy Rate:** Recharts radial progress ring displaying the target percentage (e.g., Target: 85%, Current: 78%).
  - **Velocity Trend:** Recharts area line graph displaying time studied vs. mock questions resolved over a rolling 30-day window.

### 3.2. StudyDesk & Focus Mode (The Cognitive Sanctuary)
A split-screen environment tailored to maximum focus, designed to replicate physical table layouts:
- **Left Canvas (Documents / Materials):** High-performance PDF reader.
  - Users can highlight text to instantly convert select paragraphs into a Flashcard or ask the Coach IA for a structural explanation.
- **Right Canvas (Markdown Resumo & Sketchboard):** 
  - Rich text editor with LaTeX support for mathematical formulas.
  - Floating whiteboard overlay allowing visual notes using coordinate sketching.
- **Active Pomodoro Status:** Centered in the middle-bottom screen, gently fading out distracting side menus when active.

### 3.3. Syllabus Parser Console (Edital Inteligente)
- **Interactive Drag-and-Drop Area:** Supporting large PDFs. Includes a linear progress tracker: `Uploading ➔ Processing OCR ➔ Structuring Syllabus ➔ Ready`.
- **Structural Tree:** After extraction, the edital is rendered as an interactive table of contents (Disciplinas ➔ Assuntos ➔ Subassuntos). Users can toggle priority tags, assign estimated difficulty, and check syllabus progress.

### 3.4. ExerciseDesk (Quiz / Simulado Runner)
- **Distraction-Free Quiz Space:** Single centered question block with clear, high-density options. Options trigger custom keybindings: keys `A`, `B`, `C`, `D`, `E` to select, and `Enter` to submit.
- **Immediate Interactive Feedback:** On submission, wrong answers trigger red border highlight alerts, and correct answers pulse green.
- **AI Explanation Drawer:** Sliding panel displaying the official response analysis, followed by an automated explanation broken down into: Core Rule, Common Trap (Banca pattern), and a visual memory table.

### 3.5. Adaptive Retrieval Flashcards Runner (Active Recall Deck)
- **Minimalist Physical Card UI:** High-fidelity 3D flip animation using Framer Motion (`perspective: 1000px`).
- **Interactive Keys:** Spacebar reveals the answer only after an attempted retrieval. Keys `1`, `2`, and `3` record respectively “não recuperei”, “com esforço”, and “com fluência”. The next contact is calculated from observed history and the exam horizon; no universal fixed ladder or ease score is presented as mastery.

---

## 4. Keyboard Navigation Matrix (Raycast-Style Shortcuts)

ConcurseiroOS is optimized for mouse-free execution. Keyboard badges are visible next to actions to assist muscle memory.

| Keybinding | Action Context | UX Result |
| :--- | :--- | :--- |
| `Cmd+K` / `Ctrl+K` | **Global** | Opens the Raycast-style Action Command Palette. |
| `Spacebar` | **Flashcards** | Flips the active flashcard to reveal the answer. |
| `1` / `2` / `3` | **Flashcards** | Records failed, effortful, or fluent retrieval before consultation. |
| `A`, `B`, `C`, `D`, `E` | **Exercise Desk** | Toggles specific question answers. |
| `Cmd+Enter` | **Exercise Desk** | Submits the selected answer for review. |
| `Alt+P` | **Global** | Starts or pauses the active Pomodoro Timer. |
| `Alt+F` | **Global** | Collapses/expands all auxiliary menus to toggle Focus Mode. |
| `G` then `D` | **Navigation** | Go to Dashboard. |
| `G` then `Q` | **Navigation** | Go to Questions / Exercise Desk. |
| `G` then `F` | **Navigation** | Go to Flashcards. |

---

## 5. UI Micro-Interactions (Framer Motion Choreography)

- **Layout Transitions:** Shared layout transitions on page switching to keep UI changes fluid.
- **Active Timer Pulse:** The Pomodoro timer exhibits a soft, breathing opacity animation (`scale: [1, 1.02, 1]`) when study sessions are active, reinforcing focused concentration.
- **Success Particle System:** Answering simulated quizzes or reviewing tough cards triggers micro-confetti or positive progress bars to foster visual achievement.
