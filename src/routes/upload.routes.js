const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/upload.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.use(requireAuth, requireRole('ADMIN'));

router.post('/image', upload.single('file'), ctrl.uploadImage);
router.delete('/image', ctrl.deleteImage);

module.exports = router;
