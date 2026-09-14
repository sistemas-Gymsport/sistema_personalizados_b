const router = require('express').Router();
const ctrl = require('../controllers/fields.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/definitions', ctrl.listDefinitions);
router.post('/definitions', requireRole('ADMIN'), ctrl.createDefinition);
router.put('/definitions/:id', requireRole('ADMIN'), ctrl.updateDefinition);
router.patch('/definitions/:id/active', requireRole('ADMIN'), ctrl.setActive);

router.get('/values/:entity/:recordId', ctrl.getValues);
router.put('/values/:entity/:recordId', ctrl.setValues);

module.exports = router;
