import os
import urllib.request
import json
import ssl
from dotenv import load_dotenv

load_dotenv()

token = os.environ.get("SUPABASE_MANAGEMENT_TOKEN")
ref = os.environ.get("SUPABASE_PROJECT_REF")

if not token or not ref:
    print("ERROR: Define SUPABASE_MANAGEMENT_TOKEN y SUPABASE_PROJECT_REF en .env")
    exit(1)

url = f"https://api.supabase.com/v1/projects/{ref}/config/auth"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

ctx = ssl.create_default_context()

try:
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.load(response)
        print("CURRENT_CONFIG:", json.dumps(data, indent=2))

        if data.get('disable_signup') is False and data.get('email_confirmations', True):
            print("DETECTED: Email confirmations are ON. Attempting to disable...")
            pass

except Exception as e:
    print("Error:", e)
