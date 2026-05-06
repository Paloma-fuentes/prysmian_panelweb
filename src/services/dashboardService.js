import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function getKPIs() {
  const [matSnap, histSnap, solSnap, comprasSnap] = await Promise.all([
    getDocs(collection(db, 'materiales')),
    getDocs(query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(500))),
    getDocs(query(collection(db, 'solicitudes'), where('estado', '==', 'pendiente_entrega'))),
    getDocs(query(collection(db, 'solicitudes_compra'), where('estado', '==', 'en espera'))),
  ]);

  const materiales = matSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const historial = histSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // --- KPIs inventario ---
  const totalProductos = materiales.length;
  const conStock = materiales.filter(m => m.stock > 0).length;
  const sinStock = materiales.filter(m => m.stock === 0).length;
  const bajoStock = materiales.filter(m => m.bajoStock).length;
  const criticos = materiales.filter(m => m.esCritico).length;

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

  // --- Más solicitados del mes (Lista detallada) ---
  const topProductosLista = Object.entries(porProducto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }));

  // --- Últimos movimientos ---
  const ultimosMovimientos = historial.slice(0, 20);

  const comprasUrgentes = comprasSnap.docs.filter(d => d.data().urgencia === 'urgencia').length;

  return {
    totalProductos,
    conStock,
    sinStock,
    bajoStock,
    criticos,
    solicitudesPendientes: solSnap.docs.length,
    comprasEnEspera:       comprasSnap.docs.length,
    comprasUrgentes,
    topProducto: topProducto ? { nombre: topProducto[0], cantidad: topProducto[1] } : null,
    topProductosLista,
    topMaquinas,
    sugerenciasCompra,
    sinRotacion: sinRotacion.length,
    sinRotacionLista: sinRotacion.slice(0, 10),
    ultimosMovimientos,
  };
}
