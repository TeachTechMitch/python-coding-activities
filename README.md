# 🐍 Python Functions — Interactive Lesson

**Year 9–10 Digital Technology | Canvas LMS Embeddable Page**

A fully interactive lesson page covering Python functions, designed to be hosted on **GitHub Pages** and embedded in **Canvas LMS**. Students work through lesson content and activities side-by-side; their results are saved automatically to this repository.

---

## 📋 What's Included

| File | Purpose |
|------|---------|
| `index.html` | Main lesson page (login + lesson + completion screens) |
| `style.css` | All styling — dark editorial theme |
| `app.js` | All JavaScript logic (activities, Python runner, GitHub saving) |
| `questions.json` | All lesson content — edit this to change questions |
| `responses/` | Student submission files are saved here automatically |

---

## 🚀 Quick Setup (5 minutes)

### Step 1 — Fork or clone this repo

Click **Fork** (top right on GitHub) to create your own copy.

### Step 2 — Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under Source: select `Deploy from a branch` → `main` → `/ (root)`
3. Click **Save**. Your page will be live in ~2 minutes at:
   `https://YOUR-USERNAME.github.io/python-coding-activities/`

### Step 3 — Create a Personal Access Token

1. GitHub → Your profile → **Settings** → **Developer settings** → **Tokens (classic)**
2. **Generate new token (classic)**
3. Name: `canvas-lesson-writer` | Scope: ✅ `repo`
4. Copy the token immediately (you won't see it again)
5. Set a calendar reminder to renew it before it expires

### Step 4 — Add your token to `app.js`

Open `app.js` and edit the top 3 lines:

```javascript
const GITHUB_USERNAME = "your-github-username";
const GITHUB_REPO     = "python-coding-activities";
const GITHUB_TOKEN    = "ghp_your_token_here";
```

Commit the change.

### Step 5 — Embed in Canvas

In your Canvas course, go to **Pages** or **Modules** → HTML Editor → paste:

```html
<iframe
  src="https://YOUR-USERNAME.github.io/python-coding-activities/"
  width="100%"
  height="800"
  style="border: none; border-radius: 8px;"
  title="Python Functions Lesson">
</iframe>
```

---

## 📊 Viewing Student Results

Each submission creates a JSON file in `responses/` named:
`student_12345_1718000000000.json`

**Example file:**
```json
{
  "studentId": "12345",
  "submittedAt": "2025-08-14T09:32:11.000Z",
  "lesson": "Python Functions — From Zero to Hero",
  "score": { "correct": 9, "total": 12, "percent": 75 },
  "responses": {
    "mc1a": { "answer": "To reuse a block of code...", "correct": true, "timestamp": "..." },
    "cr4b": { "answer": "def fizzbuzz(n):\n...", "correct": true, "timestamp": "..." }
  }
}
```

**Bulk download all responses:**
```bash
gh repo clone YOUR-USERNAME/python-coding-activities
# All JSON files are in responses/
```

---

## ✏️ Editing Questions

All lesson content lives in `questions.json`. You can:
- Edit existing questions/answers
- Add more `activities` to any unit array
- Add a new unit by adding to the `units` array

Activity types:
- `"multiple_choice"` — pick one of four options
- `"fill_blank"` — type the missing code
- `"code_runner"` — write and run real Python (tested against expected output)

Changes go live as soon as you commit — no rebuild needed.

---

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank iframe in Canvas | Ask admin to whitelist `github.io` in Canvas Security Settings |
| "Save failed" on submit | Regenerate PAT and update `app.js` |
| Python says "still loading" | Wait 10–15 sec — Pyodide (~10MB) loads from CDN |
| No files in `responses/` | Check `GITHUB_USERNAME`, `GITHUB_REPO`, and token in `app.js` |

---

## 📚 Lesson Coverage

| Unit | Topic | Activities |
|------|-------|-----------|
| 1 | What is a Function? | 2× MC, 1× Fill, 1× Code |
| 2 | Parameters & Arguments | 1× MC, 2× Fill, 1× Code |
| 3 | Return Values | 2× MC, 1× Fill, 1× Code |
| 4 | Scope & Real-World Functions | 1× MC, 1× Fill, 2× Code (incl. FizzBuzz) |

---

*Built for Year 9–10 Digital Technology*
