const router = require('express').Router();
const ctrl = require('../controllers/cortes.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/resumen', ctrl.resumen);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('ADMIN'), ctrl.create);

module.exports = router;
