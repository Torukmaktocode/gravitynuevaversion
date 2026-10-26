#!/usr/bin/env python3
"""
Update all Falabella knowledge_content modules from MARKDOWN CONOCIMIENTO NEGOCIACION.md
Handles: el-camino-del-lobo (40), rompe-la-barrera-del-no (40), ventas-spin (40), las-48-leyes-del-poder (48)
"""
import sys, os, re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('SUPABASE_URL', 'https://nqaiuixiryqlcszikwgb.supabase.co')
import dotenv; dotenv.load_dotenv()
from supabase import create_client

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))
BS = chr(92)

# Module config: section header markers in the markdown
MODULE_CONFIG = {
    'el-camino-del-lobo': {
        'header': 'El Camino del Lobo',
        'concept_prefix': 'Concepto',
        'total': 40,
    },
    'rompe-la-barrera-del-no': {
        'header': 'Rompe la Barrera del No',
        'concept_prefix': 'Concepto',
        'total': 40,
    },
    'ventas-spin': {
        'header': 'SPIN Selling',
        'concept_prefix': 'Concepto',
        'total': 40,
    },
    'las-48-leyes-del-poder': {
        'header': 'Las 48 Leyes del Poder',
        'concept_prefix': 'Ley',
        'total': 48,
    },
}


def clean_markdown(text):
    text = text.replace(BS + '*', '*')
    text = text.replace(BS + '[', '[')
    text = text.replace(BS + ']', ']')
    text = text.replace(BS + '.', '.')
    text = text.replace(BS + '#', '#')
    text = text.replace(BS + '+', '+')
    text = text.replace(BS + '$', '$')
    # Remove emojis EXCEPT ✅ and ✔ which are used as answer markers
    emoji_pattern = re.compile(
        '[\U0001F300-\U0001F9FF'
        '\U0001FA00-\U0001FAFF'
        '\U0001F600-\U0001F64F'
        '\U0001F680-\U0001F6FF'
        '\U0001F900-\U0001F9FF'
        '\U00002600-\U000026FF'
        '\U00002300-\U000023FF'
        '\U0000FE00-\U0000FE0F'
        '\U0000200D'
        ']+', flags=re.UNICODE)
    # But don't remove 2705(✅) and 2714(✔) from the Dingbats range
    # Actually these are removed by the pattern above. We remove emojis AFTER
    # detection. For text storage, remove ✅ and ✔ at the end.
    lines = [l.rstrip() for l in text.strip().split('\n')]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return '\n'.join(lines)


def parse_module(content, module_slug, config):
    prefix = config['concept_prefix']
    is_spin = (module_slug == 'ventas-spin')
    
    section_start = content.find(config['header'])
    if section_start == -1:
        return [], 0
    
    next_section = len(content)
    for other_slug, other_config in MODULE_CONFIG.items():
        if other_slug == module_slug:
            continue
        pos = content.find(other_config['header'], section_start + len(config['header']))
        if pos != -1 and pos < next_section:
            next_section = pos
    
    section = content[section_start:next_section]
    header_pat = BS*2 + '#' + BS*2 + r'# ' + prefix + r' (\d+): (.+)'
    
    quiz_marker = BS + '#' + BS + '#' + BS + '#' + BS + '#'
    sep_marker = BS + '---'
    items = []
    
    for m in re.finditer(header_pat, section):
        num = int(m.group(1))
        title = m.group(2).strip()
        item_start = m.end()
        
        if is_spin:
            ens_start = item_start
            while ens_start < len(section) and section[ens_start] in (' \r\n'):
                ens_start += 1
            
            ej_marker_pos = section.find(quiz_marker, ens_start)
            if ej_marker_pos == -1:
                continue
            sep1 = section.find(sep_marker, ens_start)
            if sep1 == -1 or sep1 >= ej_marker_pos:
                continue
            ens_end = sep1
            
            sep2 = section.find(sep_marker, ej_marker_pos + 4)
            if sep2 == -1:
                continue
            ej_start = ej_marker_pos
            ej_end = sep2
            
            quiz_pos = section.find(quiz_marker, sep2 + 4)
            if quiz_pos == -1:
                continue
        else:
            ens_marker = BS + '*' + BS + '*' + 'Ense\u00f1anza:' + BS + '*' + BS + '*'
            ens_pos = section.find(ens_marker, item_start)
            if ens_pos == -1:
                continue
            ens_start = ens_pos + len(ens_marker)
            while ens_start < len(section) and section[ens_start] in (' \r\n'):
                ens_start += 1
            
            ej_marker = BS + '*' + BS + '*' + 'Ejemplo:' + BS + '*' + BS + '*'
            ej_marker_pos = section.find(ej_marker, ens_start)
            if ej_marker_pos == -1:
                continue
            ens_end = ej_marker_pos
            ej_start = ej_marker_pos + len(ej_marker)
            while ej_start < len(section) and section[ej_start] in (' \r\n'):
                ej_start += 1
            
            quiz_pos = section.find(quiz_marker, ej_start)
            if quiz_pos == -1:
                continue
            ej_end = quiz_pos
        
        quiz_line_end = section.find('\n', quiz_pos)
        if quiz_line_end == -1:
            continue
        p = quiz_line_end + 1
        while p < len(section) and section[p] in '\n\r':
            p += 1
        pregunta_start = p
        pregunta_end = section.find('\n', pregunta_start)
        if pregunta_end == -1:
            continue
        
        nl = pregunta_end + 1
        if nl < len(section) and not section[nl:nl+2].startswith('- ') and not section[nl:nl+2].startswith(BS + '-'):
            pregunta_end = section.find('\n', nl)
            if pregunta_end == -1:
                continue
        
        pregunta_text = section[pregunta_start:pregunta_end].strip()
        
        options_start = pregunta_end + 1
        options = []
        correct_answer = None
        
        opt_end = section.find(sep_marker, options_start)
        next_concept = re.search(header_pat, section[options_start:])
        if next_concept:
            opt_end = min(opt_end if opt_end != -1 else len(section), options_start + next_concept.start())
        if opt_end == -1:
            opt_end = len(section)
        
        for line in section[options_start:opt_end].split('\n'):
            line = line.strip()
            if not line:
                continue
            
            opt_match = re.match(r'\\?- (?:\\((.+?)\\) )?([A-C][.,]\s*.+)', line)
            if opt_match:
                marker = (opt_match.group(1) or '').strip()
                opt_text = opt_match.group(2).strip()
                
                opt_text = opt_text.replace(BS + '*', '*').replace(BS + '[', '[').replace(BS + ']', ']')
                opt_text = opt_text.replace(BS + '#', '#').replace(BS + '.', '.')
                
                has_check = opt_text.rstrip().endswith('\u2705') or '\u2705' in opt_text
                if has_check:
                    opt_text = opt_text.replace('\u2705', '').rstrip()
                
                has_check = has_check or '\u2714' in marker or marker.replace(' ', '') == BS + '*' + BS + '*' + BS + '*' + BS + '*'
                
                options.append(opt_text)
                if has_check:
                    correct_answer = opt_text
        
        def clean(text):
            text = text.replace(BS + '*', '*').replace(BS + '[', '[').replace(BS + ']', ']')
            text = text.replace(BS + '#', '#').replace(BS + '.', '.').replace(BS + '+', '+')
            text = text.replace(BS + '$', '$')
            lines = [l.rstrip() for l in text.strip().split('\n')]
            while lines and not lines[0].strip():
                lines.pop(0)
            while lines and not lines[-1].strip():
                lines.pop()
            return '\n'.join(lines)
        
        ens_text = clean(section[ens_start:ens_end])
        ej_text = clean(section[ej_start:ej_end])
        pregunta_clean = clean(pregunta_text)
        
        if ens_text and ej_text and pregunta_clean and options:
            items.append({
                'num': num, 'concepto': title,
                'ensenanza': ens_text, 'ejemplo': ej_text,
                'pregunta': pregunta_clean, 'opciones': options,
                'respuesta': correct_answer,
            })
    
    return items, len(items)


def main():
    docs_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'docs')
    md_path = os.path.join(docs_dir, 'MARKDOWN CONOCIMIENTO NEGOCIACION.md')
    
    if not os.path.exists(md_path):
        print(f"ERROR: {md_path} not found"); sys.exit(1)
    
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    result = supabase.table("companies").select("id").eq("slug", "falabella").execute()
    if not result.data:
        print("ERROR: Falabella not found"); sys.exit(1)
    falabella_id = result.data[0]["id"]
    
    modules_to_update = ['ventas-spin', 'las-48-leyes-del-poder']
    
    for slug in modules_to_update:
        config = MODULE_CONFIG[slug]
        print(f"\n--- {slug} ({config['total']} items) ---")
        
        items, found = parse_module(content, slug, config)
        print(f"  Parsed: {found} items")
        
        for item in items:
            print(f"  [{item['num']}] {item['concepto'][:50]} - {len(item['opciones'])} opts, correcta={'si' if item['respuesta'] else 'no'}")
        
        if found != config['total']:
            print(f"  WARNING: expected {config['total']}, got {found}")
        
        # Update DB
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
