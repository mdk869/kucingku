# 🐱 Kucingku

Aplikasi web untuk merekod kucing peliharaan: profil, berat, vaksin, ubat cacing, catatan kesihatan, dan jadual rawatan yang dikira secara automatik. Dalam Bahasa Melayu, direka untuk **telefon sahaja**.

> **Penafian:** jadual dan petua dalam app ini ialah panduan umum, bukan nasihat veterinar. Sahkan sentiasa dengan doktor haiwan anda.

## Ciri

- **Profil kucing:** nama, gambar, jantina, tarikh lahir (tepat atau anggaran), baka, warna/corak, no. microchip, catatan. Tema pastel biru (jantan) atau pink (betina).
- **Umur** dalam minggu, dengan bulan + hari dalam kurungan, dan **kitaran hidup** (Anak kucing, Remaja, Dewasa, Matang, Senior, Warga emas).
- **Rekod:** berat (graf pertumbuhan, unit g/kg), vaksin, ubat cacing/kutu, catatan kesihatan. Boleh edit dan padam.
- **Jadual rawatan automatik:** tarikh seterusnya dikira daripada tarikh lahir dan rekod terakhir (lihat peraturan di bawah). Dipaparkan sebagai kotak berpenanda ✓ pada profil dan senarai "Akan datang" di Utama.
- **Timbang cepat:** catat berat semua kucing sekali gus.
- **Jadual:** halaman yang mengumpulkan semua rawatan, timbang dan temujanji dalam 30 hari akan datang (Lewat, Hari ini, 7 hari, 8 hingga 30 hari).
- **Lawatan vet dan temujanji:** tarikh, masa, sebab, catatan, klinik dan kos (RM). Tarikh akan datang menjadi temujanji dan muncul dalam Akan datang dan Jadual.
- **Vet:** senarai klinik yang anda taip sendiri (telefon, alamat atau pautan peta, waktu operasi, doktor), dengan butang Telefon dan Peta. Satu klinik boleh ditanda Klinik utama, dan klinik dipilih dalam borang rekod.
- **Export PDF** untuk doktor haiwan, bertema sama dengan app, dengan sejarah penuh, klinik utama, masa dan kos lawatan.
- **Backup:** Export/Import fail JSON, atau Copy teks backup.

Versi semasa: **1.1.0** (lihat bahagian Lagi dalam app).

## Teknologi

- `index.html` untuk HTML/CSS dan `app.js` untuk JavaScript biasa. **Tiada build, tiada dependency npm semasa runtime, tiada backend.**
- Data disimpan dalam `localStorage` pelayar (kunci `kucingku-v1`), tanpa sync ke backend. Fon dan pustaka PDF menggunakan permintaan aset luaran; butang Peta membuka alamat klinik melalui penyedia peta.
- Fon: Google Fonts (Fredoka, Nunito).
- PDF: [html2canvas](https://cdnjs.com/libraries/html2canvas) 1.4.1 dan [jsPDF](https://cdnjs.com/libraries/jspdf) 4.2.1 dimuat daripada CDN hanya apabila butang Export PDF ditekan. Setiap skrip mempunyai hash Subresource Integrity (SRI); muatan yang gagal boleh dicuba semula.
- Pengendali borang/klik menggunakan event delegation tanpa JavaScript inline atau `eval`. CSP mengehadkan skrip kepada origin sendiri dan dua URL pustaka PDF; style inline masih dibenarkan untuk tema app. `vercel.json` menambah header CSP, `nosniff` dan dasar referrer. Meta CSP dalam HTML turut digunakan pada hosting statik lain.

## Jalankan secara lokal

```bash
git clone https://github.com/<username>/kucingku.git
cd kucingku
npx serve .          # atau: python3 -m http.server 8000
```

Buka di **telefon** (rangkaian Wi-Fi yang sama) atau gunakan mod peranti mudah alih dalam DevTools pelayar. **Pada desktop, app sengaja menunjukkan skrin "untuk telefon sahaja".**

## Deploy

**GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.

**Vercel:** Add New → Project → import repo ini. Framework Preset: *Other*. Kosongkan Build Command dan Output Directory.

Selepas deploy, buka pautan di telefon, kemudian **Tambah ke Skrin Utama** (iOS Safari: Kongsi → Add to Home Screen; Android Chrome: menu → Install app).

## Penyimpanan dan backup

- Data terikat pada **pelayar dan alamat (origin)**. Alamat baharu bermakna storan baharu, jadi **Export fail** dahulu sebelum menukar alamat, kemudian **Import** di alamat baharu.
- Data boleh hilang jika data pelayar dibersihkan. Buat backup berkala melalui halaman **Backup**.
- Semua data dibersihkan dan disahkan semasa dibuka dan diimport (fungsi `clean()`).
- Simpan yang gagal mengekalkan data terdahulu dan borang terbuka. Mesej kejayaan hanya dipaparkan selepas penulisan `localStorage` berjaya.
- Backup baharu mempunyai `version: 2`. Backup lama tanpa versi masih diterima; versi yang belum disokong, ID berulang, tarikh mustahil dan rujukan rekod/klinik yang hilang ditolak sebelum penggantian data. Import fail dan teks dihadkan kepada 10 MB.
- Teks profil dan catatan dikekalkan tanpa pemotongan semasa reload. Berat mesti antara 1 g hingga 30 kg; kos antara RM 0 hingga RM 1,000,000.
- Jika storan tidak dapat dibaca, app tidak menimpanya. Gunakan Export/Copy pada Backup untuk mendapatkan salinan asal sebelum mengimport backup yang sah. Fail salinan asal `.txt` ialah bahan pemulihan, bukan backup JSON yang telah disahkan.
- Rekod rawatan dan timbangan baharu mesti bertarikh hari ini atau sebelumnya. Gunakan Lawatan vet untuk temujanji masa depan. Rekod rawatan masa depan daripada backup lama dikekalkan dalam sejarah tetapi tidak digunakan untuk mengira rawatan selesai atau tarikh seterusnya.
- Mesej muat turun bermakna permintaan muat turun telah dimulakan; pelayar tidak memberi pengesahan bahawa pengguna menyimpan fail tersebut.

## Ujian

Node.js 22 atau lebih baharu diperlukan untuk menjalankan ujian; aplikasi sendiri masih boleh dihoskan secara statik.

```bash
npm test
```

Suite menggunakan skrip app sebenar dengan storan dan masa terasing. Ia merangkumi simpan/reload, kegagalan storan, import/eksport, validasi tarikh/nilai, jadual rawatan dan kandungan laporan PDF serta retry CDN. GitHub Actions menjalankannya pada setiap PR dan push ke `main`.

Semakan pelayar sebelum release: tambah/edit kucing, rekod berat, reload, cuba import tidak sah, import backup sah, serta export JSON dan PDF. Pastikan rekod, masa temujanji dan kos muncul dengan betul. Ujian terasing tidak menggantikan semakan iOS Safari/Android Chrome atau layout PDF.

Untuk menghalang merge tanpa ujian, tetapkan job `test` daripada workflow **Regression tests** sebagai required status check pada `main`. Vercel Git integration kekal mengurus preview dan deployment; workflow ini hanya menjalankan ujian dan tidak memerlukan token Vercel.

## Peraturan jadual

| Rawatan | Peraturan |
|---|---|
| Vaksin core (F3) | Dos pertama ±8 minggu. Ulang setiap 4 minggu hingga dos pada umur 16 minggu atau lebih. Booster pada 6 bulan, kemudian setiap 3 tahun. |
| Ubat cacing | Bawah 8 minggu: setiap 14 hari. Hingga 6 bulan: setiap 30 hari. Selepas itu: setiap 3 bulan. |
| Timbang berat | Bawah 8 minggu: setiap hari. Hingga 6 bulan: setiap minggu. Selepas itu: setiap bulan. |
| Vaksin rabies | Cadangan ±12 minggu. Rekod melalui tab Vaksin dengan nama "Rabies". |
| Pemandulan | Cadangan ±5–6 bulan. Ditanda secara manual. |

Peraturan ini disusun daripada panduan umum. Selang timbang berat selepas sapih dan selepas 6 bulan ialah cadangan praktikal, bukan garis panduan rasmi.

### Rujukan

- WSAVA Vaccination Guidelines: <https://pmc.ncbi.nlm.nih.gov/articles/PMC7166872/>
- ESCCAP, Worm control in cats: <https://www.esccap.org/uploads/docs/21f9zve8_0778_ESCCAP_GL1__Worm_Management_Scheme_Fact_Sheet__Cats_v8.pdf>
- CAPC / jadual ubat cacing anak kucing: <https://www.valleyvet.com/animal-health-articles/worming-schedule-for-puppies-dogs-kittens-and-cats/>
- Pemantauan berat neonat: <https://www.dvm360.com/view/evaluating-normal-neonates-proceedings-0>

## Struktur projek

```
kucingku/
├── index.html            # HTML dan CSS
├── app.js                # state, storan, jadual, UI dan PDF
├── manifest.webmanifest  # metadata PWA
├── icons/                # ikon app (192, 512, apple-touch 180)
├── tests/app.test.cjs     # ujian regresi dengan Node.js
├── package.json          # arahan ujian, tiada dependency npm
├── .github/workflows/    # ujian pada PR dan main
├── vercel.json           # konfigurasi hosting statik dan header keselamatan
├── README.md
└── .gitignore
```

## Had yang diketahui

- Hanya untuk telefon. Desktop dan tablet disekat dengan sengaja.
- Tiada notifikasi peringatan dan tiada mod luar talian (tiada service worker).
- Teks dalam PDF ialah gambar (tidak boleh dipilih atau disalin).

## Lesen

Belum ditetapkan. Tambah fail `LICENSE` mengikut pilihan anda.
