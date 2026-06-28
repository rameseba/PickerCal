import React, { useState } from 'react';
import { User, Users, LogOut, CheckCircle, Shield, AlertTriangle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { formatRut, validateRut } from '../utils/rutValidator';

export default function ProfileSelector({
  activeProfile,
  profiles,
  onSelectProfile,
  onCreateProfile,
  onLogoutProfile,
  onUpdateProfile,
  isAdminMode,
  onChangeAdminMode
}) {
  const [showLogin, setShowLogin] = useState(!activeProfile);
  const [step, setStep] = useState('rut'); // 'rut', 'login', 'setup_password', 'register'
  const [rutInput, setRutInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [rutError, setRutError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSwitchDropdown, setShowSwitchDropdown] = useState(false);

  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value);
    setRutInput(formatted);
    setRutError('');
  };

  const handleRutSubmit = (e) => {
    e.preventDefault();
    if (!validateRut(rutInput)) {
      setRutError('RUT inválido. Verifica los puntos, guión y dígito verificador.');
      return;
    }

    const existing = profiles.find(p => p.rut === rutInput);
    if (existing) {
      setMatchedProfile(existing);
      if (existing.password) {
        setStep('login');
      } else {
        setStep('setup_password');
      }
    } else {
      setStep('register');
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!matchedProfile) return;

    if (passwordInput === matchedProfile.password) {
      onSelectProfile(matchedProfile.rut);
      setRutInput('');
      setPasswordInput('');
      setConfirmPasswordInput('');
      setMatchedProfile(null);
      setStep('rut');
      setShowLogin(false);
      setShowPassword(false);
    } else {
      setPasswordError('Contraseña incorrecta. Inténtalo de nuevo.');
    }
  };

  const handleSetupPasswordSubmit = (e) => {
    e.preventDefault();
    if (!matchedProfile) return;
    if (!passwordInput.trim()) {
      alert('Por favor, ingresa una contraseña.');
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setConfirmPasswordError('Las contraseñas no coinciden.');
      return;
    }

    const updatedProfile = {
      ...matchedProfile,
      password: passwordInput.trim()
    };

    onUpdateProfile(updatedProfile);
    onSelectProfile(updatedProfile.rut);

    setRutInput('');
    setPasswordInput('');
    setConfirmPasswordInput('');
    setMatchedProfile(null);
    setStep('rut');
    setShowLogin(false);
    setShowPassword(false);
    alert('Contraseña establecida con éxito. Úsala para tus próximos inicios de sesión.');
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      alert('Por favor ingresa tu nombre.');
      return;
    }
    if (!passwordInput.trim()) {
      alert('Por favor establece una contraseña para tu cuenta.');
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setConfirmPasswordError('Las contraseñas no coinciden.');
      return;
    }

    onCreateProfile({
      rut: rutInput,
      name: nameInput.trim(),
      phone: phoneInput.trim(),
      password: passwordInput.trim()
    });

    setRutInput('');
    setNameInput('');
    setPhoneInput('');
    setPasswordInput('');
    setConfirmPasswordInput('');
    setStep('rut');
    setShowLogin(false);
    setShowPassword(false);
  };

  const handleBackToRut = () => {
    setStep('rut');
    setPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordError('');
    setConfirmPasswordError('');
    setMatchedProfile(null);
    setShowPassword(false);
  };

  const handleProfileSwitch = (rut) => {
    const target = profiles.find(p => p.rut === rut);
    if (target) {
      onSelectProfile(''); // Log out active profile without confirmation
      setRutInput(target.rut);
      setMatchedProfile(target);
      if (target.password) {
        setStep('login');
      } else {
        setStep('setup_password');
      }
      setShowLogin(true);
    }
    setShowSwitchDropdown(false);
  };

  const handleNewProfileClick = () => {
    onSelectProfile(''); // Log out active profile without confirmation
    setStep('rut');
    setRutInput('');
    setNameInput('');
    setPhoneInput('');
    setPasswordInput('');
    setConfirmPasswordInput('');
    setMatchedProfile(null);
    setShowPassword(false);
    setShowSwitchDropdown(false);
  };

  if (showLogin || !activeProfile) {
    return (
      <div className="card glass max-w-md mx-auto my-4 profile-login-card">
        <div className="card-header text-center">
          <div className="logo-icon-bg mx-auto mb-2" style={{ width: '50px', height: '50px', overflow: 'hidden', padding: 0 }}>
            <img src="/logo.png" alt="PickerCal Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h2 className="text-gradient font-bold text-lg">
            {step === 'rut' && 'Iniciar Sesión / Registro'}
            {step === 'login' && 'Ingresar Contraseña'}
            {step === 'setup_password' && 'Proteger Cuenta'}
            {step === 'register' && 'Registro de Picker'}
          </h2>
          <p className="card-subtitle text-xxs mt-1">
            {step === 'rut' && 'Ingresa tu RUT para entrar o registrar tu perfil.'}
            {step === 'login' && 'Tu cuenta está protegida. Ingresa tu contraseña.'}
            {step === 'setup_password' && 'Establece una contraseña para tu cuenta.'}
            {step === 'register' && 'Ingresa tus datos para registrar tu perfil de picker.'}
          </p>
        </div>

        {step === 'rut' && (
          <form onSubmit={handleRutSubmit} className="card-body flex flex-col gap-4">
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
                autoFocus
              />
              {rutError && (
                <span className="text-xs text-danger flex items-center gap-1 mt-1 font-semibold">
                  <AlertTriangle size={12} />
                  {rutError}
                </span>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2">
              Siguiente
            </button>

            {activeProfile && (
              <button 
                type="button" 
                onClick={() => setShowLogin(false)} 
                className="btn btn-secondary w-full text-xs py-2"
              >
                Cancelar y volver
              </button>
            )}
          </form>
        )}

        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} className="card-body flex flex-col gap-4">
            <div className="text-center mb-1">
              <p className="text-xs text-gray-700">Hola, <strong className="text-gray-800">{matchedProfile?.name}</strong>.</p>
              <p className="text-xxs text-muted font-semibold">Ingresa tu contraseña para continuar.</p>
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="relative flex items-center">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                  className={`input-field pr-10 ${passwordError ? 'input-danger-border' : ''}`}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn-icon absolute"
                  style={{ right: '8px', padding: '4px', background: 'transparent', height: '24px', width: '24px' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordError && (
                <span className="text-xs text-danger flex items-center gap-1 mt-1 font-semibold">
                  <AlertTriangle size={12} />
                  {passwordError}
                </span>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2">
              Iniciar Sesión
            </button>

            <div className="flex gap-2 w-full">
              <button 
                type="button" 
                onClick={handleBackToRut} 
                className="btn btn-secondary flex-1 text-xs py-2 flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} />
                Atrás
              </button>
              {activeProfile && (
                <button 
                  type="button" 
                  onClick={() => setShowLogin(false)} 
                  className="btn btn-secondary flex-1 text-xs py-2"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}

        {step === 'setup_password' && (
          <form onSubmit={handleSetupPasswordSubmit} className="card-body flex flex-col gap-4">
            <div className="text-center mb-1 bg-info bg-opacity-10 border border-info border-opacity-20 text-info p-3 rounded-xl text-xxs leading-relaxed animate-pulse">
              🔓 Hola, <strong>{matchedProfile?.name}</strong>. Este perfil aún no tiene contraseña. 
              Establece una contraseña ahora para proteger tus datos de producción e historial.
            </div>

            <div className="form-group">
              <label htmlFor="new_password">Nueva Contraseña</label>
              <div className="relative flex items-center">
                <input
                  id="new_password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Fija tu nueva contraseña"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="input-field pr-10"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn-icon absolute"
                  style={{ right: '8px', padding: '4px', background: 'transparent', height: '24px', width: '24px' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm_new_password">Confirmar Contraseña</label>
              <input
                id="confirm_new_password"
                type="password"
                placeholder="Repite la contraseña para corroborar"
                value={confirmPasswordInput}
                onChange={(e) => { setConfirmPasswordInput(e.target.value); setConfirmPasswordError(''); }}
                className={`input-field ${confirmPasswordError ? 'input-danger-border' : ''}`}
                required
              />
              {confirmPasswordError && (
                <span className="text-xs text-danger flex items-center gap-1 mt-1 font-semibold">
                  <AlertTriangle size={12} />
                  {confirmPasswordError}
                </span>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2">
              Guardar Contraseña e Ingresar
            </button>

            <div className="flex gap-2 w-full">
              <button 
                type="button" 
                onClick={handleBackToRut} 
                className="btn btn-secondary flex-1 text-xs py-2 flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} />
                Atrás
              </button>
              {activeProfile && (
                <button 
                  type="button" 
                  onClick={() => setShowLogin(false)} 
                  className="btn btn-secondary flex-1 text-xs py-2"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="card-body flex flex-col gap-4">
            <div className="text-center mb-1 bg-info bg-opacity-10 border border-info border-opacity-20 text-info p-2 rounded-xl text-xxs leading-relaxed">
              ✨ El RUT <strong>{rutInput}</strong> no está registrado. Crea tu cuenta a continuación:
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
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Teléfono de Contacto (Opcional)</label>
              <input
                id="phone"
                type="tel"
                placeholder="+56 9 1234 5678"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label htmlFor="register_password">Crear Contraseña</label>
              <div className="relative flex items-center">
                <input
                  id="register_password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Establece una contraseña de seguridad"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn-icon absolute"
                  style={{ right: '8px', padding: '4px', background: 'transparent', height: '24px', width: '24px' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm_register_password">Confirmar Contraseña</label>
              <input
                id="confirm_register_password"
                type="password"
                placeholder="Repite la contraseña para corroborar"
                value={confirmPasswordInput}
                onChange={(e) => { setConfirmPasswordInput(e.target.value); setConfirmPasswordError(''); }}
                className={`input-field ${confirmPasswordError ? 'input-danger-border' : ''}`}
                required
              />
              {confirmPasswordError && (
                <span className="text-xs text-danger flex items-center gap-1 mt-1 font-semibold">
                  <AlertTriangle size={12} />
                  {confirmPasswordError}
                </span>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2">
              Registrarse y Entrar
            </button>

            <div className="flex gap-2 w-full">
              <button 
                type="button" 
                onClick={handleBackToRut} 
                className="btn btn-secondary flex-1 text-xs py-2 flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} />
                Atrás
              </button>
              {activeProfile && (
                <button 
                  type="button" 
                  onClick={() => setShowLogin(false)} 
                  className="btn btn-secondary flex-1 text-xs py-2"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}
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
                <div className="font-semibold text-xs text-gray-800">{p.name}</div>
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
