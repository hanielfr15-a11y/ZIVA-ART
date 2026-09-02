@echo off
title ZIVA ART - Servidor Local
echo Iniciando servidor local da ZIVA ART...
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause