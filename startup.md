# Quick Start From Repo Root
cd /path/to/nis-hack-web
npm install
npm run dev

# The command above starts:
# - Frontend Vite app
# - Backend FastAPI app (auto-picks first free port from 8000+)

# 1. Navigate to the backend directory
cd backend

# 2. Create backend env file (private keys live here)
cp .env.example .env

# 3. Activate the Python virtual environment
.\venv\Scripts\Activate.ps1

# 4. Start the FastAPI development server
uvicorn main:app --reload



# 1. Navigate to the frontend directory
cd frontend

# 2. Create frontend env file (public browser values only)
cp .env.example .env

# 3. Start the Vite development server
npm run dev

