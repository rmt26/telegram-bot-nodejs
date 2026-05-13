require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const token = process.env.TELEGRAM_BOT_TOKEN;

function escapeMarkdown(text) {
  return text.replace(/([*_`\[\]])/g, '\\$1');
}

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
    case 'menu_ytmp3':
      setState(chatId, 'waiting_ytmp3');
      bot.sendMessage(
        chatId,
        '🎵 *YouTube MP3 Downloader*\n\nKirim link YouTube untuk download sebagai MP3.\n\nContoh:\n`https://youtube.com/watch?v=xxxxx`',
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      break;

    case 'menu_pinterest':
      setState(chatId, 'waiting_pinterest');
      bot.sendMessage(
        chatId,
        '📌 *Pencarian Pinterest*\n\nKirim kata kunci untuk mencari gambar.\n\nContoh: `anime aesthetic`',
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      break;

    case 'menu_wiki':
      setState(chatId, 'waiting_wiki');
      bot.sendMessage(
        chatId,
        '🔍 *Pencarian Wikipedia*\n\nKirim kata kunci untuk mencari artikel di Wikipedia.\n\nContoh: `Indonesia`',
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      break;

    case 'menu_meme':
      await sendRandomMeme(chatId);
      break;

    case 'menu_weather':
      setState(chatId, 'waiting_weather');
      bot.sendMessage(
        chatId,
        '🌤 *Cek Cuaca*\n\nKirim nama kota untuk melihat cuaca saat ini.\n\nContoh: `Jakarta`',
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      break;

    case 'menu_quote':
      await sendRandomQuote(chatId);
      break;

    case 'menu_info':
      bot.sendMessage(
        chatId,
        `ℹ️ *Informasi Bot*\n\n` +
          `Versi: 2.1.0\n` +
          `Runtime: Node.js ${process.version}\n` +
          `Platform: ${process.platform}\n` +
          `Uptime: ${Math.floor(process.uptime())} detik\n\n` +
          `Dibuat dengan Node.js & node-telegram-bot-api`,
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
      );
      break;

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

    case 'cancel':
      clearState(chatId);
      bot.sendMessage(chatId, '❌ Dibatalkan.\n\nPilih fitur lain:', mainMenuKeyboard());
      break;

    default:
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

// ============ YOUTUBE MP3 DOWNLOAD (yt-dlp) ============
function isValidYouTubeURL(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)[\w-]+/.test(url);
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 120000, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

async function downloadYTMP3(chatId, url) {
  if (!isValidYouTubeURL(url)) {
    bot.sendMessage(chatId, '❌ URL YouTube tidak valid. Kirim link yang benar.', mainMenuKeyboard());
    return;
  }

  const tmpDir = path.join(require('os').tmpdir(), 'ytmp3-' + Date.now());

  try {
    fs.mkdirSync(tmpDir, { recursive: true });

    bot.sendMessage(chatId, '⏳ Sedang memproses... Tunggu sebentar ya.');

    // Get video info first
    let title = 'audio';
    try {
      const infoJson = await runCommand(
        `yt-dlp --no-playlist --print "%(title)s" "${url}" 2>/dev/null`
      );
      title = infoJson || 'audio';
    } catch (e) {
      // Title fetch failed, continue with default
    }

    // Download audio as mp3
    const outputTemplate = path.join(tmpDir, '%(id)s.%(ext)s');
    const downloadCmd = [
      'yt-dlp',
      '-x',
      '--audio-format mp3',
      '--audio-quality 128K',
      `--max-filesize 50m`,
      '--no-playlist',
      '--no-warnings',
      '-o', `"${outputTemplate}"`,
      `"${url}"`,
    ].join(' ');

    await runCommand(downloadCmd);

    // Find the downloaded mp3 file
    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp3'));
    if (files.length === 0) {
      throw new Error('File MP3 tidak ditemukan setelah download.');
    }

    const filePath = path.join(tmpDir, files[0]);
    const stats = fs.statSync(filePath);

    if (stats.size > 50 * 1024 * 1024) {
      throw new Error('File terlalu besar untuk dikirim via Telegram (maks 50MB).');
    }

    await bot.sendAudio(chatId, filePath, {
      caption: `🎵 ${title}`,
      title: title,
    });

    bot.sendMessage(chatId, 'Pilih fitur lain:', mainMenuKeyboard());
  } catch (error) {
    console.error('YouTube MP3 error:', error.message);

    let errorMsg = '❌ Gagal mendownload audio.';
    if (error.message.includes('not a bot') || error.message.includes('Sign in')) {
      errorMsg = '❌ YouTube memblokir request dari server ini.\n\n' +
        'Pastikan `yt-dlp` terinstall dan jalankan bot dari *HP/PC kamu* (bukan server).';
    } else if (error.message.includes('not found') || error.message.includes('command not found') || error.message.includes('ENOENT')) {
      errorMsg = '❌ `yt-dlp` belum terinstall.\n\n' +
        'Install di Termux:\n`pip install yt-dlp`\n\n' +
        'Install di PC:\n`pip install yt-dlp`';
    } else if (error.message.includes('terlalu besar')) {
      errorMsg = '❌ File terlalu besar (maks 50MB untuk Telegram).';
    }

    bot.sendMessage(chatId, errorMsg, { parse_mode: 'Markdown', ...mainMenuKeyboard() });
  } finally {
    // Cleanup temp directory
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// ============ PINTEREST SEARCH ============
async function searchPinterest(chatId, keyword) {
  try {
    bot.sendMessage(chatId, `🔍 Mencari "${keyword}" di Pinterest...`);

    // Use Pinterest search via HTML scraping
    const response = await axios.get(
      `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 15000,
      }
    );

    // Extract image URLs from Pinterest HTML/JSON
    const html = response.data;
    const images = [];

    // Try extracting from inline JSON data
    const jsonMatch = html.match(/"orig":\s*\{"url":\s*"([^"]+)"/g);
    if (jsonMatch) {
      for (const match of jsonMatch) {
        const urlMatch = match.match(/"url":\s*"([^"]+)"/);
        if (urlMatch && urlMatch[1] && images.length < 5) {
          images.push(urlMatch[1]);
        }
      }
    }

    // Fallback: extract from img tags with pinimg
    if (images.length === 0) {
      const imgMatches = html.match(/https:\/\/i\.pinimg\.com\/[^\s"']+/g);
      if (imgMatches) {
        const uniqueImages = [...new Set(imgMatches)]
          .filter(url => !url.includes('75x75') && !url.includes('70x70'))
          .map(url => url.replace(/\/\d+x\d*\//, '/736x/'))
          .slice(0, 5);
        images.push(...uniqueImages);
      }
    }

    if (images.length === 0) {
      // Fallback to image search
      await searchImagesFallback(chatId, keyword + ' pinterest');
      return;
    }

    const media = images.map((url, i) => ({
      type: 'photo',
      media: url,
      caption: i === 0 ? `📌 Hasil Pinterest: "${keyword}"` : '',
    }));

    await bot.sendMediaGroup(chatId, media);

    bot.sendMessage(chatId, `📌 ${images.length} gambar ditemukan!`, {
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
      await searchImagesFallback(chatId, keyword);
    } catch (fallbackError) {
      console.error('Image search fallback error:', fallbackError.message);
      bot.sendMessage(
        chatId,
        '❌ Gagal mencari gambar. Coba lagi nanti.',
        mainMenuKeyboard()
      );
    }
  }
}

// Fallback image search using Unsplash
async function searchImagesFallback(chatId, keyword) {
  const response = await axios.get(
    `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(keyword)}&per_page=5`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000,
    }
  );

  const results = response.data?.results;
  if (!results || results.length === 0) {
    bot.sendMessage(chatId, `❌ Tidak ditemukan gambar untuk "${keyword}".`, mainMenuKeyboard());
    return;
  }

  const media = results.slice(0, 5).map((photo, i) => ({
    type: 'photo',
    media: photo.urls.regular || photo.urls.small,
    caption: i === 0 ? `📌 Hasil pencarian: "${keyword}"` : '',
  }));

  await bot.sendMediaGroup(chatId, media);

  bot.sendMessage(chatId, 'Pilih fitur lain:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 Cari lagi', callback_data: 'menu_pinterest' }],
        [{ text: '🏠 Menu Utama', callback_data: 'cancel' }],
      ],
    },
  });
}

// ============ WIKIPEDIA SEARCH ============
async function searchWikipedia(chatId, keyword) {
  try {
    bot.sendMessage(chatId, `🔍 Mencari "${keyword}" di Wikipedia...`);

    const response = await axios.get('https://id.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(keyword), {
      timeout: 10000,
    });

    const data = response.data;

    const safeTitle = escapeMarkdown(data.title);
    const safeExtract = escapeMarkdown(data.extract || 'Tidak ada deskripsi.');
    let message = `📖 *${safeTitle}*\n\n${safeExtract}`;

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
      caption: `😂 ${meme.title}\n\n👍 ${meme.ups} upvotes | 📝 r/${meme.subreddit}`,
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
      `🌤 *Cuaca di ${escapeMarkdown(areaName)}, ${escapeMarkdown(country)}*\n\n` +
      `🌡 Suhu: ${current.temp_C}°C (terasa ${current.FeelsLikeC}°C)\n` +
      `💧 Kelembaban: ${current.humidity}%\n` +
      `🌬 Angin: ${current.windspeedKmph} km/h ${current.winddir16Point}\n` +
      `☁️ Kondisi: ${escapeMarkdown(current.weatherDesc[0].value)}\n` +
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
      `💬 _"${escapeMarkdown(quote.content)}"_\n\n— *${escapeMarkdown(quote.author)}*`,
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
