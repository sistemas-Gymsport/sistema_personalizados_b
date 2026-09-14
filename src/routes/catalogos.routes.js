const router = require('express').Router();
const ctrl = require('../controllers/catalogos.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/items', ctrl.listItems);
router.post('/items', requireRole('ADMIN'), ctrl.createItem);
router.put('/items/:id', requireRole('ADMIN'), ctrl.updateItem);
router.patch('/items/:id/active', requireRole('ADMIN'), ctrl.setItemActive);

router.get('/margins', ctrl.listMargins);
router.post('/margins', requireRole('ADMIN'), ctrl.createMargin);
router.put('/margins/:id', requireRole('ADMIN'), ctrl.updateMargin);
router.patch('/margins/:id/active', requireRole('ADMIN'), ctrl.setMarginActive);

router.get('/commission-rules', ctrl.listCommissionRules);
router.post('/commission-rules', requireRole('ADMIN'), ctrl.createCommissionRule);
router.patch('/commission-rules/:id/active', requireRole('ADMIN'), ctrl.setCommissionRuleActive);

module.exports = router;
