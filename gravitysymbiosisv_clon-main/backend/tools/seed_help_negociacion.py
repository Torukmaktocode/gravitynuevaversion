#!/usr/bin/env python3
"""Copy 4 Falabella modules to Help company as content-only."""
import sys, os, re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('SUPABASE_URL', 'https://nqaiuixiryqlcszikwgb.supabase.co')
import dotenv; dotenv.load_dotenv()
from supabase import create_client

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))
BS = chr(92)

MODULES = {
    'el-camino-del-lobo':         {'header': 'El Camino del Lobo',      'prefix': 'Concepto', 'total': 40, 'format': 'standard'},
    'rompe-la-barrera-del-no':    {'header': 'Rompe la Barrera del No', 'prefix': 'Concepto', 'total': 40, 'format': 'standard'},
    'ventas-spin':                {'header': 'SPIN Selling',             'prefix': 'Concepto', 'total': 40, 'format': 'spin'},
    'las-48-leyes-del-poder':     {'header': 'Las 48 Leyes del Poder',  'prefix': 'Ley',      'total': 48, 'format': 'standard'},
}

MODULE_TITLES = {
    'el-camino-del-lobo': 'El Camino del Lobo',
    'rompe-la-barrera-del-no': 'Rompe la Barrera del NO',
    'ventas-spin': 'Ventas SPIN',
    'las-48-leyes-del-poder': '48 Leyes del Poder',
}


def clean_text(text):
    text = text.replace(BS + '*', '*')
    text = text.replace(BS + '[', '[')
    text = text.replace(BS + ']', ']')
    text = text.replace(BS + '#', '#')
    text = text.replace(BS + '.', '.')
    text = text.replace(BS + '+', '+')
    text = text.replace(BS + '$', '$')
    text = text.replace(BS + '>', '>')
    text = re.sub(r'\n{3,}', '\n\n', text)
    lines = [l.rstrip() for l in text.strip().split('\n')]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return '\n'.join(lines)


def parse_spin(section, header_pat):
    quiz_4 = BS + '#' + BS + '#' + BS + '#' + BS + '#'
    sep = BS + '---'
    items = []
    for m in re.finditer(header_pat, section):
        num = int(m.group(1))
        title = m.group(2).strip()
        p = m.end()
        while p < len(section) and section[p] in ' \r\n':
            p += 1
        ens_start = p
        ej_hdr = section.find(quiz_4, ens_start)
        if ej_hdr == -1: continue
        sep1 = section.find(sep, ens_start)
        if sep1 == -1 or sep1 >= ej_hdr: continue
        ens_end = sep1
        sep2 = section.find(sep, ej_hdr + 4)
        if sep2 == -1: continue
        ej_line_end = section.find('\n', ej_hdr)
        if ej_line_end == -1: continue
        ej_start = ej_line_end + 1
        ej_end = sep2
        quiz_pos = section.find(quiz_4, sep2 + 4)
        if quiz_pos == -1: continue
        ens_text = clean_text(section[ens_start:ens_end])
        ej_text = clean_text(section[ej_start:ej_end])
        if ens_text and ej_text:
            items.append({'num': num, 'concepto': title, 'ensenanza': ens_text, 'ejemplo': ej_text})
    return items


def parse_standard(section, header_pat):
    ens_marker = BS + '*' + BS + '*' + 'Ense' + chr(0xf1) + 'anza:' + BS + '*' + BS + '*'
    ej_marker = BS + '*' + BS + '*' + 'Ejemplo:' + BS + '*' + BS + '*'
    quiz_4 = BS + '#' + BS + '#' + BS + '#' + BS + '#'
    items = []
    for m in re.finditer(header_pat, section):
        num = int(m.group(1))
        title = m.group(2).strip()
        p = m.end()
        ens_pos = section.find(ens_marker, p)
        if ens_pos == -1: continue
        ens_start = ens_pos + len(ens_marker)
        while ens_start < len(section) and section[ens_start] in ' \r\n':
            ens_start += 1
        ej_pos = section.find(ej_marker, ens_start)
        if ej_pos == -1: continue
        ens_end = ej_pos
        ej_start = ej_pos + len(ej_marker)
        while ej_start < len(section) and section[ej_start] in ' \r\n':
            ej_start += 1
        quiz_pos = section.find(quiz_4, ej_start)
        if quiz_pos == -1: continue
        ej_end = quiz_pos
        ens_text = clean_text(section[ens_start:ens_end])
        ej_text = clean_text(section[ej_start:ej_end])
        if ens_text and ej_text:
            items.append({'num': num, 'concepto': title, 'ensenanza': ens_text, 'ejemplo': ej_text})
    return items


def main():
    docs_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'docs')
    md_path = os.path.join(docs_dir, 'MARKDOWN CONOCIMIENTO NEGOCIACION.md')
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    HELP_ID = 'e3e62cc5-f145-4190-b835-127bcc9c1696'

    for slug, config in MODULES.items():
        section_start = content.find(config['header'])
        if section_start == -1:
            print(f"ERROR: {slug} header not found"); continue

        next_section = len(content)
        for other_slug, other_cfg in MODULES.items():
            if other_slug == slug: continue
            pos = content.find(other_cfg['header'], section_start + len(config['header']))
            if pos != -1 and pos < next_section:
                next_section = pos

        section = content[section_start:next_section]
        header_pat = BS*2 + '#' + BS*2 + r'# ' + config['prefix'] + r' (\d+): (.+)'

        items = parse_spin(section, header_pat) if config['format'] == 'spin' else parse_standard(section, header_pat)

        print(f"\n{slug}: {len(items)}/{config['total']} items")

        inserted = 0
        for item in items:
            payload = {
                "company_id": HELP_ID,
                "module": slug,
                "module_title": MODULE_TITLES[slug],
                "concepto": f"{item['num']}. {item['concepto']}",
                "enseñanza": item['ensenanza'],
                "ejemplo": item['ejemplo'],
                "pregunta": None, "opciones": None, "respuesta": None,
                "orden": item['num'],
            }
            supabase.table("knowledge_content").insert(payload).execute()
            inserted += 1
        print(f"  Inserted: {inserted}")

    print("\nDone!")


if __name__ == '__main__':
    main()
