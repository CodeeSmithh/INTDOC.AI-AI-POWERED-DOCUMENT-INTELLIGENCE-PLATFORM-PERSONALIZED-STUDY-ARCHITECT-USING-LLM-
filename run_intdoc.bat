@echo off
echo Starting the IntDoc.ai Secure Backend Server...
start "IntDoc API Backend" cmd /c "npm run dev:server"

echo -------------------------------------------------------------
echo Everything is set up! Starting the IntDoc.ai Web App...
echo -------------------------------------------------------------
call npm run dev
pause
