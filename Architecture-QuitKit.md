# Архитектура — «QuitKit»

**Версия:** 1.0
**Дата:** 29.05.2026
**Связанный документ:** PRD-QuitKit.md (v1.1)

---

## 1. Общая картина

Монолитное приложение в одном Docker-контейнере: Node.js (Fastify) отдаёт REST API **и** раздаёт собранный React-фронт как статику. SQLite-файл и видео лежат на смонтированных томах (volume). Снаружи — Nginx Proxy Manager даёт HTTPS и проксирует на контейнер. CI/CD: GitHub Actions собирает образ → пушит в GHCR → дёргает webhook на сервере → сервер делает `pull && up -d`.

```
                  Internet
                     │  HTTPS (quit.mindhackerdev.ru)
                     ▼
        ┌─────────────────────────┐
        │  Nginx Proxy Manager     │  (SSL, reverse proxy)
        └────────────┬────────────┘
                     │ http://quitkit:3000
                     ▼
        ┌─────────────────────────┐
        │  Контейнер quitkit       │
        │  ┌───────────────────┐   │
        │  │ Fastify (Node)    │   │
        │  │  • REST API /api  │   │
        │  │  • статика (SPA)  │   │
        │  │  • cron push (v1.1)│  │
        │  └───────────────────┘   │
        └───┬──────────────┬───────┘
            │ volume       │ volume
            ▼              ▼
     /data/quitkit.db   /media/video.mp4
```

Почему монолит: одно приложение для одного пользователя. Разделять на фронт/бэкенд-контейнеры, поднимать отдельную БД, добавлять API-gateway — это сложность без выгоды. Один образ проще собирать, деплоить и понимать.

## 2. Технологический стек

| Слой | Технология | Обоснование |
|------|-----------|-------------|
| Frontend | React + Vite + TypeScript | Быстрая сборка, привычно |
| Стили | Tailwind CSS | Mobile-first, без лишнего CSS |
| Графики | Recharts | Простые декларативные графики |
| Роутинг | React Router | 4 экрана |
| PWA | vite-plugin-pwa (Workbox) | Manifest + Service Worker из коробки |
| Backend | Node.js + Fastify | Лёгкий, быстрый, меньше церемоний чем Express |
| БД-драйвер | better-sqlite3 | Синхронный, простой, без пулов и async-обёрток |
| Миграции | свои SQL-файлы + версия в БД | Без тяжёлых ORM |
| Планировщик (v1.1) | node-cron | Внутрипроцессный cron для push |
| Push (v1.1) | web-push (VAPID) | Стандарт Web Push |
| Контейнер | Docker (multi-stage) | Сборка фронта → лёгкий runtime-образ |
| Registry | GHCR | Бесплатно, встроено в GitHub |
| CI/CD | GitHub Actions | По выбору |
| Reverse proxy | Nginx Proxy Manager | Уже развёрнут |
| Оркестрация | Docker Compose + Dockge | Как остальные сервисы в /opt/stacks |

ORM сознательно не берём: схема маленькая, better-sqlite3 + чистый SQL прозрачнее и легче в отладке.

## 3. Структура проекта

```
quitkit/
├── client/                  # React-фронт
│   ├── src/
│   │   ├── pages/           # Today, Progress, Video, Settings
│   │   ├── components/      # DoseTimer, SmokeButton, StreakCounter, QuoteCard...
│   │   ├── lib/             # api-клиент, расчёты на клиенте
│   │   └── main.tsx
│   ├── public/              # иконки PWA, manifest
│   └── vite.config.ts
├── server/                  # Fastify-бэкенд
│   ├── src/
│   │   ├── routes/          # course, doses, smoke, quotes, push
│   │   ├── db/              # connection, migrations, queries
│   │   ├── services/        # schedule-generator, streak-calc, push-scheduler
│   │   └── index.ts
│   └── migrations/          # 001_init.sql, ...
├── Dockerfile               # multi-stage: build client → build server → runtime
├── docker-compose.yml       # для сервера (Dockge)
├── .github/workflows/
│   └── deploy.yml           # CI/CD
└── package.json             # workspaces: client + server
```

Монорепо через npm workspaces: один `npm install`, общие типы между фронтом и бэком (например, тип `Phase`, форма ответа API).

## 4. Модель данных (SQLite DDL)

```sql
-- migrations/001_init.sql

CREATE TABLE course (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date      TEXT NOT NULL,          -- ISO8601
  first_dose_time TEXT NOT NULL,          -- 'HH:MM' локальное время первого приёма
  status          TEXT NOT NULL DEFAULT 'active'  -- active | done | aborted
                  CHECK (status IN ('active','done','aborted')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE dose_schedule (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id        INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  day_number       INTEGER NOT NULL,      -- 1..25
  phase            INTEGER NOT NULL,      -- 1..5
  planned_time     TEXT NOT NULL,         -- ISO8601 плановое время приёма
  interval_minutes INTEGER NOT NULL
);
CREATE INDEX idx_schedule_course ON dose_schedule(course_id, planned_time);

CREATE TABLE dose_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES dose_schedule(id) ON DELETE CASCADE,
  taken_at    TEXT NOT NULL DEFAULT (datetime('now')),
  status      TEXT NOT NULL DEFAULT 'taken'  -- taken | skipped | late
              CHECK (status IN ('taken','skipped','late'))
);
CREATE UNIQUE INDEX idx_doselog_schedule ON dose_log(schedule_id);

CREATE TABLE smoke_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  logged_at  TEXT NOT NULL DEFAULT (datetime('now')),
  note       TEXT
);

CREATE TABLE settings (
  id                INTEGER PRIMARY KEY CHECK (id = 1),  -- единственная строка
  pack_price        REAL,
  reminders_enabled INTEGER NOT NULL DEFAULT 0
);
INSERT INTO settings (id, reminders_enabled) VALUES (1, 0);

CREATE TABLE quote (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  text   TEXT NOT NULL,
  author TEXT
);

-- v1.1
CREATE TABLE push_subscription (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh   TEXT NOT NULL,
  auth     TEXT NOT NULL
);

CREATE TABLE schema_version (version INTEGER NOT NULL);
INSERT INTO schema_version (version) VALUES (1);
```

Заметки:
- Время храним строками ISO8601 — в SQLite нет типа даты, строки сортируются корректно.
- `dose_log` имеет UNIQUE по `schedule_id`: один приём логируется один раз. «Отмена приёма» = удаление строки.
- `settings` — одна строка с `CHECK (id = 1)`: классический приём для key-value-конфига в одну запись.

## 5. Генерация расписания

Сервис `schedule-generator` при создании курса:

1. Берёт `start_date` (день 1) и `first_dose_time`.
2. Для каждого дня 1..25 определяет фазу и интервал по таблице:

```ts
const PHASES = [
  { phase: 1, days: [1, 3],   intervalMin: 120, dosesPerDay: 6 },
  { phase: 2, days: [4, 12],  intervalMin: 150, dosesPerDay: 5 },
  { phase: 3, days: [13, 16], intervalMin: 180, dosesPerDay: 4 },
  { phase: 4, days: [17, 20], intervalMin: 300, dosesPerDay: 3 },
  { phase: 5, days: [21, 25], intervalMin: 0,   dosesPerDay: 2 }, // ручной режим
];
```

3. Время N-го приёма дня = `день в 00:00 + first_dose_time + intervalMin * N`, пока не набрано `dosesPerDay`.
4. Фаза 5 (дни 21–25): фиксированный интервал не задаётся (1–2 таблетки в день) — генерируем 2 слота с большим разносом (например, утро/вечер), пользователь принимает по самочувствию. В UI помечаем как гибкие.
5. Все слоты пишем в `dose_schedule` одной транзакцией.

**Статусы приёмов:** при запросе расписания на сегодня сервер вычисляет статус каждого слота на лету:
- есть запись в `dose_log` → `taken`;
- нет записи и `planned_time` в прошлом более чем на X минут → `skipped`/`late`;
- иначе → `pending`.

## 6. Расчёт «дней без сигарет» и серий

Сервис `streak-calc`:
- **Текущая серия** = время от последнего `smoke_log.logged_at` (или от `course.start_date`, если срывов не было) до сейчас.
- **Рекорд** = максимальный интервал между соседними срывами (включая отрезок старт→первый срыв и последний срыв→сейчас).
- Всё считается из `smoke_log` — отдельных счётчиков не храним, чтобы не было рассинхрона.

## 7. API (REST)

Базовый префикс `/api`. JSON. Без авторизации (один пользователь, защита на уровне сети/NPM при желании).

| Метод | Путь | Назначение |
|-------|------|-----------|
| `GET` | `/api/state` | Единый снимок: курс, расписание на сегодня, текущая серия, рекорд, цитата дня. Главный экран дёргает только его. |
| `POST` | `/api/course` | Создать/перезапустить курс (start_date, first_dose_time) → генерит расписание |
| `POST` | `/api/course/abort` | Прервать курс (status=aborted) |
| `GET` | `/api/schedule?day=N` | Расписание конкретного дня |
| `POST` | `/api/doses/:scheduleId/take` | Отметить приём |
| `DELETE` | `/api/doses/:scheduleId/take` | Отменить отметку |
| `POST` | `/api/smoke` | Залогировать срыв |
| `GET` | `/api/smoke` | История срывов |
| `GET` | `/api/progress` | Данные для графиков (адхеренс по дням, срывы, сэкономлено) |
| `GET` | `/api/quote/today` | Цитата дня |
| `POST` | `/api/push/subscribe` | (v1.1) Сохранить push-подписку |
| `GET` | `/api/health` | Healthcheck для Docker |

Принцип «один запрос для главного экрана» (`/api/state`) — чтобы UI был отзывчивым и не делал 5 запросов на старте.

## 8. Frontend

- **PWA:** `vite-plugin-pwa` генерирует manifest и service worker. `display: standalone`, иконки, тема. Для установки на iPhone — «Поделиться → На экран Домой».
- **Цитата дня:** детерминированный выбор по дате — `index = daysSinceEpoch % quotesCount`. Одна и та же весь день, меняется назавтра. Без запросов к внешним сервисам.
- **Таймер:** обратный отсчёт до ближайшего `pending`-слота, обновляется локально каждую секунду; данные синхронизируются с `/api/state` при фокусе вкладки.
- **Видео:** `<video>` тянет файл с `/media/video.mp4` (отдаётся бэкендом с тома). Перехват при «🚬 Закурил» — модалка с видео.
- **Офлайн:** service worker кэширует оболочку приложения (app shell); данные требуют сети (для одного домашнего пользователя это приемлемо).

## 9. Уведомления

**MVP:** уведомления в активной сессии. Когда вкладка открыта и подошло время приёма — `Notification` API + звук/вибро. Работает, пока PWA открыта.

**v1.1 — настоящий Web Push:**
- Клиент запрашивает разрешение, подписывается через `pushManager.subscribe` с VAPID public key, шлёт подписку на `/api/push/subscribe`.
- Сервер хранит подписки, `node-cron` раз в минуту проверяет, у кого подошёл `pending`-слот, и шлёт push через `web-push`.
- Требования iOS: 16.4+, приложение на экране «Домой», HTTPS (есть через NPM).
- VAPID-ключи генерируются один раз, приватный — в env-переменной контейнера.

## 10. Docker

**Dockerfile (multi-stage):**

```dockerfile
# --- build client ---
FROM node:22-alpine AS client
WORKDIR /app
COPY package*.json ./
COPY client ./client
RUN npm ci && npm run build --workspace=client

# --- build server ---
FROM node:22-alpine AS server
WORKDIR /app
COPY package*.json ./
COPY server ./server
RUN npm ci --workspace=server && npm run build --workspace=server

# --- runtime ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=server  /app/server/dist        ./dist
COPY --from=server  /app/server/node_modules ./node_modules
COPY --from=server  /app/server/migrations   ./migrations
COPY --from=client  /app/client/dist         ./public
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "dist/index.js"]
```

better-sqlite3 содержит нативный модуль — собираем на той же `node:22-alpine`, что и runtime, чтобы ABI совпадал. Если возникнут проблемы со сборкой нативного модуля на alpine, запасной вариант — `node:22-slim` (debian).

**docker-compose.yml (на сервере, в /opt/stacks/quitkit/):**

```yaml
services:
  quitkit:
    image: ghcr.io/<user>/quitkit:latest
    container_name: quitkit
    restart: unless-stopped
    environment:
      - TZ=Asia/Yekaterinburg
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
    volumes:
      - ./data:/app/data       # SQLite-файл
      - ./media:/app/media     # видеопослание
    networks:
      - npm_network            # общая сеть с Nginx Proxy Manager
networks:
  npm_network:
    external: true
```

NPM проксирует `quit.mindhackerdev.ru` → `http://quitkit:3000` по имени контейнера в общей docker-сети.

## 11. CI/CD (GitHub Actions → GHCR → webhook)

**Поток:**

```
git push (main)
   │
   ▼
GitHub Actions: lint → build → docker build → push в GHCR
   │
   ▼
Actions дёргает webhook на сервере (HMAC-подпись)
   │
   ▼
Сервер: docker compose pull && docker compose up -d
```

**.github/workflows/deploy.yml (скелет):**

```yaml
name: deploy
on:
  push:
    branches: [main]
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
      - name: Trigger deploy webhook
        run: |
          curl -fsS -X POST "${{ secrets.DEPLOY_WEBHOOK_URL }}" \
            -H "X-Hub-Signature-256: sha256=$(echo -n deploy | openssl dgst -sha256 -hmac '${{ secrets.DEPLOY_SECRET }}' | awk '{print $2}')"
```

**Приёмник вебхука на сервере:** маленький контейнер с `webhook` (adnanh/webhook) или 30-строчный Fastify-сервис. Проверяет HMAC-подпись по `DEPLOY_SECRET`, при успехе выполняет:

```bash
cd /opt/stacks/quitkit && docker compose pull && docker compose up -d
```

Эндпоинт вебхука тоже за NPM (отдельный поддомен или путь), доступен только с валидной подписью.

**Безопасность:**
- GHCR-образ приватный; на сервере `docker login ghcr.io` с PAT (read:packages) один раз.
- Вебхук защищён HMAC-секретом — дёрнуть деплой может только GitHub Actions.
- SSH наружу не открываем, self-hosted runner не нужен.

## 12. Конфигурация (env)

| Переменная | Где | Назначение |
|-----------|-----|-----------|
| `TZ` | контейнер | Asia/Yekaterinburg — корректное локальное время приёмов |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | контейнер | Web Push (v1.1) |
| `DEPLOY_SECRET` | сервер + GH secrets | HMAC вебхука |
| `DEPLOY_WEBHOOK_URL` | GH secrets | URL приёмника |

## 13. Бэкап

Экспорт не требуется (по решению в PRD). Данные в `./data/quitkit.db` на томе переживают пересоздание контейнера. При желании — периодическая копия файла внешним cron сервера, вне scope приложения.

## 14. Порядок реализации

1. Скелет монорепо (workspaces), Fastify + раздача статики + `/api/health`.
2. БД: миграции, `001_init.sql`, наполнение `quote`.
3. Генератор расписания + создание курса + `/api/state`.
4. Отметка приёмов, расчёт серий, лог срывов.
5. Frontend: экран «Сегодня» (таймер, «Принял», счётчик, «Закурил», цитата).
6. Экран «Прогресс» (календарь + графики).
7. Видео + перехват при срыве.
8. PWA-обвязка (manifest, service worker), проверка установки на iPhone.
9. Dockerfile + compose + подключение к NPM, первый ручной деплой.
10. GitHub Actions + вебхук-приёмник, проверка авто-деплоя.
11. (v1.1) Web Push: VAPID, подписка, cron-рассылка.
