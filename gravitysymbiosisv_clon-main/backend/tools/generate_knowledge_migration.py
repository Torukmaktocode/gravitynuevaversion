# Generates SQL migration to copy KNOWLEDGE_BASE_DB data into knowledge_content table for falabella company.
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from data.knowledge_data import KNOWLEDGE_BASE_DB

MODULE_TITLES = {
    "el-camino-del-lobo": "El Camino del Lobo",
    "rompe-la-barrera-del-no": "Rompe la Barrera del NO",
    "ventas-spin": "Ventas SPIN",
    "las-48-leyes-del-poder": "48 Leyes del Poder",
}

lines = [
    "-- =============================================================================",
    "-- MIGRATION: Seed knowledge_content with falabella data from KNOWLEDGE_BASE_DB",
    "-- =============================================================================",
    "-- Generated automatically from backend/data/knowledge_data.py",
    "-- Ejecutar en: Supabase SQL Editor (después de knowledge_content table)",
    "-- =============================================================================",
    "",
    "BEGIN;",
    "",
    "DO $$",
    "DECLARE",
    "  falabella_id uuid;",
    "BEGIN",
    "  SELECT id INTO falabella_id FROM public.companies WHERE slug = 'falabella';",
    "",
    "  IF falabella_id IS NULL THEN",
    "    RAISE EXCEPTION 'Company falabella not found. Run company migration first.';",
    "  END IF;",
    "",
]

for module_key, items in KNOWLEDGE_BASE_DB.items():
    if module_key == "conocimiento-empresa":
        continue  # skip empty placeholder
    if not items:
        continue

    title = MODULE_TITLES.get(module_key, module_key)
    module_title_escaped = title.replace("'", "''")

    for idx, item in enumerate(items):
        concepto = item.get("concepto", "").replace("'", "''")
        enseñanza = item.get("enseñanza", "").replace("'", "''")
        ejemplo = item.get("ejemplo", "").replace("'", "''")
        pregunta = item.get("pregunta", "").replace("'", "''")
        respuesta = item.get("respuesta", "").replace("'", "''")
        opciones = item.get("opciones", [])

        import json
        opciones_json = json.dumps(opciones)

        lines.append(f"""
  INSERT INTO public.knowledge_content (company_id, module, module_title, concepto, enseñanza, ejemplo, pregunta, opciones, respuesta, orden)
  VALUES (falabella_id, '{module_key}', '{module_title_escaped}', '{concepto}', '{enseñanza}', '{ejemplo}', '{pregunta}', '{opciones_json}'::jsonb, '{respuesta}', {idx + 1});""")

lines.append("""
END;
$$;

COMMIT;
""")

output = "\n".join(lines)

out_path = os.path.join(os.path.dirname(__file__), '..', 'db', 'migrations', '20260711_seed_knowledge_falabella.sql')
with open(out_path, 'w') as f:
    f.write(output)

print(f"Generated: {out_path}")
print(f"Total items: {sum(len(v) for k, v in KNOWLEDGE_BASE_DB.items() if k != 'conocimiento-empresa')}")
