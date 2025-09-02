const { Router } = require('express');
const secretsController = require('../controllers/secrets.controller');
const isAuthenticated = require('../middleware/auth.middleware');
const router = Router();

router.use(isAuthenticated);

router.get('/', secretsController.getSecrets);
router.post('/', secretsController.updateSecrets);

module.exports = router;

