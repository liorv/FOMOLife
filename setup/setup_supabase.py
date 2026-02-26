import psycopg2
import os
from pathlib import Path

# Supabase PostgreSQL connection details
SUPABASE_HOST = os.environ.get("SUPABASE_HOST")
if not SUPABASE_HOST:
    print("ERROR: SUPABASE_HOST environment variable not set")
    exit(1)
SUPABASE_PORT = 5432
SUPABASE_DB = "postgres"
SUPABASE_USER = "postgres"
SUPABASE_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD")

if not SUPABASE_PASSWORD:
    print("ERROR: SUPABASE_DB_PASSWORD environment variable not set")
    print("You can find this in your Supabase dashboard under Settings > Database")
    exit(1)

try:
    # Connect to Supabase PostgreSQL
    print("[*] Connecting to Supabase PostgreSQL...")
    conn = psycopg2.connect(
        host=SUPABASE_HOST,
        port=SUPABASE_PORT,
        database=SUPABASE_DB,
        user=SUPABASE_USER,
        password=SUPABASE_PASSWORD,
        sslmode="require"
    )
    
    cursor = conn.cursor()
    print("[OK] Connected!\n")
    
    # Read SQL file
    sql_file = Path(__file__).parent / "supabase_setup.sql"
    with open(sql_file, "r") as f:
        sql_content = f.read()
    
    # Execute SQL statements
    statements = [s.strip() for s in sql_content.split(";") if s.strip() and not s.strip().startswith("--")]
    
    print("[*] Found {} SQL statements to execute...\n".format(len(statements)))
    
    for i, statement in enumerate(statements, 1):
        try:
            print("[*] [{}/{}] Executing...".format(i, len(statements)), end=" ")
            cursor.execute(statement)
            conn.commit()
            print("[OK]")
        except psycopg2.Error as e:
            print("[WARN] {}".format(e.diag.message_primary if hasattr(e, 'diag') else str(e)))
            conn.rollback()
    
    print("\n[OK] Database setup complete!")
    
    # Verify tables were created
    cursor.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
    """)
    tables = [row[0] for row in cursor.fetchall()]
    
    if "user_data" in tables:
        print("[OK] user_data table created successfully")
    else:
        print("[WARN] user_data table not found")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print("[ERROR] {}".format(e))
    exit(1)
