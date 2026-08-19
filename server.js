import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';

const API_URL = 'https://ng504-backend.onrender.com/api';

export default function App() {
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [rolActual, setRolActual] = useState('ADMINISTRADOR'); 
  const [cobradorActivo, setCobradorActivo] = useState(''); 
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Modales
  const [clienteSel, setClienteSel] = useState(null);
  const [montoCobro, setMontoCobro] = useState('');
  const [modalCobroVisible, setModalCobroVisible] = useState(false);

  const [clienteAsignar, setClienteAsignar] = useState(null);
  const [modalAsignarVisible, setModalAsignarVisible] = useState(false);

  // Modal Nuevo Cliente
  const [modalNuevoClienteVisible, setModalNuevoClienteVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDireccion, setNuevaDireccion] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoMontoTotal, setNuevoMontoTotal] = useState('');
  const [nuevaCuota, setNuevaCuota] = useState('');
  const [diasAtraso, setDiasAtraso] = useState('0');

  useEffect(() => {
    if (usuarioLogueado) {
      cargarDatos();
    }
  }, [usuarioLogueado]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const resC = await fetch(`${API_URL}/clientes`);
      if (resC.ok) {
        const data = await resC.json();
        setClientes(data);
      } else {
        Alert.alert('Error', 'No se pudieron obtener los datos del servidor.');
      }
    } catch (e) {
      console.log('Error de red al cargar clientes:', e);
      Alert.alert('Error de conexión', 'Verifica tu conexión a internet.');
    } finally {
      setCargando(false);
    }
  };

  const iniciarSesion = () => {
    const emailClean = emailInput.trim().toLowerCase();
    const passClean = passwordInput.trim();

    if (!emailClean || !passClean) {
      Alert.alert('Error', 'Por favor ingresa correo y contraseña.');
      return;
    }

    if (emailClean === 'admin@ng504.com' && passClean === 'admin123') {
      setUsuarioLogueado({ email: emailClean, nombre: 'Dueño / Admin', rol: 'ADMINISTRADOR' });
      setRolActual('ADMINISTRADOR');
      setCobradorActivo('');
    } else if (emailClean === 'felipe@ng504.com' && passClean === 'felipe123') {
      setUsuarioLogueado({ email: emailClean, nombre: 'Felipe', rol: 'COBRADOR' });
      setRolActual('COBRADOR');
      setCobradorActivo('Felipe');
    } else if (emailClean === 'camilo@ng504.com' && passClean === 'camilo123') {
      setUsuarioLogueado({ email: emailClean, nombre: 'Camilo', rol: 'COBRADOR' });
      setRolActual('COBRADOR');
      setCobradorActivo('Camilo');
    } else {
      Alert.alert('Acceso Denegado', 'Credenciales incorrectas');
    }
  };

  const cerrarSesion = () => {
    setUsuarioLogueado(null);
    setEmailInput('');
    setPasswordInput('');
  };

  const agregarCliente = async () => {
    if (!nuevoNombre || !nuevoMontoTotal || !nuevaCuota) {
      Alert.alert('Campos Incompletos', 'Completa Nombre, Préstamo Total y Cuota.');
      return;
    }

    const cobradorAsignado = rolActual === 'COBRADOR' ? cobradorActivo : 'Felipe';

    const clienteData = {
      nombre: nuevoNombre,
      direccion: nuevaDireccion || 'Sin Dirección',
      telefono: nuevoTelefono || 'N/A',
      saldo_pendiente: parseFloat(nuevoMontoTotal),
      valor_cuota: parseFloat(nuevaCuota),
      dias_atrasado: parseInt(diasAtraso) || 0,
      cobrador: cobradorAsignado,
      cobrado_hoy: 0,
      estado_hoy: 'PENDIENTE'
    };

    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteData)
      });

      if (res.ok) {
        Alert.alert('Éxito', `Cliente asignado a la ruta de ${cobradorAsignado}`);
        setNuevoNombre('');
        setNuevaDireccion('');
        setNuevoTelefono('');
        setNuevoMontoTotal('');
        setNuevaCuota('');
        setDiasAtraso('0');
        setModalNuevoClienteVisible(false);
        cargarDatos();
      } else {
        Alert.alert('Error', 'No se pudo guardar el cliente en el servidor.');
      }
    } catch (e) {
      Alert.alert('Error', 'Problema al conectar con la base de datos.');
    } finally {
      setCargando(false);
    }
  };

  const registrarCobro = async () => {
    if (!montoCobro || parseFloat(montoCobro) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido.');
      return;
    }

    const idCliente = clienteSel._id || clienteSel.id;

    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/clientes/${idCliente}/cobrar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: parseFloat(montoCobro),
          cobrador: cobradorActivo
        })
      });

      if (res.ok) {
        setModalCobroVisible(false);
        setMontoCobro('');
        Alert.alert('Pago Confirmado', 'El pago ha sido registrado y bloqueado en la nube.');
        cargarDatos();
      } else {
        Alert.alert('Error', 'Ocurrió un error al procesar el pago.');
      }
    } catch (e) {
      Alert.alert('Error', 'Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const asignarCobradorACliente = async (nombreCobrador) => {
    if (!clienteAsignar) return;
    const idCliente = clienteAsignar._id || clienteAsignar.id;

    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/clientes/${idCliente}/asignar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cobrador: nombreCobrador })
      });

      if (res.ok) {
        setModalAsignarVisible(false);
        setClienteAsignar(null);
        Alert.alert('Éxito', `Cliente asignado a la ruta de ${nombreCobrador}`);
        cargarDatos();
      } else {
        Alert.alert('Error', 'No se pudo reasignar el cliente.');
      }
    } catch (e) {
      Alert.alert('Error', 'Error de red al actualizar.');
    } finally {
      setCargando(false);
    }
  };

  const reiniciarJornada = async () => {
    Alert.alert(
      'Reiniciar Jornada Diaria',
      '¿Deseas restablecer las listas de cobro de todos los cobradores para un nuevo día?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Reiniciar',
          onPress: async () => {
            setCargando(true);
            try {
              const res = await fetch(`${API_URL}/cierre-diario/reiniciar`, { method: 'POST' });
              if (res.ok) {
                Alert.alert('Jornada Reiniciada', 'Todas las listas están listas para el nuevo día.');
                cargarDatos();
              }
            } catch (e) {
              Alert.alert('Error', 'No se pudo hacer el cierre de jornada.');
            } finally {
              setCargando(false);
            }
          }
        }
      ]
    );
  };

  // Cálculos para cobrador activo
  const clientesCobrador = clientes.filter(c => (c.cobrador || 'Felipe') === cobradorActivo);
  const clientesAtrasadosCobrador = clientesCobrador.filter(c => c.dias_atrasado > 0);
  
  const recaudoMetaDia = clientesCobrador.reduce((acc, c) => acc + (c.valor_cuota || 0), 0);
  const cobradoHastaElMomento = clientesCobrador.reduce((acc, c) => acc + (c.cobrado_hoy || 0), 0);
  const pendienteHoy = Math.max(0, recaudoMetaDia - cobradoHastaElMomento);

  // Cálculos para Administrador
  const capitalEnCalle = clientes.reduce((acc, c) => acc + (c.saldo_pendiente || 0), 0);
  const cobradoHoyTotal = clientes.reduce((acc, c) => acc + (c.cobrado_hoy || 0), 0);

  const cobradoFelipe = clientes
    .filter(c => (c.cobrador || 'Felipe') === 'Felipe')
    .reduce((acc, c) => acc + (c.cobrado_hoy || 0), 0);

  const cobradoCamilo = clientes
    .filter(c => c.cobrador === 'Camilo')
    .reduce((acc, c) => acc + (c.cobrado_hoy || 0), 0);

  const fmt = (num) => '$ ' + Math.round(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (!usuarioLogueado) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>NG504</Text>
          <Text style={styles.loginSubtitle}>Sistema de Gestión y Cobranza</Text>

          <Text style={styles.inputLabel}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="ejemplo@ng504.com"
            placeholderTextColor="#9ca3af"
            value={emailInput}
            onChangeText={setEmailInput}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            value={passwordInput}
            onChangeText={setPasswordInput}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.btnLogin} onPress={iniciarSesion}>
            <Text style={styles.btnLoginText}>INGRESAR AL SISTEMA</Text>
          </TouchableOpacity>

          <Text style={[styles.demoTitle, { marginTop: 18, textAlign: 'center' }]}>Accesos directos:</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <TouchableOpacity 
              style={[styles.btnQuick, { backgroundColor: '#1f2937' }]}
              onPress={() => { setEmailInput('admin@ng504.com'); setPasswordInput('admin123'); }}
            >
              <Text style={styles.btnQuickText}>Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnQuick, { backgroundColor: '#2563eb' }]}
              onPress={() => { setEmailInput('felipe@ng504.com'); setPasswordInput('felipe123'); }}
            >
              <Text style={styles.btnQuickText}>Felipe</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnQuick, { backgroundColor: '#ea580c' }]}
              onPress={() => { setEmailInput('camilo@ng504.com'); setPasswordInput('camilo123'); }}
            >
              <Text style={styles.btnQuickText}>Camilo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>NG504</Text>
          <Text style={styles.headerSubtitle}>
            {usuarioLogueado.nombre} [{rolActual}]
          </Text>
        </View>

        <TouchableOpacity style={styles.btnLogout} onPress={cerrarSesion}>
          <Text style={styles.btnLogoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {cargando && (
        <View style={styles.loadingBar}>
          <ActivityIndicator color="#ffffff" size="small" />
          <Text style={styles.loadingText}>Sincronizando datos...</Text>
        </View>
      )}

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* VISTA ADMINISTRADOR */}
        {rolActual === 'ADMINISTRADOR' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={styles.greetingTag}>CONTROL CENTRAL</Text>
                <Text style={styles.mainTitle}>Administración</Text>
              </View>
              <TouchableOpacity 
                style={styles.btnNuevoCliente}
                onPress={() => setModalNuevoClienteVisible(true)}
              >
                <Text style={styles.btnNuevoClienteText}>+ Cliente</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.grid}>
              <View style={styles.cardHalf}>
                <Text style={styles.cardIcon}>💰</Text>
                <Text style={styles.cardLabel}>Capital en Calle</Text>
                <Text style={styles.cardValue}>{fmt(capitalEnCalle)}</Text>
              </View>

              <View style={styles.cardHalf}>
                <Text style={styles.cardIcon}>✅</Text>
                <Text style={styles.cardLabel}>Cobrado Hoy Total</Text>
                <Text style={styles.cardValue}>{fmt(cobradoHoyTotal)}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.btnReiniciarJornada} onPress={reiniciarJornada}>
              <Text style={styles.btnReiniciarJornadaText}>🔄 REINICIAR COBROS PARA NUEVO DÍA</Text>
            </TouchableOpacity>

            <View style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>Recaudación Hoy por Cobrador</Text>

              <View style={styles.cobradorRow}>
                <View>
                  <Text style={styles.cobradorNombre}>🏍️ Ruta Felipe</Text>
                  <Text style={styles.cobradorSub}>
                    Clientes: {clientes.filter(c => (c.cobrador || 'Felipe') === 'Felipe').length}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cobradorMonto}>{fmt(cobradoFelipe)}</Text>
                </View>
              </View>

              <View style={[styles.cobradorRow, { borderBottomWidth: 0 }]}>
                <View>
                  <Text style={styles.cobradorNombre}>🏍️ Ruta Camilo</Text>
                  <Text style={styles.cobradorSub}>
                    Clientes: {clientes.filter(c => c.cobrador === 'Camilo').length}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cobradorMonto}>{fmt(cobradoCamilo)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>Base General ({clientes.length})</Text>

              {clientes.length === 0 ? (
                <Text style={styles.emptyText}>No hay clientes registrados en la nube.</Text>
              ) : (
                clientes.map((item) => (
                  <View key={item._id || item.id} style={styles.clienteAdminCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clienteNombre}>{item.nombre}</Text>
                      <Text style={styles.clienteSub}>📍 {item.direccion || 'Sin dirección'}</Text>
                      <Text style={styles.badgeCobrador}>
                        Ruta: <Text style={{ fontWeight: 'bold', color: '#1d4ed8' }}>{item.cobrador || 'Felipe'}</Text>
                        {item.estado_hoy === 'COBRADO' && <Text style={{ color: '#15803d', fontWeight: 'bold' }}> | ✅ Cobrado ({fmt(item.cobrado_hoy)})</Text>}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.btnAsignar}
                      onPress={() => { setClienteAsignar(item); setModalAsignarVisible(true); }}
                    >
                      <Text style={styles.btnAsignarText}>Cambiar Ruta</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* VISTA COBRADOR */}
        {rolActual === 'COBRADOR' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={styles.greetingTag}>HOJA DE RUTA</Text>
                <Text style={styles.mainTitle}>Ruta de {cobradorActivo}</Text>
              </View>
              <TouchableOpacity 
                style={styles.btnNuevoCliente}
                onPress={() => setModalNuevoClienteVisible(true)}
              >
                <Text style={styles.btnNuevoClienteText}>+ Nuevo Cliente</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.grid}>
              <View style={[styles.cardHalf, { backgroundColor: '#1e293b' }]}>
                <Text style={[styles.cardLabel, { color: '#94a3b8' }]}>Cobrado Hoy</Text>
                <Text style={[styles.cardValue, { color: '#4ade80', fontSize: 20 }]}>{fmt(cobradoHastaElMomento)}</Text>
              </View>

              <View style={[styles.cardHalf, { backgroundColor: '#ffffff' }]}>
                <Text style={styles.cardLabel}>Por Cobrar Hoy</Text>
                <Text style={[styles.cardValue, { color: '#e11d48', fontSize: 20 }]}>{fmt(pendienteHoy)}</Text>
              </View>
            </View>

            {clientesAtrasadosCobrador.length > 0 && (
              <View style={styles.alertBox}>
                <Text style={styles.alertText}>
                  ⚠️ Tienes <Text style={{ fontWeight: '900' }}>{clientesAtrasadosCobrador.length} cliente(s)</Text> atrasados.
                </Text>
              </View>
            )}

            <Text style={[styles.cardSectionTitle, { marginBottom: 10, marginTop: 5 }]}>
              Clientes Asignados ({clientesCobrador.length})
            </Text>

            {clientesCobrador.length === 0 ? (
              <View style={styles.sectionCard}>
                <Text style={{ textAlign: 'center', color: '#6b7280' }}>
                  No tienes clientes en tu hoja de ruta hoy.
                </Text>
              </View>
            ) : (
              clientesCobrador.map((item) => {
                const yaCobrado = item.estado_hoy === 'COBRADO';

                return (
                  <View 
                    key={item._id || item.id} 
                    style={[
                      styles.cobradorCard, 
                      yaCobrado && { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1 }
                    ]}
                  >
                    <View style={styles.cobradorHeader}>
                      <Text style={styles.cobradorNombreCard}>👤 {item.nombre}</Text>
                      <Text style={styles.cuotaBadge}>Cuota: {fmt(item.valor_cuota)}</Text>
                    </View>

                    <Text style={styles.clienteSub}>📍 {item.direccion || 'Sin Dirección'} | 📞 {item.telefono || 'N/A'}</Text>

                    {item.dias_atrasado > 0 && (
                      <View style={styles.badgeAtraso}>
                        <Text style={styles.badgeAtrasoText}>🚨 Atrasado {item.dias_atrasado} día(s)</Text>
                      </View>
                    )}

                    <View style={styles.rowCobro}>
                      <View>
                        <Text style={styles.labelSaldo}>SALDO DEUDA</Text>
                        <Text style={styles.montoSaldo}>{fmt(item.saldo_pendiente)}</Text>
                      </View>

                      {yaCobrado ? (
                        <View style={styles.badgeCobradoLock}>
                          <Text style={styles.textCobradoLock}>✓ COBRADO ({fmt(item.cobrado_hoy)})</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.btnAbonar}
                          onPress={() => { setClienteSel(item); setModalCobroVisible(true); }}
                        >
                          <Text style={styles.btnAbonarText}>REGISTRAR PAGO</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

      </ScrollView>

      {/* MODAL AGREGAR CLIENTE */}
      <Modal visible={modalNuevoClienteVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Agregar Nuevo Cliente</Text>
              <Text style={{ color: '#6b7280', marginBottom: 10, fontSize: 12 }}>
                Ruta asignada: {rolActual === 'COBRADOR' ? cobradorActivo : 'Felipe'}
              </Text>

              <Text style={styles.inputLabel}>Nombre completo *</Text>
              <TextInput style={styles.inputModal} placeholder="Ej. Juan Pérez" value={nuevoNombre} onChangeText={setNuevoNombre} />

              <Text style={styles.inputLabel}>Dirección / Barrio</Text>
              <TextInput style={styles.inputModal} placeholder="Ej. Calle 123 #45" value={nuevaDireccion} onChangeText={setNuevaDireccion} />

              <Text style={styles.inputLabel}>Teléfono</Text>
              <TextInput style={styles.inputModal} placeholder="Ej. 3001234567" keyboardType="phone-pad" value={nuevoTelefono} onChangeText={setNuevoTelefono} />

              <Text style={styles.inputLabel}>Monto total préstamo ($) *</Text>
              <TextInput style={styles.inputModal} placeholder="Ej. 100000" keyboardType="numeric" value={nuevoMontoTotal} onChangeText={setNuevoMontoTotal} />

              <Text style={styles.inputLabel}>Cuota diaria ($) *</Text>
              <TextInput style={styles.inputModal} placeholder="Ej. 5000" keyboardType="numeric" value={nuevaCuota} onChangeText={setNuevaCuota} />

              <Text style={styles.inputLabel}>Días en mora</Text>
              <TextInput style={styles.inputModal} placeholder="0" keyboardType="numeric" value={diasAtraso} onChangeText={setDiasAtraso} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
                <TouchableOpacity style={[styles.btnModal, { backgroundColor: '#9ca3af' }]} onPress={() => setModalNuevoClienteVisible(false)}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnModal, { backgroundColor: '#15803d' }]} onPress={agregarCliente}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>GUARDAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL ASIGNAR RUTA */}
      <Modal visible={modalAsignarVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reasignar Cliente</Text>
            <Text style={{ color: '#6b7280', marginBottom: 15 }}>
              Cliente: <Text style={{ fontWeight: 'bold', color: '#111827' }}>{clienteAsignar?.nombre}</Text>
            </Text>

            <TouchableOpacity style={styles.btnOpcionAsignar} onPress={() => asignarCobradorACliente('Felipe')}>
              <Text style={styles.textOpcionAsignar}>Ruta de Felipe</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnOpcionAsignar, { backgroundColor: '#ea580c' }]} onPress={() => asignarCobradorACliente('Camilo')}>
              <Text style={styles.textOpcionAsignar}>Ruta de Camilo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancelarModal} onPress={() => setModalAsignarVisible(false)}>
              <Text style={{ color: '#6b7280', fontWeight: '700' }}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL COBRAR */}
      <Modal visible={modalCobroVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar Cobro</Text>
            <Text style={{ color: '#6b7280', marginBottom: 10 }}>Cliente: {clienteSel?.nombre}</Text>

            <Text style={styles.cardLabel}>Monto abonado ($)</Text>
            <TextInput
              style={styles.inputModal}
              value={montoCobro}
              onChangeText={setMontoCobro}
              keyboardType="numeric"
              placeholder="Ej. 5000"
              autoFocus
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
              <TouchableOpacity style={[styles.btnModal, { backgroundColor: '#9ca3af' }]} onPress={() => setModalCobroVisible(false)}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnModal, { backgroundColor: '#15803d' }]} onPress={registrarCobro}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>CONFIRMAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  loginContainer: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', padding: 20 },
  loginCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 20, elevation: 5 },
  loginTitle: { fontSize: 32, fontWeight: '900', color: '#111827', textAlign: 'center' },
  loginSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 3, marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 15, color: '#111827' },
  btnLogin: { backgroundColor: '#15803d', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnLoginText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  btnQuick: { flex: 0.3, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnQuickText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  demoTitle: { fontSize: 11, fontWeight: '700', color: '#9ca3af', marginBottom: 4 },
  header: { backgroundColor: '#111827', paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
  btnLogout: { backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnLogoutText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  loadingBar: { backgroundColor: '#2563eb', padding: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#ffffff', fontSize: 11, fontWeight: '700', marginLeft: 8 },
  body: { padding: 16 },
  greetingTag: { fontSize: 10, fontWeight: '800', color: '#6b7280', letterSpacing: 1.2, marginBottom: 2 },
  mainTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  btnNuevoCliente: { backgroundColor: '#15803d', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  btnNuevoClienteText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 10 },
  cardHalf: { backgroundColor: '#ffffff', width: '48.5%', padding: 14, borderRadius: 16, elevation: 2 },
  cardIcon: { fontSize: 20, marginBottom: 8 },
  cardLabel: { fontSize: 11, color: '#6b7280', fontWeight: '700' },
  cardValue: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 4 },
  btnReiniciarJornada: { backgroundColor: '#1e293b', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 14 },
  btnReiniciarJornadaText: { color: '#38bdf8', fontSize: 11, fontWeight: '800' },
  alertBox: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 12 },
  alertText: { color: '#991b1b', fontSize: 12 },
  badgeAtraso: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  badgeAtrasoText: { color: '#dc2626', fontSize: 10, fontWeight: '800' },
  sectionCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2 },
  cardSectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  cobradorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cobradorNombre: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cobradorSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  cobradorMonto: { fontSize: 16, fontWeight: '800', color: '#15803d' },
  clienteAdminCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: 12, borderRadius: 12, marginBottom: 10 },
  clienteNombre: { fontSize: 15, fontWeight: '700', color: '#111827' },
  clienteSub: { fontSize: 11, color: '#6b7280', marginVertical: 2 },
  badgeCobrador: { fontSize: 11, color: '#4b5563', marginTop: 2 },
  btnAsignar: { backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnAsignarText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  cobradorCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2 },
  cobradorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cobradorNombreCard: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cuotaBadge: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  rowCobro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  labelSaldo: { fontSize: 9, color: '#6b7280', fontWeight: '800' },
  montoSaldo: { fontSize: 16, fontWeight: '800', color: '#111827' },
  btnAbonar: { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  btnAbonarText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  badgeCobradoLock: { backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  textCobradoLock: { color: '#ffffff', fontWeight: '800', fontSize: 11 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginVertical: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 2 },
  btnOpcionAsignar: { backgroundColor: '#15803d', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  textOpcionAsignar: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  btnCancelarModal: { alignItems: 'center', padding: 10, marginTop: 5 },
  inputModal: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 14, marginTop: 2, color: '#111827' },
  btnModal: { flex: 0.48, padding: 12, borderRadius: 10, alignItems: 'center' }
});
