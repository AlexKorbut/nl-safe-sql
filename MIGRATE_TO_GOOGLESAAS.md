# Миграция GoogleReady в репозиторий GoogleSaas

Код полностью готов на ветке `claude/new-repository-setup-rm32jk` в репозитории `nl-safe-sql`. Выполни эти шаги, чтобы переместить его в отдельный приватный репозиторий `GoogleSaas`.

## Шаг 1: Создай приватный репозиторий на GitHub

Перейди на https://github.com/new и создай:
- **Repository name**: `GoogleSaas`
- **Description**: Google Search & Ads readiness auditor
- **Private**: ✓ (обязательно приватный)
- **Initialize this repository with**: ничего не выбирай (будет пусто)

Нажми **Create repository**.

## Шаг 2: Клонируй готовый код

```bash
# Клонируй репозиторий nl-safe-sql с готовой веткой
git clone -b claude/new-repository-setup-rm32jk https://github.com/AlexKorbut/nl-safe-sql.git GoogleSaas
cd GoogleSaas
```

## Шаг 3: Переключи remote на новый репозиторий

```bash
# Замени USERNAME на твой GitHub username
git remote set-url origin https://github.com/USERNAME/GoogleSaas.git

# Переименуй ветку в main
git branch -m claude/new-repository-setup-rm32jk main

# Пуши код как main
git push -u origin main --force-with-lease
```

## Шаг 4: Настрой локальное окружение

```bash
# Создай .env файл
cp .env.example .env

# Добавь необходимые ключи в .env:
# - PSI_API_KEY (free, от https://developers.google.com/speed/docs/insights/v5/get-started)
# - OPENAI_API_KEY (опционально, для LLM-проверок)

nano .env   # или твой редактор

# Установи зависимости и создай БД
npm install
npm run db:migrate

# Запусти локально для тестирования
npm run dev
# Откройся на http://localhost:3000
```

## Шаг 5 (опционально): Развёрнуть на VPS

Выбери один из вариантов:

### Вариант A: Docker Compose (рекомендуется)

```bash
# На VPS:
git clone https://github.com/USERNAME/GoogleSaas.git /opt/google-saas
cd /opt/google-saas

# Создай .env
cp .env.example .env
nano .env    # добавь ключи

# Запусти через Docker
docker-compose up -d

# Сайт доступен на http://localhost:3000 (или домен если настроил Caddy)
```

### Вариант B: Системный сервис Linux (systemd)

```bash
# На VPS с Node.js 22+:
git clone https://github.com/USERNAME/GoogleSaas.git /opt/google-saas
cd /opt/google-saas

# Создай .env production
cp .env.example .env
nano .env

# Установи и собери
npm install
npm run build

# Скопируй systemd сервис
sudo cp google-saas.service /etc/systemd/system/

# Создай data directory
sudo mkdir -p /var/lib/google-saas
sudo chown www-data:www-data /var/lib/google-saas

# Запусти сервис
sudo systemctl daemon-reload
sudo systemctl enable google-saas
sudo systemctl start google-saas

# Проверь статус
sudo systemctl status google-saas

# Настрой Caddy для reverse proxy и HTTPS:
sudo nano /etc/caddy/Caddyfile
# Скопируй содержимое из файла Caddyfile (замени {$DOMAIN} на твой домен)
sudo systemctl restart caddy
```

## Готово! ✨

Сайт работает и готов к тестированию. Дальше:

1. **Волна 2** (через 4–5 недель): Auth (magic link), Stripe, мониторинг аудитов
2. **Волна 3**: Глубокий кроулинг, API для агентств, Search Console integration
3. **Волна 4**: Командные аккаунты, партнёрская программа

Все детали в **CLAUDE.md** и в этом репозитории.

## Troubleshooting

**PageSpeed Insights возвращает 403 / 429?**
- Проверь, что PSI_API_KEY задана в .env
- Помни про rate limit: 25k запросов/день, 1 аудит = 2 запроса (mobile + desktop)

**OpenAI возвращает 401?**
- Убедись, что OPENAI_API_KEY правильный
- LLM-проверки опциональны: без ключа работают как `na`

**Сайт не доступен на домене?**
- Проверь, что DNS указывает на IP сервера (A record)
- Убедись, что Caddy запущен: `sudo systemctl status caddy`
- Проверь логи: `sudo journalctl -u caddy -n 50`

**SQLite: Cannot open database?**
- Убедись, что папка `/var/lib/google-saas` существует и доступна пользователю www-data
- На локальной машине достаточно создать `data/` папку

## Помощь

Все вопросы в **CLAUDE.md** (раздел "FAQ для разработчиков") и в коде (comments есть где надо).
