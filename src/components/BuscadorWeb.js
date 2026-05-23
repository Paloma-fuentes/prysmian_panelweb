import { useState, useEffect, useRef } from 'react';
import { buscarMateriales } from '../services/inventarioService';
import { C } from '../theme';

export default function BuscadorWeb({ onSelect, placeholder = "Buscar por nombre o SAP..." }) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrar, setMostrar] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setMostrar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        try {
          const res = await buscarMateriales(query);
          setResultados(res);
          setMostrar(true);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setResultados([]);
        setMostrar(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  function resaltarTexto(texto, query) {
    if (!query) return texto;
    const parts = texto.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <b key={i} style={{ color: C.primary, background: 'rgba(244,130,31,0.1)', padding: '0 2px', borderRadius: 4 }}>{part}</b> 
            : part
        )}
      </span>
    );
  }

  return (
    <div ref={wrapperRef} style={s.container}>
      <div style={s.inputWrapper}>
        <span style={s.icon}>🔍</span>
        <input
          style={s.input}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && setMostrar(true)}
        />
        {loading && <div style={s.spinner}></div>}
      </div>

      {mostrar && (
        <div style={s.dropdown}>
          {resultados.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: C.textLight, fontSize: 13 }}>
              No se encontraron repuestos para "<b>{query}</b>"
            </div>
          ) : resultados.map((res) => (
            <div
              key={res.id}
              style={s.item}
              onClick={() => {
                onSelect(res);
                setQuery('');
                setMostrar(false);
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <div style={s.itemNombre}>{resaltarTexto(res.descripcion, query)}</div>
              <div style={s.itemMeta}>
                {res.codigoSAP ? <span style={s.sap}>SAP: {resaltarTexto(res.codigoSAP, query)}</span> : null}
                <span style={{ ...s.stock, color: res.stock > 0 ? C.success : C.error }}>
                  Stock: {res.stock}
                </span>
                <span style={s.ubic}>📍 {resaltarTexto(res.ubicacion || 'Sin ubic', query)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


const s = {
  container: { position: 'relative', width: '100%' },
  inputWrapper: { display: 'flex', alignItems: 'center', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 14px', gap: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  icon: { fontSize: 16 },
  input: { flex: 1, border: 'none', outline: 'none', fontSize: 15, color: C.text },
  spinner: { width: 16, height: 16, border: '2px solid #e2e8f0', borderTop: `2px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 12, marginTop: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: 300, overflowY: 'auto', border: `1px solid ${C.border}` },
  item: { padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' },
  itemNombre: { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 },
  itemMeta: { display: 'flex', gap: 12, fontSize: 11, color: C.textSecondary },
  sap: { fontWeight: 600, color: C.primary },
  stock: { fontWeight: 800 },
  ubic: { color: C.textLight },
};
