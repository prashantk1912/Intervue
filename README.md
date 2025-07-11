# Video Interview Platform

A real-time video conferencing and collaborative code editor platform for technical interviews.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Deployed%20App-blue?style=for-the-badge&logo=vercel)](https://video-interview-platform-app.web.app)

---

## Features
* Firebase Authentication (Email/Password, Google Sign-In)
* Real-time video/audio calls powered by Stream.io
* Collaborative code editor with language selection (C++, Python)
* Room creation and joining functionality
* Responsive UI

## Technologies Used
* **Frontend:** React, TypeScript, Vite, Tailwind CSS, Monaco Editor, Stream Video SDK, Lucide React
* **Backend:** Python, Flask, PyJWT, Flask-Cors, Gunicorn
* **Database/Auth:** Google Firebase (Authentication, Firestore)
* **Deployment:** Render (Backend), Firebase Hosting (Frontend)

## Setup and Local Development

### Prerequisites
* Node.js (v18+)
* npm (v9+)
* Python (v3.8+)
* pip
* Git

### 1. Clone the Repository
```bash
git clone https://github.com/prashantk1912/video-interview-platform.git
cd video-interview-platform 
```

### 2. Backend Setup
* Install Python Dependencies:

```bash
pip install Flask Flask-Cors PyJWT python-dotenv gunicorn
```

* Create .env file: In the project root, create a .env file and add your Stream API Secret:

```bash
STREAM_API_SECRET=YOUR_STREAM_API_SECRET_FROM_STREAM_DASHBOARD
```

* Run Backend Locally:

```bash
python backend.py 
```

(This will run on http://localhost:5000)

### 3. Frontend Setup
* Install Node.js Dependencies:

```bash
npm install 
```

* Run Frontend Locally:

```bash
npm run dev 
```

(This will run on http://localhost:5173)

### 4. Firebase Hosting Setup (for Deployment)
* Install Firebase CLI:

```bash
npm install -g firebase-tools
```

* Login to Firebase:

```bash
firebase login
```

* **Initialize Firebase Hosting (in project root):**
  ```bash 
  firebase init hosting 
  ```
* Follow prompts:
  # - Use an existing project: Select 'video-interview-platform-app'
  # - Public directory: dist
  # - Configure as single-page app: Yes
  # - Set up automatic builds: No

* Build Frontend for Production:

```bash
npm run build 
```

* Deploy Frontend:

```bash
firebase deploy --only hosting 
```
## Deployment Links
* **Live Frontend:** [https://video-interview-platform-app.web.app](https://video-interview-platform-app.web.app)
* **Live Backend (Render):** [https://intervue-da2p.onrender.com](https://intervue-da2p.onrender.com)
---