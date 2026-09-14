const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/sucursales', require('./sucursales.routes'));
router.use('/instructores', require('./instructores.routes'));
router.use('/paquetes', require('./paquetes.routes'));
router.use('/socios', require('./socios.routes'));
router.use('/catalogos', require('./catalogos.routes'));
router.use('/personalizados', require('./personalizados.routes'));
router.use('/sesiones', require('./sesiones.routes'));
router.use('/comisiones', require('./comisiones.routes'));
router.use('/cortes', require('./cortes.routes'));
router.use('/fields', require('./fields.routes'));
router.use('/formatos', require('./formatos.routes'));
router.use('/upload', require('./upload.routes'));
router.use('/theme', require('./theme.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
