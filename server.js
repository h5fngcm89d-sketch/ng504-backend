const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Ruta principal de prueba
app.get('/', (req, res) => {
  res.send('Backend NG504 activo y listo');
});

// Obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
  const { data, error } = await supabase.from('Clientes').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Agregar nuevo cliente desde la app (Camilo o Felipe)
app.post('/api/clientes', async (req, res) => {
  const { nombre, monto, direccion, cobrador_id } = req.body;
  const { data, error } = await supabase.from('Clientes').insert([
    { Nombre: nombre, Monto: monto, Direccion: direccion, Cobrador_id: cobrador_id }
  ]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Cliente guardado con éxito', data });
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});
