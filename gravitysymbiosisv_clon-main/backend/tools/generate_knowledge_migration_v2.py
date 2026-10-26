#!/usr/bin/env python3
"""Generate seed SQL for knowledge_content using jsonb_build_array to avoid JSON escaping issues."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from data.knowledge_data import KNOWLEDGE_BASE_DB

MODULE_TITLES = {
    "el-camino-del-lobo": "El Camino del Lobo",
    "rompe-la-barrera-del-no": "Rompe la Barrera del NO",
    "ventas-spin": "Ventas SPIN",
    "las-48-leyes-del-poder": "48 Leyes del Poder",
}

OUT = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                   "db", "migrations", "20260711_seed_knowledge_falabella.sql")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("DO $$\n")
    f.write("DECLARE\n")
    f.write("  falabella_id uuid;\n")
    f.write("BEGIN\n")
    f.write("  SELECT id INTO falabella_id FROM public.companies WHERE slug = 'falabella';\n")
    f.write("\n")
    f.write("  IF falabella_id IS NULL THEN\n")
    f.write("    RAISE EXCEPTION 'Company falabella not found';\n")
    f.write("  END IF;\n")
    f.write("\n")

    total = 0
    for mod_key, items in KNOWLEDGE_BASE_DB.items():
        if mod_key == "conocimiento-empresa" or not items:
            continue
        title = MODULE_TITLES[mod_key]
        for idx, item in enumerate(items):
            opciones_args = ", ".join(f"'{o.replace(chr(39), chr(39)+chr(39))}'" for o in item["opciones"])
            concepto = item["concepto"].replace("'", "''")
            ensenanza = item["enseñanza"].replace("'", "''")
            ejemplo = item["ejemplo"].replace("'", "''")
            pregunta = item["pregunta"].replace("'", "''")
            respuesta = item["respuesta"].replace("'", "''")

            f.write(
                f"  INSERT INTO public.knowledge_content "
                f"(company_id, module, module_title, concepto, ense\u00f1anza, "
                f"ejemplo, pregunta, opciones, respuesta, orden)\n"
            )
            f.write(
                f"  VALUES (falabella_id, '{mod_key}', '{title}', '{concepto}', '{ensenanza}', "
                f"'{ejemplo}', '{pregunta}', jsonb_build_array({opciones_args}), "
                f"'{respuesta}', {idx+1});\n"
            )
            total += 1

    f.write("\n")
    f.write(f"  RAISE NOTICE 'Inserted % items for falabella', {total};\n")
    f.write("END\n")
    f.write("$$;\n")

print(f"Generated {OUT} with {total} items")
