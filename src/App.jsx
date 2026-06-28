import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, History, Settings, Moon, Sun, ShoppingBag, Shield } from 'lucide-react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import OcrUpload from './components/OcrUpload';
import Calculator from './components/Calculator';
import SkuTable from './components/SkuTable';
import SettingsPanel from './components/SettingsPanel';
import OrderHistory from './components/OrderHistory';
import ProfileSelector from './components/ProfileSelector';
import AdminPanel from './components/AdminPanel';
import { 
  DEFAULT_SKU_TABLE, 
  DEFAULT_BASE_PAYMENTS, 
  DEFAULT_TAX_RETENTION,
  calculateEarnings
} from './utils/calculatorLogic';

export default function App() {
  // --- Convex Hooks ---
  const dbProfiles = useQuery(api.profiles.list) || [];
  const dbAllHistory = useQuery(api.history.getAllHistory) || [];
  const dbAllSettings = useQuery(api.settings.getAllSettings) || [];
  const dbAllBonuses = useQuery(api.dailyBonuses.getAllBonuses) || [];
  const dbReports = useQuery(api.reports.list) || [];

  const createProfileMutation = useMutation(api.profiles.create);
  const updateProfileMutation = useMutation(api.profiles.update);
  const addHistoryItemMutation = useMutation(api.history.add);
  const addHistoryBatchMutation = useMutation(api.history.addBatch);
  const deleteHistoryItemMutation = useMutation(api.history.deleteItem);
  const clearHistoryMutation = useMutation(api.history.clear);
  const saveSettingsMutation = useMutation(api.settings.save);
  const saveDailyBonusMutation = useMutation(api.dailyBonuses.save);
  const addReportMutation = useMutation(api.reports.add);
  const deleteReportMutation = useMutation(api.reports.deleteReport);

  // --- Local states for Active User, Tab, Theme ---
  const [activeRut, setActiveRut] = useState(() => {
    return localStorage.getItem('picking_active_rut') || '';
  });

  const [showLogin, setShowLogin] = useState(true);

  const [showBugReportModal, setShowBugReportModal] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [bugScreenshot, setBugScreenshot] = useState(null);
  const [showTooltip, setShowTooltip] = useState(true);

  const [activeTab, setActiveTab] = useState('calculator'); // 'admin', 'calculator', 'history', 'settings'
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('picking_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // --- Reconstruct DB structures from Convex data ---
  const profiles = dbProfiles;

  const settingsDatabase = {};
  dbAllSettings.forEach(s => {
    settingsDatabase[s.rut] = {
      skuTable: s.skuTable,
      basePayments: s.basePayments,
      taxRetentionPercent: s.taxRetentionPercent
    };
  });

  const historyDatabase = {};
  dbAllHistory.forEach(h => {
    if (!historyDatabase[h.rut]) historyDatabase[h.rut] = [];
    historyDatabase[h.rut].push({
      id: h.pedidoId,
      date: h.date,
      totalProductos: h.totalProductos,
      sinStock: h.sinStock,
      pickeados: h.pickeados,
      sustituidos: h.sustituidos,
      productosSolicitados: h.productosSolicitados,
      isWeekendRate: h.isWeekendRate,
      pickingTime: h.pickingTime,
      extraBonus: h.extraBonus,
      earnings: {
        effectiveSkuCount: h.earnings.effectiveSkuCount,
        skuRate: h.earnings.skuRate,
        skuPayment: h.earnings.skuPayment,
        basePayment: h.earnings.basePayment,
        extraBonus: h.earnings.extraBonus,
        grossTotal: h.earnings.grossTotal,
        taxAmount: h.earnings.taxRetention, // map taxRetention back to taxAmount
        netTotal: h.earnings.netTotal,
        isSpecialRate: h.earnings.isSpecialRate
      }
    });
  });
  // Sort history for each picker
  Object.keys(historyDatabase).forEach(rut => {
    historyDatabase[rut].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  });

  const dailyBonusesDatabase = {};
  dbAllBonuses.forEach(b => {
    if (!dailyBonusesDatabase[b.rut]) dailyBonusesDatabase[b.rut] = {};
    dailyBonusesDatabase[b.rut][b.date] = b.amount;
  });

  const reports = dbReports;

  // --- Sync activeRut to localStorage ---
  useEffect(() => {
    localStorage.setItem('picking_active_rut', activeRut);
    if (!activeRut) {
      setShowLogin(true);
    } else {
      setShowLogin(false);
    }
  }, [activeRut]);

  useEffect(() => {
    if (activeRut) {
      setShowTooltip(true);
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeRut]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('picking_theme', theme);
  }, [theme]);

  // Cerrar panel de admin automáticamente si cambia a un RUT no autorizado
  useEffect(() => {
    if (activeRut !== '20.382.650-8') {
      setIsAdminMode(false);
      if (activeTab === 'admin') {
        setActiveTab('calculator');
      }
    }
  }, [activeRut, activeTab]);


  // --- Perfil Activo Actual ---
  const activeProfile = profiles.find(p => p.rut === activeRut) || null;

  // Cargar Ajustes del usuario activo o por defecto
  const userSettings = activeRut && settingsDatabase[activeRut] ? settingsDatabase[activeRut] : {
    skuTable: DEFAULT_SKU_TABLE,
    basePayments: DEFAULT_BASE_PAYMENTS,
    taxRetentionPercent: DEFAULT_TAX_RETENTION
  };

  // Cargar Historial del usuario activo
  const userHistory = activeRut && historyDatabase[activeRut] ? historyDatabase[activeRut] : [];

  // --- Datos de la Boleta en Edición (Calculadora) ---
  const [orderData, setOrderData] = useState({
    pedidoId: '',
    productosSolicitados: '',
    pickeados: '',
    sustituidos: '',
    sinStock: '',
    totalProductos: '',
    detectedDate: '',
    isWeekendRate: false,
    pickingTime: '',
    extraBonus: ''
  });

  const handleBugScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setBugScreenshot(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSendBugReport = async () => {
    if (!bugDescription.trim()) {
      alert("Por favor, describe el error.");
      return;
    }
    
    const activeProfileName = activeProfile?.name || 'Desconocido';
    await addReportMutation({
      pickerName: activeProfileName,
      pickerRut: activeRut || 'Desconocido',
      description: bugDescription,
      screenshot: bugScreenshot || undefined,
      date: new Date().toISOString()
    });
    
    setBugDescription('');
    setBugScreenshot(null);
    setShowBugReportModal(false);
    alert("¡Muchas gracias! Tu reporte de error ha sido enviado y registrado en el panel del administrador.");
  };

  // --- Controladores Multiperfil ---
  const handleCreateProfile = async (newProfile) => {
    await createProfileMutation({
      rut: newProfile.rut,
      name: newProfile.name,
      phone: newProfile.phone || undefined,
      password: newProfile.password
    });
    setActiveRut(newProfile.rut);
  };

  const handleUpdateProfile = async (updatedProfile) => {
    await updateProfileMutation({
      rut: updatedProfile.rut,
      name: updatedProfile.name,
      phone: updatedProfile.phone || undefined,
      password: updatedProfile.password
    });
  };

  const handleSelectProfile = (rut) => {
    setActiveRut(rut);
  };

  const handleLogoutProfile = () => {
    if (window.confirm("¿Deseas cerrar sesión de este perfil?")) {
      setActiveRut('');
      setIsAdminMode(false);
      setActiveTab('calculator');
    }
  };

  const handleSaveUserSettings = async (newSettings) => {
    if (!activeRut) return;
    await saveSettingsMutation({
      rut: activeRut,
      skuTable: newSettings.skuTable,
      basePayments: newSettings.basePayments,
      taxRetentionPercent: newSettings.taxRetentionPercent
    });
  };

  const handleResetUserSettings = async (defaultSettings) => {
    if (!activeRut) return;
    await saveSettingsMutation({
      rut: activeRut,
      skuTable: defaultSettings.skuTable,
      basePayments: defaultSettings.basePayments,
      taxRetentionPercent: defaultSettings.taxRetentionPercent
    });
  };

  // --- Controladores de Pedidos (Historial) ---
  
  // Obtener pedidos cargados hoy para saber cuál es el índice de pedido actual
  const todayDateStr = orderData.detectedDate || new Date().toISOString().split('T')[0];
  const todayOrdersCount = userHistory.filter(item => item.date === todayDateStr).length;

  const handleSaveToHistory = async (orderRecord) => {
    if (!activeRut) {
      alert("Por favor registra un perfil de Picker antes de guardar pedidos.");
      return;
    }

    await addHistoryItemMutation({
      rut: activeRut,
      pedidoId: orderRecord.pedidoId,
      date: orderRecord.date,
      totalProductos: orderRecord.totalProductos,
      sinStock: orderRecord.sinStock,
      pickeados: orderRecord.pickeados,
      sustituidos: orderRecord.sustituidos,
      productosSolicitados: orderRecord.productosSolicitados,
      isWeekendRate: orderRecord.isWeekendRate,
      pickingTime: orderRecord.pickingTime,
      extraBonus: orderRecord.extraBonus,
      earnings: {
        effectiveSkuCount: orderRecord.earnings.effectiveSkuCount,
        skuRate: orderRecord.earnings.skuRate,
        skuPayment: orderRecord.earnings.skuPayment,
        basePayment: orderRecord.earnings.basePayment,
        extraBonus: orderRecord.earnings.extraBonus,
        grossTotal: orderRecord.earnings.grossTotal,
        taxRetention: orderRecord.earnings.taxAmount,
        netTotal: orderRecord.earnings.netTotal,
        isSpecialRate: orderRecord.earnings.isSpecialRate
      }
    });

    // Resetear formulario para el siguiente pedido
    setOrderData({
      pedidoId: '',
      productosSolicitados: '',
      pickeados: '',
      sustituidos: '',
      sinStock: '',
      totalProductos: '',
      detectedDate: '',
      isWeekendRate: false,
      pickingTime: '',
      extraBonus: ''
    });

    setActiveTab('history');
  };

  const handleBatchConfirm = async (batchRecords) => {
    if (!activeRut) {
      alert("Registra un perfil antes de procesar boletas.");
      return;
    }

    const itemsToSave = batchRecords.map((record) => {
      const dateStr = record.detectedDate || new Date().toISOString().split('T')[0];
      const sameDayCount = userHistory.filter(item => item.date === dateStr).length;
      const finalOrderIndex = record.dayOrderIndex || (sameDayCount + 1);

      const earnings = calculateEarnings({
        totalProducts: record.totalProductos || 0,
        sinStock: record.sinStock || 0,
        isWeekendRate: record.isWeekendRate,
        skuTable: userSettings.skuTable,
        basePayments: userSettings.basePayments,
        taxRetentionPercent: userSettings.taxRetentionPercent,
        orderNumber: finalOrderIndex
      });

      const finalGross = earnings.grossTotal + (record.extraBonus || 0);
      const finalTax = Number((finalGross * (userSettings.taxRetentionPercent / 100)).toFixed(2));
      const finalNet = Number((finalGross - finalTax).toFixed(2));

      return {
        pedidoId: record.pedidoId,
        date: dateStr,
        totalProductos: record.totalProductos || 0,
        sinStock: record.sinStock || 0,
        pickeados: record.pickeados || 0,
        sustituidos: record.sustituidos || 0,
        productosSolicitados: record.productosSolicitados || 0,
        isWeekendRate: record.isWeekendRate,
        pickingTime: record.pickingTime || '0:00',
        extraBonus: record.extraBonus || 0,
        earnings: {
          effectiveSkuCount: earnings.effectiveSkuCount,
          skuRate: earnings.skuRate,
          skuPayment: earnings.skuPayment,
          basePayment: earnings.basePayment,
          extraBonus: record.extraBonus || 0,
          grossTotal: finalGross,
          taxRetention: finalTax,
          netTotal: finalNet,
          isSpecialRate: finalOrderIndex >= 14
        }
      };
    });

    await addHistoryBatchMutation({
      rut: activeRut,
      items: itemsToSave
    });

    setActiveTab('history');
  };

  const handleDeleteHistoryItem = async (id) => {
    if (!activeRut) return;
    if (window.confirm("¿Seguro que deseas eliminar este pedido de tu historial?")) {
      await deleteHistoryItemMutation({ rut: activeRut, pedidoId: id });
    }
  };

  const handleClearHistory = async () => {
    if (!activeRut) return;
    if (window.confirm("ATENCIÓN: Se eliminará permanentemente todo tu historial de pedidos. Esta acción no se puede deshacer. ¿Deseas continuar?")) {
      await clearHistoryMutation({ rut: activeRut });
    }
  };

  const handleSaveDailyBonus = async (date, val) => {
    if (!activeRut) return;
    await saveDailyBonusMutation({
      rut: activeRut,
      date: date,
      amount: val
    });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleToggleAdminMode = () => {
    if (activeRut !== '20.382.650-8') {
      alert("Acceso denegado. Solo el administrador autorizado puede acceder.");
      return;
    }
    setIsAdminMode(prev => {
      const next = !prev;
      if (next) {
        setActiveTab('admin');
      } else {
        setActiveTab('calculator');
      }
      return next;
    });
  };

  // Calcular SKU efectivos del pedido en edición actual
  const currentEffectiveSku = Math.max(0, (Number(orderData.totalProductos) || 0) - (Number(orderData.sinStock) || 0));

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header glass">
        <div className="header-content container">
          <div className="logo-section">
            <div className="logo-icon-bg" style={{ overflow: 'hidden', padding: 0 }}>
              <img src="/logo.png" alt="PickerCal Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <h1 className="logo-title text-gradient">PickerCal</h1>
              <span className="logo-tagline">Calculadora de Ganancias</span>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={toggleTheme} 
            className="btn-theme-toggle"
            title="Cambiar tema"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main container flex flex-col gap-6">
        {/* Selector de Picker (Login / Registro / Switch) */}
        <ProfileSelector
          activeProfile={activeProfile}
          profiles={profiles}
          onSelectProfile={handleSelectProfile}
          onCreateProfile={handleCreateProfile}
          onLogoutProfile={handleLogoutProfile}
          onUpdateProfile={handleUpdateProfile}
          isAdminMode={isAdminMode}
          onChangeAdminMode={handleToggleAdminMode}
          showLogin={showLogin}
          onShowLoginChange={setShowLogin}
        />

        {/* Solo mostrar la UI si hay un perfil activo y el login está cerrado */}
        {activeProfile && !showLogin ? (
          <div className="active-tab-container w-full max-w-4xl mx-auto flex flex-col gap-6">
            {activeTab === 'admin' && (
              <div className="w-full flex justify-center">
                <AdminPanel 
                  profiles={profiles} 
                  historyDatabase={historyDatabase} 
                  settingsDatabase={settingsDatabase}
                  dailyBonusesDatabase={dailyBonusesDatabase}
                  reports={reports}
                  onDeleteReport={(reportId) => {
                    if (window.confirm("¿Seguro que deseas resolver y eliminar este reporte de error?")) {
                      const updatedReports = reports.filter(r => r.id !== reportId);
                      setReports(updatedReports);
                      syncDbToServer(profiles, settingsDatabase, historyDatabase, dailyBonusesDatabase, updatedReports);
                    }
                  }}
                />
              </div>
            )}{activeTab === 'calculator' && (
              <div className="flex flex-col gap-6 w-full">
                {/* OCR Multi-boletas */}
                <OcrUpload 
                  onBatchConfirm={handleBatchConfirm} 
                  currentHistoryCount={userHistory.length}
                />
                
                {/* Formulario e Informes de ganancias */}
                <Calculator 
                  orderData={orderData} 
                  setOrderData={setOrderData} 
                  settings={userSettings}
                  onSaveToHistory={handleSaveToHistory}
                  onBatchSave={handleBatchConfirm}
                  dailyOrderCount={todayOrdersCount}
                />

                {/* Resaltado dinámico SKU */}
                <SkuTable 
                  skuTable={userSettings.skuTable} 
                  effectiveSkuCount={currentEffectiveSku} 
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="w-full flex justify-center">
                <OrderHistory 
                  history={userHistory} 
                  onDeleteItem={handleDeleteHistoryItem}
                  onClearHistory={handleClearHistory}
                  settings={userSettings}
                  dailyBonuses={dailyBonusesDatabase[activeRut] || {}}
                  onDailyBonusChange={handleSaveDailyBonus}
                />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="w-full flex justify-center">
                <SettingsPanel 
                  settings={userSettings} 
                  onSaveSettings={handleSaveUserSettings}
                  onResetSettings={handleResetUserSettings}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted text-xs">
            Por favor, regístrate o selecciona un Picker arriba para ver la calculadora.
          </div>
        )}
      </main>

      {/* Footer / Firma */}
      <footer className="app-footer text-center py-6 border-t mt-8 bg-white bg-opacity-5" style={{ borderRadius: '16px', padding: '20px', margin: '20px auto', maxWidth: '600px', width: '92%', border: '1px solid var(--border-light)' }}>
        <p className="text-xxs text-muted mb-2 uppercase tracking-widest font-bold">Créditos de Desarrollo</p>
        <p className="text-xs text-gray-700 leading-relaxed">
          Diseñado y desarrollado con excelencia por{" "}
          <a 
            href="https://rameseba.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-bold text-primary hover:underline hover:scale-105 inline-block transition-all duration-200"
            style={{ fontWeight: 800 }}
          >
            rameseba.com
          </a>
        </p>
        <p className="text-xxs text-muted mt-2">
          ¿Necesitas una plataforma web, e-commerce o una aplicación móvil personalizada?
        </p>
        <a 
          href="mailto:contacto@rameseba.com?subject=Consulta%20desde%20PickerCal"
          className="btn btn-secondary btn-sm mt-3 inline-flex items-center gap-1.5 text-xxs py-1.5 px-4 rounded-lg font-bold"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', color: 'var(--text-main)' }}
        >
          ✉️ contacto@rameseba.com
        </a>
      </footer>

      {/* Navegación Inferior Mobile / Centrada Desktop */}
      {activeProfile && !showLogin && (
        <nav className="bottom-nav glass">
          <div className="bottom-nav-content container">
            {isAdminMode && (
              <button 
                onClick={() => setActiveTab('admin')} 
                className={`nav-item ${activeTab === 'admin' ? 'nav-item-active' : ''}`}
              >
                <Shield size={20} />
                <span>Admin</span>
              </button>
            )}

            <button 
              onClick={() => setActiveTab('calculator')} 
              className={`nav-item ${activeTab === 'calculator' ? 'nav-item-active' : ''}`}
            >
              <CalcIcon size={20} />
              <span>Calculadora</span>
            </button>
            
            {!isAdminMode && (
              <button 
                onClick={() => setActiveTab('history')} 
                className={`nav-item ${activeTab === 'history' ? 'nav-item-active' : ''}`}
              >
                <div className="relative">
                  <History size={20} />
                  {userHistory.length > 0 && (
                    <span className="badge-dot"></span>
                  )}
                </div>
                <span>Historial</span>
              </button>
            )}
            
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`nav-item ${activeTab === 'settings' ? 'nav-item-active' : ''}`}
            >
              <Settings size={20} />
              <span>Ajustes</span>
            </button>
          </div>
        </nav>
      )}
      {/* Botones flotantes (Compartir y Bug Report) */}
      {activeRut && !showLogin && (
        <div 
          style={{
            position: 'fixed',
            bottom: '76px',
            right: '16px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-end'
          }}
        >
          {/* Botón WhatsApp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              className="glass"
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-main)',
                background: 'var(--card-bg)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.5s ease',
                opacity: showTooltip ? 1 : 0,
                transform: showTooltip ? 'translateX(0)' : 'translateX(10px)',
                pointerEvents: 'none'
              }}
            >
              Compartir App
            </span>
            <button
              onClick={() => window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent('¡Hola! Te comparto la calculadora de ganancias PickerCal para ver tus comisiones, metas y registrar boletas: https://pickercal.pages.dev'), '_blank')}
              className="btn flex items-center justify-center shadow-lg"
              style={{
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                padding: 0,
                background: '#25D366',
                color: 'white',
                border: 'none',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              title="Compartir por WhatsApp"
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              type="button"
            >
              💬
            </button>
          </div>

          {/* Botón Bug Report */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              className="glass"
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-main)',
                background: 'var(--card-bg)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.5s ease',
                opacity: showTooltip ? 1 : 0,
                transform: showTooltip ? 'translateX(0)' : 'translateX(10px)',
                pointerEvents: 'none'
              }}
            >
              Reportar Error
            </span>
            <button
              onClick={() => setShowBugReportModal(true)}
              className="btn flex items-center justify-center shadow-lg"
              style={{
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                padding: 0,
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                boxShadow: '0 4px 12px var(--primary-glow)',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              title="Reportar Error"
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              type="button"
            >
              🪲
            </button>
          </div>
        </div>
      )}

      {/* Modal de Reporte de Errores */}
      {showBugReportModal && (
        <div className="preview-modal-overlay">
          <div className="preview-modal-content card glass p-4" style={{ maxWidth: '400px', width: '92%' }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-gradient">Reportar un Error</h3>
              <button 
                onClick={() => {
                  setShowBugReportModal(false);
                  setBugDescription('');
                  setBugScreenshot(null);
                }}
                className="btn btn-secondary btn-icon"
                style={{ width: '24px', height: '24px', padding: '0' }}
              >
                ✕
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="form-group">
                <label className="text-xxs">Descripción del Error</label>
                <textarea
                  value={bugDescription}
                  onChange={(e) => setBugDescription(e.target.value)}
                  placeholder="Describe detalladamente qué falló o qué error ocurrió..."
                  className="input-field text-xs"
                  style={{ height: '80px', resize: 'none', padding: '8px 10px' }}
                />
              </div>
              
              <div className="form-group">
                <label className="text-xxs">Captura de Pantalla (Opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBugScreenshotChange}
                  className="input-field text-xs p-1"
                  style={{ height: '36px' }}
                />
              </div>

              {bugScreenshot && (
                <div className="text-center mt-1">
                  <p className="text-xxs text-muted mb-1">Previsualización de captura:</p>
                  <img 
                    src={bugScreenshot} 
                    alt="Captura de error" 
                    className="rounded border" 
                    style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain', margin: '0 auto' }} 
                  />
                </div>
              )}

              <button
                onClick={handleSendBugReport}
                className="btn btn-primary w-full text-xs mt-2"
                style={{ height: '36px' }}
              >
                Enviar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
