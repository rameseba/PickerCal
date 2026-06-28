import React from 'react';

export default function SkuTable({ skuTable, effectiveSkuCount }) {
  const formatCLP = (val) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="card glass">
      <div className="card-header">
        <h2 className="text-gradient">Tabla de Valores SKU</h2>
        <p className="card-subtitle">
          El valor de cada SKU varía según la cantidad de productos totales (descontando sin stock).
        </p>
      </div>

      <div className="card-body">
        <div className="table-responsive">
          <table className="sku-values-table">
            <thead>
              <tr>
                <th>Rango SKU</th>
                <th>Valor de SKU</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {skuTable.map((row, index) => {
                const maxVal = row.max === 9999 ? Infinity : row.max;
                const isActive = effectiveSkuCount >= row.min && effectiveSkuCount <= maxVal;

                return (
                  <tr 
                    key={index}
                    className={isActive ? 'sku-row-active' : ''}
                  >
                    <td>
                      {row.max === 9999 ? `${row.min} o más` : `${row.min} a ${row.max}`}
                    </td>
                    <td className="font-semibold text-gray-800">
                      {formatCLP(row.value)}
                    </td>
                    <td>
                      {isActive ? (
                        <span className="badge badge-success animate-pulse">Activo</span>
                      ) : (
                        <span className="text-muted text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
