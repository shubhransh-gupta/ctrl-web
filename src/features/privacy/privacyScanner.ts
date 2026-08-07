import type { PrivacyIssue, PrivacyScanResult } from '@/shared/types';

interface PatternDef {
  type: string;
  label: string;
  regex: RegExp;
  severity: PrivacyIssue['severity'];
}

const PATTERNS: PatternDef[] = [
  {
    type: 'email',
    label: 'Email address',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    severity: 'medium',
  },
  {
    type: 'phone',
    label: 'Phone-number-like value',
    regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    severity: 'medium',
  },
  {
    type: 'ip',
    label: 'IP address',
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g,
    severity: 'high',
  },
  {
    type: 'ipv6',
    label: 'IPv6 address',
    regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    severity: 'high',
  },
  {
    type: 'jwt',
    label: 'JWT-token-like string',
    regex: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    severity: 'high',
  },
  {
    type: 'bearer',
    label: 'Bearer-token-like string',
    regex: /Bearer\s+[A-Za-z0-9._~+/=-]{20,}/gi,
    severity: 'high',
  },
  {
    type: 'api_key',
    label: 'API-token-like string',
    regex: /\b(?:sk|pk|rk|api)[_-]?(?:live|test|prod)?[_-]?[A-Za-z0-9]{20,}\b/gi,
    severity: 'high',
  },
  {
    type: 'aws_key',
    label: 'AWS-key-like string',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: 'high',
  },
  {
    type: 'github_token',
    label: 'GitHub-token-like string',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g,
    severity: 'high',
  },
  {
    type: 'credit_card',
    label: 'Credit-card-like number',
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    severity: 'high',
  },
  {
    type: 'aadhaar',
    label: 'Aadhaar-like number',
    regex: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
    severity: 'high',
  },
  {
    type: 'pan',
    label: 'PAN-like pattern',
    regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    severity: 'high',
  },
  {
    type: 'password_field',
    label: 'Password-like assignment',
    regex: /(?:password|passwd|pwd|secret)\s*[:=]\s*['"]?[^\s'"]{6,}/gi,
    severity: 'high',
  },
  {
    type: 'url_credentials',
    label: 'URL with embedded credentials',
    regex: /https?:\/\/[^:\/\s]+:[^@\s]+@[^\s]+/gi,
    severity: 'high',
  },
  {
    type: 'internal_url',
    label: 'Internal/local URL',
    regex: /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)[^\s]*/gi,
    severity: 'medium',
  },
  {
    type: 'internal_domain',
    label: 'Internal-looking domain',
    regex: /\b[a-z0-9-]+\.(?:internal|local|corp|lan|intranet)\b/gi,
    severity: 'medium',
  },
];

function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function isLikelyFalsePositive(type: string, value: string): boolean {
  if (type === 'credit_card') return !luhnCheck(value);
  if (type === 'aadhaar') {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 12) return true;
  }
  if (type === 'phone') {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return true;
  }
  return false;
}

export function scanText(text: string): PrivacyScanResult {
  const issues: PrivacyIssue[] = [];
  const seen = new Set<string>();

  for (const pattern of PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(text)) !== null) {
      const value = match[0];
      const key = `${pattern.type}:${value}`;
      if (seen.has(key)) continue;
      if (isLikelyFalsePositive(pattern.type, value)) continue;
      seen.add(key);
      issues.push({
        type: pattern.type,
        label: pattern.label,
        value,
        start: match.index,
        end: match.index + value.length,
        severity: pattern.severity,
      });
    }
  }

  return { issues, text };
}

export function redactText(text: string, issues: PrivacyIssue[]): string {
  const sorted = [...issues].sort((a, b) => b.start - a.start);
  let result = text;
  for (const issue of sorted) {
    const replacement = `[REDACTED:${issue.type}]`;
    result = result.slice(0, issue.start) + replacement + result.slice(issue.end);
  }
  return result;
}

export function scanSelectionOrPage(): PrivacyScanResult {
  const selection = window.getSelection()?.toString();
  const text = selection?.trim() || document.body.innerText.slice(0, 50000);
  return scanText(text);
}

export async function copySafeVersion(issues: PrivacyIssue[], text: string): Promise<string> {
  const safe = redactText(text, issues);
  await navigator.clipboard.writeText(safe);
  return safe;
}
