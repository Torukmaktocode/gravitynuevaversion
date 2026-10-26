import base64
import json
import sys

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInN1YiI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjE2MjY4ODY0NjYsImlhdCI6MTYyNjg4NjQ2Niwicm9sZSI6ImF1dGhlbnRpY2F0ZWQifQ.123456"

try:
    payload_b64 = token.split(".")[1]
    payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
    payload_str = base64.b64decode(payload_b64).decode("utf-8")
    payload = json.loads(payload_str)
    print("SUB:", payload.get("sub"))
except Exception as e:
    print(e)
