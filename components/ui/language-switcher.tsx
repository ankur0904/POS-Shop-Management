"use client";

import { useLingoContext } from "@lingo.dev/compiler/react";
// import type { LocaleCode } from "@lingo.dev/compiler";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLingoContext();

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Globe className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as any)}
        className="appearance-none rounded-md border border-gray-300 bg-white px-2 py-1 pr-6 text-sm text-gray-700 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-blue-400 dark:focus:ring-blue-400"
      >
        <option value="en">English</option>
        {/* <option value="es">Español</option>
        <option value="de">Deutsch</option>
        <option value="fr">Français</option> */}
        <option value="hi">हिन्दी</option>
      </select>
    </div>
  );
}