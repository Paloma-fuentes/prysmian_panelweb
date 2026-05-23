/**
 * impresionService.js
 * Utilidad para generar y mandar a imprimir los vales de retiro
 * Optimizada para la impresora RICOH_Pañol
 */

export function imprimirValeRetiro(sol) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permite las ventanas emergentes para imprimir.');
    return;
  }

  const fecha = sol.creadoEn?.toDate ? sol.creadoEn.toDate().toLocaleString('es-CL', { 
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  }) : new Date().toLocaleString('es-CL');
  
  const refId = sol.id ? sol.id.substring(0, 8).toUpperCase() : 'S/R';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Vale de Retiro - ${refId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          
          @page {
            size: auto;
            margin: 10mm;
          }
          
          body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            margin: 0;
            padding: 40px;
            color: #0F172A;
            background: #fff;
          }

          .voucher-container {
            border: 2px solid #E2E8F0;
            border-radius: 16px;
            padding: 30px;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 80px;
            font-weight: 800;
            color: rgba(15, 23, 42, 0.03);
            white-space: nowrap;
            pointer-events: none;
            z-index: 0;
          }

          .header { 
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            position: relative;
            z-index: 1;
          }

          .brand {
            display: flex;
            flex-direction: column;
          }

          .brand-name {
            color: #F4821F;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -1px;
            margin: 0;
          }

          .brand-tagline {
            font-size: 10px;
            font-weight: 600;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .document-title {
            text-align: right;
          }

          .document-title h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
            color: #0F172A;
            text-transform: uppercase;
          }

          .ref-number {
            font-size: 12px;
            color: #F4821F;
            font-weight: 700;
            font-family: monospace;
          }

          .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            position: relative;
            z-index: 1;
          }

          .field {
            display: flex;
            flex-direction: column;
          }

          .label {
            font-size: 9px;
            font-weight: 800;
            color: #94A3B8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }

          .value {
            font-size: 14px;
            font-weight: 600;
            color: #1E293B;
          }

          .material-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 40px;
            position: relative;
            z-index: 1;
          }

          .qty-box {
            background: #F4821F;
            color: #fff;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            min-width: 60px;
          }

          .qty-value {
            font-size: 24px;
            font-weight: 800;
            display: block;
          }

          .qty-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .material-info {
            flex: 1;
          }

          .material-name {
            font-size: 18px;
            font-weight: 800;
            color: #0F172A;
            margin: 0;
          }

          .material-sap {
            font-size: 12px;
            color: #64748B;
            font-weight: 600;
            margin-top: 2px;
          }

          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px;
            padding: 0 40px;
            position: relative;
            z-index: 1;
          }

          .signature-line {
            border-top: 2px solid #E2E8F0;
            text-align: center;
            padding-top: 10px;
            font-size: 11px;
            font-weight: 600;
            color: #64748B;
          }

          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 9px;
            color: #94A3B8;
            border-top: 1px solid #F1F5F9;
            padding-top: 15px;
          }

          @media print {
            body { padding: 20px; }
            .voucher-container { border: 1px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="voucher-container">
          <div class="watermark">PRYSMIAN</div>
          
          <div class="header">
            <div class="brand">
              <span class="brand-name">PRYSMIAN</span>
              <span class="brand-tagline">Warehouse Management System</span>
            </div>
            <div class="document-title">
              <h1>Vale de Retiro</h1>
              <span class="ref-number">REF: ${refId}</span>
            </div>
          </div>

          <div class="info-section">
            <div class="field">
              <span class="label">Solicitante</span>
              <span class="value">${sol.usuario}</span>
            </div>
            <div class="field">
              <span class="label">Fecha Emisión</span>
              <span class="value">${fecha}</span>
            </div>
            <div class="field">
              <span class="label">Centro / Planta</span>
              <span class="value">Prysmian Santiago</span>
            </div>
            <div class="field">
              <span class="label">Máquina Destino</span>
              <span class="value">${sol.maquina}</span>
            </div>
            <div class="field">
              <span class="label">Sección / Parte</span>
              <span class="value">${sol.parteMaquina || 'General'}</span>
            </div>
            <div class="field">
              <span class="label">Ubicación Bodega</span>
              <span class="value" style="color: #10B981">${sol.ubicacion || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="label">Estado</span>
              <span class="value" style="color: #F4821F">AUTORIZADO</span>
            </div>
          </div>

          <div class="material-card">
            <div class="qty-box" style="background: ${sol.urgencia === 'alta' ? '#EF4444' : '#F4821F'}">
              <span class="qty-value">${sol.cantidad}</span>
              <span class="qty-label">${sol.unidad || 'UNIDADES'}</span>
            </div>
            <div class="material-info">
              <p class="material-name">
                ${sol.producto.toUpperCase()}
                ${sol.urgencia === 'alta' ? '<span style="color: #EF4444; font-size: 12px; margin-left: 10px;">⚠️ URGENTE</span>' : ''}
              </p>
              <p class="material-sap">SAP: ${sol.productoSAP || sol.materialId || 'N/A'}</p>
              
              ${sol.correaDetalles ? `
                <div style="margin-top: 8px; font-size: 11px; color: #F4821F; font-weight: 700; border-top: 1px dashed #E2E8F0; padding-top: 8px;">
                  ⚙️ DETALLES CORREA: ${sol.correaDetalles.posicion.toUpperCase()} 
                  ${sol.correaDetalles.numero ? `| N°: ${sol.correaDetalles.numero}` : ''}
                </div>
              ` : ''}
            </div>
          </div>

          <div class="signatures">
            <div class="signature-line">Firma Solicitante</div>
            <div class="signature-line">Firma Pañol / Despacho</div>
          </div>

          <div class="footer">
            Este documento es un comprobante válido para el control de inventario interno.<br>
            Generado digitalmente por Prysmian Panel Web v2.0
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

