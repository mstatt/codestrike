import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

# Create logs directory if it doesn't exist
if not os.path.exists('logs'):
    os.makedirs('logs')

# Configure Python error logger
python_logger = logging.getLogger('python_errors')
python_logger.setLevel(logging.ERROR)
python_handler = RotatingFileHandler(
    'logs/python_errors.log',
    maxBytes=1024 * 1024,  # 1MB
    backupCount=3
)
python_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(levelname)s - %(message)s'
))
python_logger.addHandler(python_handler)

# Configure JavaScript error logger
js_logger = logging.getLogger('javascript_errors')
js_logger.setLevel(logging.ERROR)
js_handler = RotatingFileHandler(
    'logs/javascript_errors.log',
    maxBytes=1024 * 1024,  # 1MB
    backupCount=3
)
js_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(levelname)s - %(message)s'
))
js_logger.addHandler(js_handler)

def log_python_error(error, additional_info=None):
    """Log Python errors with optional additional information"""
    error_msg = f"{str(error)}"
    if additional_info:
        error_msg += f" | Additional Info: {additional_info}"
    python_logger.error(error_msg)

def log_js_error(error_data):
    """Log JavaScript errors"""
    js_logger.error(f"JavaScript Error: {error_data}")

def get_recent_logs(log_type, lines=100):
    """Get recent logs from the specified log file"""
    try:
        log_file = f'logs/{log_type}_errors.log'
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = f.readlines()[-lines:]
                return [log.strip() for log in logs]
        return []
    except Exception as e:
        python_logger.error(f"Error reading logs: {str(e)}")
        return []
