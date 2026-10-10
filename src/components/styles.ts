// Shared Tailwind classes. Brand: orange-700 for interactive ink (5.2:1 with white text),
// orange-600 for data marks, warm stone neutrals for text and surfaces.
export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-xs placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none";
export const labelClass = "block space-y-1.5 text-sm font-medium text-stone-700";
export const cardClass = "rounded-xl border border-stone-200 bg-white p-5 shadow-sm";
export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 disabled:cursor-not-allowed disabled:opacity-50";
export const subtleButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50";
