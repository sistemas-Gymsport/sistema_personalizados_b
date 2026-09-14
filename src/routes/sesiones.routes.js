const router = require('express').Router();
const ctrl = require('../controllers/sesiones.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/generar/:personalizadoId', requireRole('ADMIN', 'COLABORADOR'), ctrl.generarParaPersonalizado);
router.post('/', requireRole('ADMIN', 'COLABORADOR'), ctrl.create);
router.put('/:id', requireRole('ADMIN', 'COLABORADOR'), ctrl.update);
router.patch('/:id/realizar', requireRole('ADMIN', 'COLABORADOR'), ctrl.marcarRealizada);

module.exports = router;
