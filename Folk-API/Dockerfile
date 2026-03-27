FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

RUN pip install --no-cache-dir poetry==1.8.3

COPY pyproject.toml README.md /app/
RUN poetry install --no-root --no-ansi

COPY . /app

CMD ["poetry", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]
