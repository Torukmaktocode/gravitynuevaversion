import json
import re

def convert_data():
    with open('md  las 48 leyes del poder card.txt', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    converted = []
    for p in data['principios']:
        ejemplo_str = f"{p['ejemplo'].get('personaje', '')}: {p['ejemplo'].get('contexto', '')}"
        if 'error' in p['ejemplo']:
            ejemplo_str += f" 👉 {p['ejemplo']['error']}"
        
        item = {
            "concepto": f"Ley {p['numero']}: {p['nombre']}",
            "enseñanza": p['descripcion'],
            "ejemplo": ejemplo_str,
            "pregunta": f"⚡ DESAFÍO TÁCTICO: {p['desafio']['pregunta']}",
            "opciones": p['desafio']['opciones'],
            "respuesta": p['desafio']['respuesta_correcta']
        }
        converted.append(item)
    
    return converted

def update_app_py(new_data):
    with open('app.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Target the dictionary entry for 'las-48-leyes-del-poder'
    # We want to replace the list associated with this key.
    
    start_marker = "'las-48-leyes-del-poder': ["
    end_marker = "    ],"
    
    # Since the list is long, we'll find the start and then the corresponding closing bracket.
    start_index = content.find(start_marker)
    if start_index == -1:
        print("Could not find start marker")
        return

    # To be safe, we'll look for the closing bracket that matches the opening one for the list.
    # But since it's a large block, let's find the next '],' that is followed by another key or the end of the dict.
    # Looking at the prev view_file, it ends with:
    # 2600: ],
    # 2601:     }
    
    # Let's find the end of the list.
    # We know it's before line 2601.
    
    # A simpler way: just replace the whole block from 'las-48-leyes-del-poder': [ to the end of that list.
    
    # Let's use regex to find the key and its list.
    pattern = re.compile(r"'las-48-leyes-del-poder':\s*\[.*?\n\s*\],", re.DOTALL)
    
    new_entry_list_str = json.dumps(new_data, indent=8, ensure_ascii=False)
    # Adjust indentation to match app.py (usually 4 spaces for the key, more for content)
    # The current app.py seems to use 4 spaces for the key and inconsistent for items.
    
    # Let's format manually for better match
    new_entry = f"'las-48-leyes-del-poder': {new_entry_list_str.replace('[', '[\n').replace('},', '},\n')},"
    
    # But let's just do a clean replacement of the whole block.
    # Finding the block start:
    match = pattern.search(content)
    if not match:
        print("Regex match failed")
        return
    
    new_content = content[:match.start()] + f"'las-48-leyes-del-poder': {new_entry_list_str}," + content[match.end():]
    
    with open('app.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("app.py updated successfully")

if __name__ == "__main__":
    new_data = convert_data()
    update_app_py(new_data)
