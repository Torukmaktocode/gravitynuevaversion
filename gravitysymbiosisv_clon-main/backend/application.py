# Wrapper para Elastic Beanstalk - importa la app desde app.py
from app import app as application

if __name__ == "__main__":
    application.run()
