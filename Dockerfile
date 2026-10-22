FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 ESTADO_DIR=/estado
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py testes.py ./
COPY dados ./dados
ENTRYPOINT ["python", "app.py"]
CMD ["demo"]
