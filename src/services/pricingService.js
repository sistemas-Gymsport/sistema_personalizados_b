// Calculo centralizado del total de un personalizado, para no duplicar la
// formula en el controlador, el recibo impreso y cualquier reporte futuro.
// total = subtotal (precio de venta) - descuento + recargos + cargoExtra
function computeTotal({ salePrice, descuento = 0, recargos = 0, cargoExtra = 0 }) {
  const value = Number(salePrice) - Number(descuento) + Number(recargos) + Number(cargoExtra);
  return Math.round(value * 100) / 100;
}

module.exports = { computeTotal };
