#!/usr/bin/env python
import os
import sys
import yaml
import logging.config

def init_logger():
        with open('conf/logger.yaml') as f:
                logger_config = yaml.load(f, Loader=yaml.FullLoader)
        logging.config.dictConfig(logger_config)


if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    # gaochao add begin
    init_logger()
    logger = logging.getLogger('devpos')
    logger.info("This Devpos backend is start")
    # gaochao add end
    execute_from_command_line(sys.argv)
