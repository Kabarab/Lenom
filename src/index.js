require('dotenv').config();
const express = require('express');
const cors = require('cors');
const workflowRoutes = require('./api/workflows.routes');
const telegramRoutes = require('./api/telegram.routes');
const webhookRoutes = require('./api/webhook.routes');

const app = express();
const port = process.env.PORT || 3000;

// --- ИЗМЕНЕНИЕ: Настраиваем CORS ---
// Список доменов, которым разрешено обращаться к вашему API
const allowedOrigins = [
  'https://len-frontend-chi.vercel.app', // Ваш фронтенд на Vercel
  'http://localhost:5173' // Для локальной разработки (если порт другой, измените)
];

const corsOptions = {
  origin: function (origin, callback) {
    // Если запрос приходит с одного из разрешенных доменов (или это не браузерный запрос)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

// Используем cors с нашими настройками
app.use(cors(corsOptions));
// --- КОНЕЦ ИЗМЕНЕНИЯ ---


app.use(express.json());

app.use('/api/workflows', workflowRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/webhooks', webhookRoutes);

app.listen(port, () => {
  console.log(`Сервер успешно запущен на порту ${port}`);
});