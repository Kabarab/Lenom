const db = require('../config/firebase');
const executionService = require('../services/execution.service');

const workflowsCollection = db.collection('workflows');
const secretsCollection = db.collection('user_secrets'); // --- ДОБАВЛЕНО ---

// Проверяем принадлежность документа пользователю
const checkOwnership = async (docId, userId) => {
    const doc = await workflowsCollection.doc(docId).get();
    if (!doc.exists || doc.data().userId !== userId) {
        return false;
    }
    return doc;
};

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
    const { name, nodes, edges } = req.body;

    const newWorkflowData = {
      name: name,
      enabled: true,
      userId: userId,
      nodes: nodes || [],
      edges: edges || []
    };
    
    const docRef = await workflowsCollection.add(newWorkflowData);
    res.status(201).json({ id: docRef.id, ...newWorkflowData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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

        // --- ДОБАВЛЕНО: Получаем ключи пользователя ---
        const secretsDoc = await secretsCollection.doc(req.user.uid).get();
        const secrets = secretsDoc.exists ? secretsDoc.data() : {};
        
        // Добавляем секреты в узлы, если они там не определены
        const nodesWithSecrets = workflow.nodes.map(node => {
            const newNode = { ...node, data: { ...node.data } };
            switch(node.type) {
                case 'telegramTrigger':
                case 'telegram':
                    if (!newNode.data.botToken && secrets.telegram) newNode.data.botToken = secrets.telegram;
                    break;
                case 'chatGPT':
                    if (!newNode.data.apiKey && secrets.openai) newNode.data.apiKey = secrets.openai;
                    break;
                case 'yandexgpt':
                    if (!newNode.data.apiKey && secrets.yandex) newNode.data.apiKey = secrets.yandex;
                    if (!newNode.data.folderId && secrets.yandexFolderId) newNode.data.folderId = secrets.yandexFolderId;
                    break;
                case 'huggingFace':
                    if (!newNode.data.hfToken && secrets.huggingface) newNode.data.hfToken = secrets.huggingface;
                    break;
                case 'deepseek':
                    if (!newNode.data.apiKey && secrets.deepseek) newNode.data.apiKey = secrets.deepseek;
                    break;
            }
            return newNode;
        });


        const testTriggerData = {
          message: {
            text: "Это тестовый запуск!",
            chat: { id: "12345" }
          }
        };

        const result = await executionService.executeWorkflow(nodesWithSecrets, workflow.edges, testTriggerData); 
        res.json(result);
    } catch (error) {
        console.error("Критическая ошибка при запуске процесса:", error);
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