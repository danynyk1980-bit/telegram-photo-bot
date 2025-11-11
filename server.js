const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();

// Ваши настройки
const BOT_TOKEN = process.env.BOT_TOKEN || '8532887348:AAFUXtJDr4QQoLW3Hw2hPoY23jBD-5PWEXA';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '129488879';
const PRIVACY_LINK = 'https://pr.dp.ru/privacy-policy';

// Используем webhook вместо polling чтобы избежать конфликтов
const bot = new TelegramBot(BOT_TOKEN);
let userData = {};

// Настройка меню бота
bot.setMyCommands([
  {
    command: '/start',
    description: '🚀 Начать сбор данных и фото'
  },
  {
    command: '/reset', 
    description: '🔄 Сбросить все данные'
  }
]);

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userData[chatId] = { step: 'name' };
  
  // Очищаем клавиатуру (исправленная версия)
  bot.sendMessage(chatId, 'Очищаем предыдущее меню...', {
    reply_markup: {
      remove_keyboard: true
    }
  }).then(() => {
    // Отправляем основное сообщение
    bot.sendMessage(chatId, 
      `👋 *Добро пожаловать в бот PR-Елка - я создан для сбора фотографий со всех PR-Елок за 10 лет!*\n\nЯ буду:\n📝 Собирать ваши контактные данные\n📸 Приму от вас фотографии\n📨 Отправлять всё администратору\n\n*Готовы начать?*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 НАЧАТЬ СБОР ДАННЫХ', callback_data: 'start_data_collection' }]
          ]
        }
      }
    );
  }).catch(error => {
    console.log('Ошибка при очистке клавиатуры:', error);
    // Если ошибка - просто отправляем основное сообщение
    bot.sendMessage(chatId, 
      `👋 *Добро пожаловать в бот для сбора данных и фотографий!*\n\nНажмите кнопку ниже чтобы начать:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 НАЧАТЬ СБОР ДАННЫХ', callback_data: 'start_data_collection' }]
          ]
        }
      }
    );
  });
});

// Обработка нажатия на кнопку "НАЧАТЬ"
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  
  if (callbackQuery.data === 'start_data_collection') {
    userData[chatId] = { step: 'name' };
    
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
    
    // Начинаем сбор данных
    bot.sendMessage(chatId,
      `🎯 *Отлично! Начинаем сбор данных.*\n\n📝 *Шаг 1 из 3:*\nВведите ваше *Имя, должность и название компании*:`,
      { parse_mode: 'Markdown' }
    );
  }
});

// Команда для полного сброса
bot.onText(/\/reset/, (msg) => {
  const chatId = msg.chat.id;
  userData = {};
  bot.sendMessage(chatId, '✅ Все данные сброшены! Бот готов к работе с чистого листа.\n\nНажмите /start чтобы начать заново.');
});

// Обработчик текстовых сообщений
bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userData[chatId]) {
    bot.sendMessage(chatId,
      `👋 Для начала работы отправьте команду */start* или нажмите на неё в меню бота.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const user = userData[chatId];

  if (user.step === 'name') {
    user.name = text;
    user.step = 'phone';
    bot.sendMessage(chatId,
      `✅ *Имя сохранено:* ${text}\n\n📞 *Шаг 2 из 3:*\nВведите ваш *номер телефона*:`,
      { parse_mode: 'Markdown' }
    );
  } else if (user.step === 'phone') {
    user.phone = text;
    user.step = 'email';
    bot.sendMessage(chatId,
      `✅ *Телефон сохранен:* ${text}\n\n📧 *Шаг 3 из 3:*\nВведите ваш *email*:`,
      { parse_mode: 'Markdown' }
    );
  } else if (user.step === 'email') {
    user.email = text;
    user.step = 'photo';
    bot.sendMessage(chatId,
      `✅ *Email сохранен:* ${text}\n\n📄 *Согласие на обработку данных*\n\nПожалуйста, ознакомьтесь с соглашением:\n🔗 [Ссылка на соглашение](${PRIVACY_LINK})\n\n*Отправляя фото, вы подтверждеаете, что согласны на обработку персонаьных данных. После ознакомления вы можете:*\n📸 Отправить фотографию (просто прикрепите файл)\n🔄 Начать заново (/start)`,
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
  
  const adminMessage = 
    `📸 *НОВОЕ ФОТО ОТ ПОЛЬЗОВАТЕЛЯ!*\n\n👤 *ФИО:* ${user.name}\n📞 *Телефон:* ${user.phone}\n📧 *Email:* ${user.email}\n🆔 *User ID:* ${chatId}\n⏰ *Время:* ${new Date().toLocaleString('ru-RU')}`;

  bot.sendPhoto(ADMIN_CHAT_ID, fileId, {
    caption: adminMessage,
    parse_mode: 'Markdown'
  });

  bot.sendMessage(chatId, 
    '✅ *Фото успешно отправлено! Спасибо!* 🎉\n\nЕсли нужно отправить еще фото - просто прикрепите файл 📸',
    { parse_mode: 'Markdown' }
  );
});

// Веб-сервер
app.get('/', (req, res) => {
  res.send('🤖 Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Bot server is running on port ${PORT}`);
  
  // Запускаем polling после старта сервера
  bot.startPolling().then(() => {
    console.log('✅ Bot polling started successfully');
  }).catch(error => {
    console.log('❌ Bot polling error:', error);
  });
});
