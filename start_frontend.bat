@echo off
echo ============================================
echo  Multimodal Agentic RAG - Frontend Startup
echo ============================================
echo.

cd /d "%~dp0frontend"

if not exist "node_modules" (
  echo Installing npm packages... (first time only)
  npm install
)

echo.
echo Starting frontend at http://localhost:5177
echo Press Ctrl+C to stop.
echo.
npm run dev -- --port 5177
