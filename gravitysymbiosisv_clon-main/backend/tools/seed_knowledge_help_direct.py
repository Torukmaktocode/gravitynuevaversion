#!/usr/bin/env python3
"""
Seed knowledge_content for Help.cl company from HELP_PILDORAS_2.0.md
Direct insert via Supabase client. Content-only (no questions/answers).
"""
import sys, os, re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('SUPABASE_URL', 'https://nqaiuixiryqlcszikwgb.supabase.co')
os.environ.setdefault('SUPABASE_KEY', 'sb_publishable_Q0x5iPZEjFtYpKON34Yt1Q_1_r9_stH')

import dotenv; dotenv.load_dotenv()
from supabase import create_client

supabase_url = os.getenv('SUPABASE_URL')
supabase_service_key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(supabase_url, supabase_service_key)

BS = chr(92)

MODULES = {
    1: {'slug': 'evolucion-consultoria-alto-impacto', 'title': 'Evolución hacia la Consultoría de Alto Impacto', 'range': (1, 44)},
    2: {'slug': 'optimizacion-procesos-gestion-riesgos', 'title': 'Optimización de Procesos y Gestión de Riesgos por Segmento', 'range': (45, 88)},
    3: {'slug': 'consolidacion-blindaje-financiero-operativo', 'title': 'Consolidación del Blindaje Financiero y Operativo', 'range': (89, 132)},
    4: {'slug': 'conversion-objeciones-valor-estrategico', 'title': 'Conversión de Objeciones en Valor Estratégico y Protección Patrimonial', 'range': (133, 176)},
    5: {'slug': 'sostenibilidad-integracion-red-ciclo-virtuoso', 'title': 'Sostenibilidad, Integración de Red y Ciclo Virtuoso de Protección', 'range': (177, 220)},
}


def clean_markdown(text):
    """Remove markdown escape chars and clean whitespace."""
    text = text.replace(BS + '*', '*')
    text = text.replace(BS + '[', '[')
    text = text.replace(BS + ']', ']')
    text = text.replace(BS + '.', '.')
    text = text.replace(BS + '+', '+')
    text = text.replace(BS + '$', '$')
    text = text.replace(BS + '#', '#')
    lines = [l.rstrip() for l in text.strip().split('\n')]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return '\n'.join(lines)


def parse_items(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    header_pat = BS*2 + '#' + BS*2 + '#' + BS*2 + r'# (\d+)' + BS*2 + r'\. (.+)'
    items = []
    pos = 0
    while True:
        m = re.search(header_pat, content[pos:])
        if not m:
            break
        num = int(m.group(1))
        title = m.group(2).strip()
        item_start = pos + m.end()

        ens_marker = BS + '*' + BS + '*' + BS + '[' + 'Enseñanza' + BS + ']' + BS + '*' + BS + '*'
        ens_pos = content.find(ens_marker, item_start)
        if ens_pos == -1:
            pos += m.start() + 1; continue
        ens_start = ens_pos + len(ens_marker)
        while ens_start < len(content) and content[ens_start] in (' ', '\r', '\n'):
            ens_start += 1

        ej_marker = BS + '*' + BS + '*' + BS + '[' + 'Ejemplo' + BS + ']' + BS + '*' + BS + '*'
        ej_marker_pos = content.find(ej_marker, ens_start)
        if ej_marker_pos == -1:
            pos += m.start() + 1; continue
        ej_content_start = ej_marker_pos + len(ej_marker)
        while ej_content_start < len(content) and content[ej_content_start] in (' ', '\r', '\n'):
            ej_content_start += 1

        sep_marker = BS + '---'
        ej_end = content.find(sep_marker, ej_content_start)
        if ej_end == -1:
            ej_end = len(content)
            nb = content.find('# Bloque', ej_content_start)
            if nb != -1:
                ej_end = nb

        next_header = re.search(header_pat, content[ej_content_start:])
        if next_header:
            ej_end = min(ej_end, ej_content_start + next_header.start())

        ens_text = clean_markdown(content[ens_start:ej_marker_pos])
        ej_text = clean_markdown(content[ej_content_start:ej_end])

        bloque_num = None
        for bn, bd in MODULES.items():
            if bd['range'][0] <= num <= bd['range'][1]:
                bloque_num = bn; break

        if bloque_num and ens_text and ej_text:
            items.append({'num': num, 'title': title, 'ensenanza': ens_text, 'ejemplo': ej_text, 'bloque': bloque_num})

        pos += m.start() + 1

    return items


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    docs_dir = os.path.join(script_dir, '..', '..', 'docs')
    md_path = os.path.join(docs_dir, 'HELP_PILDORAS_2.0.md')

    if not os.path.exists(md_path):
        print(f"ERROR: {md_path} not found")
        sys.exit(1)

    print(f"Parsing: {md_path}")
    items = parse_items(md_path)
    print(f"Found {len(items)} items")

    # Verify
    for bn in sorted(MODULES.keys()):
        count = sum(1 for i in items if i['bloque'] == bn)
        exp = MODULES[bn]['range'][1] - MODULES[bn]['range'][0] + 1
        print(f"  Bloque {bn}: {count}/{exp} items {'OK' if count == exp else 'MISMATCH'}")

    if not items:
        print("ERROR: No items parsed!"); sys.exit(1)

    # Delete existing Help content
    HELP_ID = 'e3e62cc5-f145-4190-b835-127bcc9c1696'
    result = supabase.table("knowledge_content").delete().eq("company_id", HELP_ID).execute()
    print(f"Cleared existing Help knowledge content")

    # Insert items in batches
    total = 0
    for item in items:
        bloque = MODULES[item['bloque']]
        orden = item['num'] - bloque['range'][0] + 1
        payload = {
            "company_id": HELP_ID,
            "module": bloque['slug'],
            "module_title": bloque['title'],
            "concepto": f"{item['num']}. {item['title']}",
            "enseñanza": item['ensenanza'],
            "ejemplo": item['ejemplo'],
            "pregunta": None,
            "opciones": None,
            "respuesta": None,
            "orden": orden,
        }
        supabase.table("knowledge_content").insert(payload).execute()
        total += 1
        if total % 22 == 0:
            print(f"  Inserted {total}/220 items...")

    print(f"Done! Inserted {total} items for Help (5 modules)")


if __name__ == '__main__':
    main()
