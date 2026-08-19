const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Variables de entorno desde Render
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Falta SUPABASE_URL o SUPABASE_KEY en las variables de entorno');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- ENDPOINTS / RUTAS DE LA API ---

// Obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear cliente
app.post('/api/clientes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert([req.body])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Registrar cobro
app.put('/api/clientes/:id/cobrar', async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, cobrador } = req.body;
    const pagoMonto = parseFloat(monto);

    // 1. Consultar cliente
    const { data: cliente, error: errCliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (errCliente || !cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const nuevoSaldo = Math.max(0, cliente.saldo_pendiente - pagoMonto);
    const nuevoCobradoHoy = (cliente.cobrado_hoy || 0) + pagoMonto;

    // 2. Actualizar cliente
    const { data: clienteActualizado, error: errUpd } = await supabase
      .from('clientes')
      .update({
        saldo_pendiente: nuevoSaldo,
        cobrado_hoy: nuevoCobradoHoy,
        estado_hoy: 'COBRADO'
      })
      .eq('id', id)
      .select();

    if (errUpd) throw errUpd;

    // 3. Registrar en tabla pagos
    await supabase.from('pagos').insert([{
      cliente_id: id,
      cliente_nombre: cliente.nombre,
      cobrador: cobrador || cliente.cobrador,
      monto: pagoMonto
    }]);

    res.json({ cliente: clienteActualizado[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reasignar cobrador
app.put('/api/clientes/:id/asignar', async (req, res) => {
  try {
    const { id } = req.params;
    const { cobrador } = req.body;

    const { data, error } = await supabase
      .from('clientes')
      .update({ cobrador })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reiniciar jornada diaria
app.post('/api/cierre-diario/reiniciar', async (req, res) => {
  try {
    const { error } = await supabase
      .from('clientes')
      .update({ cobrado_hoy: 0, estado_hoy: 'PENDIENTE' })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // actualiza todos los registros

    if (error) throw error;
    res.json({ mensaje: 'Jornada reiniciada con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor Supabase activo en puerto ${PORT}`));
