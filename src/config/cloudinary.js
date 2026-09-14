const cloudinary = require('cloudinary').v2;

const REQUIRED_VARS = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

// Se valida al arrancar el servidor (no al primer intento de subida) para
// que el problema aparezca de inmediato en los logs de Render, con un
// mensaje claro en vez de un stack trace generico de la libreria.
if (missing.length > 0) {
  console.error(
    `[Cloudinary] Configuracion incompleta: falta(n) ${missing.join(', ')}. ` +
      'Las subidas de imagenes fallaran hasta que se configuren estas variables de entorno.'
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

cloudinary.isConfigured = missing.length === 0;

module.exports = cloudinary;
