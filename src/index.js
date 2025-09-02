require('dotenv').config();
const express = require('express');
const cors = require('cors');
const workflowRoutes = require('./api/workflows.routes');
const telegramRoutes = require('./api/telegram.routes');
const webhookRoutes = require('./api/webhook.routes');
const secretsRoutes = require('./api/secrets.routes'); // --- ДОБАВЛЕНО ---

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  'https://len-frontend-chi.vercel.app',
  'http://localhost:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/workflows', workflowRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/secrets', secretsRoutes); // --- ДОБАВЛЕНО ---

app.listen(port, () => {
  console.log(`Сервер успешно запущен на порту ${port}`);
});