import React, { useState } from 'react';
import { Trash2, Plus, RotateCcw, Check, Save } from 'lucide-react';
import { DEFAULT_SKU_TABLE, DEFAULT_BASE_PAYMENTS, DEFAULT_TAX_RETENTION } from '../utils/calculatorLogic';

export default function SettingsPanel({ settings, onSaveSettings, onResetSettings }) {
  const [skuTable, setSkuTable] = useState([...settings.skuTable]);
  const [basePayments, setBasePayments] = useState({ ...settings.basePayments });
  const [taxRetentionPercent, setTaxRetentionPercent] = useState(settings.taxRetentionPercent);
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  const handleSkuRangeChange = (index, field, val) => {
    const updated = [...skuTable];
    const parsedVal = val === '' ? '' : Number(val);
    updated[index][field] = parsedVal;
    setSkuTable(updated);
  };

  const handleBasePaymentChange = (field, val) => {
    setBasePayments({
      ...basePayments,
      [field]: Number(val)
    });
  };

  const handleAddRow = () => {
    // Encuentra el último valor máximo para sugerir el mínimo de la nueva fila
    const lastRow = skuTable[skuTable.length - 1];
    const nextMin = lastRow ? Number(lastRow.max || 0) + 1 : 1;
    
    setSkuTable([
      ...skuTable,
      { min: nextMin, max: nextMin + 9, value: (lastRow ? lastRow.value + 5 : 30) }
    ]);
  };

  const handleRemoveRow = (index) => {
    if (skuTable.length <= 1) return;
    const updated = skuTable.filter((_, i) => i !== index);
    setSkuTable(updated);
  };

  const handleSave = () => {
    // Validar tabla SKU
    const validSkuTable = skuTable
      .map(row => ({
        min: Number(row.min) || 0,
        max: row.max === '' || row.max === null || row.max === undefined ? 9999 : Number(row.max),
        value: Number(row.value) || 0
      }))
      .sort((a, b) => a.min - b.min);

    const newSettings = {
      skuTable: validSkuTable,
      basePayments,
      taxRetentionPercent: Number(taxRetentionPercent) || 0
    };

    onSaveSettings(newSettings);
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm("¿Estás seguro de que deseas restablecer los valores de configuración de fábrica?")) {
      const defaultSettings = {
        skuTable: DEFAULT_SKU_TABLE,
        basePayments: DEFAULT_BASE_PAYMENTS,
        taxRetentionPercent: DEFAULT_TAX_RETENTION
      };
      setSkuTable([...DEFAULT_SKU_TABLE]);
      setBasePayments({ ...DEFAULT_BASE_PAYMENTS });
      setTaxRetentionPercent(DEFAULT_TAX_RETENTION);
      onResetSettings(defaultSettings);
      setShowSavedMsg(true);
      setTimeout(() => setShowSavedMsg(false), 3000);
    }
  };

  return (
    <div className="card glass settings-container">
      <div className="card-header">
        <h2 className="text-gradient">Configuración de Tarifas</h2>
        <p className="card-subtitle">Personaliza los rangos de pago por SKU, tarifas base y retención anual.</p>
      </div>

      <div className="card-body">
        {/* Retención e Impuestos */}
        <div className="settings-section">
          <h3>Impuestos y Retención</h3>
          <div className="form-group grid-2">
            <div>
              <label htmlFor="tax-retention">Porcentaje Retención (%)</label>
              <input
                id="tax-retention"
                type="number"
                step="0.01"
                placeholder="15.25"
                value={taxRetentionPercent}
                onChange={(e) => setTaxRetentionPercent(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="helper-text-container">
              <p className="helper-text">
                Actualmente en Chile es del 15.25% para boletas de honorarios. Se calcula como descuento al total bruto.
              </p>
            </div>
          </div>
        </div>

        {/* Tarifas Base */}
        <div className="settings-section">
          <h3>Tarifas Base por Pedido</h3>
          <div className="grid-2 gap-4">
            <div className="form-group">
              <label htmlFor="base-standard">Martes a Sábado (Estándar)</label>
              <div className="input-with-symbol">
                <span className="currency-symbol">$</span>
                <input
                  id="base-standard"
                  type="number"
                  placeholder="1500"
                  value={basePayments.standard}
                  onChange={(e) => handleBasePaymentChange('standard', e.target.value)}
                  className="input-field pl-6"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="base-weekend">Domingo y Lunes (Incrementada)</label>
              <div className="input-with-symbol">
                <span className="currency-symbol">$</span>
                <input
                  id="base-weekend"
                  type="number"
                  placeholder="1800"
                  value={basePayments.weekend}
                  onChange={(e) => handleBasePaymentChange('weekend', e.target.value)}
                  className="input-field pl-6"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Valores SKU */}
        <div className="settings-section">
          <div className="flex justify-between items-center mb-2">
            <h3>Rangos de SKU y Valores</h3>
            <button
              type="button"
              onClick={handleAddRow}
              className="btn btn-secondary btn-sm flex items-center gap-1"
            >
              <Plus size={16} />
              Agregar Rango
            </button>
          </div>
          
          <div className="table-responsive">
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Mínimo SKU</th>
                  <th>Máximo SKU</th>
                  <th>Valor por SKU</th>
                  <th style={{ width: '50px' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {skuTable.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="number"
                        placeholder="0"
                        value={row.min}
                        onChange={(e) => handleSkuRangeChange(index, 'min', e.target.value)}
                        className="input-field table-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="Infinito"
                        value={row.max === 9999 ? '' : row.max}
                        onChange={(e) => handleSkuRangeChange(index, 'max', e.target.value)}
                        className="input-field table-input"
                      />
                    </td>
                    <td>
                      <div className="input-with-symbol">
                        <span className="currency-symbol">$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={row.value}
                          onChange={(e) => handleSkuRangeChange(index, 'value', e.target.value)}
                          className="input-field table-input pl-5"
                        />
                      </div>
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        disabled={skuTable.length <= 1}
                        className="btn-icon btn-danger"
                        title="Eliminar rango"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card-footer flex justify-between items-center border-t mt-4 pt-4">
        <button
          type="button"
          onClick={handleReset}
          className="btn btn-secondary flex items-center gap-2"
          title="Restablecer valores de fábrica"
        >
          <RotateCcw size={16} />
          Restablecer
        </button>

        <div className="flex items-center gap-3">
          {showSavedMsg && (
            <span className="badge badge-success flex items-center gap-1">
              <Check size={14} />
              Guardado
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
