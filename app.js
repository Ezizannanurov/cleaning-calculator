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
    copyIcon: document.getElementById('copy-icon')
  };

  // Состояние калькулятора
  const state = {
    area: Number(CONFIG.defaultArea) || 45,
    selectedTypeId: null,
    selectedServices: new Set(),
    lastGeneratedMessage: '',
    lastTelegramUrl: ''
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
    calculateAndRender();
  }

  /**
   * Отрисовка шапки компании
   */
  function renderBrandHeader() {
    if (dom.brandTitle) dom.brandTitle.textContent = CONFIG.companyName || 'Клининг';
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
