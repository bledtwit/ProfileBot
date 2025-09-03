/**
 * src/index.js
 * Portfolio Bot — clean start (с доработками)
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID && String(process.env.ADMIN_ID);
const PORT = process.env.PORT || 3000;

if (!TOKEN || !ADMIN_ID) {
  console.error('❌ TELEGRAM_TOKEN или ADMIN_ID не заданы в .env');
  process.exit(1);
}

(async () => {
  const bot = new TelegramBot(TOKEN, { polling: true });

  // Express для health-check
  const app = express();
  app.get('/', (req, res) => res.send('Portfolio Bot — running'));
  app.listen(PORT, () => console.log(`🚀 HTTP server listening on ${PORT}`));

  // Главное меню
  const welcomeText = `Привет! Я бот-помощник канала @javafriendch.
Выберите действие 👇`;

  const mainMenu = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🤖 Заказать бота', callback_data: 'order' }],
        [{ text: '👨‍💻 Узнать обо мне', callback_data: 'about' }],
        [{ text: '💰 Поддержать меня', callback_data: 'support' }],
        [{ text: '❓ Помощь', callback_data: 'help' }]
      ]
    }
  };

  // /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id; // ⚠️ получаем chatId из сообщения
    await bot.sendMessage(chatId, 'Привет! Я бот-помощник канала @javafriendch.\nВыберите действие 👇', {
      reply_markup: {
        remove_keyboard: true // убираем старую клавиатуру
      }
    });

    // показываем главное меню с inline кнопками
    await bot.sendMessage(chatId, 'Выберите действие 👇', mainMenu);
  });


  // Временное хранилище для заявок
  const userStates = new Map(); // userId -> { step, data }

  // Нажатия кнопок
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const state = userStates.get(chatId);

    if (data === 'order') {
      userStates.set(chatId, { step: 1, data: {} });
      await bot.sendMessage(chatId, 'Введите ваше имя:');
    } else if (data === 'confirm_order' && state && state.step === 4) {
      // Отправляем админу
      const orderText = `📢 Новая заявка на бота!\n\n` +
        `👤 Имя: ${state.data.name}\n` +
        `📝 Задачи: ${state.data.tasks}\n` +
        `⏰ Срок: ${state.data.deadline}`;

      await bot.sendMessage(process.env.ADMIN_ID, orderText);
      await bot.sendMessage(chatId, '✅ Ваша заявка отправлена! Ожидайте ответа.', mainMenu);
      userStates.delete(chatId);
    } else if (data === 'cancel_order') {
      await bot.sendMessage(chatId, '❌ Заявка отменена.', mainMenu);
      userStates.delete(chatId);
    } else {
      switch (data) {
        case 'about':
          await bot.sendMessage(chatId,
        `👨‍💻 Обо мне:
      Я — Java Backend разработчик.
      Создаю современные бэкенд-сервисы и телеграм-ботов.

        📂 Мои проекты:`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🌐 GitHub', url: 'https://github.com/bledtwit' }],
                [{ text: '💱 FinanceBot', url: 'https://github.com/bledtwit/financebot' }],
                [{ text: '🖥 Мой сайт', url: 'https://bledtwit.github.io/' }],
                [{ text: '⬅️ В меню', callback_data: 'main_menu' }]
              ]
            }
          });
          break;
          case 'main_menu':
            await bot.sendMessage(chatId, welcomeText, mainMenu);
            break;

        case 'support':
          await bot.sendMessage(chatId,
        `☕ Буду рад вашей поддержке!

        Подписка на Boosty помогает развивать проекты и делать новых ботов.`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🚀 Boosty', url: 'https://boosty.to/bledtwit' }],
                [{ text: '⬅️ В меню', callback_data: 'main_menu' }]
              ]
            }
          });
          break;
        case 'help':
           // помечаем, что пользователь в режиме отправки вопроса
           userStates.set(chatId, { step: 'help' });
           await bot.sendMessage(chatId,
         `💬 Если у вас появились вопросы, напишите их мне, и я отвечу лично.`);
           break;
        default:
          await bot.sendMessage(chatId, 'Неизвестная кнопка.', mainMenu);
      }
    }

    try { await bot.answerCallbackQuery(query.id); } catch {}
  });

  // Ловим текстовые ответы пользователей
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates.get(chatId);

    if (!state) return; // если нет активного сценария — игнорим

    const text = msg.text?.trim();
    if (!text) return;


// проверяем, находится ли пользователь в режиме помощи
if (state.step === 'help') {
  const questionText = msg.text?.trim();
  if (questionText) {
    // отправляем админу
    await bot.sendMessage(ADMIN_ID,
`📩 Вопрос от @${msg.from?.username || msg.from?.first_name}:\n\n${questionText}`);

    // подтверждение пользователю
    await bot.sendMessage(chatId, '✅ Ваш вопрос отправлен! Я свяжусь с вами в ближайшее время.');

    // удаляем состояние
    userStates.delete(chatId);
  }
  return; // дальше ничего не делаем
}

    if (state.step === 1) {
      state.data.name = text;
      state.step = 2;
      await bot.sendMessage(chatId, 'Введите задачи, которые должен выполнять бот:');
    } else if (state.step === 2) {
      state.data.tasks = text;
      state.step = 3;
      await bot.sendMessage(chatId, 'Введите срок выполнения:');
    } else if (state.step === 3) {
      state.data.deadline = text;
      state.step = 4;

      const summary = `📩 Ваша заявка:\n\n` +
        `👤 Имя: ${state.data.name}\n` +
        `📝 Задачи: ${state.data.tasks}\n` +
        `⏰ Срок: ${state.data.deadline}\n\n` +
        `Все верно?`;

      await bot.sendMessage(chatId, summary, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Да', callback_data: 'confirm_order' }],
            [{ text: '❌ Отмена', callback_data: 'cancel_order' }]
          ]
        }
      });
    }
  });

  console.log('✅ Bot started (polling)');
})();
