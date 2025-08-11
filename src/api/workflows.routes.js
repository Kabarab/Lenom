const { Router } = require('express');
const workflowController = require('../controllers/workflow.controller');
const isAuthenticated = require('../middleware/auth.middleware'); // 1. Импортируем "охранника"
const router = Router();

// 2. Ставим "охранника" перед всеми маршрутами.
// Теперь ни один из этих запросов не пройдет без валидного токена.
router.use(isAuthenticated); 

router.get('/', workflowController.getAllWorkflows);
router.post('/', workflowController.createWorkflow);
router.get('/:id', workflowController.getWorkflowById);
router.put('/:id', workflowController.updateWorkflow);
router.delete('/:id', workflowController.deleteWorkflow);
router.post('/:id/run', workflowController.runWorkflow);

module.exports = router;
