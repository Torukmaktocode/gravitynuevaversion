import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

res = supabase.table("profiles").select("email, role").eq("email", "whiz@torukmakto.com").execute()
print("Whiz Profile:", res.data)
