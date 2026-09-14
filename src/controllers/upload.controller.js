const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');

// Cloudinary se usa EXCLUSIVAMENTE para imagenes (logos, recursos graficos).
// Los PDFs nunca se suben aqui.
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

const uploadImage = asyncHandler(async (req, res) => {
  if (!cloudinary.isConfigured) {
    throw new ApiError(503, 'El servicio de imagenes no esta configurado (Cloudinary). Contacta al administrador.');
  }
  if (!req.file) throw new ApiError(400, 'No se recibio ningun archivo.');
  if (!ALLOWED_MIME.includes(req.file.mimetype)) {
    throw new ApiError(400, 'Formato de imagen no permitido. Usa PNG, JPG, WEBP o SVG.');
  }

  const folder = req.body.folder === 'theme' ? 'gymsport/theme' : 'gymsport/formatos';

  let result;
  try {
    result = await uploadBuffer(req.file.buffer, folder);
  } catch (err) {
    console.error('[Cloudinary] Fallo al subir imagen:', err.message);
    throw new ApiError(502, 'No fue posible subir la imagen. Intenta de nuevo en unos momentos.');
  }

  sendSuccess(res, 201, {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  });
});

const deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) throw new ApiError(400, 'publicId es obligatorio.');
  if (!cloudinary.isConfigured) {
    throw new ApiError(503, 'El servicio de imagenes no esta configurado (Cloudinary). Contacta al administrador.');
  }
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.error('[Cloudinary] Fallo al eliminar imagen:', err.message);
    throw new ApiError(502, 'No fue posible eliminar la imagen anterior.');
  }
  sendSuccess(res, 200, { deleted: true });
});

module.exports = { uploadImage, deleteImage };
