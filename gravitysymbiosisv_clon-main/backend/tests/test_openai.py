import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

try:
    response = client.models.list()
    print("✅ OpenAI API key is valid.")
except Exception as e:
    print(f"❌ OpenAI API Error: {e}")
