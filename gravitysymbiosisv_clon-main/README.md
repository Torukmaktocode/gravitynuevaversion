# GRAVITY SYMBIOSIS

A full-stack web application using **Vite (Frontend)** and **Flask (Backend)** with **Supabase** and **OpenAI** integration.

---

# Technical Stack

**Frontend**

* Vite
* JavaScript
* Supabase JS

**Backend**

* Flask
* Flask-CORS
* OpenAI API
* Python-dotenv
* Gunicorn

---

# Overview

This project is structured as a **frontend** and **backend** separated architecture:

```
project/
├── frontend/        # Web application (Vite)
├── backend/         # Flask API
├── docs/            # Project documentation
├── README.md
└── .gitignore
```

---

# Documentation

Complete project documentation can be found in the **docs** folder:

* [Alfred Results](docs/ALFRED_RESULTS.md)
* [Technical Documentation](docs/GRAVITY_SYMBIOSIS_TECHNICAL_DOCUMENTATION.md)
* [Test Report](docs/REPORTE_PRUEBAS_COMPLETO.md)
* [Responsive Optimization](docs/RESPONSIVE_OPTIMIZATION.md)

---

# Installation

## 1. Clone the repository

```
git clone <repo>
cd project
```

---

## 2. Backend (Flask)

```
cd backend
python -m venv .venv
source .venv/bin/activate   # Linux / Mac
.venv\Scripts\activate      # Windows

pip install -r requirements.txt
python app.py
```

Backend available at:

```
http://localhost:5000
```

---

## 3. Frontend (Vite)

```
cd frontend
npm install
npm run dev
```

Frontend available at:

```
http://localhost:5173
```

---

# Environment Variables

Create a `.env` file in the backend folder with the required variables:

```
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

---


# Useful Scripts

**Frontend:**

```
npm run dev
npm run build
npm run preview
```

**Backend (production):**

```
gunicorn app:app
```

---

# License
MIT
