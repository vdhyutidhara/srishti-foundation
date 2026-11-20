import { useEffect, useState } from "react";
export async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.message || "Unable to load this view. Please try again.",
    );
  }
  return response.json();
}
export function query(filters, extra = {}) {
  return new URLSearchParams(
    Object.entries({ ...filters, ...extra }).filter(
      ([, v]) => v !== "" && v !== undefined && v !== null,
    ),
  ).toString();
}
export function useResource(url, revision = "") {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    api(url, { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [url, revision]);
  return state;
}
export const number = (value) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("en-IN").format(value);
export const date = (value) =>
  value
    ? new Date(
        value + (value.length === 10 ? "T12:00:00Z" : ""),
      ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "Not recorded";
