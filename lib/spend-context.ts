import type { ExpenseRecord, SpendContext } from "@/lib/types";

const holidayCategories = new Set(["holiday"]);
const growthCategories = new Set(["study"]);
const healthCategories = new Set(["Health", "medical care", "Eye"]);
const lifestyleCategories = new Set([
  "Shopping",
  "clothes",
  "makeup",
  "Self-care",
  "Personal Care",
  "E-device",
  "Entertainment",
  "culture",
  "Gym/ Sports",
]);
const adminCategories = new Set(["手续费", "bear parents"]);
const essentialCategories = new Set([
  "Home",
  "Living",
  "Household",
  "Transportation",
]);

const travelTerms = [
  "trip",
  "flight",
  "train",
  "hotel",
  "venice",
  "stockholm",
  "ucpa",
  "holiday",
  "vacation",
];

const socialTerms = [
  "dinner",
  "lunch",
  "brunch",
  "aperitivo",
  "wine",
  "cocktail",
  "bar",
  "party",
  "restaurant",
  "晚餐",
  "聚餐",
  "奶茶",
];

const growthTerms = ["course", "class", "lesson", "study", "workshop", "课"];
const healthTerms = ["clinic", "doctor", "pharmacy", "dent", "眼", "药"];
const adminTerms = ["fee", "transfer", "tuition", "bank", "手续费", "转账"];

export const spendContextLabels: Record<SpendContext, string> = {
  Essentials: "Essentials",
  Lifestyle: "Lifestyle",
  Holiday: "Holiday",
  Social: "Social",
  Growth: "Growth",
  Health: "Health",
  "Work & Admin": "Work & Admin",
};

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function inferSpendContext(input: Pick<ExpenseRecord, "name" | "comment" | "categories">): SpendContext {
  const haystack = `${input.name} ${input.comment}`.toLowerCase();

  if (input.categories.some((category) => holidayCategories.has(category))) {
    return "Holiday";
  }

  if (includesAny(haystack, travelTerms)) {
    return "Holiday";
  }

  if (input.categories.some((category) => growthCategories.has(category)) || includesAny(haystack, growthTerms)) {
    return "Growth";
  }

  if (input.categories.some((category) => healthCategories.has(category)) || includesAny(haystack, healthTerms)) {
    return "Health";
  }

  if (input.categories.some((category) => adminCategories.has(category)) || includesAny(haystack, adminTerms)) {
    return "Work & Admin";
  }

  if (input.categories.includes("Food")) {
    return includesAny(haystack, socialTerms) ? "Social" : "Essentials";
  }

  if (input.categories.some((category) => lifestyleCategories.has(category))) {
    return "Lifestyle";
  }

  if (input.categories.some((category) => essentialCategories.has(category))) {
    if (input.categories.includes("Transportation") && includesAny(haystack, travelTerms)) {
      return "Holiday";
    }
    return "Essentials";
  }

  return "Lifestyle";
}

export function addContexts(records: Omit<ExpenseRecord, "context">[]): ExpenseRecord[] {
  return records.map((record) => ({
    ...record,
    context: inferSpendContext(record),
  }));
}
