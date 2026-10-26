#!/usr/bin/env python3
"""Insert INVU knowledge items using supabase client."""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DATABASE_URL', 'postgresql://postgres:postgres@localhost:54321/postgres')

from supabase import create_client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

url = os.environ['SUPABASE_URL']
key = os.environ['SUPABASE_KEY']
supabase = create_client(url, key)

company_id = 'ef4e8f32-fa7d-489b-894e-5a39b9ea994c'

with open('/tmp/invu_seed.json', 'r') as f:
    items = json.load(f)

data = []
for item in items:
    data.append({
        'company_id': company_id,
        'module': item['module'],
        'module_title': item['module_title'],
        'concepto': item['concepto'],
        'enseñanza': item['enseñanza'],
        'ejemplo': item['ejemplo'],
        'pregunta': None,
        'opciones': None,
        'respuesta': None,
        'orden': item['orden'],
    })

# Insert in batches of 50
BATCH = 50
total = len(data)
for i in range(0, total, BATCH):
    batch = data[i:i+BATCH]
    result = supabase.table('knowledge_content').insert(batch).execute()
    print(f'Inserted {i+len(batch)}/{total}')

print('Done!')
