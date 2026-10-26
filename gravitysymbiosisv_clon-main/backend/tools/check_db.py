from app import KNOWLEDGE_BASE_DB
print(f"Total de módulos: {len(KNOWLEDGE_BASE_DB)}")
for key in KNOWLEDGE_BASE_DB:
    print(f"- {key}: {len(KNOWLEDGE_BASE_DB[key])} elementos")
