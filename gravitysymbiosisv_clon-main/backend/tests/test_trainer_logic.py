import requests

__test__ = False  # script manual, no recopilado por pytest

ENDPOINT = "http://127.0.0.1:5001/entrenar"


def test_trainer(text, session_id="test_session"):
    try:
        print(f"--- Testing Input: '{text}' ---")
        response = requests.post(ENDPOINT, data={
            'level': 'Leyenda',
            'mode': 'Roleplay',
            'session_id': session_id,
            'text': text,
        })
        if response.status_code == 200:
            data = response.json()
            print(f"AI Response: {data.get('response_text')}")
            print(f"Audio URL: {data.get('audio_url')}")
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    print("Testing Gravity AI Trainer 2.0 Logic...")
    test_trainer("Hola Gravity, estoy listo para entrenar. ¿Cómo empezamos?")
    test_trainer("/ignite", session_id="test_session")
    test_trainer("El cliente dice que el precio es muy alto.", session_id="test_session")
    test_trainer("/deep-scan", session_id="test_session")
