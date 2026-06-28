import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, History, Settings, Moon, Sun, ShoppingBag, Shield } from 'lucide-react';
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
  // --- Estado de la Base de Datos Multiperfil ---
  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('picking_profiles');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeRut, setActiveRut] = useState(() => {
    return localStorage.getItem('picking_active_rut') || '';
  });

  // Base de datos de Ajustes e Historiales por RUT
  const [settingsDatabase, setSettingsDatabase] = useState(() => {
    const saved = localStorage.getItem('picking_settings_db');
    return saved ? JSON.parse(saved) : {};
  });

  const [historyDatabase, setHistoryDatabase] = useState(() => {
    const saved = localStorage.getItem('picking_history_db');
    return saved ? JSON.parse(saved) : {};
  });

  const [dailyBonusesDatabase, setDailyBonusesDatabase] = useState(() => {
    const saved = localStorage.getItem('picking_daily_bonuses_db');
    return saved ? JSON.parse(saved) : {};
  });

  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem('picking_reports');
    return saved ? JSON.parse(saved) : [];
  });

  const [showBugReportModal, setShowBugReportModal] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [bugScreenshot, setBugScreenshot] = useState(null);
  const [showTooltip, setShowTooltip] = useState(true);

  // --- Estado Activo de Interfaz ---
  const [activeTab, setActiveTab] = useState('calculator'); // 'admin', 'calculator', 'history', 'settings'
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('picking_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Sincronizar bases de datos con localStorage
  useEffect(() => {
    localStorage.setItem('picking_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('picking_active_rut', activeRut);
  }, [activeRut]);

  useEffect(() => {
    localStorage.setItem('picking_settings_db', JSON.stringify(settingsDatabase));
  }, [settingsDatabase]);

  useEffect(() => {
    localStorage.setItem('picking_history_db', JSON.stringify(historyDatabase));
  }, [historyDatabase]);

  useEffect(() => {
    localStorage.setItem('picking_daily_bonuses_db', JSON.stringify(dailyBonusesDatabase));
  }, [dailyBonusesDatabase]);

  useEffect(() => {
    localStorage.setItem('picking_reports', JSON.stringify(reports));
  }, [reports]);

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

  // Cargar base de datos desde el servidor al iniciar
  useEffect(() => {
    fetch('/api/db')
      .then(res => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then(data => {
        if (data && data.profiles) {
          setProfiles(data.profiles);
          setSettingsDatabase(data.settingsDatabase || {});
          setHistoryDatabase(data.historyDatabase || {});
          setDailyBonusesDatabase(data.dailyBonusesDatabase || {});
          setReports(data.reports || []);
          
          localStorage.setItem('picking_profiles', JSON.stringify(data.profiles));
          localStorage.setItem('picking_settings_db', JSON.stringify(data.settingsDatabase || {}));
          localStorage.setItem('picking_history_db', JSON.stringify(data.historyDatabase || {}));
          localStorage.setItem('picking_daily_bonuses_db', JSON.stringify(data.dailyBonusesDatabase || {}));
          localStorage.setItem('picking_reports', JSON.stringify(data.reports || []));
        }
      })
      .catch(err => {
        console.warn("No se pudo conectar con el servidor de base de datos local. Usando base de datos del navegador (localStorage).", err);
      });
  }, [activeTab]);

  // Sincronizar datos con el servidor Vite
  const syncDbToServer = (p, s, h, b = dailyBonusesDatabase, r = reports) => {
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profiles: p,
        settingsDatabase: s,
        historyDatabase: h,
        dailyBonusesDatabase: b,
        reports: r,
        activeRut: activeRut
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then(resData => {
        if (resData && resData.data) {
          setProfiles(resData.data.profiles);
          setSettingsDatabase(resData.data.settingsDatabase || {});
          setHistoryDatabase(resData.data.historyDatabase || {});
          setDailyBonusesDatabase(resData.data.dailyBonusesDatabase || {});
          setReports(resData.data.reports || []);
          
          localStorage.setItem('picking_profiles', JSON.stringify(resData.data.profiles));
          localStorage.setItem('picking_settings_db', JSON.stringify(resData.data.settingsDatabase || {}));
          localStorage.setItem('picking_history_db', JSON.stringify(resData.data.historyDatabase || {}));
          localStorage.setItem('picking_daily_bonuses_db', JSON.stringify(resData.data.dailyBonusesDatabase || {}));
          localStorage.setItem('picking_reports', JSON.stringify(resData.data.reports || []));
        }
      })
      .catch(err => console.warn("No se pudo sincronizar con el servidor de base de datos local.", err));
  };

  const handleBugScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setBugScreenshot(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSendBugReport = () => {
    if (!bugDescription.trim()) {
      alert("Por favor, describe el error.");
      return;
    }
    
    const activeProfile = profiles.find(p => p.rut === activeRut);
    const newReport = {
      id: `rep_${Date.now()}`,
      pickerName: activeProfile?.name || 'Desconocido',
      pickerRut: activeRut || 'Desconocido',
      description: bugDescription,
      screenshot: bugScreenshot,
      date: new Date().toISOString()
    };
    
    const updatedReports = [newReport, ...reports];
    setReports(updatedReports);
    
    syncDbToServer(profiles, settingsDatabase, historyDatabase, dailyBonusesDatabase, updatedReports);
    
    setBugDescription('');
    setBugScreenshot(null);
    setShowBugReportModal(false);
    alert("¡Muchas gracias! Tu reporte de error ha sido enviado y registrado en el panel del administrador.");
  };

  // --- Controladores Multiperfil ---
  const handleCreateProfile = (newProfile) => {
    let updatedProfiles = profiles;
    if (!profiles.some(p => p.rut === newProfile.rut)) {
      updatedProfiles = [...profiles, newProfile];
      setProfiles(updatedProfiles);
    }
    setActiveRut(newProfile.rut);
    syncDbToServer(updatedProfiles, settingsDatabase, historyDatabase);
  };

  const handleUpdateProfile = (updatedProfile) => {
    const updatedProfiles = profiles.map(p => p.rut === updatedProfile.rut ? updatedProfile : p);
    setProfiles(updatedProfiles);
    syncDbToServer(updatedProfiles, settingsDatabase, historyDatabase);
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

  const handleSaveUserSettings = (newSettings) => {
    if (!activeRut) return;
    const updatedSettings = {
      ...settingsDatabase,
      [activeRut]: newSettings
    };
    setSettingsDatabase(updatedSettings);
    syncDbToServer(profiles, updatedSettings, historyDatabase);
  };

  const handleResetUserSettings = (defaultSettings) => {
    if (!activeRut) return;
    const updatedSettings = {
      ...settingsDatabase,
      [activeRut]: defaultSettings
    };
    setSettingsDatabase(updatedSettings);
    syncDbToServer(profiles, updatedSettings, historyDatabase);
  };

  // --- Controladores de Pedidos (Historial) ---
  
  // Obtener pedidos cargados hoy para saber cuál es el índice de pedido actual
  const todayDateStr = orderData.detectedDate || new Date().toISOString().split('T')[0];
  const todayOrdersCount = userHistory.filter(item => item.date === todayDateStr).length;

  const handleSaveToHistory = (orderRecord) => {
    if (!activeRut) {
      alert("Por favor registra un perfil de Picker antes de guardar pedidos.");
      return;
    }

    const newRecord = {
      ...orderRecord,
      id: `order_${Date.now()}`
    };

    const updatedHistory = {
      ...historyDatabase,
      [activeRut]: [newRecord, ...userHistory]
    };

    setHistoryDatabase(updatedHistory);
    syncDbToServer(profiles, settingsDatabase, updatedHistory);

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

  // Agregar lote de múltiples boletas procesadas en OCR
  const handleBatchConfirm = (batchRecords) => {
    if (!activeRut) {
      alert("Registra un perfil antes de procesar boletas.");
      return;
    }

    const currentList = [...(historyDatabase[activeRut] || [])];
    
    batchRecords.forEach((record, index) => {
      const dateStr = record.detectedDate || new Date().toISOString().split('T')[0];
      const sameDayCount = currentList.filter(item => item.date === dateStr).length;
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

      const newRecord = {
        id: `order_${Date.now()}_${index}`,
        pedidoId: record.pedidoId,
        totalProducts: record.totalProductos || 0,
        sinStock: record.sinStock || 0,
        pickeados: record.pickeados || 0,
        sustituidos: record.sustituidos || 0,
        productosSolicitados: record.productosSolicitados || 0,
        isWeekendRate: record.isWeekendRate,
        date: dateStr,
        pickingTime: record.pickingTime || '0:00',
        extraBonus: record.extraBonus || 0,
        dayOrderIndex: finalOrderIndex,
        earnings: {
          ...earnings,
          grossTotal: finalGross,
          taxAmount: finalTax,
          netTotal: finalNet
        }
      };

      currentList.unshift(newRecord);
    });

    const updatedHistory = {
      ...historyDatabase,
      [activeRut]: currentList
    };

    setHistoryDatabase(updatedHistory);
    syncDbToServer(profiles, settingsDatabase, updatedHistory);
    setActiveTab('history');
  };

  const handleDeleteHistoryItem = (id) => {
    if (!activeRut) return;
    const updatedHistory = {
      ...historyDatabase,
      [activeRut]: (historyDatabase[activeRut] || []).filter(item => item.id !== id)
    };
    setHistoryDatabase(updatedHistory);
    syncDbToServer(profiles, settingsDatabase, updatedHistory);
  };

  const handleClearHistory = () => {
    if (!activeRut) return;
    const updatedHistory = {
      ...historyDatabase,
      [activeRut]: []
    };
    setHistoryDatabase(updatedHistory);
    syncDbToServer(profiles, settingsDatabase, updatedHistory);
  };

  const handleSaveDailyBonus = (date, val) => {
    if (!activeRut) return;
    const userBonuses = dailyBonusesDatabase[activeRut] || {};
    const updatedUserBonuses = {
      ...userBonuses,
      [date]: val
    };
    const updatedDatabase = {
      ...dailyBonusesDatabase,
      [activeRut]: updatedUserBonuses
    };
    setDailyBonusesDatabase(updatedDatabase);
    syncDbToServer(profiles, settingsDatabase, historyDatabase, updatedDatabase);
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
            <div className="logo-icon-bg">
              <ShoppingBag className="logo-icon" size={24} />
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
        />

        {/* Solo mostrar la UI si hay un perfil activo o si estamos en modo Admin */}
        {activeProfile || isAdminMode ? (
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
      <footer className="app-footer text-center py-4 text-xxs text-muted border-t mt-6">
        <span>Diseñado con pasión por </span>
        <a 
          href="https://rameseba.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-bold text-primary hover:underline hover:scale-105 inline-block transition-all duration-200"
          style={{ textShadow: '0 0 8px var(--primary-glow)' }}
        >
          @rameseba
        </a>
      </footer>

      {/* Navegación Inferior Mobile / Centrada Desktop */}
      {(activeProfile || isAdminMode) && (
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
      {activeRut && (
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
