const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Backend NG504 activo y listo');
});

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});
