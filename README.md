# Telegram Bot Serba Guna - Node.js

Bot Telegram serba guna menggunakan Node.js dengan metode **polling**, **switch case**, dan **tombol inline keyboard**.

## Fitur

| Perintah / Tombol | Deskripsi |
|--------------------|-----------|
| `/start` | Menu utama dengan tombol inline |
| `/menu` | Tampilkan menu tombol |
| 🎵 **YouTube MP3** (`/ytmp3 <url>`) | Download lagu dari YouTube sebagai MP3 |
| 📌 **Pinterest** (`/pin <kata kunci>`) | Cari gambar dari Pinterest |
| 🔍 **Wikipedia** (`/wiki <kata kunci>`) | Cari artikel di Wikipedia Indonesia |
| 😂 **Meme Random** (`/meme`) | Kirim meme random dari Reddit |
| 🌤 **Cuaca** (`/cuaca <kota>`) | Cek cuaca kota saat ini |
| 💬 **Quotes** (`/quote`) | Kutipan motivasi random |
| ℹ️ **Info Bot** | Informasi tentang bot |
| ❓ **Bantuan** | Daftar semua perintah |

### Semua fitur bisa diakses melalui **tombol inline** atau **perintah teks**!

## Prasyarat

- [Node.js](https://nodejs.org/) v16 atau lebih baru
- Token bot dari [BotFather](https://t.me/BotFather) di Telegram

## Cara Mendapatkan Token Bot

1. Buka Telegram dan cari [@BotFather](https://t.me/BotFather)
2. Ketik `/newbot`
3. Ikuti instruksi untuk memberi nama bot
4. Salin token yang diberikan BotFather
5. Tempel token tersebut ke file `.env` (lihat langkah instalasi)

---

## Instalasi di PC / Laptop

1. Clone repository:
   ```bash
   git clone https://github.com/rmt26/telegram-bot-nodejs.git
   cd telegram-bot-nodejs
   ```

2. Install dependensi:
   ```bash
   npm install
   ```

3. Buat file `.env` dari template:
   ```bash
   cp .env.example .env
   ```

4. Edit file `.env` dan masukkan token bot Telegram kamu:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```

5. Jalankan bot:
   ```bash
   npm start
   ```

---

## Instalasi di Termux (Android)

### 1. Install Termux

Download dan install [Termux](https://f-droid.org/packages/com.termux/) dari **F-Droid** (disarankan, bukan dari Play Store).

### 2. Update Termux & Install Node.js

Buka Termux lalu jalankan perintah berikut satu per satu:

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
```

### 3. Clone Repository

```bash
git clone https://github.com/rmt26/telegram-bot-nodejs.git
cd telegram-bot-nodejs
```

### 4. Install Dependensi

```bash
npm install
```

### 5. Konfigurasi Token Bot

```bash
cp .env.example .env
nano .env
```

Ganti `your_bot_token_here` dengan token dari BotFather, lalu simpan:
- Tekan `Ctrl + X`
- Tekan `Y`
- Tekan `Enter`

### 6. Jalankan Bot

```bash
npm start
```

Bot akan berjalan dan menampilkan pesan:
```
Bot Telegram berjalan dengan mode polling...
```

### 7. Menjalankan Bot di Background (Opsional)

Agar bot tetap berjalan meskipun Termux ditutup:

```bash
nohup node index.js > bot.log 2>&1 &
```

Untuk melihat log:
```bash
cat bot.log
```

Untuk menghentikan bot yang berjalan di background:
```bash
pkill -f "node index.js"
```

### Tips Termux

- Gunakan `termux-wake-lock` agar Termux tidak ditutup otomatis oleh Android:
  ```bash
  termux-wake-lock
  ```
- Untuk menghentikan bot yang berjalan di foreground, tekan `Ctrl + C`
- Pastikan koneksi internet aktif agar bot bisa menerima dan mengirim pesan

---

## Teknologi

- **Node.js** - Runtime JavaScript
- **node-telegram-bot-api** - Library untuk Telegram Bot API
- **@distube/ytdl-core** - Download audio dari YouTube
- **axios** - HTTP client untuk API requests
- **cheerio** - HTML parser untuk scraping Pinterest
- **dotenv** - Manajemen environment variables

## Lisensi

ISC
