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
  res.send('Backend NG504 activo con modulo de cobranza v2');
});

// OBTENER CLIENTES
app.get('/api/clientes', async (req, res) => {
  try {
    const { data, error } = await supabase.from('Clientes').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error clientes:', err);
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

    if (error) throw error;
    res.json({ message: 'Cliente registrado', data });
  } catch (err) {
    console.error('Error al guardar cliente:', err);
    res.status(500).json({ error: err.message });
  }
});

// REGISTRAR PAGO
app.post('/api/pagos', async (req, res) => {
  try {
    const { cliente_id, monto_cobrado, cobrador_id } = req.body;

    if (!cliente_id || !monto_cobrado) {
      return res.status(400).json({ error: 'Faltan datos requeridos (cliente u monto)' });
    }

    // 1. Consultar cliente actual
    const { data: cliente, error: errCliente } = await supabase
      .from('Clientes')
      .select('*')
      .eq('id', cliente_id)
      .single();

    if (errCliente || !cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Calcular saldo
    const totalInicial = Number(cliente.monto) + (Number(cliente.monto) * ((Number(cliente.porcentaje) || 20) / 100));
    let saldoActual = cliente.saldo_pendiente !== null && cliente.saldo_pendiente !== undefined 
      ? Number(cliente.saldo_pendiente) 
      : totalInicial;

    const nuevoSaldo = Math.max(0, saldoActual - Number(monto_cobrado));

    // 2. Intentar registrar el pago (si la tabla Pagos existe)
    try {
      await supabase.from('Pagos').insert([{ 
        cliente_id: cliente_id, 
        monto_cobrado: Number(monto_cobrado), 
        cobrador_id: String(cobrador_id || 'cobrador') 
      }]);
    } catch (e) {
      console.log('Tabla Pagos opcional con aviso:', e);
    }

    // 3. Actualizar el saldo en la tabla Clientes
    const { error: errUpdate } = await supabase
      .from('Clientes')
      .update({ saldo_pendiente: nuevoSaldo })
      .eq('id', cliente_id);

    if (errUpdate) throw errUpdate;

    res.json({ message: 'Pago exitoso', nuevoSaldo });
  } catch (err) {
    console.error('Error general en pago:', err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
