const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();

// Ваши настройки
const BOT_TOKEN = process.env.BOT_TOKEN || '8532887348:AAFUXtJDr4QQoLW3Hw2hPoY23jBD-5PWEXA';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '129488879';

// Используем webhook вместо polling чтобы избежать конфликтов
const bot = new TelegramBot(BOT_TOKEN);

// Настройка меню бота
bot.setMyCommands([
  {
    command: '/start',
    description: '🚀 Начать работу с ботом'
  }
]);

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  const welcomeMessage = `🎄 *Добро пожаловать, я - бот PR-Елки!*\n\nВ этом году конференции *10 лет*.\n\nМы хотим сделать подборку фотографий за все время существования PR-Елки. Присылайте мне фото, чтобы мы могли использовать их для итогового ролика.\n\nА если вы хотите больше узнать о юбилейной конференции PR-Ёлка 2025 - переходите по ссылке:\nhttps://pr.dp.ru/`;

  // Очищаем клавиатуру
  bot.sendMessage(chatId, 'Загружаем меню...', {
    reply_markup: {
      remove_keyboard: true
    }
  }).then(() => {
    // Отправляем основное сообщение
    bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📸 ПРИСЛАТЬ ФОТО', callback_data: 'send_photo' }],
          [{ text: '🌐 УЗНАТЬ О КОНФЕРЕНЦИИ', url: 'https://pr.dp.ru/' }]
        ]
      }
    });
  }).catch(error => {
    console.log('Ошибка при очистке клавиатуры:', error);
    // Если ошибка - просто отправляем основное сообщение
    bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📸 ПРИСЛАТЬ ФОТО', callback_data: 'send_photo' }],
          [{ text: '🌐 УЗНАТЬ О КОНФЕРЕНЦИИ', url: 'https://pr.dp.ru/' }]
        ]
      }
    });
  });
});

// Обработка нажатия на кнопку "ПРИСЛАТЬ ФОТО"
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  
  if (callbackQuery.data === 'send_photo') {
    // Удаляем кнопку после нажатия
    bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      {
        chat_id: chatId,
        message_id: msg.message_id
      }
    ).catch(error => {
      console.log('Ошибка при удалении кнопки:', error);
    });
    
    // Просим прислать фото
    bot.sendMessage(chatId,
      `📸 *Отлично! Готовы принять ваше фото.*\n\nПросто отправьте фотографию в этот чат.\n\n*Важно:* Фото будет использоваться для создания итогового ролика к 10-летию конференции PR-Ёлка.`,
      { parse_mode: 'Markdown' }
    );
  }
});

// Обработчик фотографий
bot.on('photo', (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'Пользователь';
  const userLastName = msg.from.last_name || '';
  const fullName = `${userName}${userLastName ? ' ' + userLastName : ''}`;
  const username = msg.from.username ? `(@${msg.from.username})` : '';

  const photo = msg.photo[msg.photo.length - 1];
  const fileId = photo.file_id;
  
  const adminMessage = 
    `📸 *НОВОЕ ФОТО ДЛЯ PR-ЁЛКИ!*\n\n👤 *От пользователя:* ${fullName} ${username}\n🆔 *User ID:* ${chatId}\n⏰ *Время отправки:* ${new Date().toLocaleString('ru-RU')}\n\nФото принято для использования в юбилейном ролике к 10-летию конференции.`;

  // Отправляем фото администратору
  bot.sendPhoto(ADMIN_CHAT_ID, fileId, {
    caption: adminMessage,
    parse_mode: 'Markdown'
  });

  // Подтверждаем получение пользователю
  bot.sendMessage(chatId, 
    `✅ *Фото успешно получено! Спасибо за ваш вклад в юбилейный проект!* 🎉\n\nВаше фото будет рассмотрено для использования в итоговом ролике к 10-летию конференции PR-Ёлка.\n\nЕсли хотите отправить еще фото - просто прикрепите файл 📸`,
    { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📸 Отправить еще фото', callback_data: 'send_photo' }],
          [{ text: '🌐 Узнать о конференции', url: 'https://pr.dp.ru/' }]
        ]
      }
    }
  );
});

// Обработчик текстовых сообщений (если пользователь просто пишет текст)
bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  if (msg.photo) return; // Пропускаем фото, они обрабатываются отдельно
  
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId,
    `📸 Я жду от вас фотографии для юбилейного ролика PR-Ёлки!\n\nПросто отправьте фото в этот чат, или нажмите /start для просмотра основной информации.`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📸 Как отправить фото?', callback_data: 'send_photo' }]
        ]
      }
    }
  );
});

// Веб-сервер
app.get('/', (req, res) => {
  res.send('🤖 PR-Ёлка Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 PR-Ёлка Bot server is running on port ${PORT}`);
  
  // Запускаем polling после старта сервера
  bot.startPolling().then(() => {
    console.log('✅ Bot polling started successfully');
  }).catch(error => {
    console.log('❌ Bot polling error:', error);
  });
});
