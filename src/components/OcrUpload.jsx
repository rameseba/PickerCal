import React, { useState, useRef } from 'react';
import { Upload, FileImage, RefreshCw, AlertCircle, Camera, Check, Trash, Plus, X } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { parseOcrText, parseDateFromMetadata } from '../utils/ocrParser';

export default function OcrUpload({ onBatchConfirm, currentHistoryCount = 0 }) {
  const [queue, setQueue] = useState([]); // [{ file, progress, status, msg, id }]
  const [parsedResults, setParsedResults] = useState([]); // [{ id, fileName, imageUrl, data, isEditing }]
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const processFiles = async (files) => {
    if (!files || files.length === 0) return;

    const newQueueItems = Array.from(files).map((file, idx) => ({
      id: `file_${Date.now()}_${idx}`,
      file,
      progress: 0,
      status: 'queued', // 'queued', 'processing', 'done', 'error'
      msg: 'En cola...'
    }));

    setQueue(prev => [...prev, ...newQueueItems]);
    setIsProcessing(true);

    // Procesar de forma secuencial para no sobrecargar el navegador con WebAssembly
    for (const item of newQueueItems) {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing', progress: 5, msg: 'Iniciando OCR...' } : q));

      const metadataDate = parseDateFromMetadata(item.file.name, item.file.lastModified);

      try {
        const { data: { text } } = await Tesseract.recognize(
          item.file,
          'spa',
          {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                const pct = Math.round(30 + (m.progress * 70));
                setQueue(prev => prev.map(q => q.id === item.id ? { 
                  ...q, 
                  progress: pct, 
                  msg: `Escaneando: ${Math.round(m.progress * 100)}%` 
                } : q));
              }
            }
          }
        );

        const parsedData = parseOcrText(text);

        if (!parsedData.detectedDate && metadataDate) {
          parsedData.detectedDate = metadataDate.dateStr;
          parsedData.isWeekendRate = metadataDate.isWeekendRate;
        }

        // Si no se detectó fecha en absoluto, poner hoy
        if (!parsedData.detectedDate) {
          parsedData.detectedDate = new Date().toISOString().split('T')[0];
          const dayOfWeek = new Date().getDay();
          parsedData.isWeekendRate = dayOfWeek === 0 || dayOfWeek === 1;
        }

        // Agregar a la lista de resultados para que el usuario confirme
        setParsedResults(prev => [...prev, {
          id: item.id,
          fileName: item.file.name,
          imageUrl: URL.createObjectURL(item.file), // local temporary URL
          data: {
            pedidoId: parsedData.pedidoId || `P-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            productosSolicitados: parsedData.productosSolicitados !== null ? parsedData.productosSolicitados : 24,
            pickeados: parsedData.pickeados !== null ? parsedData.pickeados : 24,
            sustituidos: parsedData.sustituidos !== null ? parsedData.sustituidos : 0,
            sinStock: parsedData.sinStock !== null ? parsedData.sinStock : 0,
            totalProductos: parsedData.totalProductos !== null ? parsedData.totalProductos : 24,
            detectedDate: parsedData.detectedDate,
            isWeekendRate: parsedData.isWeekendRate,
            pickingTime: parsedData.pickingTime || '0:42', // Default a 42 min si no lee
            extraBonus: 0 // Campo para bonos extra
          }
        }]);

        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'done', progress: 100, msg: 'Lectura exitosa!' } : q));
      } catch (err) {
        console.error("Error en OCR:", err);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', msg: 'Error al leer imagen.' } : q));
      }
    }

    setIsProcessing(false);
  };

  const handleFileChange = (e) => {
    processFiles(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    processFiles(e.dataTransfer.files);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // --- Manejo de la lista de resultados pendientes ---
  const handleResultChange = (id, field, val) => {
    setParsedResults(prev => prev.map(item => {
      if (item.id === id) {
        let parsedVal = val;
        if (['productosSolicitados', 'pickeados', 'sustituidos', 'sinStock', 'totalProductos', 'extraBonus'].includes(field)) {
          parsedVal = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
        } else if (field === 'isWeekendRate') {
          parsedVal = !item.data.isWeekendRate;
        }
        return {
          ...item,
          data: {
            ...item.data,
            [field]: parsedVal
          }
        };
      }
      return item;
    }));
  };

  const handleRemoveResult = (id) => {
    const found = parsedResults.find(item => item.id === id);
    if (found && found.imageUrl) {
      URL.revokeObjectURL(found.imageUrl);
    }
    setParsedResults(prev => prev.filter(item => item.id !== id));
    setQueue(prev => prev.filter(q => q.id !== id));
  };

  const handleClearAll = () => {
    parsedResults.forEach(item => {
      if (item.imageUrl) URL.revokeObjectURL(item.imageUrl);
    });
    setParsedResults([]);
    setQueue([]);
  };

  const handleConfirmBatch = () => {
    // Enviar todos los resultados confirmados al componente padre
    onBatchConfirm(parsedResults.map(r => r.data));
    
    // Revocar todas las URLs locales de una sola vez
    parsedResults.forEach(item => {
      if (item.imageUrl) URL.revokeObjectURL(item.imageUrl);
    });
    
    setParsedResults([]);
    setQueue([]);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Dropzone */}
      <div className="card glass p-4">
        <div className="card-header mb-3">
          <h2 className="text-gradient text-lg">Escanear Boletas (Carga Múltiple)</h2>
          <p className="card-subtitle text-xs">Arrastra uno o varios screenshots. La app extraerá los datos automáticamente.</p>
        </div>

        <div 
          className={`dropzone p-6 ${isProcessing ? 'dropzone-disabled' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={!isProcessing ? triggerFileInput : undefined}
          style={{ padding: '24px' }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            multiple 
            style={{ display: 'none' }} 
            disabled={isProcessing}
          />
          <div className="dropzone-content flex items-center justify-center gap-3">
            <Upload size={20} className="text-primary animate-bounce" />
            <span className="font-semibold text-xs text-gray-700">Subir una o más boletas</span>
            <span className="text-xxs text-muted hidden-xs">PNG, JPG o JPEG</span>
          </div>
        </div>

        {/* Listado de progreso de carga */}
        {queue.length > 0 && (
          <div className="upload-queue-container mt-3 border-t pt-3">
            <h4 className="font-bold text-xxs text-gray-500 uppercase mb-2">Progreso del escaneo ({queue.filter(q => q.status === 'done').length}/{queue.length})</h4>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              {queue.map(q => (
                <div key={q.id} className="queue-item flex justify-between items-center bg-gray-50 p-2 rounded-lg border text-xxs">
                  <span className="font-semibold truncate max-w-xs">{q.file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">{q.msg}</span>
                    {q.status === 'processing' && (
                      <div className="progress-bar-container" style={{ width: '60px', height: '4px' }}>
                        <div className="progress-bar" style={{ width: `${q.progress}%` }}></div>
                      </div>
                    )}
                    {q.status === 'done' && <Check size={14} className="text-success" />}
                    {q.status === 'error' && <AlertCircle size={14} className="text-danger" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Panel de confirmación en lote */}
      {parsedResults.length > 0 && (
        <div className="card glass card-accent-glow p-4">
          <div className="card-header flex justify-between items-center border-b pb-2 mb-3">
            <div>
              <h2 className="text-gradient text-sm">Verificar Datos Leídos ({parsedResults.length} Pedidos)</h2>
              <p className="card-subtitle text-xxs">Asegúrate de que los números coincidan con tus capturas antes de guardar.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleClearAll} className="btn btn-secondary btn-sm text-xxs py-1">
                Descartar
              </button>
              <button onClick={handleConfirmBatch} className="btn btn-primary btn-sm text-xxs py-1">
                Guardar Todo
              </button>
            </div>
          </div>

          {/* Ajuste rápido para todo el lote (Fecha y Tarifa del Día) */}
          <div className="bg-primary bg-opacity-5 p-2.5 rounded-xl border border-primary border-opacity-10 flex flex-wrap gap-3 items-center mb-3 text-xxs">
            <span className="font-bold text-primary">Ajuste rápido de todo el lote:</span>
            
            <div className="flex items-center gap-1">
              <span className="text-muted">Fecha del Día:</span>
              <input 
                type="date" 
                className="input-field table-input py-0.5 text-xxs" 
                style={{ width: '120px' }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const parsedDate = new Date(val + 'T00:00:00');
                    const dayOfWeek = parsedDate.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 1;
                    setParsedResults(prev => prev.map(item => ({
                      ...item,
                      data: { 
                        ...item.data, 
                        detectedDate: val,
                        isWeekendRate: isWeekend
                      }
                    })));
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-muted">Tarifa Base:</span>
              <select 
                className="input-field table-input py-0.5 text-xxs"
                style={{ width: '150px', paddingRight: '15px' }}
                onChange={(e) => {
                  const isWeekend = e.target.value === 'weekend';
                  setParsedResults(prev => prev.map(item => ({
                    ...item,
                    data: { ...item.data, isWeekendRate: isWeekend }
                  })));
                }}
              >
                <option value="weekday">Martes-Sábado ($1.500 base)</option>
                <option value="weekend">Domingo-Lunes o Feriado ($1.800 base)</option>
              </select>
            </div>
          </div>

          <div className="batch-results-list flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-1">
            {parsedResults.map((item, idx) => {
              const { data } = item;
              const effectiveSku = Math.max(0, (data.totalProductos || 0) - (data.sinStock || 0));

              return (
                <div key={item.id} className="batch-item-card bg-gray-50 p-3 rounded-xl border flex flex-col gap-2 relative">
                  {/* Título de Fila */}
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-700">Pedido #{idx + 1 + currentHistoryCount}</span>
                      {item.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(item.imageUrl)}
                          className="flex items-center gap-1 text-[10px] text-primary font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
                        >
                          <FileImage size={12} />
                          Ver Imagen
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => handleRemoveResult(item.id)}
                      className="btn-icon btn-danger btn-sm p-1"
                      title="Eliminar de la lista"
                    >
                      <Trash size={14} />
                    </button>
                  </div>

                  {/* Cuadrícula Compacta de Inputs 2x2 / 3x3 */}
                  <div className="grid-layout gap-2" style={{ gap: '8px' }}>
                    {/* ID */}
                    <div className="form-group col-span-full md:col-span-6">
                      <label className="text-xxs">ID Pedido</label>
                      <input 
                        type="text" 
                        value={data.pedidoId}
                        onChange={(e) => handleResultChange(item.id, 'pedidoId', e.target.value)}
                        className="input-field table-input text-xxs"
                      />
                    </div>

                    {/* Fecha */}
                    <div className="form-group col-span-full md:col-span-6">
                      <label className="text-xxs">Fecha</label>
                      <input 
                        type="date" 
                        value={data.detectedDate}
                        onChange={(e) => handleResultChange(item.id, 'detectedDate', e.target.value)}
                        className="input-field table-input text-xxs"
                      />
                    </div>

                    {/* Productos */}
                    <div className="form-group col-span-4" style={{ gridColumn: 'span 4' }}>
                      <label className="text-xxs">Solicitados</label>
                      <input 
                        type="number" 
                        value={data.productosSolicitados}
                        onChange={(e) => handleResultChange(item.id, 'productosSolicitados', e.target.value)}
                        className="input-field table-input text-xxs"
                      />
                    </div>

                    <div className="form-group col-span-4" style={{ gridColumn: 'span 4' }}>
                      <label className="text-xxs">Sin Stock</label>
                      <input 
                        type="number" 
                        value={data.sinStock}
                        onChange={(e) => handleResultChange(item.id, 'sinStock', e.target.value)}
                        className="input-field table-input text-xxs input-danger-border"
                      />
                    </div>

                    <div className="form-group col-span-4" style={{ gridColumn: 'span 4' }}>
                      <label className="text-xxs">Total Prod.</label>
                      <input 
                        type="number" 
                        value={data.totalProductos}
                        onChange={(e) => handleResultChange(item.id, 'totalProductos', e.target.value)}
                        className="input-field table-input text-xxs"
                      />
                    </div>

                    {/* Tiempo de Picking y Bono Extra */}
                    <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                      <label className="text-xxs">Tiempo Picking (H:MM)</label>
                      <input 
                        type="text" 
                        placeholder="0:42"
                        value={data.pickingTime}
                        onChange={(e) => handleResultChange(item.id, 'pickingTime', e.target.value)}
                        className="input-field table-input text-xxs"
                      />
                    </div>

                    <div className="form-group col-span-6" style={{ gridColumn: 'span 6' }}>
                      <label className="text-xxs">Bono Extra ($)</label>
                      <input 
                        type="number" 
                        placeholder="0"
                        value={data.extraBonus}
                        onChange={(e) => handleResultChange(item.id, 'extraBonus', e.target.value)}
                        className="input-field table-input text-xxs"
                      />
                    </div>
                  </div>

                  {/* Fila de Tarifa */}
                  <div className="flex justify-between items-center text-xxs mt-2 pt-2 border-t text-muted">
                    <span>SKUs Efectivos: <strong>{effectiveSku}</strong></span>
                    
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={data.isWeekendRate}
                        onChange={() => handleResultChange(item.id, 'isWeekendRate')}
                        className="mr-1"
                      />
                      Tarifa Dom/Lun
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t pt-3 mt-3 flex justify-end">
            <button onClick={handleConfirmBatch} className="btn btn-primary w-full text-xs">
              Confirmar y Agregar {parsedResults.length} Pedidos al Historial
            </button>
          </div>
        </div>
      )}
      {/* Modal de Previsualización */}
      {previewUrl && (
        <div className="preview-modal-overlay" onClick={() => setPreviewUrl(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="preview-modal-close" 
              onClick={() => setPreviewUrl(null)}
              title="Cerrar vista previa"
            >
              <X size={18} />
            </button>
            <img src={previewUrl} alt="Vista previa de boleta" className="preview-modal-img" />
          </div>
        </div>
      )}
    </div>
  );
}
