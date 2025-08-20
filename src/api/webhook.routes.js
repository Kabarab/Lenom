const { Router } = require('express');
const db = require('../config/firebase');
const { executeWorkflow } = require('../services/execution.service');
const router = Router();

router.post('/telegram/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const telegramUpdate = req.body;

  console.log(`Получен вебхук для workflowId: ${workflowId}`);
  console.log('Данные от Telegram:', JSON.stringify(telegramUpdate, null, 2));

  try {
    const doc = await db.collection('workflows').doc(workflowId).get();
    if (!doc.exists) {
      console.error(`Процесс с ID ${workflowId} не найден`);
      return res.sendStatus(404);
    }

    const workflow = doc.data();

    // Передаем данные из вебхука в движок
    await executeWorkflow(workflow.nodes, workflow.edges, telegramUpdate);

    res.sendStatus(200);

  } catch (error) {
    console.error(`Ошибка при выполнении вебхука для workflowId: ${workflowId}`, error);
    res.sendStatus(500);
  }
});

module.exports = router;
