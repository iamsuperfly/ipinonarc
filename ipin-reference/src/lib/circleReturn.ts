export function circleReturn(search: string, hash: string) {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  if (query.get("error") || fragment.get("error")) return "error";
  if (query.get("code") || fragment.get("code")) return "code";
  return "";
}

export function circleErrorMessage(search: string, hash: string) {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const error = query.get("error") || fragment.get("error") || "";
  if (error === "redirect_uri_mismatch") return "Google rejected the profile return address.";
  if (error === "access_denied") return "Google was closed before it finished.";
  if (error === "interaction_required") return "Google needs the account picker. Try again.";
  if (error) return `Google stopped the wallet: ${error.replaceAll("_", " ")}.`;
  return "Google did not finish. Try again.";
}
