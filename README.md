# 🛒 KasirPro - Point of Sale

## Cara Menjalankan di Komputer (Tampilan Optimal)

### Windows
1. Extract semua file ke satu folder
2. Double-click **Jalankan-KasirPro.bat**
3. Browser akan terbuka otomatis di http://localhost:8080

### Mac / Linux  
1. Extract semua file ke satu folder
2. Double-click **Jalankan-KasirPro.sh**
   (atau klik kanan → Open Terminal → ketik `./Jalankan-KasirPro.sh`)
3. Browser akan terbuka otomatis di http://localhost:8080

### Syarat
- Python 3 harus terinstall
- Download Python: https://python.org/downloads

---

## Cara Membuka Tanpa Server (Terbatas)
Double-click **index.html** — beberapa fitur terbatas (font, PWA, Service Worker)

---

## Akses Online
Buka: https://ptidssby199.github.io/kasirku

---

## Login Default
- Admin: PIN **1234**
- Kasir 1: PIN **1111**

---

## File dalam Paket
| File | Fungsi |
|------|--------|
| index.html | Halaman utama |
| app.js | Logika aplikasi |
| db.js | Database (localStorage) |
| style.css | Tampilan |
| sw.js | Service Worker (offline) |
| manifest.json | Konfigurasi PWA |
| icon-192.png | Ikon aplikasi |
| icon-512.png | Ikon aplikasi (besar) |
| server.py | Server lokal |
| Jalankan-KasirPro.bat | Launcher Windows |
| Jalankan-KasirPro.sh | Launcher Mac/Linux |
