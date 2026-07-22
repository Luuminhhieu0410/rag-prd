import type {
  StructuredColumnParseResult,
  StructuredNormalizedValue,
  StructuredValueType,
} from './structured-data.types';

interface RuleMatch {
  format: string;
  type: Exclude<StructuredValueType, 'text'>;
  normalized: string | boolean | null;
  ambiguous?: boolean;
}

const NUMERIC_PRECISION = 65;
const NUMERIC_SCALE = 18;
const NUMERIC_INTEGER_DIGITS = NUMERIC_PRECISION - NUMERIC_SCALE;
const CANONICAL_DECIMAL = /^[+-]?\d+(?:\.\d+)?$/;
const AMBIGUOUS_GROUPED = /^[+-]?\d{1,3}([.,])\d{3}$/;
const GROUPED_DECIMAL = /^[+-]?\d{1,3}([.,])\d{3}(?:\1\d{3})*$/;
const PERCENTAGE = /^([+-]?\d+(?:\.\d+)?)%$/;
const CURRENCY = /^([$€£¥])\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function fitsNumeric(value: string): boolean {
  const unsigned = value.replace(/^[+-]/, '');
  const [integer, fraction = ''] = unsigned.split('.');
  const integerDigits = integer.replace(/^0+/, '').length;
  const scale = fraction.length;
  const precision = integerDigits + scale;

  return (
    precision <= NUMERIC_PRECISION &&
    scale <= NUMERIC_SCALE &&
    integerDigits <= NUMERIC_INTEGER_DIGITS
  );
}

function decimalMatch(
  format: string,
  normalized: string,
  ambiguous = false,
): RuleMatch {
  return {
    format,
    type: 'decimal',
    normalized: fitsNumeric(normalized) ? normalized : null,
    ambiguous,
  };
}

function normalizePercentage(value: string): string {
  const negative = value.startsWith('-');
  const unsigned = value.replace(/^[+-]/, '');
  const [integer, fraction = ''] = unsigned.split('.');
  const digits = `${integer}${fraction}`;
  const decimalIndex = integer.length - 2;
  const shifted =
    decimalIndex <= 0
      ? `0.${'0'.repeat(-decimalIndex)}${digits}`
      : `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
  const [whole, decimal = ''] = shifted.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0';
  const normalizedDecimal = decimal.replace(/0+$/, '');
  const magnitude = normalizedDecimal
    ? `${normalizedWhole}.${normalizedDecimal}`
    : normalizedWhole;

  return negative && magnitude !== '0' ? `-${magnitude}` : magnitude;
}

function parseIsoDate(value: string): string | null {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  const normalized = date.toISOString();
  return normalized.startsWith(`${value}T`) ? normalized : null;
}

function matchRule(value: string): RuleMatch | null {
  const lower = value.toLowerCase();
  if (lower === 'true' || lower === 'false') {
    return {
      format: 'boolean-literal',
      type: 'boolean',
      normalized: lower === 'true',
    };
  }

  const date = parseIsoDate(value);
  if (date) {
    return { format: 'iso-date', type: 'date', normalized: date };
  }

  const percentage = PERCENTAGE.exec(value);
  if (percentage) {
    return decimalMatch('percentage', normalizePercentage(percentage[1]));
  }

  const currency = CURRENCY.exec(value);
  if (currency) {
    return decimalMatch(
      `currency-${currency[1]}-comma-grouped-dot-decimal`,
      currency[2].replace(/,/g, ''),
    );
  }

  const ambiguous = AMBIGUOUS_GROUPED.exec(value);
  if (ambiguous) {
    return decimalMatch(
      `grouped-${ambiguous[1]}`,
      value.replace(ambiguous[1], ''),
      true,
    );
  }

  const grouped = GROUPED_DECIMAL.exec(value);
  if (grouped) {
    return decimalMatch(
      `grouped-${grouped[1]}`,
      value.replaceAll(grouped[1], ''),
    );
  }

  if (CANONICAL_DECIMAL.test(value)) {
    return decimalMatch('canonical-decimal', value);
  }

  return null;
}

function distinctCount(
  raw: string[],
  normalized: StructuredNormalizedValue[],
): number {
  const distinct = new Set<string>();
  normalized.forEach((value, index) => {
    if (raw[index].trim().length === 0) return;
    const representation = value === null ? raw[index] : String(value);
    distinct.add(`${typeof value}:${representation}`);
  });
  return distinct.size;
}

export function parseColumn(values: string[]): StructuredColumnParseResult {
  const raw = [...values];
  const matches = raw.map((value) =>
    value.trim().length === 0 ? null : matchRule(value.trim()),
  );
  const nonBlankMatches = matches.filter(
    (match): match is RuleMatch => match !== null,
  );
  const safeMatches = nonBlankMatches.filter(
    (match): match is RuleMatch & { normalized: string | boolean } =>
      match.normalized !== null,
  );
  const formats = new Set(nonBlankMatches.map((match) => match.format));
  const nullCount = raw.filter((value) => value.trim().length === 0).length;
  const nonNullCount = raw.length - nullCount;
  const groupedRuleIsEstablished =
    formats.size === 1 &&
    nonBlankMatches.every((match) => match.format.startsWith('grouped-')) &&
    nonBlankMatches.some((match) => !match.ambiguous);
  const onlyFormat = formats.size === 1 ? nonBlankMatches[0]?.format : null;
  const ambiguous = nonBlankMatches.some((match) => match.ambiguous);
  const useTypedRule =
    onlyFormat !== null &&
    safeMatches.length > 0 &&
    (!onlyFormat.startsWith('grouped-') || groupedRuleIsEstablished);

  if (!useTypedRule) {
    const normalized = raw.map((value) =>
      value.trim().length === 0 ? null : value,
    );
    return {
      type: 'text',
      parseFormat: null,
      raw,
      normalized,
      ambiguous,
      nullCount,
      invalidCount: 0,
      nonNullCount,
      distinctCount: distinctCount(raw, normalized),
      exact: true,
    };
  }

  const selectedMatch = safeMatches[0];
  const normalized = raw.map((value, index) => {
    if (value.trim().length === 0) return null;
    const match = matches[index];
    return match?.format === selectedMatch.format ? match.normalized : null;
  });
  const invalidCount = normalized.filter(
    (value, index) => value === null && raw[index].trim().length > 0,
  ).length;

  return {
    type: selectedMatch.type,
    parseFormat: selectedMatch.format,
    raw,
    normalized,
    ambiguous: false,
    nullCount,
    invalidCount,
    nonNullCount,
    distinctCount: distinctCount(raw, normalized),
    exact: invalidCount === 0,
  };
}
