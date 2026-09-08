/* =========================================================
   Dormeza — єдина точка конфігурації сайту.
   Усі значення, які змінює бізнес, живуть тут, а не в розмітці.
   Перед релізом замінити всі TODO на реальні дані (ТЗ, розділ 19).
   ========================================================= */
window.DORMEZA_CONFIG = {
  // --- Telegram ---
  // TODO(release): реальний username бота
  botUsername: 'DormezaSon6Bot',

  // Токен атрибуції — короткий непрозорий ідентифікатор кампанії/сесії.
  // У URL ЗАБОРОНЕНО передавати ім'я, email, телефон, відповіді анкети
  // чи будь-які дані про здоров'я (ТЗ, 9.1).
  attribution: {
    // Довжина токена в символах
    tokenLength: 12,
    // Час життя токена в сесії, хв
    ttlMinutes: 120,
    // Ключ у sessionStorage
    storageKey: 'dz_attr'
  },

  // --- Ціни (ТЗ, 1.2 / 7.12). Змінювати лише тут. ---
  price: {
    regular: '5 900 грн',
    current: '4 900 грн',
    currency: 'UAH',
    regularValue: 5900,
    currentValue: 4900
  },

  // --- Аналітика ---
  analytics: {
    // Увімкнеться лише після згоди користувача на аналітичні cookies
    enabled: false,
    // TODO(release): ID вимірювання, коли буде обрано провайдера
    measurementId: null
  },

  // --- Юридичні документи: версія і дата ---
  legal: {
    version: '0.9-draft',
    updated: '8 вересня 2026'
  },

  // --- Контакти (TODO(release): реальні реквізити продавця) ---
  contacts: {
    supportEmail: 'support@dormeza.example',
    dataEmail: 'privacy@dormeza.example'
  }
};
