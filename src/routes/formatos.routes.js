const router = require('express').Router();
const ctrl = require('../controllers/formatos.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/impresiones', ctrl.listImpresiones);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('ADMIN'), ctrl.create);
router.put('/:id', requireRole('ADMIN'), ctrl.update);
router.post('/:id/duplicar', requireRole('ADMIN'), ctrl.duplicate);
router.patch('/:id/active', requireRole('ADMIN'), ctrl.setActive);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);
router.post('/:id/imprimir', ctrl.registrarImpresion);

module.exports = router;
