import { createClient } from "@supabase/supabase-js";

export function bearerToken(header: string | null) {
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}

export async function signedIn(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;
  const supabase = createClient(url, key);
  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}
