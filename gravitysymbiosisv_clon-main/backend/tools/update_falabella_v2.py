#!/usr/bin/env python3
"""Update Falabella modules: el-camino-del-lobo, ventas-spin, las-48-leyes-del-poder"""
import sys, os, re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('SUPABASE_URL', 'https://nqaiuixiryqlcszikwgb.supabase.co')
import dotenv; dotenv.load_dotenv()
from supabase import create_client

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))
BS = chr(92)

MODULES = {
    'ventas-spin': {'header': 'SPIN Selling', 'prefix': 'Concepto', 'total': 40, 'format': 'spin'},
    'las-48-leyes-del-poder': {'header': 'Las 48 Leyes del Poder', 'prefix': 'Ley', 'total': 48, 'format': 'standard'},
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
    """Parse SPIN format: blockquote ensenanza, #### EJEMPLO, #### DESAFIO."""
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
        
        # Find first #### (EJEMPLO PRACTICO)
        ej_hdr = section.find(quiz_4, ens_start)
        if ej_hdr == -1:
            continue
        
        # Find first --- (ends ensenanza)
        sep1 = section.find(sep, ens_start)
        if sep1 == -1 or sep1 >= ej_hdr:
            continue
        ens_end = sep1
        
        # Find second --- (after ejemplo, before quiz)
        sep2 = section.find(sep, ej_hdr + 4)
        if sep2 == -1:
            continue
        
        # Ejemplo text starts after the EJEMPLO header line
        ej_line_end = section.find('\n', ej_hdr)
        if ej_line_end == -1:
            continue
        ej_start = ej_line_end + 1
        ej_end = sep2
        
        # Quiz is after sep2
        quiz_pos = section.find(quiz_4, sep2 + 4)
        if quiz_pos == -1:
            continue
        
        # Extract pregunta
        ql_end = section.find('\n', quiz_pos)
        if ql_end == -1:
            continue
        qp = ql_end + 1
        while qp < len(section) and section[qp] in '\n\r':
            qp += 1
        pregunta_start = qp
        pregunta_end = section.find('\n', pregunta_start)
        if pregunta_end == -1:
            continue
        
        # Check multi-line pregunta
        nl = pregunta_end + 1
        if nl < len(section) and not section[nl:nl+2].startswith('- ') and not section[nl:nl+2].startswith(BS + '-'):
            pregunta_end = section.find('\n', nl)
            if pregunta_end == -1:
                continue
        
        pregunta_text = section[pregunta_start:pregunta_end].strip()
        
        # Parse options
        opts_start = pregunta_end + 1
        options, correct = parse_options(section, opts_start, header_pat)
        
        ens_text = clean_text(section[ens_start:ens_end])
        ej_text = clean_text(section[ej_start:ej_end])
        pq_clean = clean_text(pregunta_text)
        
        if ens_text and ej_text and pq_clean and options:
            items.append({
                'num': num, 'concepto': title,
                'ensenanza': ens_text, 'ejemplo': ej_text,
                'pregunta': pq_clean, 'opciones': options, 'respuesta': correct,
            })
    
    return items


def parse_standard(section, header_pat):
    """Parse standard format: **Ensenanza:**, **Ejemplo:**, #### DESAFIO TACTICO."""
    ens_marker = BS + '*' + BS + '*' + 'Ense' + chr(0xf1) + 'anza:' + BS + '*' + BS + '*'
    ej_marker = BS + '*' + BS + '*' + 'Ejemplo:' + BS + '*' + BS + '*'
    quiz_4 = BS + '#' + BS + '#' + BS + '#' + BS + '#'
    items = []
    
    for m in re.finditer(header_pat, section):
        num = int(m.group(1))
        title = m.group(2).strip()
        p = m.end()
        
        # Find ensenanza
        ens_pos = section.find(ens_marker, p)
        if ens_pos == -1:
            continue
        ens_start = ens_pos + len(ens_marker)
        while ens_start < len(section) and section[ens_start] in ' \r\n':
            ens_start += 1
        
        # Find ejemplo
        ej_pos = section.find(ej_marker, ens_start)
        if ej_pos == -1:
            continue
        ens_end = ej_pos
        ej_start = ej_pos + len(ej_marker)
        while ej_start < len(section) and section[ej_start] in ' \r\n':
            ej_start += 1
        
        # Find quiz
        quiz_pos = section.find(quiz_4, ej_start)
        if quiz_pos == -1:
            continue
        ej_end = quiz_pos
        
        # Extract pregunta
        ql_end = section.find('\n', quiz_pos)
        if ql_end == -1:
            continue
        qp = ql_end + 1
        while qp < len(section) and section[qp] in '\n\r':
            qp += 1
        pregunta_start = qp
        pregunta_end = section.find('\n', pregunta_start)
        if pregunta_end == -1:
            continue
        
        nl = pregunta_end + 1
        if nl < len(section) and not section[nl:nl+2].startswith('- ') and not section[nl:nl+2].startswith(BS + '-'):
            pregunta_end = section.find('\n', nl)
            if pregunta_end == -1:
                continue
        
        pregunta_text = section[pregunta_start:pregunta_end].strip()
        
        # Parse options
        opts_start = pregunta_end + 1
        options, correct = parse_options(section, opts_start, header_pat)
        
        ens_text = clean_text(section[ens_start:ens_end])
        ej_text = clean_text(section[ej_start:ej_end])
        pq_clean = clean_text(pregunta_text)
        
        if ens_text and ej_text and pq_clean and options:
            items.append({
                'num': num, 'concepto': title,
                'ensenanza': ens_text, 'ejemplo': ej_text,
                'pregunta': pq_clean, 'opciones': options, 'respuesta': correct,
            })
    
    return items


def parse_options(section, opts_start, header_pat):
    """Parse multiple-choice options from section."""
    sep = BS + '---'
    opt_end = section.find(sep, opts_start)
    next_c = re.search(header_pat, section[opts_start:])
    if next_c:
        opt_end = min(opt_end if opt_end != -1 else len(section), opts_start + next_c.start())
    if opt_end == -1:
        opt_end = len(section)
    
    options = []
    correct = None
    
    for line in section[opts_start:opt_end].split('\n'):
        line = line.strip()
        if not line:
            continue
        
        m = re.match(r'\\?- (?:\((.+?)\) )?(.+)$', line)
        if not m:
            continue
        
        marker = (m.group(1) or '').strip()
        opt_text = m.group(2).strip()
        
        # Clean text
        opt_text = opt_text.replace(BS + '*', '*')
        opt_text = opt_text.replace(BS + '[', '[')
        opt_text = opt_text.replace(BS + ']', ']')
        opt_text = opt_text.replace(BS + '#', '#')
        opt_text = opt_text.replace(BS + '.', '.')
        
        # Detect correct answer
        has_check = chr(0x2705) in opt_text  # white check mark
        if has_check:
            opt_text = opt_text.replace(chr(0x2705), '').rstrip()
        
        has_check = has_check or chr(0x2714) in marker  # heavy check mark
        has_check = has_check or marker.replace(' ', '') == BS + '*' + BS + '*' + BS + '*' + BS + '*'
        
        options.append(opt_text)
        if has_check:
            correct = opt_text
    
    return options, correct


def main():
    docs_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'docs')
    md_path = os.path.join(docs_dir, 'MARKDOWN CONOCIMIENTO NEGOCIACION.md')
    
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    result = supabase.table("companies").select("id").eq("slug", "falabella").execute()
    falabella_id = result.data[0]["id"]
    
    for slug, config in MODULES.items():
        print(f"\n--- {slug} ({config['total']} items) ---")
        
        section_start = content.find(config['header'])
        if section_start == -1:
            print(f"  ERROR: Header not found"); continue
        
        next_section = len(content)
        for other_slug, other_cfg in MODULES.items():
            if other_slug == slug:
                continue
            pos = content.find(other_cfg['header'], section_start + len(config['header']))
            if pos != -1 and pos < next_section:
                next_section = pos
        
        section = content[section_start:next_section]
        header_pat = BS*2 + '#' + BS*2 + r'# ' + config['prefix'] + r' (\d+): (.+)'
        
        if config['format'] == 'spin':
            items = parse_spin(section, header_pat)
        else:
            items = parse_standard(section, header_pat)
        
        print(f"  Parsed: {len(items)} items")
        for item in items:
            c = 'si' if item['respuesta'] else 'no'
            print(f"  [{item['num']}] {item['concepto'][:45]} - {len(item['opciones'])} opts, correcta={c}")
        
        updated = 0
        for item in items:
            payload = {
                "enseñanza": item['ensenanza'],
                "ejemplo": item['ejemplo'],
                "pregunta": item['pregunta'],
                "opciones": item['opciones'],
                "respuesta": item['respuesta'],
            }
            supabase.table("knowledge_content").update(payload).eq(
                "company_id", falabella_id
            ).eq("module", slug).eq("orden", item['num']).execute()
            updated += 1
        
        print(f"  DB updated: {updated} rows")


if __name__ == '__main__':
    main()
