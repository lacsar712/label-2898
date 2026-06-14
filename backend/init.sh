#!/bin/bash
set -e

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."
for i in $(seq 1 60); do
    if python -c "import socket,sys; s=socket.socket(); s.settimeout(2); \
sys.exit(0) if s.connect_ex(('${DB_HOST}', ${DB_PORT}))==0 else sys.exit(1)"; then
        echo "Database is up."
        break
    fi
    echo "  not ready yet, retry ${i}/60..."
    sleep 2
done

echo "Applying migrations..."
python manage.py migrate --noinput

echo "Creating superuser if not exists..."
python manage.py shell <<EOF
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', '123456789')
    print("Superuser created.")
else:
    print("Superuser already exists.")
EOF

echo "Starting server..."
python manage.py runserver 0.0.0.0:8000
