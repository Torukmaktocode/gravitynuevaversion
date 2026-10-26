#!/usr/bin/env python3
"""Parse grupo 1-4.md files and generate seed SQL for INVU POS knowledge_content."""
import os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'seed')
os.makedirs(BASE, exist_ok=True)

FILES = [
    ("grupo-1-invu", "Framework Gravity INVU",
     os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "grupo 1.md")),
    ("grupo-2-invu", "Hunters & Referidos INVU",
     os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "grupo 2.md")),
    ("grupo-3-invu", "Partners INVU",
     os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "grupo 3.md")),
    ("grupo-4-invu", "Hardware INVU",
     os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "grupo 4.md")),
]

def parse_concepts(text: str):
    """Extract concepts from markdown text."""
    concepts = []
    # Split by ## Concepto
    blocks = re.split(r'^## Concepto \d+:', text, flags=re.MULTILINE)
    for block in blocks[1:]:  # skip preamble
        lines = block.strip().split('\n')
        title = lines[0].strip()
        rest = '\n'.join(lines[1:])

        enseñanza = ""
        ejemplo = ""

        # Extract enseñanza
        m = re.search(r'\*\*Enseñanza:\*\*\s*\n?(.*?)(?=\*\*Ejemplo:\*\*|\Z)', rest, re.DOTALL)
        if m:
            enseñanza = m.group(1).strip().replace("'", "''")

        # Extract ejemplo
        m = re.search(r'\*\*Ejemplo:\*\*\s*\n?(.*?)(?=\n## |\Z)', rest, re.DOTALL)
        if m:
            ejemplo = m.group(1).strip().replace("'", "''")

        if enseñanza or title:
            concepts.append({
                "title": title,
                "enseñanza": enseñanza,
                "ejemplo": ejemplo,
            })

    return concepts

COMPANY_SLUG = "invupos"
COMPANY_ID = "ef4e8f32-fa7d-489b-894e-5a39b9ea994c"

out_path = os.path.join(BASE, f"seed_invu_knowledge.sql")
with open(out_path, "w", encoding="utf-8") as f:
    f.write("DO $$\n")
    f.write("DECLARE\n")
    f.write(f"  invu_id uuid := '{COMPANY_ID}'::uuid;\n")
    f.write("BEGIN\n\n")

    total = 0
    for mod_id, mod_title, filepath in FILES:
        if not os.path.exists(filepath):
            print(f"WARNING: {filepath} not found, skipping")
            continue

        with open(filepath, "r", encoding="utf-8") as mf:
            text = mf.read()

        # Remove ```markdown fences if present
        text = re.sub(r'^```markdown\s*', '', text)
        text = re.sub(r'\s*```$', '', text)

        concepts = parse_concepts(text)
        print(f"  {mod_id}: {len(concepts)} concepts")

        for idx, c in enumerate(concepts):
            f.write(
                f"  INSERT INTO public.knowledge_content "
                f"(company_id, module, module_title, concepto, enseñanza, ejemplo, pregunta, opciones, respuesta, orden)\n"
            )
            f.write(
                f"  VALUES (invu_id, '{mod_id}', '{mod_title}', "
                f"'{c['title']}', '{c['enseñanza']}', '{c['ejemplo']}', "
                f"NULL, NULL, NULL, {idx+1});\n"
            )
            total += 1

    f.write(f"\n  RAISE NOTICE 'Inserted % items for invupos', {total};\n")
    f.write("END\n$$;\n")

print(f"\nGenerated: {out_path}")
print(f"Total: {total} items")
