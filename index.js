require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');
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
          { text: '📁 Sfile.co', callback_data: 'menu_sfile' },
          { text: '⬇️ Sfile Download', callback_data: 'menu_sfile_dl' },
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
    case 'menu_sfile':
      setState(chatId, 'waiting_sfile_search');
      bot.sendMessage(
        chatId,
        '📁 *Pencarian Sfile.co*\n\nKirim kata kunci untuk mencari file di Sfile.co.\n\nContoh: `config http custom`',
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      break;

    case 'menu_sfile_dl':
      setState(chatId, 'waiting_sfile_download');
      bot.sendMessage(
        chatId,
        '⬇️ *Download Sfile.co*\n\nKirim link Sfile.co untuk download file.\n\nContoh:\n`https://sfile.co/xxxxxxx`',
        { parse_mode: 'Markdown', ...cancelKeyboard() }
      );
      break;

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
          `Versi: 3.0.0\n` +
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
          '/sfile <kata kunci> - Cari file di Sfile.co\n' +
          '/sfdl <url> - Download file dari Sfile.co\n' +
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
      if (data.startsWith('sfile_dl_')) {
        const fileId = data.replace('sfile_dl_', '');
        downloadSfile(chatId, `https://sfile.co/${fileId}`);
      } else if (data.startsWith('sfile_page_')) {
        const parts = data.replace('sfile_page_', '').split('_');
        const page = parseInt(parts.pop(), 10);
        const keyword = parts.join('_');
        searchSfile(chatId, keyword, page);
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

bot.onText(/\/sfile\s+(.+)/, (msg, match) => {
  searchSfile(msg.chat.id, match[1].trim());
});

bot.onText(/\/sfdl\s+(.+)/, (msg, match) => {
  downloadSfile(msg.chat.id, match[1].trim());
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

    case 'waiting_sfile_search':
      clearState(chatId);
      searchSfile(chatId, text.trim());
      break;

    case 'waiting_sfile_download':
      clearState(chatId);
      downloadSfile(chatId, text.trim());
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

// ============ SFILE.CO SEARCH ============
const SFILE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en;q=0.7',
};

async function searchSfile(chatId, keyword, page = 1) {
  try {
    bot.sendMessage(chatId, `🔍 Mencari "${keyword}" di Sfile.co...`);

    const url = `https://sfile.co/search?q=${encodeURIComponent(keyword)}${page > 1 ? `&p=${page}` : ''}`;
    const response = await axios.get(url, {
      headers: SFILE_HEADERS,
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const files = [];

    $('a.search-result-link[data-file-url]').each((i, el) => {
      if (files.length >= 10) return false;
      const fileUrl = $(el).attr('data-file-url');
      const fileName = $(el).text().trim();
      const sizeText = $(el).closest('.group').find('p.text-xs').text().trim();

      if (fileUrl && fileName && !files.some(f => f.url === fileUrl)) {
        const fileId = fileUrl.replace('https://sfile.co/', '');
        files.push({
          name: fileName,
          size: sizeText,
          url: fileUrl,
          id: fileId,
        });
      }
    });

    if (files.length === 0) {
      bot.sendMessage(chatId, `❌ Tidak ditemukan file untuk "${keyword}".`, mainMenuKeyboard());
      return;
    }

    // Extract total results
    const totalText = $('h1').text();
    const totalMatch = totalText.match(/([\d.]+)\s*results?/);
    const totalResults = totalMatch ? totalMatch[1] : '?';

    let message = `📁 *Hasil pencarian Sfile.co*\nQuery: "${escapeMarkdown(keyword)}"\nTotal: ${totalResults} hasil | Halaman ${page}\n\n`;

    files.forEach((file, i) => {
      message += `${i + 1}. *${escapeMarkdown(file.name)}*\n    ${file.size}\n\n`;
    });

    message += 'Pilih file untuk download:';

    // Create file buttons (max 5 per row, 2 columns)
    const buttons = [];
    for (let i = 0; i < files.length; i += 2) {
      const row = [{ text: `${i + 1}. ${files[i].name.substring(0, 25)}`, callback_data: `sfile_dl_${files[i].id}` }];
      if (i + 1 < files.length) {
        row.push({ text: `${i + 2}. ${files[i + 1].name.substring(0, 25)}`, callback_data: `sfile_dl_${files[i + 1].id}` });
      }
      buttons.push(row);
    }

    // Navigation buttons
    const navRow = [];
    if (page > 1) {
      navRow.push({ text: '⬅️ Sebelumnya', callback_data: `sfile_page_${keyword}_${page - 1}` });
    }
    navRow.push({ text: '➡️ Selanjutnya', callback_data: `sfile_page_${keyword}_${page + 1}` });
    buttons.push(navRow);
    buttons.push([{ text: '🔄 Cari lagi', callback_data: 'menu_sfile' }, { text: '🏠 Menu', callback_data: 'cancel' }]);

    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (error) {
    console.error('Sfile search error:', error.message);
    bot.sendMessage(chatId, '❌ Gagal mencari file di Sfile.co. Coba lagi nanti.', mainMenuKeyboard());
  }
}

// ============ SFILE.CO DOWNLOAD ============
async function downloadSfile(chatId, url) {
  // Validate URL
  const sfileMatch = url.match(/(?:https?:\/\/)?(?:www\.)?sfile\.(?:co|mobi)\/(\w+)/);
  if (!sfileMatch) {
    bot.sendMessage(chatId, '❌ URL Sfile.co tidak valid.\n\nContoh: `https://sfile.co/xxxxxxx`', { parse_mode: 'Markdown', ...mainMenuKeyboard() });
    return;
  }

  const fileId = sfileMatch[1];
  const filePageUrl = `https://sfile.co/${fileId}`;

  try {
    bot.sendMessage(chatId, '⏳ Mengambil info file dari Sfile.co...');

    // Fetch file page
    const response = await axios.get(filePageUrl, {
      headers: SFILE_HEADERS,
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    // Extract file info
    const ogTitle = $('meta[property="og:title"]').attr('content') || 'Unknown';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const downloadUrl = $('#download').attr('data-dw-url');

    // Parse file info from description
    const sizeMatch = ogDesc.match(/size\s+([\d.]+\s*\w+)/i);
    const fileSize = sizeMatch ? sizeMatch[1] : 'Unknown';
    const uploaderMatch = ogDesc.match(/uploaded by\s+(\w+)/i);
    const uploader = uploaderMatch ? uploaderMatch[1] : 'Unknown';
    const dateMatch = ogDesc.match(/on\s+(\d+\s+\w+\s+\d+)/i);
    const uploadDate = dateMatch ? dateMatch[1] : 'Unknown';

    if (!downloadUrl) {
      bot.sendMessage(
        chatId,
        `📁 *${escapeMarkdown(ogTitle)}*\n\n` +
          `📦 Ukuran: ${fileSize}\n` +
          `👤 Uploader: ${uploader}\n` +
          `📅 Tanggal: ${uploadDate}\n\n` +
          `❌ Link download tidak tersedia. File mungkin sudah dihapus.\n\n` +
          `🔗 Buka manual: [Klik disini](${filePageUrl})`,
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
      );
      return;
    }

    // Parse file size to check if we can send via Telegram (max 50MB)
    const sizeMB = parseSizeToMB(fileSize);
    const canSendViaTelegram = sizeMB > 0 && sizeMB <= 50;

    if (canSendViaTelegram) {
      bot.sendMessage(chatId, `⬇️ Mendownload *${escapeMarkdown(ogTitle)}* (${fileSize})...`, { parse_mode: 'Markdown' });

      try {
        // Download the file
        const dlResponse = await axios.get(downloadUrl, {
          headers: {
            ...SFILE_HEADERS,
            'Referer': filePageUrl,
          },
          responseType: 'arraybuffer',
          timeout: 120000,
          maxContentLength: 50 * 1024 * 1024,
        });

        const tmpDir = path.join(require('os').tmpdir(), 'sfile-' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });

        const fileName = ogTitle.replace(/[^\w\s.-]/g, '').trim() || 'file';
        const filePath = path.join(tmpDir, fileName);

        fs.writeFileSync(filePath, dlResponse.data);

        await bot.sendDocument(chatId, filePath, {
          caption: `📁 ${ogTitle}\n📦 ${fileSize} | 👤 ${uploader}`,
        });

        // Cleanup
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }

        bot.sendMessage(chatId, 'Pilih fitur lain:', mainMenuKeyboard());
      } catch (dlError) {
        console.error('Sfile direct download error:', dlError.message);
        // Fallback: send the link
        bot.sendMessage(
          chatId,
          `📁 *${escapeMarkdown(ogTitle)}*\n\n` +
            `📦 Ukuran: ${fileSize}\n` +
            `👤 Uploader: ${uploader}\n` +
            `📅 Tanggal: ${uploadDate}\n\n` +
            `⚠️ Gagal download otomatis. Silakan download manual:\n` +
            `🔗 [Klik untuk download](${filePageUrl})`,
          { parse_mode: 'Markdown', ...mainMenuKeyboard() }
        );
      }
    } else {
      // File too large, send link only
      bot.sendMessage(
        chatId,
        `📁 *${escapeMarkdown(ogTitle)}*\n\n` +
          `📦 Ukuran: ${fileSize}\n` +
          `👤 Uploader: ${uploader}\n` +
          `📅 Tanggal: ${uploadDate}\n\n` +
          `⚠️ File terlalu besar untuk dikirim via Telegram (maks 50MB).\n` +
          `🔗 [Klik untuk download](${filePageUrl})`,
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
      );
    }
  } catch (error) {
    console.error('Sfile download error:', error.message);
    bot.sendMessage(
      chatId,
      `❌ Gagal mengambil info file.\n\n🔗 Coba buka manual: [${filePageUrl}](${filePageUrl})`,
      { parse_mode: 'Markdown', ...mainMenuKeyboard() }
    );
  }
}

function parseSizeToMB(sizeStr) {
  const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|bytes?)/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  switch (unit) {
    case 'GB': return value * 1024;
    case 'MB': return value;
    case 'KB': return value / 1024;
    default: return value / (1024 * 1024);
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
