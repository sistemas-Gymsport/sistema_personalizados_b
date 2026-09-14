const router = require('express').Router();
const ctrl = require('../controllers/theme.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

// Publico: la pantalla de bienvenida y el login necesitan el tema antes de autenticar.
router.get('/', ctrl.getTheme);
router.put('/', requireAuth, requireRole('ADMIN'), ctrl.updateTheme);

module.exports = router;
