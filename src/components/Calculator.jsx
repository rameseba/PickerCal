import React, { useState } from 'react';
import { Calendar, DollarSign, FileText, Clock, Award, ShieldAlert, Sparkles, Plus, Layers } from 'lucide-react';
import { calculateEarnings, getRateName } from '../utils/calculatorLogic';

export default function Calculator({
  orderData,
  setOrderData,
  settings,
  onSaveToHistory,
  onBatchSave,
  dailyOrderCount = 0
}) {
  const [activeSubTab, setActiveSubTab] = useState('individual'); // 'individual' or 'quick'
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickOrderCount, setQuickOrderCount] = useState('');

  const {
    pedidoId,
    productosSolicitados,
    pickeados,
    sustituidos,
    sinStock,
    totalProductos,
    detectedDate,
    isWeekendRate,
    pickingTime,
    extraBonus,
    dayOrderIndex // Optional: override which order number this is for today
  } = orderData;

  // Si no está definido el índice, sugerir el siguiente del día actual + 1
  const activeOrderIndex = dayOrderIndex !== undefined && dayOrderIndex !== '' ? dayOrderIndex : (dailyOrderCount + 1);

  // Realizar cálculos
  const earnings = calculateEarnings({
    totalProducts: totalProductos || 0,
    sinStock: sinStock || 0,
    isWeekendRate: isWeekendRate,
    skuTable: settings.skuTable,
    basePayments: settings.basePayments,
    taxRetentionPercent: settings.taxRetentionPercent,
    orderNumber: activeOrderIndex
  });

  // Agregar el bono extra del pedido al total líquido y bruto
  const finalGross = earnings.grossTotal + (Number(extraBonus) || 0);
  const taxAmountWithBonus = Number((finalGross * (settings.taxRetentionPercent / 100)).toFixed(2));
  const finalNet = Number((finalGross - taxAmountWithBonus).toFixed(2));

  const handleInputChange = (field, val) => {
    let parsedVal = val;
    if (['productosSolicitados', 'pickeados', 'sustituidos', 'sinStock', 'totalProductos', 'extraBonus', 'dayOrderIndex'].includes(field)) {
      parsedVal = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
    }
    setOrderData(prev => ({
      ...prev,
      [field]: parsedVal
    }));
  };

  const handleQuickBatchSave = () => {
    const count = parseInt(quickOrderCount, 10);
    if (!count || count <= 0) {
      alert("Por favor, ingresa una cantidad válida de pedidos.");
      return;
    }
    
    const parsedDate = new Date(quickDate + 'T00:00:00');
    const dayOfWeek = parsedDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 1;
    
    const batch = [];
    for (let i = 1; i <= count; i++) {
      batch.push({
        pedidoId: `R-${quickDate.slice(-5).replace('-', '')}-${String(i).padStart(2, '0')}`,
        totalProductos: 24,
        sinStock: 0,
        pickeados: 24,
        sustituidos: 0,
        productosSolicitados: 24,
        isWeekendRate: isWeekend,
        detectedDate: quickDate,
        pickingTime: '0:42',
        extraBonus: 0
      });
    }
    
    if (onBatchSave) {
      onBatchSave(batch);
      setQuickOrderCount('');
      alert(`¡Se registraron exitosamente ${count} pedidos para el día ${quickDate}!`);
    }
  };

  const handleToggleRate = () => {
    setOrderData(prev => ({
      ...prev,
      isWeekendRate: !prev.isWeekendRate
    }));
  };

  const formatCLP = (val) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const handleSave = () => {
    onSaveToHistory({
      pedidoId: pedidoId || `P-${Date.now().toString().slice(-6)}`,
      totalProducts: totalProductos || 0,
      sinStock: sinStock || 0,
      pickeados: pickeados || 0,
      sustituidos: sustituidos || 0,
      productosSolicitados: productosSolicitados || 0,
      isWeekendRate,
      date: detectedDate || new Date().toISOString().split('T')[0],
      pickingTime: pickingTime || '0:00',
      extraBonus: Number(extraBonus) || 0,
      dayOrderIndex: activeOrderIndex,
      earnings: {
        ...earnings,
        grossTotal: finalGross,
        taxAmount: taxAmountWithBonus,
        netTotal: finalNet
      }
    });
  };

  return (
    <div className="calculator-layout grid-layout gap-4 w-full">
      {/* Columna Izquierda: Formulario Compacto / Registro Rápido */}
      <div className="card glass p-4 col-span-full md:col-span-6 flex flex-col justify-between">
        <div>
          {/* Subpestañas de Tipo de Ingreso */}
          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveSubTab('individual')}
              className={`btn flex-1 text-center py-1.5 text-xxs font-bold rounded-md transition-all border-none ${activeSubTab === 'individual' ? 'bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
              type="button"
            >
              Pedido Individual
            </button>
            <button 
              onClick={() => setActiveSubTab('quick')}
              className={`btn flex-1 text-center py-1.5 text-xxs font-bold rounded-md transition-all border-none ${activeSubTab === 'quick' ? 'bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
              type="button"
            >
              Registro Rápido (Lote)
            </button>
          </div>

          {activeSubTab === 'individual' ? (
            <>
              <div className="card-header mb-3">
                <h2 className="text-gradient text-sm">Detalles del Pedido</h2>
                <p className="card-subtitle text-xxs">Introduce o ajusta los números leídos del ticket.</p>
              </div>

              <div className="grid-layout gap-2" style={{ gap: '8px' }}>
                {/* Fila 1: ID y Fecha */}
                <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                  <label className="text-xxs">ID de Pedido</label>
                  <input
                    type="text"
                    placeholder="v230912135"
                    value={pedidoId || ''}
                    onChange={(e) => setOrderData(prev => ({ ...prev, pedidoId: e.target.value }))}
                    className="input-field table-input text-xs"
                  />
                </div>
                <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                  <label className="text-xxs">Fecha</label>
                  <input
                    type="date"
                    value={detectedDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const parsedDate = new Date(val + 'T00:00:00');
                        const dayOfWeek = parsedDate.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 1;
                        setOrderData(prev => ({
                          ...prev,
                          detectedDate: val,
                          isWeekendRate: isWeekend
                        }));
                      }
                    }}
                    className="input-field table-input text-xs"
                  />
                </div>

                {/* Fila 2: Tiempos de Picking y Productos Solicitados */}
                <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                  <label className="text-xxs">Tiempo Picking (H:MM)</label>
                  <div className="input-with-symbol">
                    <span className="currency-symbol" style={{ left: '8px' }}><Clock size={12} /></span>
                    <input
                      type="text"
                      placeholder="0:42"
                      value={pickingTime || ''}
                      onChange={(e) => setOrderData(prev => ({ ...prev, pickingTime: e.target.value }))}
                      className="input-field table-input text-xs pl-6"
                    />
                  </div>
                </div>
                <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                  <label className="text-xxs">Prod. Solicitados</label>
                  <input
                    type="number"
                    value={productosSolicitados === undefined || productosSolicitados === null ? '' : productosSolicitados}
                    onChange={(e) => handleInputChange('productosSolicitados', e.target.value)}
                    className="input-field table-input text-xs"
                  />
                </div>

                {/* Fila 3: Pickeados y Sustituidos */}
                <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                  <label className="text-xxs">Pickeados</label>
                  <input
                    type="number"
                    value={pickeados === undefined || pickeados === null ? '' : pickeados}
                    onChange={(e) => handleInputChange('pickeados', e.target.value)}
                    className="input-field table-input text-xs"
                  />
                </div>
                <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                  <label className="text-xxs">Sustituidos</label>
                  <input
                    type="number"
                    value={sustituidos === undefined || sustituidos === null ? '' : sustituidos}
                    onChange={(e) => handleInputChange('sustituidos', e.target.value)}
                    className="input-field table-input text-xs"
                  />
                </div>

                {/* Fila 4: Sin Stock y Total Productos */}
                <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                  <label className="text-xxs text-danger">Sin Stock</label>
                  <input
                    type="number"
                    value={sinStock === undefined || sinStock === null ? '' : sinStock}
                    onChange={(e) => handleInputChange('sinStock', e.target.value)}
                    className="input-field table-input text-xs input-danger-border"
                  />
                </div>
                <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                  <label className="text-xxs">Total de Productos (Cart)</label>
                  <input
                    type="number"
                    value={totalProductos === undefined || totalProductos === null ? '' : totalProductos}
                    onChange={(e) => handleInputChange('totalProductos', e.target.value)}
                    className="input-field table-input text-xs font-semibold"
                  />
                </div>

                {/* Fila 5: Orden Nº del Día y Bono Extra */}
                <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                  <label className="text-xxs">Orden Nº en el Día</label>
                  <input
                    type="number"
                    placeholder={dailyOrderCount + 1}
                    value={dayOrderIndex === undefined ? '' : dayOrderIndex}
                    onChange={(e) => handleInputChange('dayOrderIndex', e.target.value)}
                    className="input-field table-input text-xs"
                  />
                </div>
                <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                  <label className="text-xxs">Bono Extra ($)</label>
                  <div className="input-with-symbol">
                    <span className="currency-symbol" style={{ left: '8px' }}><Plus size={12} /></span>
                    <input
                      type="number"
                      placeholder="0"
                      value={extraBonus === undefined || extraBonus === 0 ? '' : extraBonus}
                      onChange={(e) => handleInputChange('extraBonus', e.target.value)}
                      className="input-field table-input text-xs pl-6"
                    />
                  </div>
                </div>
              </div>

              {/* Tarifa Base Selector */}
              <div className="form-group mt-3 pt-3 border-t">
                <div className="flex justify-between items-center text-xxs">
                  <span className="font-semibold text-gray-700">Tarifa Base del Día</span>
                  {activeOrderIndex >= 14 && (
                    <span className="badge badge-success text-[10px] py-0 px-1.5 flex items-center gap-1 animate-pulse">
                      <Sparkles size={10} />
                      Bono pedido ≥14: $2.500 Base
                    </span>
                  )}
                </div>
                {activeOrderIndex < 14 ? (
                  <div className="rate-toggle-container mt-1" onClick={handleToggleRate}>
                    <div className={`rate-toggle-switch ${isWeekendRate ? 'weekend-active' : 'standard-active'}`} style={{ height: '36px' }}>
                      <div className="rate-toggle-knob"></div>
                      <div className="rate-toggle-label left-label text-xxs">
                        <span>Martes-Sáb {formatCLP(settings.basePayments.standard)}</span>
                      </div>
                      <div className="rate-toggle-label right-label text-xxs">
                        <span>Dom-Lun {formatCLP(settings.basePayments.weekend)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-success bg-opacity-10 border border-success border-opacity-20 text-success p-2 rounded-xl text-center text-xxs font-semibold mt-1">
                    Tarifa base especial aplicada automáticamente ($2.500 CLP)
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="card-header mb-1">
                <h2 className="text-gradient text-sm">Registro Rápido por Lote</h2>
                <p className="card-subtitle text-xxs">Registra un día completo ingresando únicamente la cantidad de pedidos realizados.</p>
              </div>
              
              <div className="bg-info bg-opacity-10 border border-info border-opacity-20 text-info p-3 rounded-xl text-xxs leading-relaxed">
                ℹ️ <strong>Cómo funciona:</strong> Se generarán automáticamente los pedidos correspondientes a esa fecha con parámetros promedio (24 ítems efectivos, 0 sin stock y 42 minutos de picking). Se aplicará la tarifa de fin de semana/semana correspondiente y la regla de $2.500 a partir del pedido 14.
              </div>

              <div className="form-group">
                <label className="text-xxs">Fecha a Registrar</label>
                <input
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                  className="input-field table-input text-xs"
                />
              </div>

              <div className="form-group">
                <label className="text-xxs">Cantidad de Pedidos Realizados</label>
                <input
                  type="number"
                  placeholder="Ej: 14"
                  value={quickOrderCount}
                  onChange={(e) => setQuickOrderCount(Math.max(0, parseInt(e.target.value, 10) || ''))}
                  className="input-field table-input text-xs"
                />
              </div>

              <button
                onClick={handleQuickBatchSave}
                className="btn btn-primary w-full text-xs mt-3 flex items-center justify-center gap-2"
                style={{ padding: '10px 16px', background: 'var(--secondary)', color: 'white' }}
                type="button"
              >
                <Layers size={16} />
                Registrar Lote Rápido
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Desglose de Ganancias */}
      <div className="card glass card-accent-glow p-4 col-span-full md:col-span-6 flex flex-col justify-between">
        <div>
          <div className="card-header mb-3">
            <h2 className="text-gradient text-sm">Resumen de Ganancia</h2>
            <p className="card-subtitle text-xxs">Detalle neto líquido del cálculo actual.</p>
          </div>

          {/* Badge Neto Líquido */}
          <div className="payout-hero" style={{ padding: '16px 12px' }}>
            <span className="payout-hero-label" style={{ fontSize: '0.75rem' }}>Pago Neto Líquido</span>
            <span className="payout-hero-value" style={{ fontSize: '2rem' }}>{formatCLP(finalNet)}</span>
            <span className="payout-hero-sub" style={{ fontSize: '0.65rem' }}>Impuestos retenidos ({settings.taxRetentionPercent}%)</span>
          </div>

          <div className="payout-breakdown mt-4 flex flex-col gap-2 text-xs">
            <div className="breakdown-row">
              <span className="breakdown-label flex items-center gap-1">
                <Award size={14} className="text-primary" />
                SKU Efectivos:
              </span>
              <span className="breakdown-val">
                {totalProductos || 0} - {sinStock || 0} = <strong className="text-primary">{earnings.effectiveSkuCount} SKU</strong>
              </span>
            </div>

            <div className="breakdown-row">
              <span className="breakdown-label">Tarifa del Rango SKU:</span>
              <span className="breakdown-val">{formatCLP(earnings.skuRate)} c/u</span>
            </div>

            <div className="breakdown-row highlight" style={{ padding: '6px 10px' }}>
              <span className="breakdown-label text-xs">Pago SKU:</span>
              <span className="breakdown-val text-xs">{formatCLP(earnings.skuPayment)}</span>
            </div>

            <div className="breakdown-row">
              <span className="breakdown-label">
                Valor Base Pedido (Orden #{activeOrderIndex}):
              </span>
              <span className="breakdown-val">+ {formatCLP(earnings.basePayment)}</span>
            </div>

            {Number(extraBonus) > 0 && (
              <div className="breakdown-row text-success">
                <span className="breakdown-label flex items-center gap-1">
                  <Plus size={14} />
                  Bono Extra de Pedido:
                </span>
                <span className="breakdown-val font-bold">+ {formatCLP(extraBonus)}</span>
              </div>
            )}

            <div className="breakdown-row border-t pt-2 mt-1">
              <span className="breakdown-label font-bold text-gray-700">Total Bruto:</span>
              <span className="breakdown-val font-bold text-gray-800">{formatCLP(finalGross)}</span>
            </div>

            <div className="breakdown-row text-danger-color">
              <span className="breakdown-label flex items-center gap-1">
                <ShieldAlert size={14} />
                Retención ({settings.taxRetentionPercent}%):
              </span>
              <span className="breakdown-val font-medium">- {formatCLP(taxAmountWithBonus)}</span>
            </div>
          </div>
        </div>

        {activeSubTab === 'individual' ? (
          <button
            onClick={handleSave}
            className="btn btn-primary w-full text-xs mt-3 flex items-center justify-center gap-2"
            style={{ padding: '10px 16px' }}
          >
            <Sparkles size={16} />
            Guardar Pedido
          </button>
        ) : (
          <div className="bg-gray-50 border p-3 rounded-xl text-center text-xxs text-muted mt-3">
            Usa el botón "Registrar Lote Rápido" del panel izquierdo para guardar la cantidad de pedidos indicada.
          </div>
        )}
      </div>
    </div>
  );
}
