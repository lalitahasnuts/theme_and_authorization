const express = require('express');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const app = express();
const cacheDir = path.join(__dirname, 'cache');

// Создаем папку для кэша, если её нет
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
  }
  
  app.use(express.static('public'));
  app.use(express.json());
  app.use(cookieParser());
  
  // Функция для кэширования данных в файлы
  function getCachedData(key, ttlSeconds = 30) {
    const cacheFile = path.join(cacheDir, `${key}.json`);
  
    // Если файл существует и не устарел
    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      const now = new Date().getTime();
      const fileAge = (now - stats.mtimeMs) / 1000;
  
      if (fileAge < ttlSeconds) {
        const cachedData = fs.readFileSync(cacheFile, 'utf-8');
        return JSON.parse(cachedData);
      }
    }
  
    // Генерируем новые данные
    const newData = { 
      items: [1, 2, 3], 
      timestamp: Date.now(),
      source: 'Файловый кэш'
    };
  
    // Сохраняем в файл
    fs.writeFileSync(cacheFile, JSON.stringify(newData));
  
    // Удаляем файл после истечения TTL
    setTimeout(() => {
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }
    }, ttlSeconds * 1000);
  
    return newData;
  }
  
  // API для получения данных
  app.get('/api/data', (req, res) => {
    const data = getCachedData('api_data');
    res.json(data);
  });
  
  // API для сохранения темы
  app.post('/theme', (req, res) => {
    const theme = req.body.theme;
    res.cookie('theme', theme, {
      maxAge: 86400000, // 1 день
      httpOnly: true,
      sameSite: 'strict'
    });
    res.sendStatus(200);
  });

// Мидлвары
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Конфигурация сессии
app.use(session({
    secret: 'your_secret_key_here',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Для разработки на localhost
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 часа
    }
}));

// Маршруты
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Простая проверка (в реальном приложении - проверка в БД)
    if (username === 'admin' && password === '12345') {
        req.session.user = { username };
        return res.json({ success: true });
    }
    res.status(401).json({ success: false });
});

app.get('/check-auth', (req, res) => {
    if (req.session.user) {
        return res.json({ authenticated: true, user: req.session.user });
    }
    res.json({ authenticated: false });
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Ошибка выхода');
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.listen(3000, () => {
    console.log('Сервер запущен на http://localhost:3000');
    console.log('Кэш хранится в папке:', cacheDir);
    console.log('Для теста используйте:');
    console.log('Логин: admin');
    console.log('Пароль: 12345');
});
