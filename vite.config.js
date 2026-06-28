import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, 'db.json');

// Leer base de datos local
function readDb() {
  if (!fs.existsSync(DATA_FILE)) {
    return { profiles: [], settingsDatabase: {}, historyDatabase: {}, dailyBonusesDatabase: {} };
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error("Error leyendo db.json, restableciendo:", e);
    return { profiles: [], settingsDatabase: {}, historyDatabase: {}, dailyBonusesDatabase: {} };
  }
}

// Escribir base de datos local
function writeDb(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error escribiendo en db.json:", e);
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-db-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/db') {
            if (req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(readDb()));
            } else if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  const activeRut = data.activeRut;
                  
                  const currentDb = readDb();
                  
                  let updatedDb = {};

                  // Si el que guarda es el administrador, él es la fuente de verdad total
                  if (activeRut === '20.382.650-8') {
                    updatedDb = {
                      profiles: data.profiles || [],
                      settingsDatabase: data.settingsDatabase || {},
                      historyDatabase: data.historyDatabase || {},
                      dailyBonusesDatabase: data.dailyBonusesDatabase || {}
                    };
                  } else {
                    // Si es un picker normal:
                    // 1. Fusionar perfiles únicos
                    const profilesMap = new Map();
                    (currentDb.profiles || []).forEach(p => profilesMap.set(p.rut, p));
                    (data.profiles || []).forEach(p => profilesMap.set(p.rut, p));
                    const mergedProfiles = Array.from(profilesMap.values());

                    // 2. Fusionar configuraciones
                    const mergedSettings = {
                      ...(currentDb.settingsDatabase || {}),
                      ...(data.settingsDatabase || {})
                    };

                    // 3. Fusionar bonos diarios
                    const mergedDailyBonuses = {
                      ...(currentDb.dailyBonusesDatabase || {}),
                      ...(data.dailyBonusesDatabase || {})
                    };

                    // 4. Fusionar historiales
                    const mergedHistory = { ...(currentDb.historyDatabase || {}) };
                    
                    if (activeRut) {
                      // Para el picker activo, su versión es la fuente de verdad (permite borrar sus pedidos y bonos)
                      mergedHistory[activeRut] = data.historyDatabase[activeRut] || [];
                      mergedDailyBonuses[activeRut] = (data.dailyBonusesDatabase && data.dailyBonusesDatabase[activeRut]) || {};
                      
                      // Para otros pickers, fusionamos de forma normal para evitar pérdidas de datos paralelos
                      Object.keys(data.historyDatabase).forEach(rut => {
                        if (rut !== activeRut) {
                          const existingOrders = mergedHistory[rut] || [];
                          const incomingOrders = data.historyDatabase[rut] || [];
                          
                          const ordersMap = new Map();
                          existingOrders.forEach(o => ordersMap.set(o.id, o));
                          incomingOrders.forEach(o => ordersMap.set(o.id, o));
                          
                          mergedHistory[rut] = Array.from(ordersMap.values()).sort((a, b) => b.id.localeCompare(a.id));
                        }
                      });
                    } else {
                      // Si no hay RUT especificado, sobreescribir con el payload del cliente por seguridad
                      Object.keys(data.historyDatabase).forEach(rut => {
                        mergedHistory[rut] = data.historyDatabase[rut];
                      });
                    }

                    updatedDb = {
                      profiles: mergedProfiles,
                      settingsDatabase: mergedSettings,
                      historyDatabase: mergedHistory,
                      dailyBonusesDatabase: mergedDailyBonuses
                    };
                  }

                  writeDb(updatedDb);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ status: 'ok', data: updatedDb }));
                } catch (e) {
                  console.error("Error en POST /api/db:", e);
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid JSON or Server Error' }));
                }
              });
            }
          } else {
            next();
          }
        });
      }
    }
  ]
});
