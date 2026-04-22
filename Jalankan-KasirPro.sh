#!/bin/bash
# KasirPro Local Server - Mac/Linux

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8080

echo ""
echo "  =========================================="
echo "    KasirPro - Membuka aplikasi..."
echo "  =========================================="
echo ""

# Buka browser setelah 1 detik
sleep 1 && (
    if command -v xdg-open &>/dev/null; then
        xdg-open "http://localhost:$PORT"  # Linux
    elif command -v open &>/dev/null; then
        open "http://localhost:$PORT"       # Mac
    fi
) &

# Jalankan server
cd "$DIR"
if command -v python3 &>/dev/null; then
    python3 server.py
elif command -v python &>/dev/null; then
    python server.py
else
    echo "  Python tidak ditemukan!"
    echo "  Install Python dari https://python.org"
fi
