// Envuelve controladores async para propagar errores al middleware central
// sin necesidad de try/catch repetido en cada handler.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
