const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) { console.error("❌  SUPABASE_URL env var is required"); process.exit(1); }
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""; // set via env var, never hardcode

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runSQL() {
  try {
    const sqlFile = path.join(__dirname, "supabase_setup.sql"); // setup/supabase_setup.sql
    const sql = fs.readFileSync(sqlFile, "utf-8");

    // Split SQL by statements and filter out comments and empty lines
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt && !stmt.startsWith("--"));

    console.log(`Found ${statements.length} SQL statements to execute...\n`);

    for (const [index, statement] of statements.entries()) {
      try {
        console.log(`Executing statement ${index + 1}/${statements.length}...`);
        const { data, error } = await supabase.rpc("execute_sql", {
          sql: statement,
        });

        if (error) {
          console.warn(`⚠️  Statement ${index + 1}: ${error.message}`);
        } else {
          console.log(`✅ Statement ${index + 1} executed successfully`);
        }
      } catch (err) {
        console.warn(`⚠️  Statement ${index + 1}: ${err.message}`);
      }
    }

    console.log("\n✅ All SQL statements processed!");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

runSQL();
