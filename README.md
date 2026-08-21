Project: Voice-Guided Loan Application (Local Demo)

This workspace contains a small static front-end and a minimal Node/Express backend to accept submissions and generate a PDF.

Files added/updated:
- `index.html` — UI (buttons added)
- `style.css` — existing styles
- `script.js` — front-end logic, validation, Web Speech API fallback, submit/download
- `server.js` — minimal Express server with `/api/submit` and `/api/generate-pdf`
- `package.json` — dependencies and start script

Quick start (Windows PowerShell):

1) Install Node.js (if not installed). Then in the project folder run:

```powershell
cd 'C:\Users\Dharunya R\Downloads\aam'
npm install
npm start
```

2) Serve the front-end locally (open in browser) — recommended to use a simple server so microphone permissions work on `localhost`:

```powershell
# Option A: Python simple HTTP server
python -m http.server 8000
# Then open http://localhost:8000 in Chrome/Edge

# Option B: use Live Server extension in VS Code or any static server
```

3) Use the app in Chrome/Edge (recommended):
- Click `Start Guide` and follow the prompts.
- Use `Speak Now / Submit Text` to use microphone (browser will request permission) or fallback to text prompt.
- When the form is complete, click `Submit To Server` to save the data (written to `submissions.json`).
- Click `Download PDF` to generate and download a PDF of the submission from the server, or `Print` to open a print window.

Troubleshooting:
- If microphone doesn't respond, ensure the browser has microphone permission and you're on `localhost` or HTTPS.
- If `Submit` or `Download PDF` fails, make sure the server is running (`npm start`) and accessible at `http://localhost:3000`.

If you'd like, I can:
- Switch the server to save files in a proper database (SQLite / MongoDB).
- Add server-side validation and authentication.
- Add richer PDF layout and a signature placeholder.