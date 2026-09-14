const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/summary', ctrl.summary);
router.get('/por-instructor', ctrl.porInstructor);

module.exports = router;
