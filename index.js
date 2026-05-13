require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN tidak ditemukan di file .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('Bot Telegram berjalan dengan mode polling...');

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  const command = text.toLowerCase().trim();

  switch (command) {
    case '/start':
      bot.sendMessage(
        chatId,
        'Halo! Selamat datang di Bot Telegram.\n\n' +
          'Berikut perintah yang tersedia:\n' +
          '/start - Memulai bot\n' +
          '/help - Menampilkan bantuan\n' +
          '/info - Informasi tentang bot\n' +
          '/time - Menampilkan waktu saat ini\n' +
          '/echo <teks> - Mengulang teks yang kamu kirim\n' +
          '/about - Tentang pembuat bot'
      );
      break;

    case '/help':
      bot.sendMessage(
        chatId,
        'Daftar Perintah:\n\n' +
          '/start - Memulai bot\n' +
          '/help - Menampilkan bantuan\n' +
          '/info - Informasi tentang bot\n' +
          '/time - Menampilkan waktu saat ini\n' +
          '/echo <teks> - Mengulang teks yang kamu kirim\n' +
          '/about - Tentang pembuat bot'
      );
      break;

    case '/info':
      bot.sendMessage(
        chatId,
        `Informasi Bot:\n\n` +
          `Nama: Telegram Bot\n` +
          `Versi: 1.0.0\n` +
          `Runtime: Node.js ${process.version}\n` +
          `Platform: ${process.platform}\n` +
          `Uptime: ${Math.floor(process.uptime())} detik`
      );
      break;

    case '/time':
      bot.sendMessage(
        chatId,
        `Waktu saat ini: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
      );
      break;

    case '/about':
      bot.sendMessage(
        chatId,
        'Bot ini dibuat menggunakan Node.js dengan library node-telegram-bot-api.\n' +
          'Menggunakan metode polling untuk menerima pesan.'
      );
      break;

    default:
      if (text.startsWith('/echo ')) {
        const echoText = text.substring(6);
        bot.sendMessage(chatId, echoText);
      } else if (text.startsWith('/')) {
        bot.sendMessage(chatId, 'Perintah tidak dikenali. Ketik /help untuk melihat daftar perintah.');
      } else {
        bot.sendMessage(chatId, `Kamu berkata: "${text}"\n\nKetik /help untuk melihat daftar perintah.`);
      }
      break;
  }
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

process.on('SIGINT', () => {
  console.log('Bot dihentikan.');
  bot.stopPolling();
  process.exit(0);
});
