const { Router } = require('express');
const db = require('../config/firebase');
const { executeWorkflow } = require('../services/execution.service');
const router = Router();

router.post('/telegram/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const telegramUpdate = req.body;

  console.log(`[Webhook] Получен запрос для workflowId: ${workflowId}`);
  console.log('[Webhook] Данные от Telegram:', JSON.stringify(telegramUpdate, null, 2));

  try {
    const doc = await db.collection('workflows').doc(workflowId).get();
    if (!doc.exists) {
      console.error(`[Webhook] ОШИБКА: Процесс с ID ${workflowId} не найден в базе данных.`);
      return res.status(404).send('Workflow not found.');
    }

    const workflow = doc.data();
    console.log(`[Webhook] Процесс "${workflow.name}" найден. Запускаем выполнение...`);

    // Передаем данные из вебхука и ЯВНО указываем тип триггера
    await executeWorkflow(workflow.nodes, workflow.edges, telegramUpdate, 'TELEGRAM');

    console.log(`[Webhook] Процесс для workflowId: ${workflowId} успешно запущен.`);
    res.sendStatus(200); // Отвечаем Telegram, что все хорошо

  } catch (error) {
    console.error(`[Webhook] КРИТИЧЕСКАЯ ОШИБКА при выполнении процесса ${workflowId}:`, error);
    res.sendStatus(500); // Отвечаем Telegram, что у нас произошла ошибка
  }
});

module.exports = router;