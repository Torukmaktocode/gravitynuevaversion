import httpx
import json

url = "http://127.0.0.1:5000/generar_plan"
payload = {
    "vendedor_info": {
        "q1_sales_level": "Vendedor activo",
        "q2_experience_years": "1-3",
        "q4_lost_stage": "Objeciones",
        "q6_objection_comfort": "Cómodo",
        "q9_training_time": "20 minutos",
        "q8_main_block": "Miedo al precio"
    }
}

try:
    with httpx.Client() as client:
        response = client.post(url, json=payload, timeout=30.0)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
