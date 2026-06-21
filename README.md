# BigQuery Release Pulse

Stay up to date with the latest features, announcements, deprecations, and updates from Google Cloud BigQuery in real time. **BigQuery Release Pulse** is a sleek, modern, glassmorphic web dashboard built using a Flask Python backend and a vanilla CSS/JavaScript frontend.

---

## 🚀 Features

- **Live XML Feed Parsing**: Automatically fetches and parses Google Cloud's official BigQuery Atom release notes feed on the backend.
- **Smart Backend Caching**: Caches parsed results for 10 minutes to ensure fast load times and minimize API requests to Google Cloud.
- **Interactive Filtering & Search**:
  - Filter release notes by category: **Features**, **Changes**, **Announcements**, and **Deprecations**.
  - Instant full-text search across all notes, categories, and HTML content.
- **Modern Responsive UI**: Custom dark mode layout with glowing ambient orbs, modern typography, clean CSS Grid/Flexbox structures, and micro-animations.
- **Share Draft Composer (Twitter/X integration)**:
  - Compose shareable drafts directly from any release note card.
  - Real-time character counting that dynamically calculates Twitter's standard URL shortening (`t.co`) length.
  - Copy draft to clipboard or share/publish directly via X (Twitter).
- **Toast Notifications**: Built-in toast notifications for smooth user feedback on copy, refresh, and networking events.

---

## 🛠️ Technology Stack

- **Backend**: Python 3, [Flask](https://flask.palletsprojects.com/) (Web server & routing), [BeautifulSoup4](https://www.crummy.com/software/BeautifulSoup/) & `ElementTree` (HTML & XML parsing), `Requests` (Feed retrieval).
- **Frontend**: Plain HTML5, Vanilla CSS3 (Custom variables, CSS Grid, animations, and glassmorphism styling), Vanilla JavaScript (ES6+ state management and DOM manipulation).

---

## 📂 Project Structure

```
bq-releases-notes/
├── app.py                  # Flask web server & XML parsing engine
├── requirements.txt        # Python dependency list
├── .gitignore              # Files ignored by git (including virtualenv, caches, gh CLI)
├── templates/
│   └── index.html          # Main HTML structure with sharing modal
└── static/
    ├── css/
    │   └── style.css       # Core styling & theme design
    └── js/
        └── main.js         # Frontend application logic
```

---

## ⚙️ Setup and Installation

### 1. Prerequisites
Ensure you have **Python 3.8+** installed on your system.

### 2. Clone and Prepare the Project
```bash
# Navigate to project directory
cd bq-releases-notes

# Create a virtual environment
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate

# Install the dependencies
pip install -r requirements.txt
```

---

## 🏃 Running the Application

To run the application locally:

```bash
# Activate environment if not already done
source .venv/bin/activate

# Run the Flask app
python app.py
```

The server will start on `http://127.0.0.1:5000/`. Open this link in your browser to view the application.

---

## 💡 How It Works

1. **Feed Retrieval**: When you load the homepage or click **Refresh Feed**, the frontend calls `/api/release-notes`.
2. **Parsing & Section Division**: The Python backend fetches Google's Atom feed, parses the XML, and breaks the content down using BeautifulSoup to separate different sections (e.g., categorizing them as a Feature, Change, etc.).
3. **Responsive Display**: The UI renders these sections dynamically. You can filter them by clicking the category chips at the top or by typing query text in the search bar.
4. **Draft Generation**: Clicking the Twitter icon on any card extracts the text, loads it into a composer modal, and formats it with a link to the original release note.

---

## 📝 License
This project is open-source and free to use.
