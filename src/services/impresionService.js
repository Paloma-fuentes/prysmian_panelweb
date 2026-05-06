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

  const fecha = sol.creadoEn?.toDate ? sol.creadoEn.toDate().toLocaleString('es-CL') : new Date().toLocaleString('es-CL');
  
  printWindow.document.write(`
    <html>
      <head>
        <title>VALE_${sol.usuario.replace(/\s+/g, '_')}_${Date.now()}</title>
        <style>
          @page {
            size: auto;
            margin: 10mm;
          }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 20px; 
            color: #1a1a2e;
            line-height: 1.6;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #E0E0E0;
            padding: 30px;
            border-radius: 15px;
          }
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #F4821F; 
            padding-bottom: 15px; 
            margin-bottom: 25px; 
          }
          .title-box h1 { 
            color: #F4821F; 
            font-size: 26px; 
            font-weight: 900; 
            margin: 0;
            text-transform: uppercase;
          }
          .title-box p {
            margin: 5px 0 0;
            font-size: 12px;
            font-weight: bold;
            color: #666;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .info-item {
            font-size: 14px;
          }
          .label { 
            font-weight: 800; 
            color: #1A1A2E; 
            display: block;
            font-size: 10px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .value {
            font-size: 16px;
            color: #333;
            font-weight: 500;
          }
          .item-card { 
            background: #F8FAFC; 
            padding: 25px; 
            border-radius: 12px; 
            border: 1px dashed #F4821F; 
            margin: 30px 0;
            text-align: center;
          }
          .item-qty {
            font-size: 40px;
            font-weight: 900;
            color: #F4821F;
            display: block;
          }
          .item-name {
            font-size: 22px;
            font-weight: 800;
            color: #1A1A2E;
            margin-top: 5px;
            display: block;
          }
          .item-sap {
            font-size: 12px;
            color: #666;
            margin-top: 10px;
            display: block;
          }
          .signature-section { 
            margin-top: 80px; 
            display: flex; 
            justify-content: space-around; 
          }
          .signature-box {
            border-top: 2px solid #1A1A2E; 
            width: 220px; 
            text-align: center; 
            padding-top: 10px;
            font-size: 12px;
            font-weight: bold;
          }
          .footer { 
            margin-top: 60px; 
            text-align: center; 
            font-size: 10px; 
            color: #999;
            border-top: 1px solid #EEE;
            padding-top: 10px;
          }
          .printer-note {
            background: #E8F5E9;
            color: #2E7D32;
            padding: 8px;
            border-radius: 5px;
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="printer-note">
            ⚠️ Destino de impresión sugerido: RICOH_Pañol on srv776-01cl
          </div>

          <div class="header">
            <div class="title-box">
              <h1>Vale de Retiro</h1>
              <p>PRYSMIAN GROUP - SISTEMA DE GESTIÓN DE PAÑOL</p>
            </div>
            <div style="text-align: right; font-size: 11px; color: #666;">
              Ref: ${sol.id.substring(0, 8).toUpperCase()}
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Solicitante</span>
              <span class="value">${sol.usuario}</span>
            </div>
            <div class="info-item">
              <span class="label">Fecha y Hora</span>
              <span class="value">${fecha}</span>
            </div>
            <div class="info-item">
              <span class="label">Máquina Destino</span>
              <span class="value">${sol.maquina}</span>
            </div>
            <div class="info-item">
              <span class="label">Ubicación / Parte</span>
              <span class="value">${sol.parteMaquina || 'General'}</span>
            </div>
          </div>
          
          <div class="item-card">
            <span class="item-qty">${sol.cantidad} Unidades</span>
            <span class="item-name">${sol.producto.toUpperCase()}</span>
            <span class="item-sap">ID Material: ${sol.materialId || 'S/C'}</span>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">Firma Solicitante</div>
            <div class="signature-box">Autorización Pañol (RICOH)</div>
          </div>
          
          <div class="footer">
            Este documento es un comprobante oficial de retiro de materiales. 
            Generado digitalmente por Prysmian Mobile App.
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
