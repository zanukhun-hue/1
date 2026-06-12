# Деплой на Render

## Что уже подготовлено

В проект добавлен `render.yaml`. Render сможет взять настройки из него:

- тип сервиса: Web Service;
- runtime: Node;
- build command: `npm install`;
- start command: `npm start`;
- health check path: `/`;
- Node version: 20.

## Как запустить на Render

1. Открой Render Dashboard.
2. Нажми New.
3. Выбери Blueprint или Web Service.
4. Подключи GitHub и выбери репозиторий `zanukhun-hue/1`.
5. Если Render предложит использовать `render.yaml`, соглашайся.
6. Нажми Deploy.

После деплоя Render выдаст адрес вида:

```text
https://ae-vault-ssr.onrender.com
```

Точный адрес будет показан в панели Render.

## Если выбираешь Web Service вручную

Укажи такие параметры:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /
```

Переменные окружения:

```text
NODE_VERSION=20
TELEGRAM_URL=https://t.me/ae_plugins_vault
```

## Важно

GitHub Pages для этой версии не подходит, потому что сайт теперь запускается через Node.js сервер.
