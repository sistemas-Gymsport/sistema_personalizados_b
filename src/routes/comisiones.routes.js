const router = require('express').Router();
const ctrl = require('../controllers/comisiones.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.put('/:id', requireRole('ADMIN'), ctrl.update);
router.post('/recalcular', requireRole('ADMIN'), ctrl.recalcular);

module.exports = router;
