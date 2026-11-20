# 🐱 Kucingku

Aplikasi web untuk merekod kucing peliharaan: profil, berat, vaksin, ubat cacing, catatan kesihatan, dan jadual rawatan yang dikira secara automatik. Dalam Bahasa Melayu, direka untuk **telefon sahaja**.

> **Penafian:** jadual dan petua dalam app ini ialah panduan umum, bukan nasihat veterinar. Sahkan sentiasa dengan doktor haiwan anda.

## Ciri

- **Profil kucing:** nama, gambar, jantina, tarikh lahir (tepat atau anggaran), baka, warna/corak, no. microchip, catatan. Tema pastel biru (jantan) atau pink (betina).
- **Umur** dalam minggu, dengan bulan + hari dalam kurungan, dan **kitaran hidup** (Anak kucing, Remaja, Dewasa, Matang, Senior, Warga emas).
- **Rekod:** berat (graf pertumbuhan; unit g/kg mengikut Setting), vaksin, ubat cacing/kutu, catatan kesihatan. Boleh edit dan padam.
- **Jadual rawatan automatik:** tarikh seterusnya dikira daripada tarikh lahir dan rekod terakhir (lihat peraturan di bawah). Dipaparkan sebagai kotak berpenanda ✓ pada profil dan senarai "Akan datang" di Utama.
- **Jagaan rutin (v1.9.1):** tab *Jagaan* dalam profil kucing untuk potong kuku, mandi, bersih telinga, gosok gigi, rawatan kutu, sikat bulu atau jagaan sendiri, dengan kekerapan (setiap hari hingga setiap 3 bulan). Butang *Selesai* mengemas kini tarikh terakhir; *Batal selesai* memulihkannya pada hari yang sama. Jagaan yang sampai tarikh atau lewat muncul dalam Fokus hari ini, Akan datang dan Jadual, dan disenaraikan dalam PDF vet. Disimpan dalam `c.care` (ikut backup).
- **Kemas kini app (v1.9.1):** versi baharu dimuat turun di latar tetapi **tidak dipasang sendiri**. Popup *Versi baharu tersedia* menyenaraikan perubahan (Baharu / Lebih baik / Dibaiki) dengan butang *Kemas kini sekarang* dan *Nanti*; Nanti meninggalkan bar kecil di atas menu bawah, dan popup keluar semula pada pembukaan seterusnya. Selepas kemas kini, *Kucingku dah dikemas kini* dipaparkan sekali. Senarai penuh: Setting → Tentang → *Senarai perubahan*. App menyemak versi baharu bila dibuka dan bila kembali ke app.
- **Ringkasan kesihatan (v1.9.2):** peraturan tetap, tanpa AI (`hAlerts` dalam `app.js`). Amaran merah: berat turun 3 kali berturut-turut, turun lebih 10% dalam 30 hari, atau naik lebih 15% dalam 30 hari (kucing dewasa sahaja); hanya jika timbangan terakhir dalam 60 hari. Amaran kuning: belum timbang (lewat 2/3/7 hari ikut kekerapan harian/mingguan/bulanan), vaksin core atau ubat cacing lewat, jagaan rutin lewat. Kad di Utama (hanya bila ada amaran) dan dalam profil kucing (4 kotak status, amaran, Telefon vet, Timbang sekarang).
- **Kongsi kad (v1.9.2):** profil kucing → *Kongsi kad*: gambar PNG 1080×1350 (`kcard`, ditangkap dengan html2canvas) dalam tema pink/biru ikut jantina. Dua jenis: *Kad profil* (pilih Umur, Baka, Status vaksin, Berat, Warna / corak) dan *Hari lahir* (jika tarikh lahir ada). No. microchip dan maklumat vet tidak pernah dimasukkan. *Kongsi* membuka butang Kongsi telefon; *Simpan gambar* memuat turun (iPhone: butang Kongsi).
- **Stok (v1.9.2, Lagi → Stok):** makanan kering, makanan basah, pasir atau stok lain, dengan jenama, jenis/perisa dan jumlah. *Dah beli* merekod pembelian (jenama lepas diisi sendiri); anggaran tahan = purata 3 selang pembelian terakhir, atau anggaran awal (`est`) sehingga ada 2 pembelian. Kad *Stok hampir habis* di Utama bila tinggal ±3 hari atau kurang. Kos pembelian masuk Perbelanjaan sebagai *Stok*. Disimpan dalam `S.stock` (ikut backup).
- **Hari istimewa (v1.9.2):** medan pilihan *Hari mula dibela* (`c.adopt`) dalam Edit profil. Pada hari lahir dan ulang tahun mula dibela (29 Feb disambut 28 Feb pada tahun bukan lompat), kad di atas Utama dengan butang *Kongsi* (kad *Hari lahir* atau *Hari dibela*) dan × untuk tutup hari itu (`kucingku-seen-day-v1`).
- **Pemandulan dengan tarikh (v1.9.4):** kotak Pemandulan dalam Jadual kesihatan membuka lembaran tarikh (`mdForm`, boleh tarikh lampau, tidak sebelum tarikh lahir, tukar atau padam). Juga medan *Tarikh pemandulan (pilihan)* dalam Edit profil, jadi kucing tanpa tarikh lahir pun boleh direkod. Dipaparkan dalam profil. Data: `c.ms.md`.
- **Dinding penyokong (v1.9.3):** butang *Saya dah belanja ☕* dalam lembaran QR → borang (nama/Tanpa nama, kucing, ucapan ≤80, izin papar) → Google Form `PK` → Sheet pembangun. Pembangun taip YA dalam lajur Papar; tab *Dinding* (QUERY) diterbitkan sebagai CSV (`PK.csv`) dan dipaparkan di Lagi (≥3 nama, 4 terbaru + Lihat semua; dimuat semula bila Lagi dibuka, paling kerap setiap 30 saat, dengan parameter `_` untuk memintas salinan lama Google). Tiada jumlah RM, tiada ranking. Lencana ☕ Penyokong hanya pada telefon penyumbang. Borang semasa: `entry.812810628` Nama, `entry.1086461158` Kucing, `entry.1426398179` Ucapan, `entry.1840377008` Kebenaran (Ya/Tidak); CSV tab Dinding gid 917299080. Tersembunyi dalam TWA. Tidak disenaraikan dalam changelog.
- **Belanja kopi (v1.9.2):** kad di bawah halaman Lagi (sejak v1.9.3) dan link kecil pada skrin *Kucingku dah dikemas kini*. Lembaran DuitNow QR (`img/duitnow-qr.png`, Touch 'n Go / Malaysia National QR, nama penerima ditunjuk) dengan *Simpan gambar QR*. Tiada caj platform. Disembunyikan dalam app Play Store (TWA, `document.referrer` `android-app://`) kerana polisi Google Play.
- **Timbang cepat:** catat berat semua kucing sekali gus.
- **Jadual:** halaman yang mengumpulkan semua rawatan, timbang dan temujanji dalam 30 hari akan datang (Lewat, Hari ini, 7 hari, 8 hingga 30 hari).
- **Lawatan vet dan temujanji:** tarikh, masa, sebab, catatan, klinik dan kos (RM). Tarikh akan datang menjadi temujanji dan muncul dalam Akan datang dan Jadual.
- **Vet:** senarai klinik yang anda taip sendiri (telefon, alamat atau pautan peta, waktu operasi, doktor), dengan butang Telefon dan Peta. Satu klinik boleh ditanda Klinik utama, dan klinik dipilih dalam borang rekod.
- **Perbelanjaan (Lagi → Perbelanjaan):** jumlah kos bulan ini, tahun ini atau semua, graf 6 bulan, pecahan mengikut jenis rekod dan kucing, serta kos terkini. Hanya rekod yang sudah berlalu dikira; temujanji akan datang tidak termasuk.
- **Kalendar (Lagi → Kalendar):** export fail `.ics` untuk temujanji vet dan jadual vaksin/ubat cacing akan datang (dengan peringatan). Satu temujanji juga boleh ditambah terus dari kad Temujanji seterusnya. Fail ialah salinan semasa; UID kekal supaya import semula mengemas kini acara yang sama dan bukan menggandakannya.
- **Export PDF** untuk doktor haiwan (reka bentuk baharu v1.9.0): header dengan klinik utama, 4 kad ringkasan (berat terkini, vaksin terakhir, ubat cacing terakhir, rawatan/temujanji seterusnya), profil, timeline vaksin, graf berat, jadual ubat cacing, rekod berat, lawatan vet, catatan kesihatan dan ruang *Catatan doktor haiwan*. Pemisahan halaman kemas: seksyen blok tidak dipotong (pindah penuh ke halaman baru), jadual dan senarai dipecah ikut baris dengan tajuk dan tajuk lajur diulang serta label *(sambungan)*, tiada tajuk tergantung di bawah halaman, dan setiap halaman ada header kecil serta *Halaman x / y* (`rptData`, `secHtml`, `pdfPaginate`, `rptMeasure` dalam `app.js`).
- **Dashboard Utama:** **Tindakan pantas** (Timbang cepat, Tambah rekod, Telefon vet), **Fokus hari ini** (senarai semak rawatan, timbang dan temujanji hari ini dengan bar kemajuan dan tanda siap), **Temujanji seterusnya** (tarikh, masa, klinik, Telefon dan Peta) dan **kad setiap kucing** (umur, berat terkini dengan perubahan, status Terkini, lewat atau hari ini).
- **Setting (Lagi → Setting)** dalam kategori: **Umum** (bahasa Bahasa Melayu atau English, unit berat Auto/Gram/Kilogram), **Tema** (mod Sistem/Cerah/Gelap dan lima skema warna pastel: Sakura, Langit, Pudina, Lavender, Aprikot; warna kucing jantan biru dan betina merah jambu kekal, dan PDF sentiasa cerah), **Peringatan** (peringatan backup 14, 30, 60 hari atau mati), **Data** (Backup: Export/Import/Copy, dan padam semua data) dan **Tentang** (maklum balas, privasi, versi, penafian, rujukan peraturan jadual).
- **Butang ＋ Tambah (v1.9.3):** di tengah menu bawah (Utama · Kucing · ＋ · Jadual · Lagi). Lembaran Tambah: pilih kucing (kucing terakhir diingat; tersembunyi jika seekor), Timbang, Vaksin, Ubat cacing, Jagaan selesai, Lawatan vet, Catatan kesihatan, Dah beli stok, Tambah kucing.
- **Maklum balas (v1.9.3, Lagi dan Setting → Tentang):** borang dalam app (rasa, jenis Cadangan/Masalah/Lain-lain, mesej, info app pilihan) dihantar terus ke Google Form. Draf disimpan.
- **Statistik penggunaan tanpa nama:** Vercel Web Analytics (tanpa cookie) untuk bilangan lawatan, pelawat dan sumber pautan. Data kucing tidak dihantar.
- **Wajib pasang ke skrin utama:** di pelayar telefon, app dipaparkan kelabu dan kabur di belakang panel *Pasang Kucingku untuk mula* yang tidak boleh ditutup. App hanya boleh digunakan apabila dibuka dari ikon skrin utama atau sebagai app Play Store (`display-mode: standalone` / `navigator.standalone`). Android Chrome dan Edge: butang satu tekan melalui gesaan pasang pelayar, dengan langkah bergambar sebagai sandaran (menu ⋮ → Pasang app → Pasang); selepas dipasang panel menyuruh pengguna buka dari ikon. iPhone: langkah bergambar Kongsi → Tambah ke Skrin Utama → Tambah. Samsung Internet dan pelayar Android yang tidak boleh memasang app (Xiaomi, UC, Opera Mini, Vivo, HeyTap, Huawei): butang *Buka dalam Chrome*. Samsung Internet dihantar ke Chrome kerana app yang dipasangnya disekat oleh Google Play Protect (*Unsafe app blocked: built for an older version of Android*). Facebook, Instagram, TikTok, Threads, LINE atau WebView Android: skrin *Buka dalam Chrome* (pautan `intent://`) atau langkah *Buka dalam Safari*, berserta pautan untuk disalin. Desktop dan tablet: dihantar ke website rasmi `/tentang` (lihat di bawah).
- **Mod ujian:** tambah `?dev` pada pautan untuk menggunakan app dalam pelayar tanpa memasang (disimpan pada peranti itu, kunci `kucingku-install-v1-dev`); `?dev=0` mematikannya.
- **Luar talian:** service worker (`sw.js`) menyimpan fail app supaya Kucingku boleh dibuka tanpa internet. Versi baharu dimuat turun di latar dan digunakan pada pembukaan seterusnya. App yang dipasang juga meminta storan kekal (`navigator.storage.persist()`) supaya data tidak dipadam bila storan telefon hampir penuh.
- **Butang Back Android:** setiap skrin dan borang ialah satu entri sejarah. Back menutup borang yang terbuka dahulu, kemudian kembali ke skrin sebelumnya.
- **Apa yang baharu di website (20 Nov 2026):** `/tentang#perubahan` ialah halaman changelog website, dibaca terus daripada `changelog.json` oleh `web.js` (tapis Baharu / Lebih baik / Dibaiki, 7 versi terkini + versi lama). `/tentang` juga ada kotak 3 perubahan terkini, pil versi di menu, dan 9 kad ciri; kad dengan `data-v` dapat lencana *Baharu* (atau *Reka baharu* untuk `data-t="imp"`) selama 30 hari dari tarikh versi itu. Screenshot website: `img/web-*.webp` (screenshot skrin Pasang dalam app kekal `img/pratonton-*.webp`). Changelog sengaja di `/tentang#perubahan`, bukan laluan baharu: laluan baharu perlu diubah dalam `sw.js`, dan setiap perubahan `sw.js` memaparkan popup kemas kini di telefon pengguna. **Setiap keluaran yang ada fungsi baharu besar:** tambah/kemas kini kad ciri (dengan `data-v`) dan screenshot di `tentang.html`; changelog dan versi dikemas kini sendiri.
- **Website rasmi (v1.8.7):** `/tentang` (`tentang.html`, `web.css`, `web.js`) ialah laman rasmi Kucingku: ciri, contoh paparan, cara mula 3 langkah, privasi, soalan lazim, kod QR, butang *Hantar ke WhatsApp* dan *Salin link* (`?utm_source=web`). Pelawat desktop/tablet yang membuka `/` dihantar ke `/tentang` (`goWeb()` dalam `app.js`); di telefon, laman ini menunjukkan butang *Buka Kucingku*. Pengesanan telefon dalam `web.js` mesti sama dengan `MOB` dalam `app.js`. `/privasi` (`privasi.html`) ialah Dasar Privasi (diperlukan untuk Play Store). Kedua-dua laman dilayan oleh `rewrites` dalam `vercel.json` dan service worker tidak mengambil alih laluan ini. Gambar pratonton link (Open Graph) `img/og.jpg` 1200×630 dipasang pada `/` dan `/tentang`.
- **Contoh paparan pada skrin Pasang (v1.8.6):** 4 screenshot app (`img/pratonton-*.webp`, ±16KB setiap satu) boleh dileret di atas langkah pemasangan, supaya pengguna nampak app sebelum memasang. Untuk menukar gambar, ganti fail dengan nama yang sama (360px lebar, WebP).
- **Keselamatan data (v1.8.5):** amaran "Data disimpan dalam telefon ini sahaja" pada skrin selamat datang dan Setting → Data; kad *Buat backup sekarang* di Utama selagi belum ada backup. Di iPhone, Export (backup, PDF, kalendar) membuka butang Kongsi (Simpan ke Fail, Google Drive, WhatsApp); jika tidak disokong, muat turun biasa digunakan.
- **Laporan masalah:** ralat yang tidak dijangka memaparkan panel *Ada masalah dalam app* dengan butang Laporkan, yang membuka borang maklum balas dengan versi app, jenis telefon dan mesej ralat diisi automatik (tiada data kucing). Ralat skrip luar (fon, analytics, sambungan pelayar) diabaikan.
- **Bahasa English:** semua skrin, borang, mesej dan PDF diterjemah; data tidak berubah apabila bahasa ditukar.

Versi semasa: **1.9.2** (lihat Setting → Tentang dalam app).

## Teknologi

- `index.html` untuk HTML/CSS dan `app.js` untuk JavaScript biasa. **Tiada build, tiada dependency npm semasa runtime, tiada backend.**
- Statistik: skrip Vercel Web Analytics `/_vercel/insights/script.js` dari origin sendiri; `connect-src 'self'` membenarkan beacon ke origin sendiri sahaja. Di luar Vercel skrip ini hanya 404 tanpa kesan pada app.
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

Buka di **telefon** (rangkaian Wi-Fi yang sama) atau gunakan mod peranti mudah alih dalam DevTools pelayar, dengan `?dev` pada alamat supaya app tidak dikunci oleh panel pasang. **Pada desktop, `/` dihantar ke website rasmi `/tentang`.** Pelayan lokal biasa tidak mengikut `rewrites` Vercel, jadi buka `/tentang.html` terus.

## Deploy

**GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.

**Vercel:** Add New → Project → import repo ini. Framework Preset: *Other*. Kosongkan Build Command dan Output Directory.

### Statistik (Vercel Web Analytics)

1. Dashboard Vercel → projek **kucingku** → tab **Analytics** → **Enable**.
2. Redeploy. Statistik mula dikumpul pada lawatan seterusnya.
3. Untuk tahu sumber pautan, kongsi pautan dengan parameter UTM, cth. `https://kucingku-bay.vercel.app/?utm_source=whatsapp`. Dashboard turut memaparkan referrer.

App ini satu halaman, jadi setiap pembukaan app (termasuk dari ikon skrin utama) dikira sebagai satu page view; navigasi antara tab tidak dikira.

### Membaca statistik pemasangan

Vercel Analytics (pelan percuma) tidak memaparkan UTM, jadi app menukar alamat setiap lawatan kepada jenis skrin. Lihat **Pages** dalam Vercel Analytics:

| Laluan | Maksud |
|---|---|
| `/app` | App dibuka dari ikon skrin utama (pengguna aktif) |
| `/pasang/<sumber>` | Skrin "Pasang Kucingku" dalam pelayar telefon, cth. `/pasang/threads` |
| `/buka-pelayar/<sumber>` | Dibuka dalam app Threads, Facebook dan lain-lain (perlu buka dalam Chrome/Safari) |
| `/pelayar` | Mod ujian `?dev` dalam pelayar |
| `/desktop` | Dibuka dari komputer di `/` (sejak v1.8.7 terus dihantar ke `/tentang`, jadi angka ini mungkin rendah) |
| `/tentang` | Website rasmi (desktop, tablet, dan sesiapa yang buka link `/tentang`) |
| `/privasi` | Dasar Privasi |

Bilangan pelawat `/app` setiap hari ialah anggaran pengguna aktif harian.

### Borang maklum balas (Google Forms)

Sejak v1.9.3 pengguna isi borang dalam app (Lagi → Maklum balas) dan app menghantarnya terus ke Google Form (`formResponse`, `fetch` `no-cors`). Jawapan masuk ke Google Sheet yang dipautkan pada borang. Tiada pelayan sendiri.

1. Cipta borang di Google Forms dengan 4 soalan jawapan ringkas (Mesej: perenggan), semuanya tidak wajib: **Jenis**, **Rasa**, **Mesej**, **Info app**.
2. Settings → Responses: *Collect email addresses* = Do not collect, *Limit to 1 response* = mati. Responses → *Link to Sheets*. Publish, *Responders* = Anyone with the link.
3. ⋮ → *Get pre-filled link*, isi a, b, c, d dan salin pautan untuk mendapatkan `entry.XXXXXXXX` setiap soalan.
4. Dalam `app.js`: `const FB={form:'<pautan viewform>',jen:'entry…',rasa:'entry…',msg:'entry…',ver:'entry…'};`. CSP `connect-src` mesti membenarkan `https://docs.google.com` (index.html dan vercel.json).

Borang semasa: `entry.987852967` Jenis, `entry.1382123140` Rasa, `entry.1914040619` Mesej, `entry.1022943400` Info app. Tiada internet: maklum balas disimpan (`kucingku-fb-v1`) dan dihantar bila talian kembali. Had 1 hantaran setiap 30 saat. Jika `FB` tidak lengkap, butang membuka borang dalam tab baharu (`fbUrl`), seperti butang Laporkan pada panel ralat.

Selepas deploy, buka pautan di telefon: app memaparkan panel **Pasang Kucingku untuk mula** dengan langkah mengikut telefon dan pelayar. Untuk menguji dalam pelayar tanpa memasang, gunakan `?dev`.

`manifest.webmanifest` menetapkan `id: "./"` (identiti sama seperti pemasangan sedia ada) dan `start_url: "./?utm_source=homescreen"`, jadi pembukaan dari ikon skrin utama boleh dilihat dalam Vercel Analytics → UTM. Kod QR desktop menggunakan `utm_source=desktop-qr`; jana semula `icons/qr.svg` jika alamat production bertukar.

## Penyimpanan dan backup

- Data terikat pada **pelayar dan alamat (origin)**. Alamat baharu bermakna storan baharu, jadi **Export fail** dahulu sebelum menukar alamat, kemudian **Import** di alamat baharu.
- Data boleh hilang jika data pelayar dibersihkan. Buat backup berkala melalui **Setting → Data**.
- Semua data dibersihkan dan disahkan semasa dibuka dan diimport (fungsi `clean()`).
- Simpan yang gagal mengekalkan data terdahulu dan borang terbuka. Mesej kejayaan hanya dipaparkan selepas penulisan `localStorage` berjaya.
- Backup baharu mempunyai `version: 2`. Backup lama tanpa versi masih diterima; versi yang belum disokong, ID berulang, tarikh mustahil dan rujukan rekod/klinik yang hilang ditolak sebelum penggantian data. Import fail dan teks dihadkan kepada 10 MB.
- Teks profil dan catatan dikekalkan tanpa pemotongan semasa reload. Berat mesti antara 1 g hingga 30 kg; kos antara RM 0 hingga RM 1,000,000.
- Jika storan tidak dapat dibaca, app tidak menimpanya. Gunakan Export/Copy pada Setting → Data untuk mendapatkan salinan asal sebelum mengimport backup yang sah. Fail salinan asal `.txt` ialah bahan pemulihan, bukan backup JSON yang telah disahkan.
- Rekod rawatan dan timbangan baharu mesti bertarikh hari ini atau sebelumnya. Gunakan Lawatan vet untuk temujanji masa depan. Rekod rawatan masa depan daripada backup lama dikekalkan dalam sejarah tetapi tidak digunakan untuk mengira rawatan selesai atau tarikh seterusnya.
- Tetapan app (bahasa, unit berat, tema, peringatan backup) disimpan pada kunci berasingan `kucingku-settings-v1` dan merupakan pilihan peranti: ia tidak termasuk dalam backup, tidak ditimpa semasa import dan kekal selepas padam semua data. Nilai tetapan yang tidak sah diabaikan dan lalai digunakan.
- Unit berat menentukan paparan dan juga cara nombor yang ditaip dibaca: **Auto** membaca nombor di bawah 20 sebagai kg dan selebihnya sebagai gram; **Gram** dan **Kilogram** membaca nombor dalam unit itu sahaja. Berat disimpan sebagai gram bulat dan mesti antara 1 g hingga 30 kg.
- Mesej muat turun bermakna permintaan muat turun telah dimulakan; pelayar tidak memberi pengesahan bahawa pengguna menyimpan fail tersebut.

## Ujian

Node.js 22 atau lebih baharu diperlukan untuk menjalankan ujian; aplikasi sendiri masih boleh dihoskan secara statik.

```bash
npm test
```

Fail ujian: `app.test.cjs` (storan, import/eksport, jadual, PDF), `settings.test.cjs` (tetapan, unit berat, Data), `phase1.test.cjs` (perbelanjaan dan kalendar .ics), `theme.test.cjs` (tema, mod gelap, skema warna), `i18n.test.cjs` (terjemahan English dan imbasan teks Melayu yang tertinggal pada setiap skrin, borang dan PDF) `home.test.cjs` (dashboard dan tindakan pantas), `v184.test.cjs` (luar talian, butang Back, timbangan sama hari, vaksin gabungan dan vaksin pertama), `v186.test.cjs` (contoh paparan skrin Pasang), `v185.test.cjs` (backup versi lama dan semasa tanpa kehilangan data, Kongsi di iPhone, amaran data, laluan analytics, laporan masalah, buang gambar) dan `install.test.cjs` (kunci wajib pasang, mod ujian, Android, iPhone, pelayar dalam app, desktop dan terjemahan). `helpers.cjs` menyediakan persekitaran ujian bersama.

Suite menggunakan skrip app sebenar dengan storan dan masa terasing. Ia merangkumi simpan/reload, kegagalan storan, import/eksport, validasi tarikh/nilai, jadual rawatan dan kandungan laporan PDF serta retry CDN. GitHub Actions menjalankannya pada setiap PR dan push ke `main`.

Semakan pelayar sebelum release: tambah/edit kucing, rekod berat, reload, cuba import tidak sah, import backup sah, serta export JSON dan PDF. Pastikan rekod, masa temujanji dan kos muncul dengan betul. Ujian terasing tidak menggantikan semakan iOS Safari/Android Chrome atau layout PDF.

Untuk menghalang merge tanpa ujian, tetapkan job `test` daripada workflow **Regression tests** sebagai required status check pada `main`. Vercel Git integration kekal mengurus preview dan deployment; workflow ini hanya menjalankan ujian dan tidak memerlukan token Vercel.

## Peraturan jadual

| Rawatan | Peraturan |
|---|---|
| Vaksin core (F3) | Dos pertama ±8 minggu. Ulang setiap 4 minggu hingga dos pada umur 16 minggu atau lebih. Booster pada 6 bulan, kemudian setiap 3 tahun. Kucing tanpa sejarah vaksin (tanda *Vaksin pertama* pada borang): dua dos selang 4 minggu. Vaksin gabungan seperti "F4 + Rabies" dikira untuk vaksin core dan rabies. |
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
├── sw.js                 # service worker (luar talian); tukar CACHE pada setiap keluaran
├── icons/                # ikon app (192, 512, maskable 512, apple-touch 180)
├── tests/                # ujian regresi dengan Node.js (helpers + fail ujian)
│   └── fixtures/         # contoh fail backup v1.0 dan v1.8 untuk ujian keserasian
├── package.json          # arahan ujian, tiada dependency npm
├── .github/workflows/    # ujian pada PR dan main
├── vercel.json           # konfigurasi hosting statik dan header keselamatan
├── README.md
└── .gitignore
```

## Had yang diketahui

- Hanya untuk telefon. Desktop dan tablet disekat dengan sengaja.
- Tiada notifikasi peringatan.
- Selepas kemas kini, versi baharu digunakan pada pembukaan app seterusnya (bukan serta-merta).
- Teks dalam PDF ialah gambar (tidak boleh dipilih atau disalin).

## Lesen

Belum ditetapkan. Tambah fail `LICENSE` mengikut pilihan anda.

## Setiap keluaran

1. Naikkan versi di `app.js` (`VER`), `sw.js` (`CACHE`) dan `package.json`.
2. Tambah entri baharu **di atas** `changelog.json`: `{"v":"x.y.z","d":"YYYY-MM-DD","i":[{"t":"new|imp|fix","ms":"…","en":"…"}]}`. Teks ini dipaparkan kepada pengguna dalam popup kemas kini, jadi tulis dalam bahasa mudah. Ujian gagal jika entri teratas bukan versi semasa.
3. `npm test`, uji di telefon melalui branch pratonton, kemudian ke `main`.

Service worker (`sw.js`) menunggu mesej `skip` daripada butang *Kemas kini sekarang* sebelum versi baharu diaktifkan. Pemasangan pertama, dan peralihan daripada versi sebelum 1.9.1, dipasang terus.
