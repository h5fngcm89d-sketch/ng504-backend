const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = process.env.SUPABASE_URL || 'TU_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'TU_SUPABASE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// REGLA FINANCIERA: Cálculo de fecha fin excluyendo domingos
function calcularFechaFin(fechaInicio, cuotas, frecuencia) {
  let fecha = new Date(fechaInicio);
  if (frecuencia === 'SEMANAL') {
    fecha.setDate(fecha.getDate() + (cuotas * 7));
    return fecha.toISOString().split('T')[0];
  }
  
  let cuotasContadas = 0;
  while (cuotasContadas < cuotas) {
    fecha.setDate(fecha.getDate() + 1);
    if (fecha.getDay() !== 0) { // Excluir Domingos (0)
      cuotasContadas++;
    }
  }
  return fecha.toISOString().split('T')[0];
}

// 1. ENDPOINT: CREAR PRÉSTAMO CON REGLA SIN DOMINGOS
app.post('/api/prestamos', async (req, res) => {
  const { cliente_id, monto_prestado, interes_porcentaje, cantidad_cuotas, frecuencia, fecha_inicio } = req.body;
  
  const monto = Number(monto_prestado);
  const interes = Number(interes_porcentaje);
  const monto_total = monto + (monto * (interes / 100));
  const valor_cuota = monto_total / Number(cantidad_cuotas);
  const fecha_fin = calcularFechaFin(fecha_inicio, Number(cantidad_cuotas), frecuencia);

  const { data, error } = await supabase.from('prestamos').insert([{
    cliente_id,
    monto_prestado: monto,
    interes_porcentaje: interes,
    monto_total,
    cantidad_cuotas: Number(cantidad_cuotas),
    frecuencia,
    valor_cuota,
    fecha_inicio,
    fecha_fin,
    estado: 'ACTIVO'
  }]).select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// 2. ENDPOINT: DASHBOARD GENERAL (ADMINISTRADOR)
app.get('/api/dashboard', async (req, res) => {
  const { data: prestamos } = await supabase.from('prestamos').select('*, pagos(*)');
  const { data: gastos } = await supabase.from('gastos').select('*');

  let capitalEnCalle = 0;
  let cobradoHoy = 0;
  let gananciaGenerada = 0;
  let totalGastos = 0;

  const hoyStr = new Date().toISOString().split('T')[0];

  prestamos?.forEach(p => {
    const totalPagado = p.pagos?.reduce((acc, pago) => acc + Number(pago.monto_cobrado), 0) || 0;
    const saldoPendiente = Math.max(0, Number(p.monto_total) - totalPagado);
    capitalEnCalle += saldoPendiente;

    p.pagos?.forEach(pago => {
      if (pago.fecha_pago.startsWith(hoyStr)) {
        cobradoHoy += Number(pago.monto_cobrado);
      }
    });

    const proporcionInteres = Number(p.interes_porcentaje) / (100 + Number(p.interes_porcentaje));
    gananciaGenerada += (totalPagado * proporcionInteres);
  });

  gastos?.forEach(g => {
    if (g.fecha.startsWith(hoyStr)) totalGastos += Number(g.monto);
  });

  res.json({
    capitalEnCalle,
    cobradoHoy,
    gananciaGenerada,
    gastosHoy: totalGastos,
    cajaSaldo: cobradoHoy - totalGastos
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NG504 Backend listo en puerto ${PORT}`));
