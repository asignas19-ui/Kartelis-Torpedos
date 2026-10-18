@echo off
title Standoff 2 - Tournament Verifier PC Server
cd /d "%~dp0"
echo Paleidziamas Tournament Verifier Serveris...
start http://localhost:8080
python server.py
pause
