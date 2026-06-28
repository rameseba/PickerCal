import React, { useState } from 'react';
import { Trash2, Search, Trash, Calendar, Hash, Clock, Award, Sparkles, Plus, CheckCircle2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';


export default function OrderHistory({ 
  history, 
  onDeleteItem, 
  onClearHistory,
  settings,
  dailyBonuses,
  onDailyBonusChange
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDates, setExpandedDates] = useState({});
  const [currentCalDate, setCurrentCalDate] = useState(() => {
    if (history && history.length > 0) {
      const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));
      return new Date(sortedHistory[0].date + 'T00:00:00');
    }
    return new Date();
  });

  const formatCLP = (val) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const taxRate = settings.taxRetentionPercent / 100;

  // --- Reglas de Meta Diaria ---
  const getDailyMetaLabel = (orderCount) => {
    if (orderCount >= 13) {
      const extra = orderCount - 13;
      const totalMeta = 50000 + (extra * 2500);
      return { 
        text: extra > 0 ? `Meta 13 + ${extra} extra` : "Meta 13 Pedidos alcanzada", 
        bonus: totalMeta, 
        color: "badge-success" 
      };
    }
    if (orderCount >= 10) return { text: "Meta 10 Pedidos alcanzada", bonus: 40000, color: "badge-info" };
    if (orderCount >= 7) return { text: "Meta 7 Pedidos alcanzada", bonus: 28000, color: "badge-info" };
    return { text: `${orderCount}/7 para meta`, bonus: 0, color: "badge-danger" };
  };

  // Guardar bono diario
  const handleDailyBonusChange = (date, val) => {
    const parsedVal = val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0);
    onDailyBonusChange(date, parsedVal);
  };

  // Convertir string de tiempo (ej. "0:42") a minutos
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+)\s*\:\s*(\d+)/);
    return match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : 0;
  };

  const handlePrevMonth = () => {
    setCurrentCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const toggleDateExpand = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const handleCalendarDayClick = (dateStr) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateStr]: true
    }));
    setTimeout(() => {
      const element = document.getElementById(`day-card-${dateStr}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('day-card-highlight');
        setTimeout(() => {
          element.classList.remove('day-card-highlight');
        }, 1500);
      }
    }, 100);
  };

  const generateCalendarDays = () => {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday is 0, Sunday is 6
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    
    const cells = [];
    
    // Rellenar días vacíos iniciales
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Generar celdas del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      
      const dayOrders = history.filter(item => item.date === dateStr);
      const isToday = dateStr === todayStr;
      const hasOrders = dayOrders.length > 0;
      
      let dayNetTotal = 0;
      let isPaid = false;
      if (hasOrders) {
        const dayBaseNet = dayOrders.reduce((sum, item) => sum + (item.earnings?.netTotal || 0), 0);
        const metaInfo = getDailyMetaLabel(dayOrders.length);
        const guaranteedMinimumGross = metaInfo.bonus;
        const guaranteedMinimumNet = Number((guaranteedMinimumGross * (1 - taxRate)).toFixed(2));
        const currentDailyBonus = dailyBonuses[dateStr] || 0;
        dayNetTotal = Math.max(dayBaseNet, guaranteedMinimumNet) + currentDailyBonus;

        const { payDateStr } = getWeekNumberAndYear(dateStr);
        isPaid = new Date(payDateStr + 'T00:00:00') <= new Date();
      }
      
      cells.push({
        dayNum: d,
        dateStr,
        isToday,
        hasOrders,
        orderCount: dayOrders.length,
        netTotal: dayNetTotal,
        isPaid
      });
    }
    
    return cells;
  };

  const getWeekNumberAndYear = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      mondayStr: monday.toISOString().split('T')[0],
      sundayStr: sunday.toISOString().split('T')[0],
      weekKey: `${monday.getFullYear()}-W${getWeekNumber(monday)}`,
      payDateStr: getPaymentThursday(sunday)
    };
  };

  const getWeekNumber = (d) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  };

  const getPaymentThursday = (sundayDate) => {
    const paymentDate = new Date(sundayDate);
    paymentDate.setDate(sundayDate.getDate() + 4);
    return paymentDate.toISOString().split('T')[0];
  };

  const getWeeklyMetrics = () => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diffToMonday));
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);

    const currentWeekOrders = history.filter(item => {
      if (!item.date) return false;
      const itemDate = new Date(item.date + 'T00:00:00');
      return itemDate >= monday && itemDate <= sunday;
    });

    const weeklyOrdersCount = currentWeekOrders.length;
    const weeklyMins = currentWeekOrders.reduce((sum, item) => sum + timeToMinutes(item.pickingTime), 0);
    const weeklyWorkedDates = [...new Set(currentWeekOrders.map(item => item.date))];

    const weeklyNetTotal = weeklyWorkedDates.reduce((sum, date) => {
      const dayOrders = currentWeekOrders.filter(item => item.date === date);
      const dayBaseNet = dayOrders.reduce((dSum, item) => dSum + (item.earnings?.netTotal || 0), 0);
      const metaInfo = getDailyMetaLabel(dayOrders.length);
      const guaranteedMinimumGross = metaInfo.bonus;
      const guaranteedMinimumNet = Number((guaranteedMinimumGross * (1 - taxRate)).toFixed(2));
      const currentDailyBonus = dailyBonuses[date] || 0;
      
      const dayTotal = Math.max(dayBaseNet, guaranteedMinimumNet) + currentDailyBonus;
      return sum + dayTotal;
    }, 0);

    const payDate = new Date(sunday);
    payDate.setDate(sunday.getDate() + 4);
    const payDateStr = payDate.toISOString().split('T')[0];
    const isWeeklyPaid = payDate <= today;

    return {
      mondayStr: monday.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
      sundayStr: sunday.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
      payDateFormatted: payDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }),
      weeklyOrdersCount,
      weeklyWorkedDatesCount: weeklyWorkedDates.length,
      weeklyMins,
      weeklyNetTotal,
      isWeeklyPaid
    };
  };

  const weeklyMetrics = getWeeklyMetrics();

  const formatMinutes = (totalMins) => {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
  };

  // Filtrar el historial según la búsqueda
  const filteredHistory = history.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      (item.pedidoId && item.pedidoId.toLowerCase().includes(term)) ||
      (item.date && item.date.toLowerCase().includes(term))
    );
  });

  // Agrupar pedidos por fecha
  const groupedOrders = {};
  filteredHistory.forEach(item => {
    if (!groupedOrders[item.date]) {
      groupedOrders[item.date] = [];
    }
    groupedOrders[item.date].push(item);
  });

  // Ordenar fechas de más reciente a más antigua
  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a));

  // --- Estadísticas Acumuladas Globales de Historial ---
  const totalOrders = filteredHistory.length;
  const uniqueDatesInFiltered = [...new Set(filteredHistory.map(item => item.date))];
  
  // Calcular el total líquido acumulado aplicando tramos de metas diarias y bonos generales
  const totalNetAll = uniqueDatesInFiltered.reduce((sum, date) => {
    const dayOrders = history.filter(item => item.date === date);
    const dayBaseNet = dayOrders.reduce((dSum, item) => dSum + (item.earnings?.netTotal || 0), 0);
    const metaInfo = getDailyMetaLabel(dayOrders.length);
    const guaranteedMinimumGross = metaInfo.bonus;
    const guaranteedMinimumNet = Number((guaranteedMinimumGross * (1 - taxRate)).toFixed(2));
    const currentDailyBonus = dailyBonuses[date] || 0;
    
    const dayTotal = Math.max(dayBaseNet, guaranteedMinimumNet) + currentDailyBonus;
    return sum + dayTotal;
  }, 0);

  const totalMinutes = filteredHistory.reduce((sum, item) => sum + timeToMinutes(item.pickingTime), 0);

  return (
    <div className="card glass w-full">
      <div className="card-header flex justify-between items-start flex-wrap gap-2 border-b pb-3 mb-4">
        <div>
          <h2 className="text-gradient text-lg">Historial y Calendario</h2>
          <p className="card-subtitle text-xs">Consulta tus pedidos agrupados por día y tus metas diarias alcanzadas.</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="btn btn-secondary btn-danger-hover btn-sm text-xxs py-1 px-3 flex items-center gap-1"
          >
            <Trash size={12} />
            Borrar Todo
          </button>
        )}
      </div>

      <div className="card-body p-0">
        {/* Dashboard de Totales (Semana Actual) */}
        {history.length > 0 && (
          <div className="grid-3 gap-3 mb-4" style={{ gap: '10px' }}>
            <div className="stats-box stats-primary p-3">
              <TrendingUp className="stats-icon text-primary" size={16} />
              <span className="stats-title text-[10px]">Líquido Semana Actual</span>
              <span className="stats-val text-sm font-bold text-gradient">{formatCLP(weeklyMetrics.weeklyNetTotal)}</span>
              <span className="text-[9px] text-muted">Ciclo: {weeklyMetrics.mondayStr} - {weeklyMetrics.sundayStr}</span>
            </div>
            <div className="stats-box stats-secondary p-3">
              <Hash className="stats-icon text-secondary" size={16} />
              <span className="stats-title text-[10px]">Resumen Semanal</span>
              <span className="stats-val text-sm">{weeklyMetrics.weeklyOrdersCount} pedidos</span>
              <span className="text-[9px] text-muted">{weeklyMetrics.weeklyWorkedDatesCount} días trabajados</span>
            </div>
            <div className="stats-box stats-muted p-3">
              <Calendar className="stats-icon text-muted" size={16} />
              <span className="stats-title text-[10px]">Estado de Pago Semanal</span>
              <span className="stats-val text-sm" style={{ color: weeklyMetrics.isWeeklyPaid ? 'var(--success)' : '#d97706', fontWeight: 'bold' }}>
                {weeklyMetrics.isWeeklyPaid ? "✓ Pagado" : "⏳ Por pagar"}
              </span>
              <span className="text-[9px] text-muted">Jueves {weeklyMetrics.payDateFormatted}</span>
            </div>
          </div>
        )}

        {/* Calendario Mensual Completo */}
        {history.length > 0 && (
          <div className="calendar-widget mb-4 border rounded-xl p-3 bg-gray-50 bg-opacity-40">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-xs capitalize text-gray-800 flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" />
                {currentCalDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={handlePrevMonth} 
                  className="btn btn-secondary btn-icon btn-sm font-bold"
                  style={{ width: '24px', height: '24px', padding: '0' }}
                  title="Mes anterior"
                >
                  &lt;
                </button>
                <button 
                  onClick={handleNextMonth} 
                  className="btn btn-secondary btn-icon btn-sm font-bold"
                  style={{ width: '24px', height: '24px', padding: '0' }}
                  title="Mes siguiente"
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="calendar-grid">
              {['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map(day => (
                <div key={day} className="calendar-header-cell text-center font-bold text-gray-500 uppercase text-[9px] py-1">
                  {day}
                </div>
              ))}
              {generateCalendarDays().map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="calendar-day-empty"></div>;
                }

                const { dayNum, dateStr, isToday, hasOrders, orderCount, netTotal, isPaid } = cell;
                return (
                  <div 
                    key={dateStr}
                    onClick={hasOrders ? () => handleCalendarDayClick(dateStr) : undefined}
                    className={`calendar-day-cell text-center p-1 flex flex-col justify-between items-center rounded-lg relative ${isToday ? 'today-cell' : ''} ${hasOrders ? 'active-day-cell cursor-pointer hover:scale-105 transition-transform' : 'text-gray-400'}`}
                    style={{ minHeight: '56px' }}
                  >
                    <span className="text-[10px] font-semibold">{dayNum}</span>
                    {hasOrders && (
                      <div className="flex flex-col items-center w-full">
                        <span className="badge badge-info text-[7px] px-1 py-0.2" style={{ transform: 'scale(0.85)', margin: '1px 0', whiteSpace: 'nowrap' }}>
                          {orderCount} ped
                        </span>
                        <span className="text-[8px] text-primary font-bold" style={{ transform: 'scale(0.85)', whiteSpace: 'nowrap' }}>
                          {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(netTotal)}
                        </span>
                        <span 
                          className="font-bold text-[8px]" 
                          style={{ 
                            color: '#ffffff',
                            backgroundColor: isPaid ? '#10b981' : '#d97706',
                            fontSize: '8px', 
                            padding: '1px 4px',
                            borderRadius: '4px',
                            marginTop: '2px',
                            fontWeight: '800',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {isPaid ? "✓ Pagado" : "⏳ Por pagar"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Buscador */}
        <div className="form-group mb-4">
          <div className="search-input-container">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Buscar por ID de pedido o fecha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field table-input text-xs pl-9"
            />
          </div>
        </div>

        {/* Listado de Días */}
        {sortedDates.length === 0 ? (
          <div className="text-center py-8 text-muted text-xs">
            {history.length === 0 
              ? "No tienes pedidos guardados en tu historial." 
              : "No se encontraron resultados para la búsqueda."}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {sortedDates.map(date => {
              const dayOrders = groupedOrders[date];
              const dayMins = dayOrders.reduce((sum, item) => sum + timeToMinutes(item.pickingTime), 0);
              
              const dayProductionNet = dayOrders.reduce((sum, item) => sum + (item.earnings?.netTotal || 0), 0);
              const dayProductionGross = dayOrders.reduce((sum, item) => sum + (item.earnings?.grossTotal || 0), 0);
              
              const metaInfo = getDailyMetaLabel(dayOrders.length);
              const guaranteedMinimumGross = metaInfo.bonus; 
              const guaranteedMinimumNet = Number((guaranteedMinimumGross * (1 - taxRate)).toFixed(2));
              
              const pickingNetTotal = Math.max(dayProductionNet, guaranteedMinimumNet);
              const isMetaApplied = guaranteedMinimumGross > 0 && dayProductionNet < guaranteedMinimumNet;
              
              const currentDailyBonus = dailyBonuses[date] || 0;
              const dayTotalNet = pickingNetTotal + currentDailyBonus;

              const isExpanded = expandedDates[date] || false;

              const { payDateStr } = getWeekNumberAndYear(date);
              const isPaid = new Date(payDateStr + 'T00:00:00') <= new Date();
              const payDateFormatted = new Date(payDateStr + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });

              return (
                <div 
                  key={date} 
                  id={`day-card-${date}`} 
                  className="day-group border rounded-xl overflow-hidden glass transition-all duration-300"
                >
                  {/* Cabecera del Día */}
                  <div 
                    onClick={() => toggleDateExpand(date)}
                    className="day-group-header bg-gray-50 border-b p-3 flex justify-between items-center flex-wrap gap-2 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-800 flex items-center gap-1">
                          {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                          {new Date(date + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </span>
                        <span className="badge badge-info text-[9px] py-0.5 px-2">
                          {dayOrders.length} {dayOrders.length === 1 ? 'Pedido' : 'Pedidos'}
                        </span>
                        <span className={`badge ${metaInfo.color} text-[9px] py-0.5 px-2`}>
                          {metaInfo.text}
                        </span>
                      </div>
                      <div className="text-xxs text-muted mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-0.5"><Clock size={10} /> {formatMinutes(dayMins)}</span>
                        <span>•</span>
                        {isMetaApplied ? (
                          <span className="text-success font-medium">Asegurado por Meta: {formatCLP(guaranteedMinimumNet)}</span>
                        ) : (
                          <span>Producción Bruta: {formatCLP(dayProductionGross)}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xxs text-muted block">Ganancia Líquida</span>
                      <span className="font-bold text-sm text-primary block">{formatCLP(dayTotalNet)}</span>
                      <span 
                        className="text-[9px] font-semibold block mt-0.5" 
                        style={{ color: isPaid ? 'var(--success)' : '#d97706' }}
                      >
                        {isPaid ? "✓ Pagado" : "⏳ Por pagar"} ({payDateFormatted})
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo del Día: Lista de Pedidos */}
                  {isExpanded && (
                    <div className="day-group-body p-2 flex flex-col gap-2 border-t bg-white bg-opacity-30">
                      {dayOrders.map((item) => (
                        <div key={item.id} className="history-item p-2 rounded-lg border bg-white flex justify-between items-center text-xxs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-gray-800">{item.pedidoId}</strong>
                              <span className="text-muted">Orden #{item.dayOrderIndex || 1}</span>
                              {item.earnings?.isSpecialRate && (
                                <span className="badge badge-success text-[8px] py-0.2 px-1">≥14</span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted mt-0.5">
                              <span>SKUs: {item.earnings?.effectiveSkuCount} ({item.totalProducts} - {item.sinStock})</span>
                              <span className="mx-1.5">|</span>
                              <span>Time: {item.pickingTime || '0:00'}</span>
                              {item.extraBonus > 0 && (
                                <>
                                  <span className="mx-1.5">|</span>
                                  <span className="text-success font-medium">Bono: +{formatCLP(item.extraBonus)}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700">{formatCLP((item.earnings?.netTotal || 0) + (item.extraBonus || 0))}</span>
                            <button
                              onClick={() => onDeleteItem(item.id)}
                              className="btn-icon btn-danger btn-sm p-1"
                              title="Eliminar pedido"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Bono Diario Extra Form */}
                      <div className="mt-2 pt-2 border-t flex justify-between items-center flex-wrap gap-2 text-xxs px-2 pb-1">
                        <div className="flex items-center gap-1">
                          <Plus size={12} className="text-secondary" />
                          <span className="text-muted">Bono Diario General (Lluvia, etc.):</span>
                        </div>
                        <div className="input-with-symbol" style={{ width: '100px' }}>
                          <span className="currency-symbol" style={{ left: '8px', fontSize: '10px' }}>$</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={dailyBonuses[date] || ''}
                            onChange={(e) => handleDailyBonusChange(date, e.target.value)}
                            className="input-field table-input text-xxs pl-5 text-right"
                            style={{ padding: '3px 6px' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
