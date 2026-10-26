#!/usr/bin/env python3
"""Insert INVU knowledge items directly via psql."""
import subprocess, json

company_id = 'ef4e8f32-fa7d-489b-894e-5a39b9ea994c'

with open('/tmp/invu_seed.json', 'r') as f:
    items = json.load(f)

# Generate bulk INSERT statements
BATCH = 44
total = len(items)
for batch_num in range(0, total, BATCH):
    batch = items[batch_num:batch_num+BATCH]
    values = []
    for item in batch:
        c = item['concepto'].replace("'", "''")
        e = item['enseñanza'].replace("'", "''")
        ej = item['ejemplo'].replace("'", "''")
        mod = item['module']
        mt = item['module_title']
        o = item['orden']
        values.append(f"('{company_id}', '{mod}', '{mt}', '{c}', '{e}', '{ej}', NULL, NULL, NULL, {o})")

    sql = f"INSERT INTO public.knowledge_content (company_id, module, module_title, concepto, enseñanza, ejemplo, pregunta, opciones, respuesta, orden) VALUES {', '.join(values)};"
    print(f'Batch {batch_num//BATCH+1}/{(total+BATCH-1)//BATCH}: {len(batch)} items...', end=' ', flush=True)
    result = subprocess.run(
        ['psql', os.environ.get('DIRECT_DB_URL', 'postgresql://postgres:postgres@db.nqaiuixiryqlcszikwgb.supabase.co:5432/postgres'),
         '-c', sql],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode == 0:
        print('OK')
    else:
        print('FAIL:', result.stderr[:200])
