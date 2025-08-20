require('dotenv').config();
const express = require('express');
const cors = require('cors');
const workflowRoutes = require('./api/workflows.routes');
const telegramRoutes = require('./api/telegram.routes');
const webhookRoutes = require('./api/webhook.routes');

const app = express();
const port = process.env.PORT || 3000;

// Используем cors без настроек, что по умолчанию означает "разрешить всем".
// Это самый надежный способ для решения проблем с CORS в разных браузерах.
app.use(cors());

app.use(express.json());

app.use('/api/workflows', workflowRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/webhooks', webhookRoutes);

app.listen(port, () => {
  console.log(`Сервер успешно запущен на порту ${port}`);
});
