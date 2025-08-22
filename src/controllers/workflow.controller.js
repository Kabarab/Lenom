const db = require('../config/firebase');
const executionService = require('../services/execution.service');
const axios = require('axios'); // Добавляем axios для запросов к Telegram

const workflowsCollection = db.collection('workflows');

// READ (All)
const getAllWorkflows = async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await workflowsCollection.where('userId', '==', userId).get();
    const workflows = [];
    snapshot.forEach(doc => {
      workflows.push({ id: doc.id, ...doc.data() });
    });
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE
const createWorkflow = async (req, res) => {
  try {
    const userId = req.user.uid;
    const newWorkflowData = {
      ...req.body,
      userId: userId,
      nodes: [],
      edges: []
    };
    const docRef = await workflowsCollection.add(newWorkflowData);
    res.status(201).json({ id: docRef.id, ...newWorkflowData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Проверяем принадлежность документа пользователю
const checkOwnership = async (docId, userId) => {
    const doc = await workflowsCollection.doc(docId).get();
    if (!doc.exists || doc.data().userId !== userId) {
        return false;
    }
    return doc;
};

// READ (One)
const getWorkflowById = async (req, res) => {
    try {
        const doc = await checkOwnership(req.params.id, req.user.uid);
        if (!doc) {
            return res.status(404).json({ message: 'Процесс не найден или у вас нет к нему доступа' });
        }
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE
const updateWorkflow = async (req, res) => {
    try {
        const doc = await checkOwnership(req.params.id, req.user.uid);
        if (!doc) {
            return res.status(404).json({ message: 'Процесс не найден или у вас нет к нему доступа' });
        }
        await workflowsCollection.doc(req.params.id).set(req.body, { merge: true });
        res.json({ message: `Процесс с ID ${req.params.id} обновлен.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE
const deleteWorkflow = async (req, res) => {
    try {
        const doc = await checkOwnership(req.params.id, req.user.uid);
        if (!doc) {
            return res.status(404).json({ message: 'Процесс не найден или у вас нет к нему доступа' });
        }
        await workflowsCollection.doc(req.params.id).delete();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- СУЩЕСТВЕННЫЕ ИЗМЕНЕНИЯ В ЛОГИКЕ ЗАПУСКА ---
// RUN
const runWorkflow = async (req, res) => {
    try {
        const doc = await checkOwnership(req.params.id, req.user.uid);
        if (!doc) {
            return res.status(404).json({ message: 'Процесс не найден или у вас нет к нему доступа' });
        }
        const workflow = doc.data();

        // 1. Находим триггер в процессе
        const triggerNode = workflow.nodes.find(n => n.type === 'telegramTrigger');
        if (!triggerNode || !triggerNode.data.botToken) {
            return res.status(400).json({ message: 'Не найден Telegram-триггер с токеном бота в этом процессе.' });
        }

        // 2. Получаем последнее сообщение от Telegram
        const getUpdatesUrl = `https://api.telegram.org/bot${triggerNode.data.botToken}/getUpdates`;
        const tgResponse = await axios.get(getUpdatesUrl);
        const updates = tgResponse.data.result;

        if (!updates || updates.length === 0) {
            return res.status(404).json({ message: 'Не найдено ни одного сообщения для этого бота. Отправьте ему что-нибудь для теста.' });
        }
        
        // 3. Используем самое последнее обновление как тестовые данные
        const lastUpdate = updates[updates.length - 1];

        // 4. Запускаем процесс с реальными данными и правильным типом триггера
        const result = await executionService.executeWorkflow(workflow.nodes, workflow.edges, lastUpdate, 'TELEGRAM');
        res.json(result);

    } catch (error) {
        console.error("Ошибка при ручном запуске:", error.response?.data || error.message);
        res.status(500).json({ message: `Ошибка при ручном запуске: ${error.message}` });
    }
};


module.exports = {
  getAllWorkflows,
  createWorkflow,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  runWorkflow,
};