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
      // Берем ID чата из самого последнего сообщения
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

module.exports = router;