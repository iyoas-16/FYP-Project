import { supabase } from "@/integrations/supabase/client";

export async function getProfileRole(userId: string): Promise<"user" | "admin"> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.role === "admin" ? "admin" : "user";
}
