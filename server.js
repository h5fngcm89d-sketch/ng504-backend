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

// OBTENER CLIENTES
app.get('/api/clientes', async (req, res) => {
  try {
    const { data, error } = await supabase.from('Clientes').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREAR CLIENTE
app.post('/api/clientes', async (req, res) => {
  try {
    const { nombre, monto, direccion, cobrador_id, dias, porcentaje } = req.body;
    const montoNum = Number(monto) || 0;
    const pct = Number(porcentaje) || 20;
    const totalACobrar = montoNum + (montoNum * (pct / 100));

    const { data, error } = await supabase
      .from('Clientes')
      .insert([
        { 
          nombre, 
          monto: montoNum, 
          direccion, 
          cobrador_id,
          dias: Number(dias) || 30,
          porcentaje: pct,
          saldo_pendiente: totalACobrar
        }
      ]);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Cliente registrado', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REGISTRAR PAGO (Ruta simplificada directa)
app.post('/api/pagos', async (req, res) => {
  try {
    const { cliente_id, monto_cobrado } = req.body;

    if (!cliente_id || !monto_cobrado) {
      return res.status(400).json({ error: 'Faltan cliente_id o monto_cobrado' });
    }

    // 1. Traer cliente actual
    const { data: cliente, error: errCliente } = await supabase
      .from('Clientes')
      .select('*')
      .eq('id', cliente_id)
      .maybeSingle();

    if (errCliente || !cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // 2. Calcular saldo
    const totalInicial = Number(cliente.monto) + (Number(cliente.monto) * ((Number(cliente.porcentaje) || 20) / 100));
    const saldoActual = cliente.saldo_pendiente !== null && cliente.saldo_pendiente !== undefined 
      ? Number(cliente.saldo_pendiente) 
      : totalInicial;

    const nuevoSaldo = Math.max(0, saldoActual - Number(monto_cobrado));

    // 3. Actualizar en Supabase
    const { error: errUpdate } = await supabase
      .from('Clientes')
      .update({ saldo_pendiente: nuevoSaldo })
      .eq('id', cliente_id);

    if (errUpdate) {
      return res.status(500).json({ error: errUpdate.message });
    }

    return res.json({ message: 'Pago registrado con éxito', nuevoSaldo });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor listo en puerto ${PORT}`));
