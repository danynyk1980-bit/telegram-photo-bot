const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();

// Ваши настройки
const BOT_TOKEN = process.env.BOT_TOKEN || '8532887348:AAFUXtJDr4QQoLW3Hw2hPoY23jBD-5PWEXA';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '129488879';
const PRIVACY_LINK = 'https://pr.dp.ru/privacy-policy';

const bot = new TelegramBot(BOT_TOKEN, {polling: true});
let userData = {};

// Команда для полного сброса
bot.onText(/\/reset/, (msg) => {
  const chatId = msg.chat.id;
  userData = {};
  bot.sendMessage(chatId, '✅ Все данные сброшены! Бот готов к работе с чистого листа.');
});

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userData[chatId] = { step: 'name' };
  
  bot.sendMessage(chatId, 
    `👋 Добро пожаловать! \n\nЯ помогу собрать ваши данные и фотографии.\n\n📝 *Шаг 1 из 3:*\nВведите ваше *ФИО* (полностью):`,
    { parse_mode: 'Markdown' }
  );
});

// Обработчик текстовых сообщений
bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userData[chatId]) userData[chatId] = { step: 'name' };

  const user = userData[chatId];

  if (user.step === 'name') {
    user.name = text;
    user.step = 'phone';
    bot.sendMessage(chatId,
      `✅ ФИО сохранено: ${text}\n\n📞 *Шаг 2 из 3:*\nВведите ваш *номер телефона*:`,
      { parse_mode: 'Markdown' }
    );
  } else if (user.step === 'phone') {
    user.phone = text;
    user.step = 'email';
    bot.sendMessage(chatId,
      `✅ Телефон сохранен: ${text}\n\n📧 *Шаг 3 из 3:*\nВведите ваш *email*:`,
      { parse_mode: 'Markdown' }
    );
  } else if (user.step === 'email') {
    user.email = text;
    user.step = 'photo';
    bot.sendMessage(chatId,
      `✅ Email сохранен: ${text}\n\n📄 *Согласие на обработку данных*\n\nПожалуйста, ознакомьтесь с соглашением:\n🔗 [Ссылка на соглашение](${PRIVACY_LINK})\n\n*После ознакомления вы можете:*\n📸 Отправить фотографию (просто прикрепите файл)\n🔄 Начать заново (/start)`,
      { parse_mode: 'Markdown' }
    );
  }
});

// Обработчик фотографий
bot.on('photo', (msg) => {
  const chatId = msg.chat.id;
  const user = userData[chatId];
  
  if (!user || user.step !== 'photo') {
    bot.sendMessage(chatId, '❌ Пожалуйста, сначала заполните данные через /start');
    return;
  }

  const photo = msg.photo[msg.photo.length - 1];
  const fileId = photo.file_id;
  
  // Отправляем данные администратору
  const adminMessage = 
    `📸 *НОВОЕ ФОТО ОТ ПОЛЬЗОВАТЕЛЯ!*\n\n👤 *ФИО:* ${user.name}\n📞 *Телефон:* ${user.phone}\n📧 *Email:* ${user.email}\n🆔 *User ID:* ${chatId}\n⏰ *Время:* ${new Date().toLocaleString('ru-RU')}`;

  // Пересылаем фото администратору
  bot.sendPhoto(ADMIN_CHAT_ID, fileId, {
    caption: adminMessage,
    parse_mode: 'Markdown'
  });

  bot.sendMessage(chatId, 
    '✅ Фото успешно отправлено! Спасибо! 🎉\n\nЕсли нужно отправить еще фото - просто прикрепите файл 📸',
    { parse_mode: 'Markdown' }
  );
});

// Веб-сервер для поддержания активности
app.get('/', (req, res) => {
  res.send('🤖 Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Bot server is running on port ${PORT}`);
});
