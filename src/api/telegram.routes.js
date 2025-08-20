const { Router } = require('express');
const axios = require('axios');
const router = Router();

// Маршрут для получения последнего Chat ID
router.post('/get-chat-id', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Токен не предоставлен' });
  }

  const url = `https://api.telegram.org/bot${token}/getUpdates`;

  try {
    const response = await axios.get(url);
    const updates = response.data.result;

    if (updates && updates.length > 0) {
      const lastUpdate = updates[updates.length - 1];
      const chatId = lastUpdate.message?.chat?.id || lastUpdate.edited_message?.chat?.id || lastUpdate.channel_post?.chat?.id;
      if (chatId) {
        res.json({ chatId });
      } else {
        res.status(404).json({ message: 'Не удалось найти ID чата в обновлениях.' });
      }
    } else {
      res.status(404).json({ message: 'Нет сообщений для этого бота. Отправьте ему сообщение.' });
    }
  } catch (error) {
    console.error("Ошибка API Telegram:", error.response?.data);
    res.status(500).json({ message: 'Ошибка при обращении к API Telegram.' });
  }
});

// Маршрут для автоматической установки вебхука
router.post('/set-webhook', async (req, res) => {
    const { token, workflowId } = req.body;
    if (!token || !workflowId) {
        return res.status(400).json({ message: 'Токен или ID процесса не предоставлены' });
    }

    // ИЗМЕНЕНИЕ: Используем переменную окружения для публичного URL
    const backendUrl = process.env.BACKEND_URL || `http://localhost:3000`;
    const webhookUrl = `${backendUrl}/api/webhooks/telegram/${workflowId}`;
    const telegramApiUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;

    try {
        const response = await axios.get(telegramApiUrl);
        if (response.data.ok) {
            res.json({ success: true, message: `Вебхук успешно установлен на ${webhookUrl}` });
        } else {
            throw new Error(response.data.description);
        }
    } catch (error) {
        console.error("Ошибка установки вебхука:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: `Ошибка установки вебхука: ${error.message}` });
    }
});

module.exports = router;
