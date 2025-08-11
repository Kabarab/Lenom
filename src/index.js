require('dotenv').config();
const express = require('express');
const cors = require('cors');
const workflowRoutes = require('./api/workflows.routes');
const telegramRoutes = require('./api/telegram.routes');
const webhookRoutes = require('./api/webhook.routes'); // 1. Импортируем

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/workflows', workflowRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/webhooks', webhookRoutes); // 2. Подключаем

app.listen(port, () => {
  console.log(`Сервер успешно запущен на порту ${port}`);
});
