const app = require('./app');

// Render asigna el puerto dinamicamente, nunca se debe fijar uno por defecto
// que no sea de respaldo local.
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API escuchando en el puerto ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
