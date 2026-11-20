"use client";
import { useEffect, useState } from "react";

export interface Resource<T> {
  data?: T;
  loading?: boolean;
  error?: string;
}

export async function api<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.message || "Unable to load this view. Please try again.",
    );
  }
  return response.json();
}

type FilterInput = Record<string, string | number | undefined | null>;

export function query(
  filters: Record<string, unknown>,
  extra: FilterInput = {},
): string {
  return new URLSearchParams(
    Object.entries({ ...filters, ...extra })
      .filter(([, v]) => v !== "" && v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
}

export function useResource<T = unknown>(
  url: string,
  revision: string | number = "",
): Resource<T> {
  const [state, setState] = useState<Resource<T>>({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    api<T>(url, { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error: Error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [url, revision]);
  return state;
}

export const number = (value: number | null | undefined): string =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("en-IN").format(value);

export const date = (value: string | null | undefined): string =>
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
