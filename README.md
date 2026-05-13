# Telegram Bot - Node.js

Bot Telegram sederhana menggunakan Node.js dengan metode **polling** dan **switch case**.

## Fitur

| Perintah | Deskripsi |
|----------|-----------|
| `/start` | Memulai bot dan menampilkan daftar perintah |
| `/help` | Menampilkan bantuan |
| `/info` | Informasi tentang bot (versi, runtime, uptime) |
| `/time` | Menampilkan waktu saat ini (WIB) |
| `/echo <teks>` | Mengulang teks yang dikirim |
| `/about` | Tentang pembuat bot |

## Prasyarat

- [Node.js](https://nodejs.org/) v16 atau lebih baru
- Token bot dari [BotFather](https://t.me/BotFather) di Telegram

## Instalasi

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

## Menjalankan Bot

```bash
npm start
```

## Cara Mendapatkan Token Bot

1. Buka Telegram dan cari [@BotFather](https://t.me/BotFather)
2. Ketik `/newbot`
3. Ikuti instruksi untuk memberi nama bot
4. Salin token yang diberikan BotFather
5. Tempel token tersebut ke file `.env`

## Teknologi

- **Node.js** - Runtime JavaScript
- **node-telegram-bot-api** - Library untuk Telegram Bot API
- **dotenv** - Manajemen environment variables

## Lisensi

ISC
