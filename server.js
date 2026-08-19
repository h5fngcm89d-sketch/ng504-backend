const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Conexión a MongoDB (Usa tu propia URI de MongoDB Atlas)
const MONGO_URI = process.env.MONGO_URI || 'TU_MONGO_URI_AQUI';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch((err) => console.error('❌ Error conectando a MongoDB:', err));

// 2. Modelo de Cliente
const ClienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  direccion: { type: String, default: 'Sin Dirección' },
  telefono: { type: String, default: 'N/A' },
  saldo_pendiente: { type: Number, required: true },
  valor_cuota: { type: Number, required: true },
  dias_atrasado: { type: Number, default: 0 },
  cobrador: { type: String, default: 'Felipe' },
  cobrado_hoy: { type: Number, default: 0 },
  estado_hoy: { type: String, default: 'PENDIENTE' } // 'PENDIENTE' o 'COBRADO'
}, { timestamps: true });

const Cliente = mongoose.model('Cliente', ClienteSchema);

// 3. Modelo de Historial de Pagos (Auditoría)
const PagoSchema = new mongoose.Schema({
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
  clienteNombre: String,
  cobrador: String,
  monto: Number,
  fecha: { type: Date, default: Date.now }
});

const Pago = mongoose.model('Pago', PagoSchema);

// --- ENDPOINTS / RUTAS DE LA API ---

// Obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ createdAt: -1 });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Crear nuevo cliente
app.post('/api/clientes', async (req, res) => {
  try {
    const nuevoCliente = new Cliente(req.body);
    await nuevoCliente.save();
    res.status(201).json(nuevoCliente);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear cliente' });
  }
});

// Registrar cobro / abono (Bloquea el pago diario)
app.put('/api/clientes/:id/cobrar', async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, cobrador } = req.body;
    const pagoMonto = parseFloat(monto);

    const cliente = await Cliente.findById(id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    cliente.saldo_pendiente = Math.max(0, cliente.saldo_pendiente - pagoMonto);
    cliente.cobrado_hoy = (cliente.cobrado_hoy || 0) + pagoMonto;
    cliente.estado_hoy = 'COBRADO';

    await cliente.save();

    // Guardar en el historial inalterable de pagos
    const nuevoPago = new Pago({
      clienteId: cliente._id,
      clienteNombre: cliente.nombre,
      cobrador: cobrador || cliente.cobrador,
      monto: pagoMonto
    });
    await nuevoPago.save();

    res.json({ cliente, pago: nuevoPago });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar el cobro' });
  }
});

// Reasignar cobrador a cliente
app.put('/api/clientes/:id/asignar', async (req, res) => {
  try {
    const { id } = req.params;
    const { cobrador } = req.body;

    const cliente = await Cliente.findByIdAndUpdate(
      id,
      { cobrador },
      { new: true }
    );
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: 'Error al reasignar cliente' });
  }
});

// Reiniciar jornada diaria (Cierre de caja - pone todos los cobros en PENDIENTE)
app.post('/api/cierre-diario/reiniciar', async (req, res) => {
  try {
    await Cliente.updateMany({}, {
      cobrado_hoy: 0,
      estado_hoy: 'PENDIENTE'
    });
    res.json({ mensaje: 'Jornada reiniciada con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al reiniciar la jornada' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`));
