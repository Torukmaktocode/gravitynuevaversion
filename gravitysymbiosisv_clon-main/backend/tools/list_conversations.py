#!/usr/bin/env python3
"""
Lista todas las conversaciones de un usuario filtrado por email y fecha.

Uso:
  python backend/tools/list_conversations.py --email usuario@ejemplo.com
  python backend/tools/list_conversations.py --email usuario@ejemplo.com --fecha 2024-06-01
  python backend/tools/list_conversations.py --email parcial@ejemplo.com --partial        (búsqueda parcial de email)
  python backend/tools/list_conversations.py --email usuario@ejemplo.com --fechas        (lista días con conversaciones)

Requiere: pip install python-dotenv supabase
Variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_KEY
"""

import argparse
import os
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
from supabase import create_client

LIMA_TZ = timezone(timedelta(hours=-5))

load_dotenv()


def main():
    parser = argparse.ArgumentParser(description="Listar conversaciones por email y fecha")
    parser.add_argument("--email", help="Email del usuario (o parte si usas --partial). Si no se provee, lista todos los users con conversaciones")
    parser.add_argument("--fecha", help="Fecha (YYYY-MM-DD) — conversaciones creadas este día")
    parser.add_argument("--fechas", action="store_true", help="Listar días con conversaciones")
    parser.add_argument("--partial", action="store_true", help="Búsqueda parcial de email (LIKE)")
    parser.add_argument("--mensajes", action="store_true", help="Incluir mensajes de cada conversación")
    parser.add_argument("--limit", type=int, default=50, help="Máx conversaciones (default: 50)")
    args = parser.parse_args()

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        print("Error: SUPABASE_URL y SUPABASE_SERVICE_KEY (o SUPABASE_KEY) en .env")
        exit(1)

    supabase = create_client(url, key)

    # 1. Buscar perfil por email
    query = supabase.table("profiles").select("id, email, first_name, last_name, role")
    if args.partial:
        query = query.ilike("email", f"%{args.email}%")
    else:
        query = query.eq("email", args.email)

    profiles = query.execute().data

    if not profiles:
        print(f"No se encontró usuario con email: {args.email}")
        exit(1)

    if len(profiles) > 1:
        print(f"Se encontraron {len(profiles)} usuarios. Usa un email más específico:\n")
        for p in profiles:
            print(f"  {p['email']:40s} {p.get('first_name', '') or ''} {p.get('last_name', '') or ''} ({p['role']})")
        exit(1)

    user = profiles[0]
    user_id = user["id"]
    print(f"Usuario: {user['email']} | {user.get('first_name', '') or ''} {user.get('last_name', '') or ''} ({user['role']})")
    print(f"UUID:    {user_id}")
    print()

    # 2a. Modo --fechas: listar días con conversaciones (en America/Lima)
    if args.fechas:
        cq_all = supabase.table("conversations").select("created_at").eq("user_id", user_id).execute()
        dates = set()
        for conv in cq_all.data:
            ts = conv["created_at"]
            if ts:
                if ts.endswith("Z"):
                    ts = ts[:-1] + "+00:00"
                dt = datetime.fromisoformat(ts).astimezone(LIMA_TZ)
                dates.add(dt.strftime("%Y-%m-%d"))
        if not dates:
            print("No tiene conversaciones.")
            return
        print("Días con conversaciones (America/Lima):")
        for d in sorted(dates, reverse=True):
            print(f"  {d}")
        return

    # 2b. Obtener conversaciones (filtro por fecha en Python con timezone Lima)
    cq = supabase.table("conversations").select("id, created_at").eq("user_id", user_id).order("created_at", desc=True).limit(500)
    all_data = cq.execute().data or []
    if args.fecha:
        target = datetime.strptime(args.fecha, "%Y-%m-%d").replace(tzinfo=LIMA_TZ).date()
        data = []
        for conv in all_data:
            ts = conv["created_at"]
            if ts:
                if ts.endswith("Z"):
                    ts = ts[:-1] + "+00:00"
                dt = datetime.fromisoformat(ts).astimezone(LIMA_TZ).date()
                if dt == target:
                    data.append(conv)
    else:
        data = all_data
    if args.limit and len(data) > args.limit:
        data = data[:args.limit]

    if not data:
        print("No tiene conversaciones." + (" en esa fecha." if args.fecha else ""))
        return

    # 3. Para cada conversación, contar mensajes y obtener el primer/último mensaje
    for conv in data:
        conv_id = conv["id"]
        created = conv["created_at"]

        msg_query = supabase.table("messages").select("role, content, created_at").eq("conversation_id", conv_id).order("created_at").execute()
        msgs = msg_query.data
        msg_count = len(msgs)

        if msg_count > 0:
            first_content = msgs[0]["content"][:120] if msgs[0]["content"] else "(sin contenido)"
            last_time = msgs[-1]["created_at"]
        else:
            first_content = "(sin mensajes)"
            last_time = created

        print(f"  {conv_id}")
        print(f"    Creada:     {created}")
        print(f"    Último msg: {last_time}")
        print(f"    Mensajes:   {msg_count}")
        print(f"    Inicio:     {first_content}")

        if args.mensajes and msgs:
            print(f"    ---- Mensajes ----")
            for m in msgs:
                role_icon = "🗣" if m["role"] == "user" else "🤖"
                content = m["content"][:200] if m["content"] else "(sin contenido)"
                print(f"    {role_icon} [{m['created_at']}] {content}")
        print()

    total = len(data)
    print(f"Total: {total} conversacion(es)")


if __name__ == "__main__":
    main()
