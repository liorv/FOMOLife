import { supabase } from "./supabaseClient";

const EMPTY_DATA = Object.freeze({
  tasks: [],
  projects: [],
  people: [],
});

const DEFAULT_USER = "default";

/**
 * Initialize Supabase tables if they don't exist.
 * This should be called once at app startup.
 */
export async function initSupabaseTables() {
  if (!supabase) return { created: false };
  
  try {
    // Check if tables exist by trying to query them
    const { error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .limit(1);

    if (taskError?.code === "PGRST116") {
      // Table doesn't exist, we'll need to create it manually
      console.log(
        "Supabase tables not found. Please run the SQL setup in your Supabase dashboard."
      );
    } else if (taskError && taskError.code !== "PGRST116") {
      console.error("Error checking Supabase tables:", taskError);
    }
  } catch (error) {
    console.error("Error initializing Supabase tables:", error);
  }
}

/**
 * Load user data from Supabase.
 * Returns an object with shape: { tasks, projects, people }
 */
export async function loadData(userId = DEFAULT_USER) {
  if (!supabase) return EMPTY_DATA;
  
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No data found for this user, return empty data
        return EMPTY_DATA;
      }
      throw error;
    }

    return data?.data || EMPTY_DATA;
  } catch (error) {
    console.error("Error loading data from Supabase:", error);
    return EMPTY_DATA;
  }
}

/**
 * Save user data to Supabase.
 */
export async function saveData(data, userId = DEFAULT_USER) {
  if (!supabase) return; // Silent fail if Supabase is not configured
  
  try {
    // Check if user data exists
    const { data: existing } = await supabase
      .from("user_data")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing?.id) {
      // Update existing
      const { error } = await supabase
        .from("user_data")
        .update({
          data,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase.from("user_data").insert([
        {
          user_id: userId,
          data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
    }
  } catch (error) {
    console.error("Error saving data to Supabase:", error);
    // Don't rethrow - allow app to continue
  }
}
