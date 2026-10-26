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
    adminGithubRepo: document.getElementById('admin-github-repo'),
    adminGithubToken: document.getElementById('admin-github-token'),
    btnAdminGithubSave: document.getElementById('btn-admin-github-save'),
    adminGithubStatus: document.getElementById('admin-github-status'),
    adminCompanyName: document.getElementById('admin-company-name'),
    adminTgManager: document.getElementById('admin-tg-manager'),
    adminPhone: document.getElementById('admin-phone'),
    adminMinPrice: document.getElementById('admin-min-price'),
    adminTypesContainer: document.getElementById('admin-types-container'),
    adminServicesContainer: document.getElementById('admin-services-container'),
    btnAdminApply: document.getElementById('btn-admin-apply'),
    btnAdminDownload: document.getElementById('btn-admin-download'),
    btnAdminCopy: document.getElementById('btn-admin-copy'),
    btnAdminReset: document.getElementById('btn-admin-reset')
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

    // Кнопка глобального сохранения в GitHub
    if (dom.btnAdminGithubSave) {
      dom.btnAdminGithubSave.addEventListener('click', saveGloballyToGitHub);
    }

    // Кнопка локальной проверки в калькуляторе
    if (dom.btnAdminApply) {
      dom.btnAdminApply.addEventListener('click', () => {
        applyAdminChanges();
        showGithubStatus('✓ Изменения применены в текущем окне калькулятора.', 'success');
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
    if (dom.adminGithubRepo) {
      dom.adminGithubRepo.value = CONFIG.githubRepo || '';
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
    if (dom.adminGithubRepo) {
      CONFIG.githubRepo = dom.adminGithubRepo.value.trim();
    }
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
   * Глобальное сохранение изменений в репозиторий GitHub через REST API
   */
  async function saveGloballyToGitHub() {
    const rawRepo = dom.adminGithubRepo ? dom.adminGithubRepo.value.trim() : '';
    const rawToken = dom.adminGithubToken ? dom.adminGithubToken.value.trim() : '';

    // Очистка репозитория (удаляем возможный https://github.com/ в начале)
    const cleanRepo = rawRepo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').trim();

    if (!cleanRepo || !cleanRepo.includes('/')) {
      showGithubStatus('⚠️ Укажите репозиторий в формате «имя_пользователя/имя_репозитория» (например, user/cleaning-calculator)', 'error');
      if (dom.adminGithubRepo) dom.adminGithubRepo.focus();
      return;
    }

    if (!rawToken) {
      showGithubStatus('⚠️ Введите ваш GitHub Personal Access Token (нажмите «Получить токен в 1 клик»)', 'error');
      if (dom.adminGithubToken) dom.adminGithubToken.focus();
      return;
    }

    // Блокируем кнопку на время отправки
    if (dom.btnAdminGithubSave) {
      dom.btnAdminGithubSave.disabled = true;
    }
    showGithubStatus('⏳ Подключение к GitHub API...', 'loading');

    try {
      // 1. Применяем текущие значения формы к конфигурации
      applyAdminChanges();

      // 2. Запрашиваем информацию о файле config.js из GitHub для получения sha
      const getFileUrl = `https://api.github.com/repos/${cleanRepo}/contents/config.js`;
      const getRes = await fetch(getFileUrl, {
        headers: {
          'Authorization': `Bearer ${rawToken}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (getRes.status === 401) {
        throw new Error('Неверный токен GitHub или срок его действия истек. Создайте новый токен по ссылке выше.');
      }
      if (getRes.status === 404) {
        throw new Error(`Репозиторий «${cleanRepo}» или файл «config.js» не найден. Проверьте правильность названия репозитория.`);
      }
      if (getRes.status === 403) {
        throw new Error('Доступ запрещен. Убедитесь, что токен имеет галочку доступа «repo» (Contents: read & write).');
      }
      if (!getRes.ok) {
        throw new Error(`Ошибка GitHub API (${getRes.status}): ${getRes.statusText}`);
      }

      const fileData = await getRes.json();
      const currentSha = fileData.sha;

      showGithubStatus('⏳ Сохранение и создание коммита в GitHub Pages...', 'loading');

      // 3. Формируем новый текст файла и кодируем в base64
      const newConfigContent = generateConfigJsSource();
      const encodedContent = toBase64Utf8(newConfigContent);

      // 4. Отправляем PUT-запрос для обновления файла
      const putRes = await fetch(getFileUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${rawToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Update cleaning calculator prices via Admin Panel',
          content: encodedContent,
          sha: currentSha
        })
      });

      if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({}));
        throw new Error(errData.message || `Ошибка сохранения: статус ${putRes.status}`);
      }

      // Успех!
      showGithubStatus('✓ <strong>Изменения успешно сохранены глобально!</strong><br>Коммит отправлен в GitHub. GitHub Pages обновит сайт для всех посетителей через ~30-60 секунд.', 'success');

    } catch (err) {
      console.error('Ошибка сохранения в GitHub:', err);
      showGithubStatus(`❌ ${escapeHtml(err.message)}`, 'error');
    } finally {
      if (dom.btnAdminGithubSave) {
        dom.btnAdminGithubSave.disabled = false;
      }
    }
  }

  /**
   * Отображение статуса в блоке GitHub
   */
  function showGithubStatus(htmlText, type) {
    if (!dom.adminGithubStatus) return;
    dom.adminGithubStatus.className = `admin-status-message ${type} visible`;
    dom.adminGithubStatus.innerHTML = htmlText;
  }

  /**
   * Кодирование строки UTF-8 в base64
   */
  function toBase64Utf8(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    }));
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
    showGithubStatus('✓ Файл config.js скачан на компьютер.', 'success');
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
        showGithubStatus('✓ Код config.js скопирован в буфер обмена.', 'success');
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
    showGithubStatus('Поля сброшены к исходным значениям.', 'loading');
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
