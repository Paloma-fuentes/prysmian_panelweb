import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function getKPIs() {
  const [matSnap, histSnap, solSnap, comprasSnap, userSnap] = await Promise.all([
    getDocs(collection(db, 'materiales')),
    getDocs(query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(1000))),
    getDocs(query(collection(db, 'solicitudes'))),
    getDocs(query(collection(db, 'solicitudes_compra'))),
    getDocs(collection(db, 'usuarios')),
  ]);

  const materiales = matSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const historial   = histSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const usuarios    = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const userMap     = Object.fromEntries(usuarios.map(u => [u.id || u.uid, u.nombre + ' ' + (u.apellido || '')]));

  // --- Cálculo de Gastos Reales (Basado en Compras del Mes) ---
  const compras = comprasSnap.docs.map(d => d.data());
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();

  const comprasMes = compras.filter(c => {
    const f = c.creadoEn?.toDate ? c.creadoEn.toDate() : new Date();
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const gastoMensual = comprasMes.reduce((acc, c) => acc + ((c.cantidad || 0) * (c.costoEstimado || 0)), 0);
  const gastoPorCategoria = comprasMes.reduce((acc, c) => {
    const cat = c.categoria || 'Otros';
    acc[cat] = (acc[cat] || 0) + ((c.cantidad || 0) * (c.costoEstimado || 0));
    return acc;
  }, {});

  // --- Material más solicitado del mes (últimos 30 días) ---
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const recientes = historial.filter(h => {
    const f = h.fecha?.toDate ? h.fecha.toDate() : new Date(h.fecha);
    return h.tipo === 'retiro' && f >= hace30;
  });
  const porProducto = {};
  recientes.forEach(h => {
    porProducto[h.producto] = (porProducto[h.producto] || 0) + (h.cantidad || 1);
  });
  const topProducto = Object.entries(porProducto).sort((a, b) => b[1] - a[1])[0];

  // --- Máquina con mayor consumo ---
  const porMaquina = {};
  historial.filter(h => h.tipo === 'retiro').forEach(h => {
    if (h.maquina && h.maquina !== 'N/A') {
      porMaquina[h.maquina] = (porMaquina[h.maquina] || 0) + (h.cantidad || 1);
    }
  });
  const topMaquinas = Object.entries(porMaquina).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // --- Sin rotación: stock > 0 pero no aparece en historial reciente (90 días) ---
  const hace90 = new Date();
  hace90.setDate(hace90.getDate() - 90);
  const productosMovidos = new Set(
    historial
      .filter(h => { const f = h.fecha?.toDate ? h.fecha.toDate() : new Date(h.fecha); return f >= hace90; })
      .map(h => h.producto)
  );
  const sinRotacion = materiales.filter(m => m.stock > 0 && !productosMovidos.has(m.descripcion));

  // --- Sugerencias de Compra (Materiales con bajo stock) ---
  const sugerenciasCompra = materiales
    .filter(m => m.stock <= (m.stockMinimo || 2) || m.bajoStock)
    .map(m => ({ id: m.id, nombre: m.descripcion, stock: m.stock, min: m.stockMinimo || 2 }))
    .slice(0, 5);

  // --- Consumo por Departamento (Área) ---
  const porArea = {};
  recientes.forEach(h => {
    const area = h.area || 'General';
    porArea[area] = (porArea[area] || 0) + (h.cantidad || 1);
  });

  // --- Ranking de Solicitantes ---
  const porUsuario = {};
  recientes.forEach(h => {
    const uId = h.usuarioUid || h.solicitanteUid;
    const nombre = userMap[uId] || h.usuario || 'Anonimo';
    porUsuario[nombre] = (porUsuario[nombre] || 0) + (h.cantidad || 1);
  });

  // --- KPI Quiebre de Stock ---
  // Estimado por historial de stock 0 en retiros (aproximación)
  const totalRetirosIntento = historial.filter(h => h.tipo === 'retiro').length;
  const quiebres = historial.filter(h => h.tipo === 'retiro' && h.nota?.toLowerCase().includes('sin stock')).length;
  const stockoutRate = totalRetirosIntento > 0 ? (quiebres / totalRetirosIntento) * 100 : 0;

  // --- Últimos movimientos ---
  const ultimosMovimientos = historial.slice(0, 20);

  const comprasUrgentes = comprasSnap.docs.filter(d => d.data().urgencia === 'urgencia').length;

  return {
    totalProductos,
    conStock,
    sinStock,
    bajoStock,
    gastoMensual,
    gastoPorCategoria,
    stockoutRate,
    consumoPorArea: Object.entries(porArea).map(([name, value]) => ({ name, value })),
    rankingUsuarios: Object.entries(porUsuario).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value })),
    solicitudesPendientes: solSnap.docs.filter(d => d.data().estado === 'pendiente_entrega').length,
    comprasEnEspera:       comprasSnap.docs.filter(d => d.data().estado === 'en espera').length,
    comprasUrgentes,
    topProductosLista: Object.entries(porProducto).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([nombre, cantidad]) => ({ nombre, cantidad })),
    topMaquinas,
    sugerenciasCompra,
    sinRotacion: sinRotacion.length,
    ultimosMovimientos,
  };
}
