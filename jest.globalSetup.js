// Zona horaria fija para que los tests de medianoche y cambio de hora
// den el mismo resultado en cualquier ordenador.
module.exports = async () => {
  process.env.TZ = 'Europe/Madrid';
};
