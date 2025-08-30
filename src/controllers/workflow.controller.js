const db = require('../config/firebase');
const executionService = require('../services/execution.service');
const axios = require('axios');

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

// --- ИЗМЕНЕНИЕ: Улучшаем функцию создания ---
// CREATE
const createWorkflow = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name, nodes, edges } = req.body; // Получаем имя и опционально узлы/связи

    const newWorkflowData = {
      name: name,
      enabled: true, // Всегда включаем при создании
      userId: userId,
      // Если узлы и связи переданы, используем их, иначе создаем пустые массивы
      nodes: nodes || [],
      edges: edges || []
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

// RUN
const runWorkflow = async (req, res) => {
    try {
        const doc = await checkOwnership(req.params.id, req.user.uid);
        if (!doc) {
            return res.status(404).json({ message: 'Процесс не найден или у вас нет к нему доступа' });
        }
        const workflow = doc.data();

        const testTriggerData = {
          message: {
            text: "Это тестовый запуск!",
            chat: { id: "12345" }
          }
        };

        const result = await executionService.executeWorkflow(workflow.nodes, workflow.edges, testTriggerData); 
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
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