import React, { useState } from 'react';
import { User, Users, LogOut, CheckCircle, Shield, AlertTriangle } from 'lucide-react';
import { formatRut, validateRut } from '../utils/rutValidator';

export default function ProfileSelector({
  activeProfile,
  profiles,
  onSelectProfile,
  onCreateProfile,
  onLogoutProfile,
  isAdminMode,
  onChangeAdminMode
}) {
  const [showLogin, setShowLogin] = useState(!activeProfile);
  const [rutInput, setRutInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [rutError, setRutError] = useState('');
  const [showSwitchDropdown, setShowSwitchDropdown] = useState(false);

  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value);
    setRutInput(formatted);
    setRutError('');
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!validateRut(rutInput)) {
      setRutError('RUT inválido. Verifica los puntos, guión y dígito verificador.');
      return;
    }

    if (!nameInput.trim()) {
      alert('Por favor ingresa tu nombre.');
      return;
    }

    onCreateProfile({
      rut: rutInput,
      name: nameInput.trim(),
      phone: phoneInput.trim()
    });
    
    // Reset inputs
    setRutInput('');
    setNameInput('');
    setPhoneInput('');
    setShowLogin(false);
  };

  const handleProfileSwitch = (rut) => {
    onSelectProfile(rut);
    setShowSwitchDropdown(false);
  };

  const handleNewProfileClick = () => {
    setShowLogin(true);
    setShowSwitchDropdown(false);
  };

  if (showLogin || !activeProfile) {
    return (
      <div className="card glass max-w-md mx-auto my-4 profile-login-card">
        <div className="card-header text-center">
          <div className="logo-icon-bg mx-auto mb-2" style={{ width: '50px', height: '50px' }}>
            <User size={28} />
          </div>
          <h2 className="text-gradient">Registro de Picker</h2>
          <p className="card-subtitle">Ingresa tus datos para registrar y guardar tu historial y tarifas personalizadas.</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="card-body flex flex-col gap-4">
          <div className="form-group">
            <label htmlFor="rut">RUT Chileno</label>
            <input
              id="rut"
              type="text"
              placeholder="12.345.678-K"
              value={rutInput}
              onChange={handleRutChange}
              className={`input-field ${rutError ? 'input-danger-border' : ''}`}
              required
            />
            {rutError && (
              <span className="text-xs text-danger flex items-center gap-1 mt-1 font-semibold">
                <AlertTriangle size={12} />
                {rutError}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="name">Nombre Completo</label>
            <input
              id="name"
              type="text"
              placeholder="Nicolás Lavandero"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Teléfono de Contacto</label>
            <input
              id="phone"
              type="tel"
              placeholder="+56 9 1234 5678"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="input-field"
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-2">
            Ingresar a la Calculadora
          </button>

          {profiles.length > 0 && (
            <button 
              type="button" 
              onClick={() => {
                if (!activeProfile && profiles.length > 0) {
                  onSelectProfile(profiles[0].rut);
                }
                setShowLogin(false);
              }} 
              className="btn btn-secondary w-full text-xs py-2"
            >
              Cancelar y volver a {activeProfile?.name || 'perfiles'}
            </button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="profile-bar glass flex justify-between items-center mb-6 p-3 rounded-2xl border">
      <div className="profile-active-info flex items-center gap-3 relative">
        <div className="profile-avatar flex items-center justify-center">
          <User size={18} className="text-primary" />
        </div>
        <div>
          <div 
            className="flex items-center gap-1 cursor-pointer select-none"
            onClick={() => setShowSwitchDropdown(!showSwitchDropdown)}
          >
            <span className="font-bold text-sm text-gray-800 hover:underline">
              {activeProfile?.name}
            </span>
            <span className="text-xs text-muted font-medium">({activeProfile?.rut})</span>
          </div>
        </div>

        {/* Dropdown de cambio de perfil */}
        {showSwitchDropdown && (
          <div className="profile-switch-dropdown glass">
            <div className="dropdown-title">Seleccionar Picker</div>
            {profiles.map(p => (
              <button
                key={p.rut}
                onClick={() => handleProfileSwitch(p.rut)}
                className={`dropdown-item ${p.rut === activeProfile?.rut ? 'active' : ''}`}
              >
                <div className="font-semibold text-xs">{p.name}</div>
                <div className="text-xxs text-muted">{p.rut}</div>
              </button>
            ))}
            <div className="dropdown-divider"></div>
            <button onClick={handleNewProfileClick} className="dropdown-item text-primary font-bold text-center text-xs">
              + Registrar Nuevo Picker
            </button>
            <button onClick={onLogoutProfile} className="dropdown-item text-danger font-bold text-center text-xs flex items-center justify-center gap-1">
              <LogOut size={12} />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>

      {/* Modo Administrador y Salir (Restringido a RUT administrador) */}
      <div className="flex items-center gap-2">
        {activeProfile?.rut === '20.382.650-8' && (
          <button
            onClick={onChangeAdminMode}
            className={`btn btn-sm flex items-center gap-1 ${isAdminMode ? 'btn-primary' : 'btn-secondary'}`}
            title="Alternar modo Administrador para ver reportes y pickers"
          >
            <Shield size={14} />
            <span className="hidden-xs">{isAdminMode ? 'Modo Admin' : 'Admin'}</span>
          </button>
        )}

        <button
          onClick={onLogoutProfile}
          className="btn btn-sm btn-secondary btn-danger-hover flex items-center gap-1"
          title="Cerrar sesión del perfil actual"
        >
          <LogOut size={14} />
          <span>Salir</span>
        </button>
      </div>
    </div>
  );
}
