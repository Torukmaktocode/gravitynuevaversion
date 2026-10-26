import requests

url = "http://127.0.0.1:5001/conocimiento"
params = {"modulo": "las-48-leyes-del-poder"}

print(f"Probando: {url}?modulo={params['modulo']}")
print("=" * 60)

try:
    response = requests.get(url, params=params)
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print("\nRespuesta:")
    import json
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error: {e}")
