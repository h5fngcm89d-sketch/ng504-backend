const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/', (req, res) => {
  res.send('Backend NG504 activo');
});

// OBTENER CLIENTES (GET)
app.get('/api/clientes', async (req, res) => {
  const { data, error } = await supabase.from('Clientes').select('*');
  if (error) {
    console.error('Error Supabase:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// GUARDAR CLIENTE (POST)
app.post('/api/clientes', async (req, res) => {
  const { nombre, monto, direccion, cobrador_id, dias, porcentaje } = req.body;

  const { data, error } = await supabase
    .from('Clientes')
    .insert([
      { 
        nombre, 
        monto, 
        direccion, 
        cobrador_id,
        dias: dias || null,
        porcentaje: porcentaje || null
      }
    ]);

  if (error) {
    console.error('Error Supabase:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: 'Cliente guardado', data });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
