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
  res.send('Backend NG504 activo con modulo de cobranza');
});

// OBTENER CLIENTES Y CALCULAR SALDOS
app.get('/api/clientes', async (req, res) => {
  const { data, error } = await supabase.from('Clientes').select('*');
  if (error) {
    console.error('Error Supabase:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// GUARDAR CLIENTE NUEVO (Inicializa saldo pendiente)
app.post('/api/clientes', async (req, res) => {
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
        dias: dias || 30,
        porcentaje: pct,
        saldo_pendiente: totalACobrar
      }
    ]);

  if (error) {
    console.error('Error Supabase:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: 'Cliente registrado con éxito', data });
});

// REGISTRAR UN PAGO / COBRO DIARIO
app.post('/api/pagos', async (req, res) => {
  const { cliente_id, monto_cobrado, cobrador_id } = req.body;

  if (!cliente_id || !monto_cobrado) {
    return res.status(400).json({ error: 'Faltan datos del cobro' });
  }

  // 1. Registrar el pago en la tabla Pagos
  const { data: pagoData, error: pagoError } = await supabase
    .from('Pagos')
    .insert([{ cliente_id, monto_cobrado: Number(monto_cobrado), cobrador_id }]);

  if (pagoError) {
    console.error('Error al guardar pago:', pagoError);
    return res.status(500).json({ error: pagoError.message });
  }

  // 2. Consultar el cliente para actualizar su saldo pendiente
  const { data: cliente, error: clienteError } = await supabase
    .from('Clientes')
    .select('saldo_pendiente, monto, porcentaje')
    .eq('id', cliente_id)
    .single();

  if (clienteError) {
    return res.status(500).json({ error: clienteError.message });
  }

  // Si el saldo pendiente no existía, calcularlo
  let saldoActual = cliente.saldo_pendiente;
  if (saldoActual === null || saldoActual === undefined) {
    const totalInicial = cliente.monto + (cliente.monto * (cliente.porcentaje / 100));
    saldoActual = totalInicial;
  }

  const nuevoSaldo = Math.max(0, saldoActual - Number(monto_cobrado));

  // 3. Actualizar el nuevo saldo en la base de datos
  const { error: updateError } = await supabase
    .from('Clientes')
    .update({ saldo_pendiente: nuevoSaldo })
    .eq('id', cliente_id);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  res.json({ message: 'Pago registrado correctamente', nuevoSaldo });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
