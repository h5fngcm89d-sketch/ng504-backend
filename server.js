const express = require('express');
const { createClient } = require('@supabase/supabase-supabase-js');
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

// Guardar cliente
app.post('/api/clientes', async (req, res) => {
  const { nombre, monto, direccion, cobrador_id } = req.body;
  
  const { data, error } = await supabase
    .from('Clientes')
    .insert([
      { 
        nombre: nombre, 
        monto: monto, 
        direccion: direccion, 
        cobrador_id: cobrador_id 
      }
    ]);

  if (error) {
    console.error('Error Supabase:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: 'Cliente guardado con éxito', data });
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Servidor en puerto ${port}`));
