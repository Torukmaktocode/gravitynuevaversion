#!/usr/bin/env python3
"""Reads KNOWLEDGE_BASE_DB and inserts all items into knowledge_content for falabella company."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('SUPABASE_URL', 'https://nqaiuixiryqlcszikwgb.supabase.co')

from supabase import create_client
from data.knowledge_data import KNOWLEDGE_BASE_DB
from core.config import supabase

MODULE_TITLES = {
    "el-camino-del-lobo": "El Camino del Lobo",
    "rompe-la-barrera-del-no": "Rompe la Barrera del NO",
    "ventas-spin": "Ventas SPIN",
    "las-48-leyes-del-poder": "48 Leyes del Poder",
}

# Get falabella company id
result = supabase.table("companies").select("id").eq("slug", "falabella").execute()
if not result.data:
    print("ERROR: Falabella company not found")
    sys.exit(1)
falabella_id = result.data[0]["id"]
print(f"Falabella company ID: {falabella_id}")

# Clear existing data for falabella first
supabase.table("knowledge_content").delete().eq("company_id", falabella_id).execute()
print("Cleared existing falabella knowledge content")

# Insert items
total = 0
for module_key, items in KNOWLEDGE_BASE_DB.items():
    if module_key == "conocimiento-empresa":
        continue
    if not items:
        continue

    title = MODULE_TITLES.get(module_key, module_key)

    for idx, item in enumerate(items):
        payload = {
            "company_id": falabella_id,
            "module": module_key,
            "module_title": title,
            "concepto": item["concepto"],
            "enseñanza": item["enseñanza"],
            "ejemplo": item["ejemplo"],
            "pregunta": item["pregunta"],
            "opciones": item["opciones"],
            "respuesta": item["respuesta"],
            "orden": idx + 1,
        }
        supabase.table("knowledge_content").insert(payload).execute()
        total += 1
        if total % 20 == 0:
            print(f"  Inserted {total} items...")

print(f"Done! Inserted {total} items for falabella.")
