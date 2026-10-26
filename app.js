/**
 * Чистый Дом — Логика веб-калькулятора клининга
 * Чистый Vanilla JavaScript без фреймворков и библиотек
 */

(function () {
  'use strict';

  // Проверка конфигурации
  const CONFIG = window.CONFIG || {
    companyName: "Клининг Сервис",
    telegramManager: "manager",
    phone: "+7 (999) 000-00-00",
    workingHours: "Ежедневно с 8:00 до 22:00",
    currencySymbol: "₽",
    minOrderPrice: 2500,
    defaultArea: 45,
    minArea: 10,
    maxArea: 300,
    cleaningTypes: [
      { id: "supporting", name: "Поддерживающая", pricePerSqM: 60, description: "Стандартная уборка", isDefault: true }
    ],
    additionalServices: []
  };

  // Элементы DOM
  const dom = {
    // Шапка
    brandTitle: document.getElementById('brand-title'),
    brandSubtitle: document.getElementById('brand-subtitle'),
    brandPhone: document.getElementById('brand-phone'),
    brandHours: document.getElementById('brand-hours'),

    // Площадь
    areaInput: document.getElementById('area-input'),
    areaSlider: document.getElementById('area-slider'),
    btnAreaMinus: document.getElementById('btn-area-minus'),
    btnAreaPlus: document.getElementById('btn-area-plus'),
    presetsContainer: document.getElementById('area-presets'),

    // Контейнеры опций
    cleaningTypesContainer: document.getElementById('cleaning-types-container'),
    servicesContainer: document.getElementById('services-container'),
    featuresContainer: document.getElementById('features-container'),

    // Форма адреса и времени
    inputAddress: document.getElementById('input-address'),
    inputDatetime: document.getElementById('input-datetime'),

    // Итоговый расчет
    totalPrice: document.getElementById('total-price'),
    currencySymbol: document.getElementById('currency-symbol'),
    minPriceAlert: document.getElementById('min-price-alert'),
    minPriceAmount: document.getElementById('min-price-amount'),
    priceBreakdown: document.getElementById('price-breakdown'),

    // Кнопка заявки
    btnTelegram: document.getElementById('btn-telegram'),

    // Модальное окно предпросмотра
    previewModal: document.getElementById('preview-modal'),
    previewTextContent: document.getElementById('preview-text-content'),
    btnConfirmTelegram: document.getElementById('btn-confirm-telegram'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelModal: document.getElementById('btn-cancel-modal'),
    btnCopyText: document.getElementById('btn-copy-text'),
    copyLabel: document.getElementById('copy-label'),
    copyIcon: document.getElementById('copy-icon'),

    // Панель владельца (скрытая)
    btnSecretAdmin: document.getElementById('btn-secret-admin'),
    brandLogoIcon: document.querySelector('.brand-logo-icon'),
    copyrightName: document.getElementById('copyright-name'),
    adminModal: document.getElementById('admin-modal'),
    btnCloseAdmin: document.getElementById('btn-close-admin'),
    adminAuthView: document.getElementById('admin-auth-view'),
    adminMainView: document.getElementById('admin-main-view'),
    adminPinInput: document.getElementById('admin-pin-input'),
    btnAuthSubmit: document.getElementById('btn-auth-submit'),
    adminPinError: document.getElementById('admin-pin-error'),
    adminGsheetUrl: document.getElementById('admin-gsheet-url'),
    btnGsheetSync: document.getElementById('btn-gsheet-sync'),
    gsheetLiveIndicator: document.getElementById('gsheet-live-indicator'),
    adminGsheetStatus: document.getElementById('admin-gsheet-status'),
    adminCompanyName: document.getElementById('admin-company-name'),
    adminTgManager: document.getElementById('admin-tg-manager'),
    adminPhone: document.getElementById('admin-phone'),
    adminMinPrice: document.getElementById('admin-min-price'),
    adminTypesContainer: document.getElementById('admin-types-container'),
    adminServicesContainer: document.getElementById('admin-services-container'),
    btnAdminApply: document.getElementById('btn-admin-apply'),
    btnAdminDownload: document.getElementById('btn-admin-download'),
    btnAdminCopy: document.getElementById('btn-admin-copy'),
    btnAdminReset: document.getElementById('btn-admin-reset'),
    adminStatusMessage: document.getElementById('admin-status-message')
  };

  // Снимок исходной конфигурации для сброса
  const initialConfigSnapshot = JSON.parse(JSON.stringify(CONFIG));

  // Состояние калькулятора
  const state = {
    area: Number(CONFIG.defaultArea) || 45,
    selectedTypeId: null,
    selectedServices: new Set(),
    lastGeneratedMessage: '',
    lastTelegramUrl: '',
    isAdminAuthenticated: false
  };

  /**
   * Инициализация калькулятора
   */
  function init() {
    renderBrandHeader();
    renderCleaningTypes();
    renderAdditionalServices();
    renderFeatures();
    initAreaControls();
    initTelegramButton();
    initPreviewModal();
    initAdminPanel();
    calculateAndRender();
    initGoogleSheetsSync();
  }

  /**
   * Отрисовка шапки компании
   */
  function renderBrandHeader() {
    if (dom.brandTitle) dom.brandTitle.textContent = CONFIG.companyName || 'Клининг';
    if (dom.copyrightName) dom.copyrightName.textContent = CONFIG.companyName || 'Чистый Дом';
    if (dom.brandPhone) {
      dom.brandPhone.textContent = CONFIG.phone || '';
      dom.brandPhone.href = `tel:${(CONFIG.phone || '').replace(/[^+\d]/g, '')}`;
    }
    if (dom.brandHours) dom.brandHours.textContent = CONFIG.workingHours || '';
    if (dom.currencySymbol) dom.currencySymbol.textContent = CONFIG.currencySymbol || '₽';
  }

  /**
   * Отрисовка типов уборки
   */
  function renderCleaningTypes() {
    if (!dom.cleaningTypesContainer || !CONFIG.cleaningTypes) return;

    dom.cleaningTypesContainer.innerHTML = '';

    // Определяем тип по умолчанию
    const defaultType = CONFIG.cleaningTypes.find(t => t.isDefault) || CONFIG.cleaningTypes[0];
    state.selectedTypeId = defaultType ? defaultType.id : null;

    CONFIG.cleaningTypes.forEach(type => {
      const isSelected = type.id === state.selectedTypeId;
      const card = document.createElement('label');
      card.className = `type-card ${isSelected ? 'selected' : ''}`;
      card.setAttribute('data-type-id', type.id);

      card.innerHTML = `
        <input type="radio" name="cleaning-type" value="${type.id}" class="type-card-radio" ${isSelected ? 'checked' : ''}>
        <span class="custom-radio"></span>
        <div class="type-info">
          <div class="type-top-row">
            <span class="type-name">
              ${escapeHtml(type.name)}
              ${type.badge ? `<span class="type-badge-pill">${escapeHtml(type.badge)}</span>` : ''}
            </span>
            <span class="type-rate">${type.pricePerSqM} ${CONFIG.currencySymbol}/м²</span>
          </div>
          <div class="type-description">${escapeHtml(type.description || '')}</div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        // Предотвращаем дублирование события от label и radio
        state.selectedTypeId = type.id;
        updateTypeSelectionUI();
        calculateAndRender();
      });

      dom.cleaningTypesContainer.appendChild(card);
    });
  }

  /**
   * Обновление визуального состояния типов уборки
   */
  function updateTypeSelectionUI() {
    const cards = dom.cleaningTypesContainer.querySelectorAll('.type-card');
    cards.forEach(card => {
      const typeId = card.getAttribute('data-type-id');
      const radio = card.querySelector('input[type="radio"]');
      if (typeId === state.selectedTypeId) {
        card.classList.add('selected');
        if (radio) radio.checked = true;
      } else {
        card.classList.remove('selected');
        if (radio) radio.checked = false;
      }
    });
  }

  /**
   * Отрисовка дополнительных услуг
   */
  function renderAdditionalServices() {
    if (!dom.servicesContainer || !CONFIG.additionalServices) return;

    dom.servicesContainer.innerHTML = '';

    CONFIG.additionalServices.forEach(service => {
      const card = document.createElement('label');
      card.className = 'service-card';
      card.setAttribute('data-service-id', service.id);

      card.innerHTML = `
        <input type="checkbox" value="${service.id}" class="service-card-checkbox">
        <div class="service-left">
          <span class="custom-checkbox">
            <svg viewBox="0 0 16 16"><polyline points="3 8 7 12 13 4"></polyline></svg>
          </span>
          <span class="service-icon">${service.icon || '✨'}</span>
          <span class="service-title">${escapeHtml(service.name)}</span>
        </div>
        <span class="service-price-badge">+${service.price.toLocaleString('ru-RU')} ${CONFIG.currencySymbol}</span>
      `;

      const checkbox = card.querySelector('input[type="checkbox"]');

      card.addEventListener('change', () => {
        if (checkbox.checked) {
          state.selectedServices.add(service.id);
          card.classList.add('checked');
        } else {
          state.selectedServices.delete(service.id);
          card.classList.remove('checked');
        }
        calculateAndRender();
      });

      dom.servicesContainer.appendChild(card);
    });
  }

  /**
   * Инициализация управления площадью
   */
  function initAreaControls() {
    const min = Number(CONFIG.minArea) || 10;
    const max = Number(CONFIG.maxArea) || 300;
    state.area = Math.min(Math.max(state.area, min), max);

    if (dom.areaInput) {
      dom.areaInput.min = min;
      dom.areaInput.max = max;
      dom.areaInput.value = state.area;

      dom.areaInput.addEventListener('input', () => {
        let val = parseInt(dom.areaInput.value, 10);
        if (isNaN(val)) return;
        setArea(val, false);
      });

      dom.areaInput.addEventListener('blur', () => {
        let val = parseInt(dom.areaInput.value, 10);
        if (isNaN(val) || val < min) val = min;
        if (val > max) val = max;
        setArea(val, true);
      });
    }

    if (dom.areaSlider) {
      dom.areaSlider.min = min;
      dom.areaSlider.max = max;
      dom.areaSlider.value = state.area;

      dom.areaSlider.addEventListener('input', () => {
        setArea(parseInt(dom.areaSlider.value, 10), true);
      });
    }

    if (dom.btnAreaMinus) {
      dom.btnAreaMinus.addEventListener('click', () => {
        setArea(state.area - 5, true);
      });
    }

    if (dom.btnAreaPlus) {
      dom.btnAreaPlus.addEventListener('click', () => {
        setArea(state.area + 5, true);
      });
    }

    // Обработка чипов пресетов площади
    if (dom.presetsContainer) {
      const presetButtons = dom.presetsContainer.querySelectorAll('.preset-chip');
      presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const areaVal = parseInt(btn.getAttribute('data-area'), 10);
          if (!isNaN(areaVal)) {
            setArea(areaVal, true);
          }
        });
      });
    }

    updateSliderTrackFill();
  }

  /**
   * Установка площади с синхронизацией контролов
   */
  function setArea(newArea, syncInput) {
    const min = Number(CONFIG.minArea) || 10;
    const max = Number(CONFIG.maxArea) || 300;
    state.area = Math.min(Math.max(newArea, min), max);

    if (syncInput && dom.areaInput) {
      dom.areaInput.value = state.area;
    }
    if (dom.areaSlider) {
      dom.areaSlider.value = state.area;
      updateSliderTrackFill();
    }

    // Подсветка активного пресета
    if (dom.presetsContainer) {
      const presetButtons = dom.presetsContainer.querySelectorAll('.preset-chip');
      presetButtons.forEach(btn => {
        const areaVal = parseInt(btn.getAttribute('data-area'), 10);
        if (areaVal === state.area) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    calculateAndRender();
  }

  /**
   * Окрашивание полосы ползунка от 0 до текущего значения
   */
  function updateSliderTrackFill() {
    if (!dom.areaSlider) return;
    const min = Number(dom.areaSlider.min) || 10;
    const max = Number(dom.areaSlider.max) || 300;
    const percent = ((state.area - min) / (max - min)) * 100;
    dom.areaSlider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`;
  }

  /**
   * Отрисовка преимуществ компании
   */
  function renderFeatures() {
    if (!dom.featuresContainer || !CONFIG.features) return;
    dom.featuresContainer.innerHTML = '';
    CONFIG.features.forEach(feat => {
      const item = document.createElement('div');
      item.className = 'feature-item';
      item.innerHTML = `
        <span class="feature-icon">${feat.icon || '⭐'}</span>
        <span class="feature-title">${escapeHtml(feat.title)}</span>
        <span class="feature-desc">${escapeHtml(feat.desc)}</span>
      `;
      dom.featuresContainer.appendChild(item);
    });
  }

  /**
   * Главный расчет стоимости
   * Формула: (Площадь * Тариф выбранного типа) + Сумма выбранных доп. услуг
   * Если сумма < minOrderPrice, итоговая сумма = minOrderPrice + подсказка клиенту
   */
  function calculateAndRender() {
    const selectedType = CONFIG.cleaningTypes.find(t => t.id === state.selectedTypeId) || CONFIG.cleaningTypes[0];
    const typeRate = selectedType ? Number(selectedType.pricePerSqM) || 0 : 0;
    const areaPrice = state.area * typeRate;

    // Сумма дополнительных услуг
    let extrasPrice = 0;
    const selectedExtrasList = [];

    state.selectedServices.forEach(serviceId => {
      const service = CONFIG.additionalServices.find(s => s.id === serviceId);
      if (service) {
        extrasPrice += Number(service.price) || 0;
        selectedExtrasList.push(service.name);
      }
    });

    const calculatedSum = areaPrice + extrasPrice;
    const minPrice = Number(CONFIG.minOrderPrice) || 0;
    const isMinPriceApplied = calculatedSum < minPrice;
    const finalPrice = isMinPriceApplied ? minPrice : calculatedSum;

    // Отображение итоговой суммы
    if (dom.totalPrice) {
      dom.totalPrice.textContent = finalPrice.toLocaleString('ru-RU');
    }

    // Подсказка о минимальной стоимости выезда
    if (dom.minPriceAlert) {
      if (isMinPriceApplied) {
        dom.minPriceAlert.classList.add('visible');
        if (dom.minPriceAmount) {
          dom.minPriceAmount.textContent = `${minPrice.toLocaleString('ru-RU')} ${CONFIG.currencySymbol}`;
        }
      } else {
        dom.minPriceAlert.classList.remove('visible');
      }
    }

    // Текстовая детализация расчета
    if (dom.priceBreakdown) {
      const extrasText = extrasPrice > 0 ? ` + доп. услуги: ${extrasPrice.toLocaleString('ru-RU')} ${CONFIG.currencySymbol}` : '';
      if (isMinPriceApplied) {
        dom.priceBreakdown.textContent = `Расчет по тарифу: ${state.area} м² × ${typeRate} ${CONFIG.currencySymbol}${extrasText} = ${calculatedSum.toLocaleString('ru-RU')} ${CONFIG.currencySymbol} (применена минимальная стоимость выезда)`;
      } else {
        dom.priceBreakdown.textContent = `Расчет: ${state.area} м² × ${typeRate} ${CONFIG.currencySymbol}/м²${extrasText}`;
      }
    }

    return {
      selectedType,
      areaPrice,
      extrasPrice,
      selectedExtrasList,
      calculatedSum,
      finalPrice,
      isMinPriceApplied
    };
  }

  /**
   * Инициализация кнопки отправки в Telegram
   */
  function initTelegramButton() {
    if (!dom.btnTelegram) return;

    dom.btnTelegram.addEventListener('click', (e) => {
      e.preventDefault();
      showOrderPreview();
    });
  }

  /**
   * Формирование сообщения и отображение предпросмотра
   */
  function showOrderPreview() {
    const calc = calculateAndRender();

    const addressValue = (dom.inputAddress ? dom.inputAddress.value.trim() : '');
    const datetimeValue = (dom.inputDatetime ? dom.inputDatetime.value.trim() : '');

    // Подсветка адреса, если поле пустое, для напоминания
    if (!addressValue && dom.inputAddress) {
      dom.inputAddress.classList.add('input-error');
      setTimeout(() => {
        dom.inputAddress.classList.remove('input-error');
      }, 2000);
    }

    // Список доп услуг через запятую или "Нет"
    const extrasString = calc.selectedExtrasList.length > 0
      ? calc.selectedExtrasList.join(', ')
      : 'Нет';

    const cleanAddress = addressValue || 'Уточняется';
    const cleanDatetime = datetimeValue || 'В ближайшее время';

    // Формирование текста по заданному формату
    const messageLines = [
      `Здравствуйте! Хочу заказать уборку в «${CONFIG.companyName}»:`,
      `- Тип: ${calc.selectedType ? calc.selectedType.name : 'Не выбран'}`,
      `- Площадь: ${state.area} кв.м`,
      `- Доп. услуги: ${extrasString}`,
      `- Ориентировочная сумма: ${calc.finalPrice.toLocaleString('ru-RU')} ₽`,
      `- Адрес: ${cleanAddress}`,
      `- Дата/время: ${cleanDatetime}`
    ];

    const messageText = messageLines.join('\n');
    state.lastGeneratedMessage = messageText;

    // Очистка имени менеджера от символа @ и пробелов
    const cleanManager = (CONFIG.telegramManager || 'telegram').replace(/^@+/, '').trim();

    // Формирование итогового URL
    const telegramUrl = `https://t.me/${cleanManager}?text=${encodeURIComponent(messageText)}`;
    state.lastTelegramUrl = telegramUrl;

    // Вывод текста в блок предпросмотра
    if (dom.previewTextContent) {
      dom.previewTextContent.textContent = messageText;
    }

    // Привязка ссылки к кнопке перехода
    if (dom.btnConfirmTelegram) {
      dom.btnConfirmTelegram.href = telegramUrl;
    }

    // Сброс состояния кнопки копирования
    resetCopyButtonState();

    // Открытие диалогового окна предпросмотра (HTML5 <dialog>)
    if (dom.previewModal) {
      if (typeof dom.previewModal.showModal === 'function') {
        dom.previewModal.showModal();
      } else {
        // Фоллбэк для устаревших сред без поддержки dialog.showModal
        dom.previewModal.setAttribute('open', '');
      }
    }
  }

  /**
   * Инициализация событий модального окна предпросмотра
   */
  function initPreviewModal() {
    if (!dom.previewModal) return;

    // Закрытие по крестику
    if (dom.btnCloseModal) {
      dom.btnCloseModal.addEventListener('click', closeModal);
    }

    // Закрытие по кнопке «Изменить данные»
    if (dom.btnCancelModal) {
      dom.btnCancelModal.addEventListener('click', closeModal);
    }

    // Закрытие по клику на фон (backdrop click)
    dom.previewModal.addEventListener('click', (e) => {
      if (e.target === dom.previewModal) {
        closeModal();
      }
    });

    // Кнопка копирования текста в буфер обмена (Async Clipboard API)
    if (dom.btnCopyText) {
      dom.btnCopyText.addEventListener('click', copyPreviewTextToClipboard);
    }

    // При клике на переход в Telegram закрываем модалку через небольшую паузу
    if (dom.btnConfirmTelegram) {
      dom.btnConfirmTelegram.addEventListener('click', () => {
        setTimeout(closeModal, 400);
      });
    }
  }

  /**
   * Закрытие модального окна предпросмотра
   */
  function closeModal() {
    if (!dom.previewModal) return;
    if (typeof dom.previewModal.close === 'function') {
      dom.previewModal.close();
    } else {
      dom.previewModal.removeAttribute('open');
    }
  }

  /**
   * Копирование сформированного текста в буфер обмена
   */
  function copyPreviewTextToClipboard() {
    const textToCopy = state.lastGeneratedMessage;
    if (!textToCopy) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(setCopiedButtonState)
        .catch(() => fallbackCopyText(textToCopy));
    } else {
      fallbackCopyText(textToCopy);
    }
  }

  /**
   * Фоллбэк копирования для устаревших браузеров
   */
  function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      setCopiedButtonState();
    } catch (err) {
      console.warn('Не удалось скопировать текст:', err);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  /**
   * Визуальный отклик успешного копирования
   */
  function setCopiedButtonState() {
    if (!dom.btnCopyText) return;
    dom.btnCopyText.classList.add('copied');
    if (dom.copyLabel) dom.copyLabel.textContent = 'Скопировано!';
    if (dom.copyIcon) dom.copyIcon.textContent = '✓';

    setTimeout(resetCopyButtonState, 2500);
  }

  /**
   * Сброс кнопки копирования в исходное состояние
   */
  function resetCopyButtonState() {
    if (!dom.btnCopyText) return;
    dom.btnCopyText.classList.remove('copied');
    if (dom.copyLabel) dom.copyLabel.textContent = 'Скопировать текст';
    if (dom.copyIcon) dom.copyIcon.textContent = '📋';
  }

  /**
   * =========================================================================
   * Веб-панель управления тарифами (Панель владельца с сохранением в GitHub)
   * Скрытый доступ: по ссылке #admin, тройной клик по логотипу, Ctrl+Shift+A
   * =========================================================================
   */
  function initAdminPanel() {
    if (!dom.adminModal) return;

    // 1. Скрытый триггер: незаметная точка в футере
    if (dom.btnSecretAdmin) {
      dom.btnSecretAdmin.addEventListener('click', openAdminPanel);
    }

    // 2. Скрытый триггер: секретная ссылка в адресной строке (#admin или #owner)
    function checkUrlHash() {
      if (window.location.hash === '#admin' || window.location.hash === '#owner') {
        openAdminPanel();
      }
    }
    window.addEventListener('hashchange', checkUrlHash);
    setTimeout(checkUrlHash, 200);

    // 3. Скрытый триггер: тройной клик по логотипу ✨ в шапке
    if (dom.brandLogoIcon) {
      let logoClicks = 0;
      let logoClickTimer = null;
      dom.brandLogoIcon.style.cursor = 'pointer';
      dom.brandLogoIcon.addEventListener('click', () => {
        logoClicks++;
        clearTimeout(logoClickTimer);
        if (logoClicks >= 3) {
          logoClicks = 0;
          openAdminPanel();
        } else {
          logoClickTimer = setTimeout(() => { logoClicks = 0; }, 800);
        }
      });
    }

    // 4. Скрытый триггер: клавиатурное сочетание Ctrl + Shift + A
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.code === 'KeyA')) {
        e.preventDefault();
        openAdminPanel();
      }
    });

    // Обработка кнопки ввода PIN-кода
    if (dom.btnAuthSubmit) {
      dom.btnAuthSubmit.addEventListener('click', verifyAdminPin);
    }
    if (dom.adminPinInput) {
      dom.adminPinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') verifyAdminPin();
      });
    }

    // Закрытие панели
    if (dom.btnCloseAdmin) {
      dom.btnCloseAdmin.addEventListener('click', closeAdminPanel);
    }

    // Закрытие по клику на затемненный фон
    dom.adminModal.addEventListener('click', (e) => {
      if (e.target === dom.adminModal) {
        closeAdminPanel();
      }
    });

    // Кнопка синхронизации с Google Таблицей
    if (dom.btnGsheetSync) {
      dom.btnGsheetSync.addEventListener('click', () => {
        const url = dom.adminGsheetUrl ? dom.adminGsheetUrl.value.trim() : (CONFIG.googleSheetUrl || '');
        if (!url) {
          showGsheetStatus('⚠️ Вставьте ссылку на Google Таблицу в поле выше.', 'error');
          if (dom.adminGsheetUrl) dom.adminGsheetUrl.focus();
          return;
        }
        syncWithGoogleSheet(url, true);
      });
    }

    // Кнопка локальной проверки в калькуляторе
    if (dom.btnAdminApply) {
      dom.btnAdminApply.addEventListener('click', () => {
        applyAdminChanges();
        showAdminStatus('✓ Изменения применены в текущем окне калькулятора.', 'success');
      });
    }

    // Кнопка скачивания config.js
    if (dom.btnAdminDownload) {
      dom.btnAdminDownload.addEventListener('click', downloadUpdatedConfigFile);
    }

    // Кнопка копирования кода config.js
    if (dom.btnAdminCopy) {
      dom.btnAdminCopy.addEventListener('click', copyUpdatedConfigCode);
    }

    // Кнопка сброса к исходным настройкам
    if (dom.btnAdminReset) {
      dom.btnAdminReset.addEventListener('click', resetAdminConfig);
    }
  }

  /**
   * Открытие панели владельца (с проверкой PIN-кода)
   */
  function openAdminPanel() {
    if (!dom.adminModal) return;

    if (state.isAdminAuthenticated) {
      showAdminMainView();
    } else {
      showAdminPinView();
    }

    if (typeof dom.adminModal.showModal === 'function') {
      dom.adminModal.showModal();
    } else {
      dom.adminModal.setAttribute('open', '');
    }

    if (!state.isAdminAuthenticated && dom.adminPinInput) {
      setTimeout(() => dom.adminPinInput.focus(), 150);
    }
  }

  /**
   * Показ экрана ввода PIN-кода
   */
  function showAdminPinView() {
    if (dom.adminAuthView) dom.adminAuthView.style.display = 'flex';
    if (dom.adminMainView) dom.adminMainView.style.display = 'none';
    if (dom.adminPinInput) dom.adminPinInput.value = '';
    if (dom.adminPinError) dom.adminPinError.classList.remove('visible');
  }

  /**
   * Показ основного содержимого панели
   */
  function showAdminMainView() {
    if (dom.adminAuthView) dom.adminAuthView.style.display = 'none';
    if (dom.adminMainView) dom.adminMainView.style.display = 'flex';
    populateAdminForm();
  }

  /**
   * Проверка введенного PIN-кода
   */
  function verifyAdminPin() {
    const entered = dom.adminPinInput ? dom.adminPinInput.value.trim() : '';
    const expected = String(CONFIG.adminPin || '1234').trim();

    if (entered === expected) {
      state.isAdminAuthenticated = true;
      showAdminMainView();
    } else {
      if (dom.adminPinError) {
        dom.adminPinError.textContent = 'Неверный PIN-код. Попробуйте еще раз.';
        dom.adminPinError.classList.add('visible');
      }
      if (dom.adminPinInput) {
        dom.adminPinInput.select();
      }
    }
  }

  /**
   * Закрытие панели владельца
   */
  function closeAdminPanel() {
    if (typeof dom.adminModal.close === 'function') {
      dom.adminModal.close();
    } else {
      dom.adminModal.removeAttribute('open');
    }
  }

  /**
   * Заполнение полей формы актуальными данными
   */
  function populateAdminForm() {
    if (dom.adminGsheetUrl) dom.adminGsheetUrl.value = CONFIG.googleSheetUrl || '';
    if (dom.gsheetLiveIndicator) {
      if (CONFIG.googleSheetUrl) {
        dom.gsheetLiveIndicator.textContent = '✓ Подключена';
        dom.gsheetLiveIndicator.classList.add('active');
      } else {
        dom.gsheetLiveIndicator.textContent = '⚡ Не подключена';
        dom.gsheetLiveIndicator.classList.remove('active');
      }
    }
    if (dom.adminCompanyName) dom.adminCompanyName.value = CONFIG.companyName || '';
    if (dom.adminTgManager) dom.adminTgManager.value = CONFIG.telegramManager || '';
    if (dom.adminPhone) dom.adminPhone.value = CONFIG.phone || '';
    if (dom.adminMinPrice) dom.adminMinPrice.value = CONFIG.minOrderPrice || 2500;

    // Отрисовка тарифов за м²
    if (dom.adminTypesContainer && CONFIG.cleaningTypes) {
      dom.adminTypesContainer.innerHTML = '';
      CONFIG.cleaningTypes.forEach(type => {
        const row = document.createElement('div');
        row.className = 'admin-row-item';
        row.innerHTML = `
          <div class="admin-row-info">
            <span class="admin-row-title">${escapeHtml(type.name)}</span>
          </div>
          <div class="admin-input-wrapper">
            <input type="number" id="admin-type-${type.id}" class="admin-input-number" value="${type.pricePerSqM}" min="1" step="5">
            <span class="admin-input-unit">₽ / м²</span>
          </div>
        `;
        dom.adminTypesContainer.appendChild(row);
      });
    }

    // Отрисовка цен дополнительных услуг
    if (dom.adminServicesContainer && CONFIG.additionalServices) {
      dom.adminServicesContainer.innerHTML = '';
      CONFIG.additionalServices.forEach(service => {
        const row = document.createElement('div');
        row.className = 'admin-row-item';
        row.innerHTML = `
          <div class="admin-row-info">
            <span>${service.icon || '✨'}</span>
            <span class="admin-row-title">${escapeHtml(service.name)}</span>
          </div>
          <div class="admin-input-wrapper">
            <input type="number" id="admin-service-${service.id}" class="admin-input-number" value="${service.price}" min="0" step="50">
            <span class="admin-input-unit">₽</span>
          </div>
        `;
        dom.adminServicesContainer.appendChild(row);
      });
    }
  }

  /**
   * Применение изменений к объекту CONFIG и перерисовка калькулятора
   */
  function applyAdminChanges() {
    if (dom.adminGsheetUrl) CONFIG.googleSheetUrl = dom.adminGsheetUrl.value.trim();
    if (dom.adminCompanyName) CONFIG.companyName = dom.adminCompanyName.value.trim() || CONFIG.companyName;
    if (dom.adminTgManager) CONFIG.telegramManager = dom.adminTgManager.value.trim() || CONFIG.telegramManager;
    if (dom.adminPhone) CONFIG.phone = dom.adminPhone.value.trim() || CONFIG.phone;
    if (dom.adminMinPrice) CONFIG.minOrderPrice = Number(dom.adminMinPrice.value) || CONFIG.minOrderPrice;

    // Сохранение тарифов за м²
    if (CONFIG.cleaningTypes) {
      CONFIG.cleaningTypes.forEach(type => {
        const input = document.getElementById(`admin-type-${type.id}`);
        if (input && !isNaN(Number(input.value))) {
          type.pricePerSqM = Number(input.value);
        }
      });
    }

    // Сохранение цен доп. услуг
    if (CONFIG.additionalServices) {
      CONFIG.additionalServices.forEach(service => {
        const input = document.getElementById(`admin-service-${service.id}`);
        if (input && !isNaN(Number(input.value))) {
          service.price = Number(input.value);
        }
      });
    }

    // Мгновенное обновление всего интерфейса калькулятора
    renderBrandHeader();
    renderCleaningTypes();
    renderAdditionalServices();
    calculateAndRender();
  }

  /**
   * Фоновая инициализация синхронизации с Google Таблицей
   */
  function initGoogleSheetsSync() {
    const activeSheetUrl = (CONFIG.googleSheetUrl || '').trim();
    if (activeSheetUrl) {
      syncWithGoogleSheet(activeSheetUrl, false);
    }
  }

  /**
   * Синхронизация тарифов и настроек из Google Таблицы
   */
  async function syncWithGoogleSheet(rawUrl, isManual = false) {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    const trimmed = rawUrl.trim();
    if (!trimmed) return;

    // Извлечение Spreadsheet ID
    const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = idMatch ? idMatch[1] : trimmed;

    if (!sheetId || sheetId.length < 15) {
      if (isManual) {
        showGsheetStatus('⚠️ Не удалось распознать ссылку на Google Таблицу. Укажите полную ссылку вида https://docs.google.com/spreadsheets/d/...', 'error');
      }
      return;
    }

    if (isManual && dom.btnGsheetSync) {
      dom.btnGsheetSync.disabled = true;
      showGsheetStatus('⏳ Загрузка свежих данных из Google Таблицы...', 'loading');
    }

    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
      const res = await fetch(gvizUrl);
      if (!res.ok) {
        throw new Error(`Google Sheets вернул статус ${res.status}. Убедитесь, что доступ к таблице открыт («Все, у кого есть ссылка»).`);
      }

      const text = await res.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
      if (!match || !match[1]) {
        throw new Error('Не удалось разобрать ответ от Google Таблицы.');
      }

      const data = JSON.parse(match[1]);
      if (!data.table || !data.table.rows) {
        throw new Error('Таблица пуста или имеет нестандартный формат.');
      }

      let updatedCount = 0;
      data.table.rows.forEach(r => {
        if (!r || !r.c) return;
        const col0 = r.c[0] ? String(r.c[0].v !== null && r.c[0].v !== undefined ? r.c[0].v : '').trim() : '';
        const col1 = r.c[1] ? (r.c[1].v !== null && r.c[1].v !== undefined ? r.c[1].v : '') : '';
        const col2 = r.c[2] ? String(r.c[2].v !== null && r.c[2].v !== undefined ? r.c[2].v : '').trim().toLowerCase() : '';

        const key = col2 || col0.toLowerCase();
        const val = typeof col1 === 'string' ? col1.trim() : col1;

        if (!key || val === '' || val === null || val === undefined) return;

        // Общие параметры компании
        if (key.includes('companyname') || key.includes('название компании')) {
          CONFIG.companyName = String(val);
          updatedCount++;
        } else if (key.includes('telegram') || key.includes('телеграм')) {
          CONFIG.telegramManager = String(val).replace(/^@/, '');
          updatedCount++;
        } else if (key.includes('phone') || key.includes('телефон')) {
          CONFIG.phone = String(val);
          updatedCount++;
        } else if (key.includes('workinghours') || key.includes('график') || key.includes('часы')) {
          CONFIG.workingHours = String(val);
          updatedCount++;
        } else if (key.includes('minorder') || key.includes('минимальн')) {
          const num = Number(val);
          if (!isNaN(num) && num > 0) {
            CONFIG.minOrderPrice = num;
            updatedCount++;
          }
        }

        // Типы уборки (за м²)
        if (CONFIG.cleaningTypes) {
          CONFIG.cleaningTypes.forEach(t => {
            const tId = t.id.toLowerCase();
            const tName = t.name.toLowerCase();
            if (key === tId || key.includes(tId) || col0.toLowerCase().includes(tName)) {
              const num = Number(val);
              if (!isNaN(num) && num > 0) {
                t.pricePerSqM = num;
                updatedCount++;
              }
            }
          });
        }

        // Дополнительные услуги
        if (CONFIG.additionalServices) {
          CONFIG.additionalServices.forEach(s => {
            const sId = s.id.toLowerCase();
            const sName = s.name.toLowerCase();
            if (key === sId || key.includes(sId) || col0.toLowerCase().includes(sName)) {
              const num = Number(val);
              if (!isNaN(num) && num >= 0) {
                s.price = num;
                updatedCount++;
              }
            }
          });
        }
      });

      CONFIG.googleSheetUrl = trimmed;

      // Обновление UI
      renderBrandHeader();
      renderCleaningTypes();
      renderAdditionalServices();
      calculateAndRender();

      if (state.isAdminAuthenticated) {
        populateAdminForm();
      }

      if (dom.gsheetLiveIndicator) {
        dom.gsheetLiveIndicator.textContent = '✓ Синхронизировано';
        dom.gsheetLiveIndicator.classList.add('active');
      }

      if (isManual) {
        showGsheetStatus(`✓ <strong>Таблица успешно подключена!</strong><br>Обновлено параметров: ${updatedCount}. Цены в калькуляторе стали актуальными.`, 'success');
      }

    } catch (err) {
      console.error('Ошибка синхронизации Google Sheets:', err);
      if (dom.gsheetLiveIndicator) {
        dom.gsheetLiveIndicator.textContent = '⚠️ Ошибка доступа';
        dom.gsheetLiveIndicator.classList.remove('active');
      }
      if (isManual) {
        showGsheetStatus(`❌ Ошибка загрузки: ${escapeHtml(err.message)}<br><small>Убедитесь, что в Google Таблице нажато «Поделиться» → «Все, у кого есть ссылка» (Читатель).</small>`, 'error');
      }
    } finally {
      if (isManual && dom.btnGsheetSync) {
        dom.btnGsheetSync.disabled = false;
      }
    }
  }

  /**
   * Отображение уведомлений в блоке Google Таблицы
   */
  function showGsheetStatus(htmlText, type) {
    if (!dom.adminGsheetStatus) return;
    dom.adminGsheetStatus.className = `admin-status-message ${type} visible`;
    dom.adminGsheetStatus.innerHTML = htmlText;
  }

  /**
   * Отображение уведомлений в панели владельца
   */
  function showAdminStatus(htmlText, type) {
    const el = dom.adminStatusMessage || dom.adminGithubStatus;
    if (!el) return;
    el.className = `admin-status-message ${type} visible`;
    el.innerHTML = htmlText;
  }

  /**
   * Генерация исходного кода config.js
   */
  function generateConfigJsSource() {
    return `/**\n * Конфигурация калькулятора клининговых услуг\n * Сгенерировано через веб-панель управления тарифами\n */\nwindow.CONFIG = ${JSON.stringify(CONFIG, null, 2)};\n`;
  }

  /**
   * Скачивание config.js на диск
   */
  function downloadUpdatedConfigFile() {
    applyAdminChanges();
    const source = generateConfigJsSource();
    const blob = new Blob([source], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAdminStatus('✓ Файл config.js скачан на компьютер.', 'success');
  }

  /**
   * Копирование кода config.js в буфер обмена
   */
  function copyUpdatedConfigCode() {
    applyAdminChanges();
    const source = generateConfigJsSource();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(source).then(() => {
        if (dom.btnAdminCopy) {
          const orig = dom.btnAdminCopy.textContent;
          dom.btnAdminCopy.textContent = '✓ Скопировано!';
          setTimeout(() => { dom.btnAdminCopy.textContent = orig; }, 2000);
        }
        showAdminStatus('✓ Код config.js скопирован! Теперь нажмите кнопку «✏️ Открыть config.js на GitHub» вверху и вставьте его.', 'success');
      });
    } else {
      fallbackCopyText(source);
    }
  }

  /**
   * Сброс к исходным значениям
   */
  function resetAdminConfig() {
    if (!initialConfigSnapshot) return;
    Object.assign(CONFIG, JSON.parse(JSON.stringify(initialConfigSnapshot)));
    populateAdminForm();
    applyAdminChanges();
    showAdminStatus('Поля сброшены к исходным значениям.', 'loading');
  }

  /**
   * Экранирование HTML для безопасного вывода
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Запуск после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
