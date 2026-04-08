import type { ParsedPurchasePrompt, PurchaseAdviceRequest, PurchaseUrgency, SpendContext } from "@/lib/types";

type KeywordMatch<T> = {
  value: T;
  keyword: string;
};

type ContextKeywordGroup = {
  context: SpendContext;
  keywords: string[];
  explicitKeywords: string[];
};

const contextKeywordGroups: ContextKeywordGroup[] = [
  {
    context: "Essentials",
    keywords: ["日常用品", "生活用品", "必需品", "刚需", "groceries", "grocery", "supermarket", "rent", "food", "commute", "通勤", "交通", "买菜"],
    explicitKeywords: ["日常用品", "生活用品", "必需品", "刚需"],
  },
  {
    context: "Lifestyle",
    keywords: ["护肤", "护肤品", "化妆", "化妆品", "粉底", "粉底液", "makeup", "skincare", "clothes", "shopping", "购物", "serum", "cosmetic"],
    explicitKeywords: ["购物", "shopping"],
  },
  {
    context: "Holiday",
    keywords: ["旅行", "旅游", "trip", "holiday", "vacation", "hotel", "flight", "机票", "酒店"],
    explicitKeywords: ["旅行", "旅游", "trip", "holiday", "vacation"],
  },
  {
    context: "Social",
    keywords: ["聚餐", "约会", "奶茶", "restaurant", "dinner", "lunch", "cocktail", "bar", "party"],
    explicitKeywords: ["聚餐", "约会", "party"],
  },
  {
    context: "Growth",
    keywords: ["课程", "课", "学习", "书", "study", "course", "book", "training", "lesson", "workshop"],
    explicitKeywords: ["学习", "study"],
  },
  {
    context: "Health",
    keywords: ["看病", "药", "doctor", "clinic", "medical", "health", "glasses", "dentist"],
    explicitKeywords: ["看病", "medical", "health"],
  },
  {
    context: "Work & Admin",
    keywords: ["手续费", "转账", "bank fee", "admin", "tuition", "work permit", "subscription"],
    explicitKeywords: ["手续费", "转账", "bank fee", "admin"],
  },
];

const urgencyKeywordGroups: Array<{ urgency: PurchaseUrgency; keywords: string[] }> = [
  {
    urgency: "high",
    keywords: ["高优先级", "急用", "今天要", "今天就要", "马上要", "urgent", "asap", "right now"],
  },
  {
    urgency: "low",
    keywords: ["低优先级", "不急", "以后再说", "改天再买", "later", "not urgent", "someday"],
  },
  {
    urgency: "medium",
    keywords: ["中优先级", "一般", "普通优先级", "medium priority"],
  },
];

const standaloneContextPhrases = new Set(
  contextKeywordGroups.flatMap((group) => group.explicitKeywords.map((keyword) => keyword.toLowerCase())),
);
const standaloneUrgencyPhrases = new Set(
  urgencyKeywordGroups.flatMap((group) => group.keywords.map((keyword) => keyword.toLowerCase())),
);

const leadingActionPatterns = [
  /^(?:请问|想问下|想问问|问一下)\s*/i,
  /^(?:我)?(?:想买|想要买|准备买|打算买|想入手|准备入手|打算入手|我能买|我可以买|可以买|能不能买|是否可以买|可不可以买)\s*/i,
  /^(?:我)?(?:想要|打算|准备)\s*/i,
  /^(?:买|购买|入手|消费|花)\s*/i,
];

const trailingQuestionPatterns = [
  /(?:现在)?(?:可以买(?:吗|么)?|能买(?:吗|么)?|值不值得买(?:吗|么)?|划算(?:吗|么)?|合适(?:吗|么)?|可以吗|行吗|吗|么|\?|？)+$/gi,
  /(?:现在|目前|这会儿)\s*$/gi,
];

const fillerPatterns = [
  /(?:帮我看看|帮我判断|告诉我|想知道|我想知道)/gi,
  /(?:这笔)?(?:消费|东西|玩意儿)\b/gi,
];

const nonItemPhrasePatterns = [
  /(?:高|中|低)优先级/gi,
  /(?:urgent|asap|not urgent|medium priority)/gi,
  /(?:现在就要|今天就要|今天要|马上要|不急)/gi,
  /(?:日常用品|生活用品|必需品|刚需)/gi,
];

const amountWithCurrencyPattern =
  /(?:€\s*)?(\d+(?:[.,]\d+)?)\s*(?:欧元?|eur|euro|€|块钱?|块|元)/i;
const amountNearVerbPattern =
  /(?:买|购买|花|预算|price|cost|spend)\s*(?:大概|约|around)?\s*(\d+(?:[.,]\d+)?)/i;
const genericAmountPattern = /(\d+(?:[.,]\d+)?)/g;
const genericPlaceholderPattern = /^(?:这个|这个东西|东西|item|purchase|消费)$/i;

function normalizeText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeAmount(value: string) {
  return Number(value.replace(",", "."));
}

function findKeywordMatch<T>(input: string, groups: Array<{ value: T; keywords: string[] }>): KeywordMatch<T> | null {
  const lowered = input.toLowerCase();

  for (const group of groups) {
    for (const keyword of group.keywords) {
      if (lowered.includes(keyword.toLowerCase())) {
        return {
          value: group.value,
          keyword,
        };
      }
    }
  }

  return null;
}

function findContextMatch(input: string) {
  return findKeywordMatch(
    input,
    contextKeywordGroups.map((group) => ({
      value: group.context,
      keywords: group.keywords,
    })),
  );
}

function findExplicitContextMatch(input: string) {
  return findKeywordMatch(
    input,
    contextKeywordGroups.map((group) => ({
      value: group.context,
      keywords: group.explicitKeywords,
    })),
  );
}

function findUrgencyMatch(input: string) {
  return findKeywordMatch(
    input,
    urgencyKeywordGroups.map((group) => ({
      value: group.urgency,
      keywords: group.keywords,
    })),
  );
}

function removeKnownPatterns(input: string, patterns: RegExp[]) {
  return patterns.reduce((current, pattern) => current.replace(pattern, " "), input);
}

function cleanupCandidate(input: string) {
  let candidate = normalizeText(input);

  candidate = candidate.replace(amountWithCurrencyPattern, " ");
  candidate = candidate.replace(amountNearVerbPattern, " ");
  candidate = removeKnownPatterns(candidate, leadingActionPatterns);
  candidate = removeKnownPatterns(candidate, trailingQuestionPatterns);
  candidate = removeKnownPatterns(candidate, fillerPatterns);
  candidate = removeKnownPatterns(candidate, nonItemPhrasePatterns);
  candidate = candidate.replace(/^(?:关于|这个|这个是|一笔|一个|一件|一套)\s*/i, "");
  candidate = candidate.replace(/\b(?:买|购买|入手)\b/gi, " ");
  candidate = candidate.replace(/[，,。；;、]/g, " ");
  candidate = candidate.replace(/\s+的\s+/g, " ");
  candidate = candidate.replace(/^\s*的+/g, "");
  candidate = normalizeText(candidate);

  if (genericPlaceholderPattern.test(candidate)) {
    return "";
  }

  return candidate;
}

function isStandaloneClassificationSegment(input: string) {
  const cleaned = normalizeText(input).toLowerCase();
  return standaloneContextPhrases.has(cleaned) || standaloneUrgencyPhrases.has(cleaned);
}

function extractItemName(input: string) {
  const segments = normalizeText(input)
    .split(/[，,。；;、\n]+/)
    .map((segment) => normalizeText(segment))
    .filter(Boolean);

  for (const segment of segments) {
    if (isStandaloneClassificationSegment(segment)) {
      continue;
    }

    const candidate = cleanupCandidate(segment);
    if (candidate) {
      return candidate;
    }
  }

  return cleanupCandidate(input) || undefined;
}

function extractAmount(input: string) {
  const currencyMatch = input.match(amountWithCurrencyPattern);
  if (currencyMatch?.[1]) {
    return {
      amount: normalizeAmount(currencyMatch[1]),
      isInferred: false,
      matchedText: currencyMatch[0],
    };
  }

  const nearVerbMatch = input.match(amountNearVerbPattern);
  if (nearVerbMatch?.[1]) {
    return {
      amount: normalizeAmount(nearVerbMatch[1]),
      isInferred: true,
      matchedText: nearVerbMatch[0],
    };
  }

  const genericMatches = [...input.matchAll(genericAmountPattern)];
  if (genericMatches.length === 1 && genericMatches[0]?.[1]) {
    return {
      amount: normalizeAmount(genericMatches[0][1]),
      isInferred: true,
      matchedText: genericMatches[0][0],
    };
  }

  return {
    amount: undefined,
    isInferred: false,
    matchedText: undefined,
  };
}

function inferContextFromItem(itemName?: string): SpendContext {
  if (!itemName) {
    return "Lifestyle";
  }

  return findContextMatch(itemName)?.value ?? "Lifestyle";
}

function buildUnparsedRemainder(
  rawPrompt: string,
  itemName: string | undefined,
  amountMatch: string | undefined,
  contextMatch: KeywordMatch<SpendContext> | null,
  urgencyMatch: KeywordMatch<PurchaseUrgency> | null,
) {
  let remainder = rawPrompt;

  if (amountMatch) {
    remainder = remainder.replace(amountMatch, " ");
  }

  if (contextMatch?.keyword) {
    remainder = remainder.replace(new RegExp(contextMatch.keyword, "i"), " ");
  }

  if (urgencyMatch?.keyword) {
    remainder = remainder.replace(new RegExp(urgencyMatch.keyword, "i"), " ");
  }

  if (itemName) {
    remainder = remainder.replace(itemName, " ");
  }

  remainder = removeKnownPatterns(remainder, leadingActionPatterns);
  remainder = removeKnownPatterns(remainder, trailingQuestionPatterns);
  remainder = removeKnownPatterns(remainder, fillerPatterns);
  remainder = remainder.replace(/(?:^|\s)的(?:\s|$)/g, " ");
  remainder = normalizeText(remainder.replace(/[，,。；;、]/g, " "));

  return remainder || undefined;
}

export function parsePurchasePrompt(input: string): ParsedPurchasePrompt {
  const rawPrompt = normalizeText(input);
  const { amount, isInferred: isAmountInferred, matchedText } = extractAmount(rawPrompt);
  const explicitContextMatch = findExplicitContextMatch(rawPrompt);
  const itemName = extractItemName(rawPrompt);
  const inferredContext = inferContextFromItem(itemName);
  const urgencyMatch = findUrgencyMatch(rawPrompt);
  const urgency = urgencyMatch?.value ?? "medium";
  const desiredContext = explicitContextMatch?.value ?? inferredContext;
  const missingFields: Array<"itemName" | "amount"> = [];

  if (!itemName) {
    missingFields.push("itemName");
  }

  if (amount == null) {
    missingFields.push("amount");
  }

  return {
    rawPrompt,
    itemName,
    amount,
    desiredContext,
    urgency,
    isAmountInferred,
    isContextInferred: explicitContextMatch == null,
    isUrgencyDefaulted: urgencyMatch == null,
    isItemNameInferred: itemName == null,
    missingFields,
    unparsedRemainder: buildUnparsedRemainder(rawPrompt, itemName, matchedText, explicitContextMatch, urgencyMatch),
  };
}

export function parsedPromptToRequest(
  parsedPrompt: ParsedPurchasePrompt,
  note?: string,
): PurchaseAdviceRequest | null {
  if (parsedPrompt.amount == null) {
    return null;
  }

  return {
    itemName: parsedPrompt.itemName ?? "This purchase",
    amount: parsedPrompt.amount,
    desiredContext: parsedPrompt.desiredContext,
    urgency: parsedPrompt.urgency,
    note,
  };
}

export function structuredRequestToParsedPrompt(request: PurchaseAdviceRequest, rawPrompt = ""): ParsedPurchasePrompt {
  return {
    rawPrompt,
    itemName: request.itemName,
    amount: request.amount,
    desiredContext: request.desiredContext,
    urgency: request.urgency,
    isAmountInferred: false,
    isContextInferred: false,
    isUrgencyDefaulted: false,
    isItemNameInferred: false,
    missingFields: [],
  };
}
