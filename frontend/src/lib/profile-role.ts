import { supabase } from "@/integrations/supabase/client";

export async function getProfileRole(userId: string): Promise<"user" | "admin"> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? "admin" : "user";
}
