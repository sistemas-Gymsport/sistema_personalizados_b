const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');

// Configuracion visual unica (fila "default"). Se crea automaticamente si no existe.
async function getOrCreateTheme() {
  const existing = await prisma.themeConfig.findUnique({ where: { id: 'default' } });
  if (existing) return existing;
  return prisma.themeConfig.create({ data: { id: 'default' } });
}

const getTheme = asyncHandler(async (req, res) => {
  const theme = await getOrCreateTheme();
  sendSuccess(res, 200, theme);
});

const updateTheme = asyncHandler(async (req, res) => {
  await getOrCreateTheme();
  const {
    systemName,
    primaryColor,
    secondaryColor,
    backgroundColor,
    textColor,
    buttonColor,
    logoUrl,
    logoPublicId,
    faviconUrl,
    faviconPublicId,
    welcomeMessage,
  } = req.body;

  const data = {};
  if (systemName !== undefined) data.systemName = systemName;
  if (primaryColor !== undefined) data.primaryColor = primaryColor;
  if (secondaryColor !== undefined) data.secondaryColor = secondaryColor;
  if (backgroundColor !== undefined) data.backgroundColor = backgroundColor;
  if (textColor !== undefined) data.textColor = textColor;
  if (buttonColor !== undefined) data.buttonColor = buttonColor;
  if (logoUrl !== undefined) data.logoUrl = logoUrl;
  if (logoPublicId !== undefined) data.logoPublicId = logoPublicId;
  if (faviconUrl !== undefined) data.faviconUrl = faviconUrl;
  if (faviconPublicId !== undefined) data.faviconPublicId = faviconPublicId;
  if (welcomeMessage !== undefined) data.welcomeMessage = welcomeMessage;

  const theme = await prisma.themeConfig.update({ where: { id: 'default' }, data });
  sendSuccess(res, 200, theme);
});

module.exports = { getTheme, updateTheme };
