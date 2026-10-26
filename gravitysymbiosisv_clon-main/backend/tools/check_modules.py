import sys
sys.path.insert(0, '.')

# Importar el diccionario desde app.py
from app import KNOWLEDGE_BASE_DB

print("=== MÓDULOS DISPONIBLES EN KNOWLEDGE_BASE_DB ===")
print(f"Total de módulos: {len(KNOWLEDGE_BASE_DB)}")
print("\nNombres de módulos:")
for key in KNOWLEDGE_BASE_DB.keys():
    count = len(KNOWLEDGE_BASE_DB[key]) if isinstance(KNOWLEDGE_BASE_DB[key], list) else 0
    print(f"  - '{key}': {count} items")

print("\n=== VERIFICANDO 'las-48-leyes-del-poder' ===")
if 'las-48-leyes-del-poder' in KNOWLEDGE_BASE_DB:
    data = KNOWLEDGE_BASE_DB['las-48-leyes-del-poder']
    print(f"✓ Módulo encontrado!")
    print(f"  Tipo: {type(data)}")
    print(f"  Cantidad de leyes: {len(data)}")
    if len(data) > 0:
        print(f"  Primera ley: {data[0]['concepto']}")
else:
    print("✗ Módulo NO encontrado")
