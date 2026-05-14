@echo off
echo ============================================
echo  Multimodal Agentic RAG - Backend Startup
echo ============================================
echo.

if "%GOOGLE_API_KEY%"=="" (
  echo ERROR: GOOGLE_API_KEY environment variable is not set!
  echo Please set it by running:
  echo   set GOOGLE_API_KEY=your-google-ai-studio-key
  echo.
  pause
  exit /b 1
)

cd /d "%~dp0backend"

if not exist ".venv\Scripts\activate.bat" (
  echo Creating virtual environment...
  python -m venv .venv
)

call .venv\Scripts\activate.bat

echo Installing / checking requirements...
pip install -r requirements.txt --quiet

echo.
echo Starting backend at http://localhost:8897
echo Press Ctrl+C to stop.
echo.
python server.py
