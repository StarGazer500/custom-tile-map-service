runserver: 
	@kill -9 $(shell lsof -t -i :8000) || true
	@gunicorn --worker-class uvicorn_worker.UvicornWorker \
	--workers 2 \
	--bind 0.0.0.0:8000 \
	--log-level debug \
	--reload \
	--error-logfile - \
	--access-logfile - \
	tms_service.asgi:application