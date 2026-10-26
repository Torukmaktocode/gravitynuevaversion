#!/usr/bin/env python3
"""
Seed knowledge_content for Help.cl company from HELP_PILDORAS_2.0.md
5 modules, 44 items each, all content-only (no questions/answers).
Parses the markdown and generates a SQL migration file.
"""

import re
import os
import sys

COMPANY_ID = 'e3e62cc5-f145-4190-b835-127bcc9c1696'

BS = chr(92)  # backslash character

MODULES = {
    1: {
        'slug': 'evolucion-consultoria-alto-impacto',
        'title': 'Evolución hacia la Consultoría de Alto Impacto',
        'range': (1, 44),
    },
    2: {
        'slug': 'optimizacion-procesos-gestion-riesgos',
        'title': 'Optimización de Procesos y Gestión de Riesgos por Segmento',
        'range': (45, 88),
    },
    3: {
        'slug': 'consolidacion-blindaje-financiero-operativo',
        'title': 'Consolidación del Blindaje Financiero y Operativo',
        'range': (89, 132),
    },
    4: {
        'slug': 'conversion-objeciones-valor-estrategico',
        'title': 'Conversión de Objeciones en Valor Estratégico y Protección Patrimonial',
        'range': (133, 176),
    },
    5: {
        'slug': 'sostenibilidad-integracion-red-ciclo-virtuoso',
        'title': 'Sostenibilidad, Integración de Red y Ciclo Virtuoso de Protección',
        'range': (177, 220),
    },
}


def parse_items(filepath):
    """Parse the markdown file and extract items grouped by bloque."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Build regex patterns using explicit chr(92) for backslashes
    # Item header: \#\#\# N\. Title
    header_pat = BS + BS + '#' + BS + BS + '#' + BS + BS + r'# (\d+)' + BS + BS + r'\. (.+)'
    
    # Find all item boundaries
    items = []
    pos = 0
    while True:
        m = re.search(header_pat, content[pos:])
        if not m:
            break
        
        num = int(m.group(1))
        title = m.group(2).strip()
        item_start = pos + m.end()
        
        # Find enseñanza section: \*\*\[Enseñanza\]\*\*
        ens_marker = BS + '*' + BS + '*' + BS + '[' + 'Enseñanza' + BS + ']' + BS + '*' + BS + '*'
        ens_start = content.find(ens_marker, item_start)
        if ens_start == -1:
            pos += m.start() + 1
            continue
        ens_start += len(ens_marker)
        # Skip trailing spaces/newlines after marker
        while ens_start < len(content) and content[ens_start] in (' ', '\r', '\n'):
            ens_start += 1
        
        # Find ejemplo section marker: \*\*\[Ejemplo\]\*\*
        ej_marker = BS + '*' + BS + '*' + BS + '[' + 'Ejemplo' + BS + ']' + BS + '*' + BS + '*'
        ej_marker_pos = content.find(ej_marker, ens_start)
        if ej_marker_pos == -1:
            pos += m.start() + 1
            continue
        ej_content_start = ej_marker_pos + len(ej_marker)
        while ej_content_start < len(content) and content[ej_content_start] in (' ', '\r', '\n'):
            ej_content_start += 1
        
        # Find end of ejemplo: --- (but escaped as \---)
        sep_marker = BS + '---'
        ej_end = content.find(sep_marker, ej_content_start)
        if ej_end == -1:
            ej_end = len(content)
            next_block = content.find('# Bloque', ej_content_start)
            if next_block != -1:
                ej_end = next_block
        
        # But also check for next \#\#\# header
        next_header = re.search(header_pat, content[ej_content_start:])
        if next_header:
            ej_end = min(ej_end, ej_content_start + next_header.start())
        
        # Extract enseñanza text: from end of enseñanza marker to start of ejemplo marker
        ens_text = content[ens_start:ej_marker_pos].strip()
        # Remove trailing whitespace from each line
        ens_lines = []
        for line in ens_text.split('\n'):
            rline = line.rstrip()
            ens_lines.append(rline)
        while ens_lines and not ens_lines[-1].strip():
            ens_lines.pop()
        
        # Extract ejemplo text: from end of ejemplo marker to end marker
        ej_text = content[ej_content_start:ej_end].strip()
        ej_lines = []
        for line in ej_text.split('\n'):
            line = line.rstrip()
            if line.rstrip() == sep_marker or line.strip() == '# Bloque':
                break
            ej_lines.append(line)
        while ej_lines and not ej_lines[-1].strip():
            ej_lines.pop()
        
        ens_clean = '\n'.join(ens_lines).strip()
        ej_clean = '\n'.join(ej_lines).strip()
        
        # Determine bloque
        bloque_num = None
        for bn, bdata in MODULES.items():
            if bdata['range'][0] <= num <= bdata['range'][1]:
                bloque_num = bn
                break
        
        if bloque_num is not None and ens_clean and ej_clean:
            items.append({
                'num': num,
                'title': title,
                'ensenanza': ens_clean,
                'ejemplo': ej_clean,
                'bloque': bloque_num,
            })
        
        pos += m.start() + 1
    
    return items


def escape_sql(text):
    """Escape text for SQL string literal."""
    if text is None:
        return 'NULL'
    escaped = text.replace('\\', '\\\\')
    escaped = escaped.replace("'", "''")
    return f"'{escaped}'"


def generate_sql(items):
    """Generate SQL migration content."""
    sql_lines = []
    sql_lines.append("-- Seed knowledge_content for Help.cl (5 modules, 220 items, content-only)")
    sql_lines.append("-- Generated from HELP_PILDORAS_2.0.md")
    sql_lines.append("")
    sql_lines.append("DO $$")
    sql_lines.append("DECLARE")
    sql_lines.append(f"  help_id UUID := '{COMPANY_ID}';")
    sql_lines.append("BEGIN")
    sql_lines.append("")
    
    for item in items:
        bloque = MODULES[item['bloque']]
        slug = bloque['slug']
        module_title = bloque['title']
        concepto = f"{item['num']}. {item['title']}"
        orden = item['num'] - bloque['range'][0] + 1
        
        sql_lines.append(f"  INSERT INTO public.knowledge_content")
        sql_lines.append(f"    (company_id, module, module_title, concepto, enseñanza, ejemplo, pregunta, opciones, respuesta, orden)")
        sql_lines.append(f"  VALUES")
        sql_lines.append(f"    (help_id, {escape_sql(slug)}, {escape_sql(module_title)},")
        sql_lines.append(f"     {escape_sql(concepto)},")
        sql_lines.append(f"     {escape_sql(item['ensenanza'])},")
        sql_lines.append(f"     {escape_sql(item['ejemplo'])},")
        sql_lines.append(f"     NULL, NULL, NULL,")
        sql_lines.append(f"     {orden})")
        sql_lines.append(f"  ON CONFLICT (company_id, module, orden) DO NOTHING;")
        sql_lines.append("")
    
    total = len(items)
    sql_lines.append(f"  RAISE NOTICE 'Inserted % items for help (5 modules)', {total};")
    sql_lines.append("END $$;")
    
    return '\n'.join(sql_lines)


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    docs_dir = os.path.join(project_root, '..', 'docs')
    
    markdown_path = os.path.join(docs_dir, 'HELP_PILDORAS_2.0.md')
    if not os.path.exists(markdown_path):
        print(f"Error: File not found: {markdown_path}")
        sys.exit(1)
    
    print(f"Parsing: {markdown_path}")
    items = parse_items(markdown_path)
    print(f"Found {len(items)} items")
    
    # Verify
    for bn in sorted(MODULES.keys()):
        count = sum(1 for i in items if i['bloque'] == bn)
        expected = MODULES[bn]['range'][1] - MODULES[bn]['range'][0] + 1
        status = "OK" if count == expected else f"MISMATCH (expected {expected})"
        print(f"  Bloque {bn} ({MODULES[bn]['title'][:50]}...): {count} items - {status}")
    
    if not items:
        print("ERROR: No items parsed!")
        sys.exit(1)
    
    # Generate SQL
    sql = generate_sql(items)
    
    # Write to migration file
    migrations_dir = os.path.join(project_root, 'db', 'migrations')
    os.makedirs(migrations_dir, exist_ok=True)
    
    output_path = os.path.join(migrations_dir, '20260810_seed_knowledge_help_pildoras.sql')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(sql)
    
    print(f"\nSQL migration written to: {output_path}")
    print(f"Size: {len(sql)} bytes, {sql.count(chr(10))} lines")


if __name__ == '__main__':
    main()
