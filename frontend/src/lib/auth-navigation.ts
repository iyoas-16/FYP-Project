export function getDefaultAuthenticatedPath(isAdmin: boolean) {
  return isAdmin ? "/admin" : "/dashboard";
}

export function getSafeRedirectTarget(fallback = "/dashboard") {
  if (typeof window === "undefined") return fallback;

  const redirect = new URLSearchParams(window.location.search).get("redirect");

  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return fallback;
  }

  return redirect;
}
