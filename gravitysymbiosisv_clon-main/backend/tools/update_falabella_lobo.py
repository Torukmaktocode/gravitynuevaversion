#!/usr/bin/env python3
"""
Update knowledge_content for Falabella - el-camino-del-lobo
from MARKDOWN CONOCIMIENTO NEGOCIACION.md (new format with DESAFÍO TÁCTICO quizzes)
"""
import sys, os, re, json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('SUPABASE_URL', 'https://nqaiuixiryqlcszikwgb.supabase.co')

import dotenv; dotenv.load_dotenv()
from supabase import create_client

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

BS = chr(92)


def clean_markdown(text):
    text = text.replace(BS + '*', '*')
    text = text.replace(BS + '[' , '[')
    text = text.replace(BS + ']', ']')
    text = text.replace(BS + '.', '.')
    text = text.replace(BS + '#', '#')
    text = text.replace(BS + '+', '+')
    text = text.replace(BS + '!', '!')
    lines = [l.rstrip() for l in text.strip().split('\n')]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return '\n'.join(lines)


def parse_document(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    items = []
    pos = 0

    while True:
        # Find \#\# Concepto N:
        m = re.search(BS*2 + '#' + BS*2 + '#' + r' Concepto (\d+): (.+)', content[pos:])
        if not m:
            break

        num = int(m.group(1))
        title = m.group(2).strip()
        item_start = pos + m.end()

        # Find \*\*Enseñanza:\*\*
        ens_marker = BS + '*' + BS + '*' + 'Enseñanza:' + BS + '*' + BS + '*'
        ens_pos = content.find(ens_marker, item_start)
        if ens_pos == -1:
            pos += m.start() + 1; continue
        ens_text_start = ens_pos + len(ens_marker)
        while ens_text_start < len(content) and content[ens_text_start] in (' ', '\r', '\n'):
            ens_text_start += 1

        # Find \*\*Ejemplo:\*\*
        ej_marker = BS + '*' + BS + '*' + 'Ejemplo:' + BS + '*' + BS + '*'
        ej_pos = content.find(ej_marker, ens_text_start)
        if ej_pos == -1:
            pos += m.start() + 1; continue
        ej_text_start = ej_pos + len(ej_marker)
        while ej_text_start < len(content) and content[ej_text_start] in (' ', '\r', '\n'):
            ej_text_start += 1

        # Find \#\#\#\# ⚡ DESAFÍO TÁCTICO  or without emoji
        quiz_marker = BS + '#' + BS + '#' + BS + '#' + BS + '#'
        quiz_pos = content.find(quiz_marker, ej_text_start)
        if quiz_pos == -1:
            pos += m.start() + 1; continue
        
        # Find the pregunta line (after quiz_marker and some whitespace)
        quiz_end_marker = quiz_pos + len(quiz_marker)
        # Skip " DESAFÍO TÁCTICO" line
        nl = content.find('\n', quiz_end_marker)
        if nl == -1:
            pos += m.start() + 1; continue
        pregunta_start = nl + 1
        
        # Find next empty line after pregunta to get just the question text
        next_nl = content.find('\n', pregunta_start)
        if next_nl == -1:
            pos += m.start() + 1; continue
        pregunta_end = content.find('\n', next_nl + 1)
        if pregunta_end == -1:
            pos += m.start() + 1; continue
        pregunta_text = content[pregunta_start:pregunta_end].strip()

        # Find options (lines starting with "- (")
        options_start = next_nl + 1
        options = []
        correct_answer = None
        
        # Find the separator \--- that ends this concept
        sep = content.find(BS + '---', options_start)
        if sep == -1:
            # Find next concepto or end
            next_concept = re.search(BS*2 + '#' + BS*2 + '#' + r' Concepto', content[options_start:])
            if next_concept:
                sep = options_start + next_concept.start()
            else:
                sep = len(content)
        
        options_text = content[options_start:sep]
        for line in options_text.split('\n'):
            line = line.strip()
            if not line:
                continue
            # Match: \- (\*\*✔\*\*) Text  or  \- ( ) Text
            opt_match = re.match(r'\\?- \((.+?)\) (.+)', line)
            if opt_match:
                marker = opt_match.group(1).strip()
                opt_text = clean_markdown(opt_match.group(2).strip())
                options.append(opt_text)
                # Correct option has \*\*✔\*\* or after emoji removal \*\*\*\* (4 asterisks)
                is_correct = '✔' in marker or marker.replace(' ', '') == '\\*\\*\\*\\*'
                if is_correct:
                    correct_answer = opt_text

        # Clean extracted texts
        ens_text = clean_markdown(content[ens_text_start:ej_pos])
        ej_text = clean_markdown(content[ej_text_start:quiz_pos])
        pregunta_clean = clean_markdown(pregunta_text)

        print(f"  Concepto {num}: '{title}' - {len(options)} opciones, correcta={'si' if correct_answer else 'no'}")

        items.append({
            'num': num,
            'concepto': title,
            'ensenanza': ens_text,
            'ejemplo': ej_text,
            'pregunta': pregunta_clean,
            'opciones': options,
            'respuesta': correct_answer,
        })

        pos += m.start() + 1

    return items


def main():
    docs_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'docs')
    md_path = os.path.join(docs_dir, 'MARKDOWN CONOCIMIENTO NEGOCIACION.md')

    if not os.path.exists(md_path):
        print(f"ERROR: {md_path} not found"); sys.exit(1)

    print(f"Parsing: {md_path}")
    items = parse_document(md_path)
    print(f"Found {len(items)} concepts")

    # Get falabella company ID
    result = supabase.table("companies").select("id").eq("slug", "falabella").execute()
    if not result.data:
        print("ERROR: Falabella company not found"); sys.exit(1)
    falabella_id = result.data[0]["id"]
    print(f"Falabella ID: {falabella_id}")

    # Update each item
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
        ).eq("module", "el-camino-del-lobo").eq("orden", item['num']).execute()
        updated += 1
        if updated % 10 == 0:
            print(f"  Updated {updated}/40...")

    print(f"Done! Updated {updated} items for el-camino-del-lobo")


if __name__ == '__main__':
    main()
