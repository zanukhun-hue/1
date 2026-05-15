# AE Plugins Vault — обновлённая версия

Что добавлено:

- сайт разделён на страницы: `index.html`, `plugins.html`, `plugin.html`, `install.html`, `faq.html`, `stats.html`;
- плагины вынесены в `plugins.js`;
- каталог с поиском, категориями, сортировкой и избранным;
- отдельная страница каждого плагина через `plugin.html?id=...`;
- инструкции установки для `.aex`, `.jsx / .jsxbin`, `.ffx`;
- локальный счётчик посещений в `stats.html`;
- подготовка под публичную статистику через GoatCounter;
- тёмная/светлая тема;
- адаптивное меню.

## Как добавить новый плагин

Открой `plugins.js` и добавь новый объект в массив `window.AE_PLUGINS`.

Минимальный пример:

```js
{
  "id": "new-plugin",
  "name": "New Plugin",
  "description": "Описание плагина",
  "category": "effects",
  "categoryLabel": "Эффекты",
  "package": "aex",
  "minAe": "2022",
  "version": "v1.0",
  "size": "10 MB",
  "status": "available",
  "downloadUrl": "https://drive.google.com/...",
  "badge": "Новый",
  "icon": "fas fa-magic",
  "tags": ["эффекты", "aex"],
  "updated": "16.05.2026",
  "compatibility": "After Effects 2022+"
}
```

Если ссылки пока нет, ставь:

```js
"status": "updating",
"downloadUrl": "#"
```

## Как подключить общий счётчик посещений

Локальный счётчик работает сразу, но он считает только визиты в конкретном браузере.

Для общего счётчика всех людей:

1. Зарегистрируй сайт в GoatCounter.
2. Открой `config.js`.
3. Вставь свой код:

```js
window.AE_SITE_CONFIG = {
  goatCounterCode: "your-code",
  telegramUrl: "https://t.me/ae_plugins_vault"
};
```

Если твой адрес в GoatCounter выглядит так:

```text
your-code.goatcounter.com
```

то в `goatCounterCode` нужно писать только:

```text
your-code
```

## Как залить на GitHub Pages

1. Замени старые файлы сайта на файлы из этого архива.
2. Сделай commit.
3. В GitHub открой Settings → Pages.
4. Выбери ветку и папку, откуда публикуется сайт.
