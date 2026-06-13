#!/bin/bash

echo "Waiting for database..."
# 简单的等待逻辑
sleep 5

echo "Applying migrations..."
python manage.py migrate

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
