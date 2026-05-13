require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN tidak ditemukan di file .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('Bot Telegram berjalan dengan mode polling...');

// ============ STATE MANAGEMENT ============
const userState = {};

function setState(chatId, state) {
  userState[chatId] = state;
}

function getState(chatId) {
  return userState[chatId] || null;
}

function clearState(chatId) {
  delete userState[chatId];
}

// ============ MAIN MENU KEYBOARD ============
function mainMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🎵 YouTube MP3', callback_data: 'menu_ytmp3' },
          { text: '📌 Pinterest', callback_data: 'menu_pinterest' },
        ],
        [
          { text: '🔍 Wikipedia', callback_data: 'menu_wiki' },
          { text: '😂 Meme Random', callback_data: 'menu_meme' },
        ],
        [
          { text: '🌤 Cuaca', callback_data: 'menu_weather' },
          { text: '💬 Quotes', callback_data: 'menu_quote' },
        ],
        [
          { text: 'ℹ️ Info Bot', callback_data: 'menu_info' },
          { text: '❓ Bantuan', callback_data: 'menu_help' },
        ],
      ],
    },
  };
}

function cancelKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: '❌ Batal', callback_data: 'cancel' }]],
    },
  };
}

// ============ /start COMMAND ============
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'Pengguna';
  clearState(chatId);
  bot.sendMessage(
    chatId,
    `Halo ${name}! 👋\nSelamat datang di *Bot Serba Guna*.\n\nPilih fitur yang kamu inginkan:`,
    { parse_mode: 'Markdown', ...mainMenuKeyboard() }
  );
});

// ============ /menu COMMAND ============
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  clearState(chatId);
  bot.sendMessage(chatId, 'Pilih fitur:', mainMenuKeyboard());
});

// ============ CALLBACK QUERY HANDLER ============
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  bot.answerCallbackQuery(query.id);

  switch (data) {
    // --- YouTube MP3 ---
    case 'menu_ytmp3':
      setState(chatId, 'waiting_ytmp3');
      bot.sendMessage(
        chatId,
        '🎵 *YouTube MP3 Downloader*\n\nKirim link YouTube untuk download sebagai MP3.\n\nContoh:\n`https://youtube.com/watch?v=xxxxx`',
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      break;

    // --- Pinterest ---
    case 'menu_pinterest':
      setState(chatId, 'waiting_pinterest');
      bot.sendMessage(
        chatId,
        '📌 *Pencarian Pinterest*\n\nKirim kata kunci untuk mencari gambar di Pinterest.\n\nContoh: `anime aesthetic`',
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      break;

    // --- Wikipedia ---
    case 'menu_wiki':
      setState(chatId, 'waiting_wiki');
      bot.sendMessage(
        chatId,
        '🔍 *Pencarian Wikipedia*\n\nKirim kata kunci untuk mencari artikel di Wikipedia.\n\nContoh: `Indonesia`',
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      break;

    // --- Meme ---
    case 'menu_meme':
      await sendRandomMeme(chatId);
      break;

    // --- Cuaca ---
    case 'menu_weather':
      setState(chatId, 'waiting_weather');
      bot.sendMessage(
        chatId,
        '🌤 *Cek Cuaca*\n\nKirim nama kota untuk melihat cuaca saat ini.\n\nContoh: `Jakarta`',
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      break;

    // --- Quotes ---
    case 'menu_quote':
      await sendRandomQuote(chatId);
      break;

    // --- Info ---
    case 'menu_info':
      bot.sendMessage(
        chatId,
        `ℹ️ *Informasi Bot*\n\n` +
          `Versi: 2.0.0\n` +
          `Runtime: Node.js ${process.version}\n` +
          `Platform: ${process.platform}\n` +
          `Uptime: ${Math.floor(process.uptime())} detik\n\n` +
          `Dibuat dengan Node.js & node-telegram-bot-api`,
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
      );
      break;

    // --- Help ---
    case 'menu_help':
      bot.sendMessage(
        chatId,
        '❓ *Bantuan*\n\n' +
          '*Perintah:*\n' +
          '/start - Menu utama\n' +
          '/menu - Tampilkan menu\n' +
          '/ytmp3 <url> - Download YouTube MP3\n' +
          '/pin <kata kunci> - Cari gambar Pinterest\n' +
          '/wiki <kata kunci> - Cari di Wikipedia\n' +
          '/meme - Meme random\n' +
          '/cuaca <kota> - Cek cuaca\n' +
          '/quote - Quotes random\n\n' +
          'Atau gunakan tombol menu di atas! 👆',
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
      );
      break;

    // --- Cancel ---
    case 'cancel':
      clearState(chatId);
      bot.sendMessage(chatId, '❌ Dibatalkan.\n\nPilih fitur lain:', mainMenuKeyboard());
      break;

    // --- More Pinterest results ---
    default:
      if (data.startsWith('pin_more_')) {
        const keyword = data.replace('pin_more_', '');
        await searchPinterest(chatId, keyword);
      }
      break;
  }
});

// ============ TEXT COMMAND SHORTCUTS ============
bot.onText(/\/ytmp3\s+(.+)/, (msg, match) => {
  downloadYTMP3(msg.chat.id, match[1].trim());
});

bot.onText(/\/pin\s+(.+)/, (msg, match) => {
  searchPinterest(msg.chat.id, match[1].trim());
});

bot.onText(/\/wiki\s+(.+)/, (msg, match) => {
  searchWikipedia(msg.chat.id, match[1].trim());
});

bot.onText(/\/meme$/, (msg) => {
  sendRandomMeme(msg.chat.id);
});

bot.onText(/\/cuaca\s+(.+)/, (msg, match) => {
  getWeather(msg.chat.id, match[1].trim());
});

bot.onText(/\/quote$/, (msg) => {
  sendRandomQuote(msg.chat.id);
});

// ============ MESSAGE HANDLER (STATE-BASED) ============
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  const state = getState(chatId);

  switch (state) {
    case 'waiting_ytmp3':
      clearState(chatId);
      downloadYTMP3(chatId, text.trim());
      break;

    case 'waiting_pinterest':
      clearState(chatId);
      searchPinterest(chatId, text.trim());
      break;

    case 'waiting_wiki':
      clearState(chatId);
      searchWikipedia(chatId, text.trim());
      break;

    case 'waiting_weather':
      clearState(chatId);
      getWeather(chatId, text.trim());
      break;

    default:
      bot.sendMessage(
        chatId,
        'Pilih fitur dari menu di bawah ini:',
        mainMenuKeyboard()
      );
      break;
  }
});

// ============ YOUTUBE MP3 DOWNLOAD ============
async function downloadYTMP3(chatId, url) {
  if (!ytdl.validateURL(url)) {
    bot.sendMessage(chatId, '❌ URL YouTube tidak valid. Kirim link yang benar.', cancelKeyboard());
    return;
  }

  try {
    bot.sendMessage(chatId, '⏳ Sedang memproses... Tunggu sebentar ya.');

    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    const duration = parseInt(info.videoDetails.lengthSeconds, 10);

    if (duration > 600) {
      bot.sendMessage(
        chatId,
        '❌ Video terlalu panjang (maks 10 menit untuk download MP3).',
        mainMenuKeyboard()
      );
      return;
    }

    const sanitizedTitle = title.replace(/[^\w\s-]/g, '').substring(0, 50);
    const filePath = path.join('/tmp', `${sanitizedTitle}-${Date.now()}.mp3`);

    const stream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
    });

    const writeStream = fs.createWriteStream(filePath);
    stream.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      stream.on('error', reject);
    });

    await bot.sendAudio(chatId, filePath, {
      caption: `🎵 *${title}*`,
      parse_mode: 'Markdown',
      title: title,
    });

    fs.unlink(filePath, () => {});

    bot.sendMessage(chatId, 'Pilih fitur lain:', mainMenuKeyboard());
  } catch (error) {
    console.error('YouTube MP3 error:', error.message);
    bot.sendMessage(
      chatId,
      '❌ Gagal mendownload audio. Pastikan link valid dan coba lagi.',
      mainMenuKeyboard()
    );
  }
}

// ============ PINTEREST SEARCH ============
async function searchPinterest(chatId, keyword) {
  try {
    bot.sendMessage(chatId, `🔍 Mencari "${keyword}" di Pinterest...`);

    const response = await axios.get(
      `https://www.pinterest.com/resource/BaseSearchResource/get/`,
      {
        params: {
          source_url: `/search/pins/?q=${encodeURIComponent(keyword)}`,
          data: JSON.stringify({
            options: {
              query: keyword,
              scope: 'pins',
              page_size: 10,
            },
          }),
        },
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        timeout: 15000,
      }
    );

    const results = response.data?.resource_response?.data?.results;

    if (!results || results.length === 0) {
      bot.sendMessage(chatId, `❌ Tidak ditemukan hasil untuk "${keyword}".`, mainMenuKeyboard());
      return;
    }

    const images = results
      .filter((pin) => pin.images && pin.images.orig)
      .slice(0, 5);

    if (images.length === 0) {
      bot.sendMessage(chatId, `❌ Tidak ditemukan gambar untuk "${keyword}".`, mainMenuKeyboard());
      return;
    }

    const media = images.map((pin) => ({
      type: 'photo',
      media: pin.images.orig.url,
      caption: pin.grid_title || '',
    }));

    await bot.sendMediaGroup(chatId, media);

    bot.sendMessage(chatId, `📌 ${images.length} gambar ditemukan untuk "${keyword}"`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Cari lagi', callback_data: 'menu_pinterest' }],
          [{ text: '🏠 Menu Utama', callback_data: 'cancel' }],
        ],
      },
    });
  } catch (error) {
    console.error('Pinterest error:', error.message);

    try {
      await searchPinterestFallback(chatId, keyword);
    } catch (fallbackError) {
      console.error('Pinterest fallback error:', fallbackError.message);
      bot.sendMessage(
        chatId,
        `❌ Gagal mencari gambar Pinterest. Coba lagi nanti.`,
        mainMenuKeyboard()
      );
    }
  }
}

async function searchPinterestFallback(chatId, keyword) {
  const response = await axios.get(
    `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 15000,
    }
  );

  const $ = cheerio.load(response.data);
  const images = [];

  $('img[src*="pinimg.com"]').each((i, el) => {
    if (i >= 5) return false;
    const src = $(el).attr('src');
    if (src && src.includes('pinimg.com')) {
      const highRes = src.replace(/\/\d+x\//, '/originals/');
      images.push(highRes);
    }
  });

  if (images.length === 0) {
    bot.sendMessage(chatId, `❌ Tidak ditemukan gambar untuk "${keyword}".`, mainMenuKeyboard());
    return;
  }

  const media = images.map((url, i) => ({
    type: 'photo',
    media: url,
    caption: i === 0 ? `📌 Hasil Pinterest: "${keyword}"` : '',
  }));

  await bot.sendMediaGroup(chatId, media);

  bot.sendMessage(chatId, 'Pilih fitur lain:', mainMenuKeyboard());
}

// ============ WIKIPEDIA SEARCH ============
async function searchWikipedia(chatId, keyword) {
  try {
    bot.sendMessage(chatId, `🔍 Mencari "${keyword}" di Wikipedia...`);

    const response = await axios.get('https://id.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(keyword), {
      timeout: 10000,
    });

    const data = response.data;

    let message = `📖 *${data.title}*\n\n${data.extract || 'Tidak ada deskripsi.'}`;

    if (data.content_urls && data.content_urls.desktop) {
      message += `\n\n🔗 [Baca selengkapnya](${data.content_urls.desktop.page})`;
    }

    const options = {
      parse_mode: 'Markdown',
      ...mainMenuKeyboard(),
    };

    if (data.thumbnail && data.thumbnail.source) {
      await bot.sendPhoto(chatId, data.thumbnail.source, {
        caption: message,
        parse_mode: 'Markdown',
      });
      bot.sendMessage(chatId, 'Pilih fitur lain:', mainMenuKeyboard());
    } else {
      bot.sendMessage(chatId, message, options);
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      bot.sendMessage(chatId, `❌ Artikel "${keyword}" tidak ditemukan di Wikipedia.`, mainMenuKeyboard());
    } else {
      console.error('Wikipedia error:', error.message);
      bot.sendMessage(chatId, '❌ Gagal mencari di Wikipedia. Coba lagi nanti.', mainMenuKeyboard());
    }
  }
}

// ============ RANDOM MEME ============
async function sendRandomMeme(chatId) {
  try {
    const response = await axios.get('https://meme-api.com/gimme', { timeout: 10000 });
    const meme = response.data;

    await bot.sendPhoto(chatId, meme.url, {
      caption: `😂 *${meme.title}*\n\n👍 ${meme.ups} upvotes | 📝 r/${meme.subreddit}`,
      parse_mode: 'Markdown',
    });

    bot.sendMessage(chatId, 'Pilih fitur lain:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '😂 Meme Lagi', callback_data: 'menu_meme' }],
          [{ text: '🏠 Menu Utama', callback_data: 'cancel' }],
        ],
      },
    });
  } catch (error) {
    console.error('Meme error:', error.message);
    bot.sendMessage(chatId, '❌ Gagal mengambil meme. Coba lagi nanti.', mainMenuKeyboard());
  }
}

// ============ WEATHER ============
async function getWeather(chatId, city) {
  try {
    const response = await axios.get(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { timeout: 10000 }
    );

    const data = response.data;
    const current = data.current_condition[0];
    const area = data.nearest_area[0];
    const areaName = area.areaName[0].value;
    const country = area.country[0].value;

    const message =
      `🌤 *Cuaca di ${areaName}, ${country}*\n\n` +
      `🌡 Suhu: ${current.temp_C}°C (terasa ${current.FeelsLikeC}°C)\n` +
      `💧 Kelembaban: ${current.humidity}%\n` +
      `🌬 Angin: ${current.windspeedKmph} km/h ${current.winddir16Point}\n` +
      `☁️ Kondisi: ${current.weatherDesc[0].value}\n` +
      `👁 Jarak Pandang: ${current.visibility} km`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...mainMenuKeyboard() });
  } catch (error) {
    console.error('Weather error:', error.message);
    bot.sendMessage(chatId, `❌ Gagal mendapatkan cuaca untuk "${city}". Pastikan nama kota benar.`, mainMenuKeyboard());
  }
}

// ============ RANDOM QUOTE ============
async function sendRandomQuote(chatId) {
  try {
    const response = await axios.get('https://api.quotable.io/random', { timeout: 10000 });
    const quote = response.data;

    bot.sendMessage(
      chatId,
      `💬 _"${quote.content}"_\n\n— *${quote.author}*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💬 Quote Lagi', callback_data: 'menu_quote' }],
            [{ text: '🏠 Menu Utama', callback_data: 'cancel' }],
          ],
        },
      }
    );
  } catch (error) {
    console.error('Quote error:', error.message);

    const fallbackQuotes = [
      { text: 'Satu-satunya cara untuk melakukan pekerjaan hebat adalah mencintai apa yang kamu lakukan.', author: 'Steve Jobs' },
      { text: 'Hidup itu seperti mengendarai sepeda. Untuk menjaga keseimbanganmu, kamu harus terus bergerak.', author: 'Albert Einstein' },
      { text: 'Jangan menunggu. Waktunya tidak akan pernah tepat.', author: 'Napoleon Hill' },
      { text: 'Kesuksesan adalah berjalan dari kegagalan ke kegagalan tanpa kehilangan antusiasme.', author: 'Winston Churchill' },
      { text: 'Pendidikan adalah senjata paling ampuh yang bisa kamu gunakan untuk mengubah dunia.', author: 'Nelson Mandela' },
    ];

    const random = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];

    bot.sendMessage(
      chatId,
      `💬 _"${random.text}"_\n\n— *${random.author}*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💬 Quote Lagi', callback_data: 'menu_quote' }],
            [{ text: '🏠 Menu Utama', callback_data: 'cancel' }],
          ],
        },
      }
    );
  }
}

// ============ ERROR HANDLING ============
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

process.on('SIGINT', () => {
  console.log('Bot dihentikan.');
  bot.stopPolling();
  process.exit(0);
});
