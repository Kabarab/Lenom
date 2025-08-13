require('dotenv').config();
const express = require('express');
const cors = require('cors');
const workflowRoutes = require('./api/workflows.routes');
const telegramRoutes = require('./api/telegram.routes');
const webhookRoutes = require('./api/webhook.routes');

const app = express();
const port = process.env.PORT || 3000;

// --- НАЧАЛО ВАЖНЫХ ИЗМЕНЕНИЙ ---

// Создаем объект с настройками для CORS
const corsOptions = {
  // Явно указываем, с какого "источника" (адреса) мы разрешаем запросы.
  // Вставьте сюда URL вашего фронтенда на Vercel.
  origin: 'https://len-frontend-chi.vercel.app',
  optionsSuccessStatus: 200
};

// Используем cors с нашими новыми, строгими настройками.
app.use(cors(corsOptions));

// --- КОНЕЦ ВАЖНЫХ ИЗМЕНЕНИЙ ---

app.use(express.json());

app.use('/api/workflows', workflowRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/webhooks', webhookRoutes);

app.listen(port, () => {
  console.log(`Сервер успешно запущен на порту ${port}`);
});