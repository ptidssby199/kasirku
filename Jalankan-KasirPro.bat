@echo off
title KasirPro Server
echo.
echo  ==========================================
echo    KasirPro - Membuka aplikasi...
echo  ==========================================
echo.

:: Cek apakah Python ada
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo  Menjalankan server dengan Python...
    python server.py
    goto end
)

:: Coba python3
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo  Menjalankan server dengan Python3...
    python3 server.py
    goto end
)

:: Python tidak ditemukan - buka langsung dengan browser
echo  Python tidak ditemukan.
echo  Membuka langsung dengan browser...
echo.
echo  CATATAN: Beberapa fitur mungkin tidak bekerja
echo  saat dibuka langsung sebagai file.
echo.
start "" "index.html"

:end
pause
