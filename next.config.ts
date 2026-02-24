import type { NextConfig } from "next";
import { withLingo } from "@lingo.dev/compiler/next";

const nextConfig: NextConfig = {};

export default async function (): Promise<NextConfig> {
  return await withLingo(nextConfig, {
    sourceRoot: "./app",
    sourceLocale: "en",
    targetLocales: ["hi"],
    models: "lingo.dev",
    dev: {
      usePseudotranslator: false,
    },
    buildMode: "cache-only",
  });
}