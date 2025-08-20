const { Router } = require('express');
const axios = require('axios');
const router = Router();

// Маршрут для получения последнего Chat ID
router.post('/get-chat-id', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Токен не предоставлен' });
  }

  const getUpdatesUrl = `https://api.telegram.org/bot${token}/getUpdates`;

  try {
    // Перед получением обновлений удаляем вебхук, чтобы избежать конфликта
    try {
      const deleteWebhookUrl = `https://api.telegram.org/bot${token}/deleteWebhook`;
      await axios.get(deleteWebhookUrl);
      console.log('Вебхук успешно удален (если он был установлен).');
    } catch (error) {
      // Мы можем проигнорировать ошибку, так как вебхук мог быть и не установлен.
      // Логируем для информации, но не прерываем процесс.
      console.warn('Не удалось удалить вебхук. Возможно, он не был установлен.');
    }

    const response = await axios.get(getUpdatesUrl);
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

    const webhookUrl = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`}/api/webhooks/telegram/${workflowId}`;
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

// --- НОВЫЙ МАРШРУТ ---
// Маршрут для удаления вебхука
router.post('/delete-webhook', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ message: 'Токен не предоставлен' });
    }
    const telegramApiUrl = `https://api.telegram.org/bot${token}/deleteWebhook`;
    try {
        const response = await axios.get(telegramApiUrl);
        if (response.data.ok) {
            res.json({ success: true, message: 'Вебхук успешно удален.' });
        } else {
            throw new Error(response.data.description);
        }
    } catch (error) {
        console.error("Ошибка удаления вебхука:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: `Ошибка удаления вебхука: ${error.message}` });
    }
});

module.exports = router;
