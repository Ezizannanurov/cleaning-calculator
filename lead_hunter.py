#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Поиск B2B клиентов для клининговой компании через карты (OpenStreetMap / Яндекс / 2ГИС)
Формирует базу контактов и готовые ссылки для отправки КП в WhatsApp в 1 клик.
"""

import sys
import os
import json
import csv
import re
import urllib.parse
import urllib.request
from datetime import datetime

# Настройки по умолчанию
CALCULATOR_URL = "https://ezizannanurov.github.io/cleaning-calculator/"
MANAGER_PHONE = "+7 (999) 456-78-99"

CATEGORIES = {
    "1": {
        "name": "Салоны красоты и барбершопы",
        "tag": '(node["shop"~"beauty|hairdresser"](area.searchArea);way["shop"~"beauty|hairdresser"](area.searchArea););',
        "query_text": "салон красоты"
    },
    "2": {
        "name": "Стоматологии и медцентры",
        "tag": '(node["amenity"~"dentist|clinic|doctors"](area.searchArea);way["amenity"~"dentist|clinic|doctors"](area.searchArea););',
        "query_text": "стоматология"
    },
    "3": {
        "name": "Офисы и коворкинги",
        "tag": '(node["office"](area.searchArea);node["amenity"="coworking_space"](area.searchArea););',
        "query_text": "коворкинг"
    },
    "4": {
        "name": "Кафе и рестораны",
        "tag": '(node["amenity"~"restaurant|cafe"](area.searchArea););',
        "query_text": "ресторан"
    }
}

def clean_phone(phone_str):
    if not phone_str:
        return ""
    digits = re.sub(r"[^\d]", "", phone_str)
    if digits.startswith("8") and len(digits) == 11:
        digits = "7" + digits[1:]
    return digits

def generate_wa_link(phone_digits, company_name):
    if not phone_digits or len(phone_digits) < 10:
        return ""
    pitch = (
        f"Здравствуйте! Подскажите, пожалуйста, с кем можно обсудить вопрос клининга вашего помещения ({company_name})?\n"
        f"Мы специализированная клининговая служба. Сейчас дарим скидку 20% на первую уборку.\n"
        f"Рассчитать точную стоимость за 30 секунд можно на нашем калькуляторе: {CALCULATOR_URL}\n"
        f"Можем приехать на бесплатный тестовый осмотр. Удобно будет?"
    )
    encoded = urllib.parse.quote(pitch)
    return f"https://wa.me/{phone_digits}?text={encoded}"

def search_leads(city="Москва", cat_key="1", limit=30):
    cat_info = CATEGORIES.get(cat_key, CATEGORIES["1"])
    print(f"\n🔍 Поиск объектов: [{cat_info['name']}] в городе [{city}]...")

    # Overpass QL Query
    query = f"""
    [out:json][timeout:25];
    area["name"="{city}"]->.searchArea;
    {cat_info['tag']}
    out center {limit};
    """

    overpass_url = "https://overpass-api.de/api/interpreter?data=" + urllib.parse.quote(query)
    req = urllib.request.Request(overpass_url, headers={
        "User-Agent": "CleaningLeadHunter/2.0 (contact: clean-business@example.com)"
    })

    leads = []
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elements = data.get("elements", [])
            print(f"✓ Найдено объектов через карты: {len(elements)}")

            for el in elements:
                tags = el.get("tags", {})
                name = tags.get("name") or tags.get("brand") or tags.get("operator")
                if not name:
                    continue

                street = tags.get("addr:street", "")
                housenumber = tags.get("addr:housenumber", "")
                address = f"{street} {housenumber}".strip() or tags.get("address", "Адрес на карте")

                raw_phone = tags.get("contact:phone") or tags.get("phone") or tags.get("contact:mobile") or ""
                clean_num = clean_phone(raw_phone)
                website = tags.get("contact:website") or tags.get("website") or tags.get("contact:vk") or ""

                wa_link = generate_wa_link(clean_num, name)

                leads.append({
                    "Название": name,
                    "Категория": cat_info["name"],
                    "Город": city,
                    "Адрес": address,
                    "Телефон": raw_phone or "Уточнить на картах",
                    "WhatsApp_Ссылка": wa_link,
                    "Сайт": website
                })

    except Exception as e:
        print(f"⚠️ Ошибка запроса к API карт: {e}")

    # Ссылки для ручного открытия в Яндекс и 2ГИС
    yandex_url = f"https://yandex.ru/maps/?text={urllib.parse.quote(city + ' ' + cat_info['query_text'])}"
    twogis_url = f"https://2gis.ru/search/{urllib.parse.quote(city + ' ' + cat_info['query_text'])}"

    return leads, yandex_url, twogis_url

def save_to_csv(leads, city, cat_name):
    if not leads:
        print("База пуста, файл не создан.")
        return None

    filename = f"leads_{city}_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)

    fieldnames = ["Название", "Категория", "Город", "Адрес", "Телефон", "WhatsApp_Ссылка", "Сайт"]
    with open(filepath, mode="w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(leads)

    print(f"\n📁 База успешно сохранена в файл: {filename}")
    print(f"Всего клиентов в списке: {len(leads)}")
    return filepath

def main():
    print("=" * 60)
    print(" 🚀 ПОИСК B2B КЛИЕНТОВ ДЛЯ КЛИНИНГА (Яндекс / 2ГИС / Карты)")
    print("=" * 60)

    city = input("Введите город для поиска (Enter для 'Москва'): ").strip() or "Москва"

    print("\nВыберите категорию потенциальных клиентов:")
    for k, v in CATEGORIES.items():
        print(f"  [{k}] {v['name']}")
    choice = input("Ваш выбор (1-4, Enter для 1): ").strip() or "1"

    leads, yandex_url, twogis_url = search_leads(city=city, cat_key=choice, limit=40)

    print("\n" + "-" * 60)
    print("🔗 Ссылки для быстрого открытия в картах вашего города:")
    print(f" • Яндекс Карты: {yandex_url}")
    print(f" • 2ГИС:         {twogis_url}")
    print("-" * 60)

    if leads:
        save_to_csv(leads, city, CATEGORIES.get(choice, {}).get("name", "клиенты"))
        print("\nПервые 5 найденных объектов:")
        for i, lead in enumerate(leads[:5], 1):
            print(f"{i}. {lead['Название']} | {lead['Адрес']} | {lead['Телефон']}")
    else:
        print("Попробуйте открыть ссылки выше на Яндекс Картах и 2ГИС для прямого сбора.")

if __name__ == "__main__":
    main()
