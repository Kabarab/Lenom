const admin = require('firebase-admin');

// Это асинхронная функция-middleware
async function isAuthenticated(req, res, next) {
  // 1. Получаем "пропуск" (токен) из заголовков запроса
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Нет токена авторизации' });
  }

  const idToken = authorization.split('Bearer ')[1];

  try {
    // 2. Проверяем токен с помощью Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // 3. Если токен верный, добавляем информацию о пользователе в запрос
    req.user = decodedToken;

    // 4. Пропускаем запрос дальше, к основной логике
    next();
  } catch (error) {
    console.error('Ошибка верификации токена:', error);
    return res.status(401).json({ message: 'Неверный токен авторизации' });
  }
}

module.exports = isAuthenticated;