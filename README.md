# 🎓 COEP Scopus Intelligence Web Dashboard

Standalone HTML5, CSS3, and JavaScript Web Edition of the **COEP Scopus Research Intelligence Dashboard**. Designed for lightning-fast performance, client-side interactivity, dark/light glassmorphic UI, and 1-click hosting on **Vercel**.

---

## 🚀 How to Host on Vercel (Free & Instant)

### Option A: Via GitHub Integration (Easiest)
1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and log in.
3. Click **Add New** > **Project** and select your GitHub repository.
4. Set the **Root Directory** to `web_dashboard` (or leave as root if hosting only this directory).
5. Click **Deploy**. Vercel will build and host your site with a free SSL certificate in seconds!

### Option B: Via Vercel CLI
1. Install Vercel CLI globally:
   ```bash
   npm i -g vercel
   ```
2. Open terminal inside the `web_dashboard` folder:
   ```bash
   cd web_dashboard
   vercel
   ```
3. Follow the prompt to deploy instantly.

---

## 💻 How to Run Locally

You can preview the dashboard locally using any static web server:

### Python HTTP Server
```bash
cd web_dashboard
python -m http.server 8000
```
Open your browser at `http://localhost:8000`.

### Node.js `npx serve`
```bash
npx serve web_dashboard
```

---

## ✨ Features Included

- **Top 10 Scopus KPIs**: Real-time calculated total pubs, 2026/2025 output, citations, CPP, Q1 %, international & industry collaborations, active faculty count, and last 30 days publications.
- **Plotly.js Interactive Visualizations**:
  - Publication trend line chart
  - Department output bar chart
  - Citations accrual chart
  - Impact scatter bubble plot (CiteScore vs Citations)
  - Domestic vs International co-authorship donut chart
  - Top collaborating partner institutions bar chart
  - Journal Quartile (Q1–Q4) donut breakdown
  - SJR vs CiteScore distribution
- **Dual Theme Support**: Seamless Dark Mode (`#070F1E`) and Light Mode (`#F1F5F9`) with state persistence.
- **Faculty Leaderboard & Dossier Profiles**: Searchable faculty list with 1-click printable PDF dossier modals.
- **Live Feed Explorer**: Multi-filter live paper search with pagination.
- **Data Exporting**: Export filtered research data directly to **BibTeX (`.bib`)** or **Excel (`.csv`)**.
- **Local AI Bibliometric Copilot**: Natural language query engine for quick research analytics.

---

## 📁 File Structure

```
web_dashboard/
├── index.html                # Main HTML5 application shell
├── styles.css                # Glassmorphic CSS3 styling system (Dark/Light mode)
├── app.js                    # Client-side JavaScript data processor & Plotly visualizer
├── vercel.json               # Vercel deployment routing configuration
└── data/
    └── coep_scopus_cache.json # Verified Scopus bibliometric JSON cache
```
