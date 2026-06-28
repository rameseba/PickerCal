import React, { useState } from 'react';
import { Search, User, Phone, FileText, CheckCircle, Settings, Calendar, TrendingUp, Clock, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { DEFAULT_SKU_TABLE, DEFAULT_BASE_PAYMENTS, DEFAULT_TAX_RETENTION } from '../utils/calculatorLogic';

export default function AdminPanel({ profiles, historyDatabase, settingsDatabase, dailyBonusesDatabase = {} }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRut, setSelectedRut] = useState('');
  const [showSettingsDetails, setShowSettingsDetails] = useState(false);

  const formatCLP = (val) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  // Filtrar perfiles por término de búsqueda
  const filteredProfiles = profiles.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.rut.toLowerCase().includes(term) ||
      (p.phone && p.phone.toLowerCase().includes(term))
    );
  });

  // Si no hay perfil seleccionado y hay perfiles en la lista, seleccionar el primero por defecto
  const activeRut = selectedRut || (filteredProfiles[0]?.rut || '');
  const selectedProfile = profiles.find(p => p.rut === activeRut);

  // Obtener el historial y configuración del perfil seleccionado
  const userHistory = historyDatabase[activeRut] || [];
  const userSettings = settingsDatabase[activeRut] || {
    skuTable: DEFAULT_SKU_TABLE,
    basePayments: DEFAULT_BASE_PAYMENTS,
    taxRetentionPercent: DEFAULT_TAX_RETENTION
  };

  // Verificar si la configuración es predeterminada o personalizada
  const isDefaultSettings = 
    JSON.stringify(userSettings.skuTable) === JSON.stringify(DEFAULT_SKU_TABLE) &&
    JSON.stringify(userSettings.basePayments) === JSON.stringify(DEFAULT_BASE_PAYMENTS) &&
    userSettings.taxRetentionPercent === DEFAULT_TAX_RETENTION;

  // --- Procesamiento de Tiempos y Cálculos ---
  
  // Convertir string de tiempo (ej. "0:42" o "1:15") a minutos
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+)\s*\:\s*(\d+)/);
    if (match) {
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    // Si solo viene un número
    const num = parseInt(timeStr, 10);
    return isNaN(num) ? 0 : num;
  };

  // Convertir minutos a string legible (ej: "15h 24m")
  const formatMinutes = (totalMins) => {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
  };

  // Mínimo garantizado por tramos de pedidos diarios
  const getDailyMetaMinimum = (orderCount) => {
    if (orderCount >= 13) {
      return 50000 + (orderCount - 13) * 2500;
    }
    if (orderCount >= 10) return 40000;
    if (orderCount >= 7) return 28000;
    return 0;
  };

  const activeUserDailyBonuses = dailyBonusesDatabase[activeRut] || {};

  // Fechas únicas trabajadas
  const workedDates = [...new Set(userHistory.map(item => item.date))].sort();
  const totalDaysWorked = workedDates.length;

  const taxRate = userSettings.taxRetentionPercent / 100;

  // --- Estadísticas Consolidadas ---
  // Suma del total de líquido acumulado sumando los máximos garantizados y bonos de cada día de trabajo
  const totalNet = workedDates.reduce((sum, date) => {
    const dayOrders = userHistory.filter(item => item.date === date);
    const dayProductionNet = dayOrders.reduce((dSum, item) => dSum + (item.earnings?.netTotal || 0), 0);
    const guaranteedMinimumGross = getDailyMetaMinimum(dayOrders.length);
    const guaranteedMinimumNet = Number((guaranteedMinimumGross * (1 - taxRate)).toFixed(2));
    const currentDailyBonus = activeUserDailyBonuses[date] || 0;
    
    return sum + Math.max(dayProductionNet, guaranteedMinimumNet) + currentDailyBonus;
  }, 0);

  const totalGross = userHistory.reduce((sum, item) => sum + (item.earnings?.grossTotal || 0), 0);
  const totalSkus = userHistory.reduce((sum, item) => sum + (item.earnings?.effectiveSkuCount || 0), 0);
  const totalOrders = userHistory.length;

  // Tiempo acumulado en minutos
  const totalMinutes = userHistory.reduce((sum, item) => {
    const pickingTimeStr = item.pickingTime || (item.rawText && item.rawText.match(/tiempo total de picking\s*([\d\:]+)/i)?.[1]) || '0:0';
    return sum + timeToMinutes(pickingTimeStr);
  }, 0);

  // --- Agrupación por Día ---
  const dailyStats = workedDates.map(date => {
    const dayOrders = userHistory.filter(item => item.date === date);
    const dayProductionNet = dayOrders.reduce((sum, item) => sum + (item.earnings?.netTotal || 0), 0);
    const guaranteedMinimumGross = getDailyMetaMinimum(dayOrders.length);
    const guaranteedMinimumNet = Number((guaranteedMinimumGross * (1 - taxRate)).toFixed(2));
    const currentDailyBonus = activeUserDailyBonuses[date] || 0;
    
    const dayNet = Math.max(dayProductionNet, guaranteedMinimumNet) + currentDailyBonus;

    const dayMins = dayOrders.reduce((sum, item) => {
      const pickingTimeStr = item.pickingTime || (item.rawText && item.rawText.match(/tiempo total de picking\s*([\d\:]+)/i)?.[1]) || '0:0';
      return sum + timeToMinutes(pickingTimeStr);
    }, 0);
    return {
      date,
      orderCount: dayOrders.length,
      netTotal: dayNet,
      pickingTime: formatMinutes(dayMins)
    };
  }).reverse(); // Más recientes primero

  // --- Agrupación por Semana (Lunes a Domingo) ---
  const getWeekNumberAndYear = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    // En Chile la semana laboral empieza el Lunes. Busquemos el lunes previo.
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar si es Domingo (0)
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
    paymentDate.setDate(sundayDate.getDate() + 4); // El jueves posterior
    return paymentDate.toISOString().split('T')[0];
  };

  // Agrupar semanalmente
  const weeklyMap = {};
  const weekDatesMap = {}; // { weekKey: Set of dates }
  userHistory.forEach(item => {
    if (!item.date) return;
    const { mondayStr, sundayStr, weekKey, payDateStr } = getWeekNumberAndYear(item.date);
    if (!weeklyMap[weekKey]) {
      weeklyMap[weekKey] = {
        monday: mondayStr,
        sunday: sundayStr,
        payDate: payDateStr,
        orders: 0,
        netTotal: 0,
        mins: 0
      };
      weekDatesMap[weekKey] = new Set();
    }
    weeklyMap[weekKey].orders += 1;
    weekDatesMap[weekKey].add(item.date);
    const pickingTimeStr = item.pickingTime || (item.rawText && item.rawText.match(/tiempo total de picking\s*([\d\:]+)/i)?.[1]) || '0:0';
    weeklyMap[weekKey].mins += timeToMinutes(pickingTimeStr);
  });

  // Calcular el neto de la semana sumando los días trabajados con sus garantías y bonos
  Object.keys(weeklyMap).forEach(weekKey => {
    const dates = Array.from(weekDatesMap[weekKey]);
    let weekNetSum = 0;
    dates.forEach(date => {
      const dayOrders = userHistory.filter(item => item.date === date);
      const dayProductionNet = dayOrders.reduce((sum, item) => sum + (item.earnings?.netTotal || 0), 0);
      const guaranteedMinimumGross = getDailyMetaMinimum(dayOrders.length);
      const guaranteedMinimumNet = Number((guaranteedMinimumGross * (1 - taxRate)).toFixed(2));
      const currentDailyBonus = activeUserDailyBonuses[date] || 0;
      
      weekNetSum += Math.max(dayProductionNet, guaranteedMinimumNet) + currentDailyBonus;
    });
    weeklyMap[weekKey].netTotal = weekNetSum;
  });

  const weeklyStats = Object.values(weeklyMap).sort((a, b) => b.monday.localeCompare(a.monday));

  // --- Agrupación por Mes ---
  const monthlyMap = {};
  const monthDatesMap = {}; // { monthKey: Set of dates }
  userHistory.forEach(item => {
    if (!item.date) return;
    const date = new Date(item.date + 'T00:00:00');
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = {
        label: monthLabel,
        orders: 0,
        netTotal: 0,
        mins: 0
      };
      monthDatesMap[monthKey] = new Set();
    }
    monthlyMap[monthKey].orders += 1;
    monthDatesMap[monthKey].add(item.date);
    const pickingTimeStr = item.pickingTime || (item.rawText && item.rawText.match(/tiempo total de picking\s*([\d\:]+)/i)?.[1]) || '0:0';
    monthlyMap[monthKey].mins += timeToMinutes(pickingTimeStr);
  });

  // Calcular el neto de cada mes sumando los días trabajados correspondientes con sus garantías y bonos
  Object.keys(monthlyMap).forEach(monthKey => {
    const dates = Array.from(monthDatesMap[monthKey]);
    let monthNetSum = 0;
    dates.forEach(date => {
      const dayOrders = userHistory.filter(item => item.date === date);
      const dayProductionNet = dayOrders.reduce((sum, item) => sum + (item.earnings?.netTotal || 0), 0);
      const guaranteedMinimumGross = getDailyMetaMinimum(dayOrders.length);
      const guaranteedMinimumNet = Number((guaranteedMinimumGross * (1 - taxRate)).toFixed(2));
      const currentDailyBonus = activeUserDailyBonuses[date] || 0;
      
      monthNetSum += Math.max(dayProductionNet, guaranteedMinimumNet) + currentDailyBonus;
    });
    monthlyMap[monthKey].netTotal = monthNetSum;
  });

  const monthlyStats = Object.entries(monthlyMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, val]) => val);

  return (
    <div className="card glass admin-panel-card w-full">
      <div className="card-header">
        <h2 className="text-gradient">Panel de Administrador</h2>
        <p className="card-subtitle">Auditoría centralizada de tarifas, tiempos y reportes por RUT de Picker.</p>
      </div>

      <div className="card-body admin-layout">
        {/* Lado Izquierdo: Buscador y Listado de Usuarios */}
        <div className="admin-sidebar">
          <div className="form-group mb-3">
            <div className="search-input-container">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Buscar RUT o Nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-9 table-input"
              />
            </div>
          </div>

          <div className="admin-user-list">
            {filteredProfiles.length === 0 ? (
              <p className="text-muted text-xs text-center py-4">No se encontraron pickers.</p>
            ) : (
              filteredProfiles.map(p => (
                <button
                  key={p.rut}
                  onClick={() => setSelectedRut(p.rut)}
                  className={`admin-user-item ${p.rut === activeRut ? 'active' : ''}`}
                >
                  <span className="font-bold text-xs block text-left text-gray-800">{p.name}</span>
                  <span className="text-xxs text-muted block text-left">{p.rut}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Lado Derecho: Reportes del Usuario Seleccionado */}
        <div className="admin-reports-content">
          {!selectedProfile ? (
            <div className="text-center py-12 text-muted">
              Selecciona un Picker de la lista para ver su reporte consolidado.
            </div>
          ) : (
            <div className="reports-container flex flex-col gap-6">
              {/* Información Personal y Configuración */}
              <div className="profile-details-card glass p-4 rounded-xl flex justify-between items-start flex-wrap gap-4">
                <div className="flex gap-3">
                  <div className="logo-icon-bg" style={{ width: '40px', height: '40px' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-800">{selectedProfile.name}</h3>
                    <div className="text-xs text-muted flex items-center gap-3">
                      <span>RUT: {selectedProfile.rut}</span>
                      {selectedProfile.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {selectedProfile.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="settings-status-indicator">
                  <div 
                    className="badge badge-info flex items-center gap-1 cursor-pointer select-none"
                    onClick={() => setShowSettingsDetails(!showSettingsDetails)}
                  >
                    <Settings size={12} />
                    <span>Ajustes: {isDefaultSettings ? 'Predeterminados' : 'Personalizados'}</span>
                    {showSettingsDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </div>
                  {showSettingsDetails && (
                    <div className="settings-popup glass text-xxs mt-1 p-2 rounded border">
                      <p>Retención: <strong>{userSettings.taxRetentionPercent}%</strong></p>
                      <p>Base Estándar: <strong>{formatCLP(userSettings.basePayments.standard)}</strong></p>
                      <p>Base Fin de Sem./Lunes: <strong>{formatCLP(userSettings.basePayments.weekend)}</strong></p>
                      <p>Rangos SKU configurados: <strong>{userSettings.skuTable.length} filas</strong></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid de Totales */}
              <div className="grid-3 gap-3">
                <div className="stats-box stats-primary p-3">
                  <TrendingUp className="stats-icon text-primary" size={16} />
                  <span className="stats-title text-xxs">Ingreso Líquido</span>
                  <span className="stats-val text-sm">{formatCLP(totalNet)}</span>
                </div>
                <div className="stats-box stats-secondary p-3">
                  <Clock className="stats-icon text-secondary" size={16} />
                  <span className="stats-title text-xxs">Tiempo de Picking</span>
                  <span className="stats-val text-sm">{formatMinutes(totalMinutes)}</span>
                </div>
                <div className="stats-box stats-muted p-3">
                  <Hash className="stats-icon text-muted" size={16} />
                  <span className="stats-title text-xxs">Pedidos / Días</span>
                  <span className="stats-val text-sm">{totalOrders} ped. / {totalDaysWorked} días</span>
                </div>
              </div>

              {/* Pestañas de Agrupación */}
              <div className="report-sections grid-1 gap-4">
                {/* Desglose por Semana (Corte Lunes-Domingo) */}
                <div className="report-section">
                  <h4 className="font-bold text-xs text-gray-700 mb-2 uppercase tracking-wide">Desglose Semanal (Pago Jueves)</h4>
                  {weeklyStats.length === 0 ? (
                    <p className="text-muted text-xs">Sin registros de pedidos.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Semana (Lun - Dom)</th>
                            <th>Pedidos</th>
                            <th>Tiempo Picking</th>
                            <th>Monto Líquido</th>
                            <th>Fecha Estimada Pago</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyStats.map((w, idx) => (
                            <tr key={idx}>
                              <td className="text-xs">
                                {new Date(w.monday + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} - {new Date(w.sunday + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                              </td>
                              <td className="font-semibold">{w.orders}</td>
                              <td>{formatMinutes(w.mins)}</td>
                              <td className="font-bold text-primary">{formatCLP(w.netTotal)}</td>
                              <td className="text-xs font-medium">
                                {(() => {
                                  const payDate = new Date(w.payDate + 'T00:00:00');
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const isPaid = payDate <= today;
                                  
                                  const dateFormatted = payDate.toLocaleDateString('es-CL', { 
                                    weekday: 'short', 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  });
                                  
                                  return isPaid ? (
                                    <span className="flex items-center gap-1 text-success">
                                      <CheckCircle size={12} />
                                      <span>Pagado ({dateFormatted})</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1" style={{ color: '#d97706', display: 'flex', alignItems: 'center' }}>
                                      <Clock size={12} />
                                      <span>Por pagar ({dateFormatted})</span>
                                    </span>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Desglose Mensual */}
                <div className="report-section">
                  <h4 className="font-bold text-xs text-gray-700 mb-2 uppercase tracking-wide">Consolidado Mensual</h4>
                  {monthlyStats.length === 0 ? (
                    <p className="text-muted text-xs">Sin registros de pedidos.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Mes</th>
                            <th>Pedidos</th>
                            <th>Tiempo Picking</th>
                            <th>Monto Líquido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyStats.map((m, idx) => (
                            <tr key={idx}>
                              <td className="text-xs font-semibold capitalize">{m.label}</td>
                              <td>{m.orders}</td>
                              <td>{formatMinutes(m.mins)}</td>
                              <td className="font-bold text-primary">{formatCLP(m.netTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Desglose Diario */}
                <div className="report-section">
                  <h4 className="font-bold text-xs text-gray-700 mb-2 uppercase tracking-wide">Desglose Diario</h4>
                  {dailyStats.length === 0 ? (
                    <p className="text-muted text-xs">Sin registros de pedidos.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Pedidos del Día</th>
                            <th>Tiempo Picking</th>
                            <th>Monto Líquido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyStats.map((d, idx) => (
                            <tr key={idx}>
                              <td className="text-xs">
                                {new Date(d.date + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="font-semibold">{d.orderCount}</td>
                              <td>{d.pickingTime}</td>
                              <td className="font-bold text-primary">{formatCLP(d.netTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
