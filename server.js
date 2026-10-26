#!/usr/bin/env node
/**
 * Бэкенд-сервер для калькулятора клининга
 * Запускается на чистом Node.js (без внешних зависимостей)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const CONFIG_FILE = path.join(PUBLIC_DIR, 'config.json');
const ORDERS_FILE = path.join(PUBLIC_DIR, 'orders.json');

// MIME-типы файлов
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8'
};

// Чтение конфигурации
function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Ошибка чтения config.json:', err.message);
  }
  return {};
}

// Запись конфигурации
function saveConfig(newConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Ошибка записи config.json:', err.message);
    return false;
  }
}

// Запись заявки в базу
function saveOrder(orderData) {
  try {
    let orders = [];
    if (fs.existsSync(ORDERS_FILE)) {
      try {
        orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
      } catch (e) {
        orders = [];
      }
    }
    const orderRecord = {
      id: 'ORD-' + Date.now(),
      createdAt: new Date().toISOString(),
      ...orderData
    };
    orders.unshift(orderRecord);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
    return orderRecord;
  } catch (err) {
    console.error('Ошибка сохранения заявки:', err.message);
    return null;
  }
}

// Сборка тела входящего POST-запроса
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) { // лимит 2MB
        req.destroy();
        reject(new Error('Размер тела запроса превышен'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Отправка JSON-ответа
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

// Сервер
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // --- API: Получить конфигурацию ---
  if (pathname === '/api/config' && req.method === 'GET') {
    const config = getConfig();
    sendJson(res, 200, config);
    return;
  }

  // --- API: Сохранить конфигурацию (панель владельца) ---
  if (pathname === '/api/config' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      const currentConfig = getConfig();
      const expectedPin = String(currentConfig.adminPin || '8814').trim();

      if (String(payload.pin || '').trim() !== expectedPin) {
        sendJson(res, 401, { success: false, error: 'Неверный PIN-код владельца' });
        return;
      }

      if (!payload.config || typeof payload.config !== 'object') {
        sendJson(res, 400, { success: false, error: 'Переданы некорректные данные настроек' });
        return;
      }

      // Сохраняем PIN владельца неизменным, если он не был передан явно
      if (!payload.config.adminPin) {
        payload.config.adminPin = expectedPin;
      }

      const ok = saveConfig(payload.config);
      if (ok) {
        console.log(`[${new Date().toLocaleTimeString()}] ✓ Конфигурация успешно обновлена владельцем.`);
        sendJson(res, 200, { success: true, message: 'Настройки и тарифы успешно сохранены на сервере!' });
      } else {
        sendJson(res, 500, { success: false, error: 'Ошибка записи файла конфигурации' });
      }
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // --- API: Сохранить заявку клиента ---
  if (pathname === '/api/orders' && req.method === 'POST') {
    try {
      const orderData = await parseBody(req);
      const saved = saveOrder(orderData);
      console.log(`[${new Date().toLocaleTimeString()}] 🔔 Новая заявка: ${orderData.clientAddress || 'Без адреса'} на сумму ${orderData.totalPrice || 0} ₽`);
      sendJson(res, 201, { success: true, order: saved });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // --- Статические файлы (index.html, style.css, app.js и др.) ---
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = 'index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404: Файл не найден');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// Запуск сервера
server.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(65));
  console.log(' 🚀 КЛИНИНГОВЫЙ КАЛЬКУЛЯТОР — СЕРВЕР ЗАПУЩЕН!');
  console.log('='.repeat(65));
  console.log(` • Локально на ноутбуке:   http://localhost:${PORT}`);

  // Определение локального Wi-Fi IP для открытия с телефона
  const ifaces = os.networkInterfaces();
  for (const name in ifaces) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(` • С телефона по Wi-Fi:    http://${iface.address}:${PORT}`);
      }
    }
  }

  console.log('='.repeat(65));
  console.log(' • Панель владельца:      ПИН 8814 (3 клика на ✨ или Ctrl+Shift+A)');
  console.log(' • Изменения цен:          Сохраняются мгновенно прямо на ноутбуке!');
  console.log('='.repeat(65));
});

// Корректное завершение
process.on('SIGINT', () => {
  console.log('\nОстановка сервера...');
  server.close(() => process.exit(0));
});
