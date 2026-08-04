export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startLogin = (nextPath?: string) => {
  if (typeof window === "undefined") return;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const next = nextPath ?? (window.location.pathname === "/login" ? "/dashboard" : currentPath);
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
};
