import sys
sys.path.insert(0, '.')

# Importar el diccionario desde app.py
from app import KNOWLEDGE_BASE_DB

with open('module_check_output.txt', 'w', encoding='utf-8') as f:
    f.write("=== MÓDULOS DISPONIBLES EN KNOWLEDGE_BASE_DB ===\n")
    f.write(f"Total de módulos: {len(KNOWLEDGE_BASE_DB)}\n\n")
    f.write("Nombres de módulos:\n")
    for key in KNOWLEDGE_BASE_DB.keys():
        count = len(KNOWLEDGE_BASE_DB[key]) if isinstance(KNOWLEDGE_BASE_DB[key], list) else 0
        f.write(f"  - '{key}': {count} items\n")
    
    f.write("\n=== VERIFICANDO 'las-48-leyes-del-poder' ===\n")
    if 'las-48-leyes-del-poder' in KNOWLEDGE_BASE_DB:
        data = KNOWLEDGE_BASE_DB['las-48-leyes-del-poder']
        f.write(f"✓ Módulo encontrado!\n")
        f.write(f"  Tipo: {type(data)}\n")
        f.write(f"  Cantidad de leyes: {len(data)}\n")
        if len(data) > 0:
            f.write(f"  Primera ley: {data[0]['concepto']}\n")
    else:
        f.write("✗ Módulo NO encontrado\n")

print("Resultado guardado en module_check_output.txt")
