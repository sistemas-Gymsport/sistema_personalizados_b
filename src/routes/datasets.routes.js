const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/datasets.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// Sin requireAuth: pensado para ser llamado por un scheduler externo con un
// secreto compartido (ver datasets.controller.js#cleanupExpired).
router.post('/cleanup', ctrl.cleanupExpired);

router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/rows', ctrl.getRows);
router.post('/', requireRole('ADMIN', 'COLABORADOR'), upload.single('file'), ctrl.upload);
router.delete('/:id', requireRole('ADMIN', 'COLABORADOR'), ctrl.remove);

module.exports = router;
