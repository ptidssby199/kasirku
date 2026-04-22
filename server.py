#!/usr/bin/env python3
"""
KasirPro Local Server
Jalankan file ini untuk membuka KasirPro di browser
"""
import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)
    
    def log_message(self, format, *args):
        pass  # Sembunyikan log request

    def end_headers(self):
        # Headers untuk PWA
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Service-Worker-Allowed', '/')
        super().end_headers()

os.chdir(DIR)

print("=" * 45)
print("  🛒  KasirPro - Local Server")
print("=" * 45)
print(f"  ✅ Server berjalan di port {PORT}")
print(f"  🌐 Buka: http://localhost:{PORT}")
print(f"  📁 Folder: {DIR}")
print("  ⛔ Tekan Ctrl+C untuk stop")
print("=" * 45)

# Buka browser otomatis
webbrowser.open(f'http://localhost:{PORT}')

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n✅ Server dihentikan")
    sys.exit(0)
except OSError:
    # Port sudah dipakai, coba port lain
    PORT = 8081
    print(f"Port 8080 sudah dipakai, mencoba port {PORT}...")
    webbrowser.open(f'http://localhost:{PORT}')
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
