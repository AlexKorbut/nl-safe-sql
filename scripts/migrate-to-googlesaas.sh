#!/bin/bash
set -e

# Миграция из nl-safe-sql в GoogleSaas репозиторий
# Использование: ./scripts/migrate-to-googlesaas.sh <github-username>

if [ -z "$1" ]; then
  echo "Usage: ./scripts/migrate-to-googlesaas.sh <github-username>"
  echo "Example: ./scripts/migrate-to-googlesaas.sh alexkorbut"
  exit 1
fi

USERNAME=$1
REPO_URL="https://github.com/$USERNAME/GoogleSaas.git"

echo "🚀 Миграция GoogleReady MVP в репозиторий $REPO_URL"
echo ""

# Шаг 1: Убедиться, что репозиторий создан вручную на GitHub (приватный)
echo "✓ Убедитесь, что репозиторий GoogleSaas создан вручную на GitHub и приватный"
echo "  https://github.com/new?name=GoogleSaas&private=1"
echo ""
read -p "Нажмите Enter когда репозиторий создан..."

# Шаг 2: Переключить remote
echo "📦 Переключаем remote с nl-safe-sql на GoogleSaas..."
git remote set-url origin "$REPO_URL"

# Шаг 3: Push текущей ветки как main
echo "📤 Пушим код в main..."
git branch -m claude/new-repository-setup-rm32jk main
git push -u origin main --force-with-lease

# Шаг 4: Очистить данные
echo "🧹 Очищаем локальные данные..."
rm -rf data/*.db data/*.db-*

# Шаг 5: Git для шага 5
echo ""
echo "✅ Готово! GoogleReady MVP теперь в https://github.com/$USERNAME/GoogleSaas"
echo ""
echo "Следующие шаги:"
echo "  1. cd .. && mkdir googlesaas && cd googlesaas"
echo "  2. git clone $REPO_URL ."
echo "  3. cp .env.example .env && # добавьте PSI_API_KEY и OPENAI_API_KEY"
echo "  4. npm install && npm run db:migrate && npm run dev"
echo ""
echo "Для production развёртывания см. CLAUDE.md раздел 'Развёртывание'"
