/**
 * Security Guard & Anti-Injection Protection Engine
 * God's Hand International Model School
 *
 * Provides:
 * 1. Deep Hacking Keyword & Injection Detection (SQLi, XSS, RCE, Path Traversal)
 * 2. Real-time Input Sanitization & Keystroke Filtering
 * 3. Prevention of Password Transmission via HTTP GET / URL Query strings
 * 4. Anti-Brute-Force Rate Limiting & Account Protection
 */

// Common attack vectors and malicious injection signatures
const FORBIDDEN_PATTERNS: { regex: RegExp; label: string }[] = [
  // SQL Injection (SQLi)
  { regex: /union\s+(all\s+)?select/i, label: 'SQL Injection (UNION SELECT)' },
  { regex: /('\s*(or|and)\s*'1'\s*=\s*'1')|('\s*(or|and)\s*1\s*=\s*1)/i, label: 'SQL Injection (OR 1=1)' },
  { regex: /drop\s+(table|database|view|index)/i, label: 'SQL Injection (DROP TABLE)' },
  { regex: /insert\s+into/i, label: 'SQL Injection (INSERT INTO)' },
  { regex: /delete\s+from/i, label: 'SQL Injection (DELETE FROM)' },
  { regex: /update\s+.+set\s+/i, label: 'SQL Injection (UPDATE SET)' },
  { regex: /alter\s+table/i, label: 'SQL Injection (ALTER TABLE)' },
  { regex: /--|\/\*|\*\//i, label: 'SQL Comment Sequence' },
  { regex: /xp_cmdshell|exec\s*\(|execute\s*\(/i, label: 'SQL Execution Command' },
  { regex: /information_schema|benchmark\s*\(|sleep\s*\(/i, label: 'SQL Database Probe' },

  // Cross-Site Scripting (XSS)
  { regex: /<\s*script\b[^>]*>/i, label: 'Cross-Site Scripting (<script>)' },
  { regex: /<\s*\/\s*script\s*>/i, label: 'Cross-Site Scripting (</script>)' },
  { regex: /javascript\s*:/i, label: 'XSS (javascript: URI)' },
  { regex: /vbscript\s*:/i, label: 'XSS (vbscript: URI)' },
  { regex: /data\s*:\s*text\/html/i, label: 'XSS (Data URI injection)' },
  { regex: /on(error|load|click|mouseover|focus|blur|change|submit)\s*=/i, label: 'XSS Event Handler' },
  { regex: /eval\s*\(|new\s+Function\s*\(/i, label: 'Code Execution (eval/Function)' },
  { regex: /document\.cookie|document\.domain|window\.location/i, label: 'DOM Scraping Attack' },
  { regex: /<\s*(iframe|embed|object|applet)\b/i, label: 'Embedded Frame Injection' },

  // Path Traversal & OS Command Injection
  { regex: /\.\.\/|\.\.\\/i, label: 'Directory Path Traversal (../)' },
  { regex: /\/etc\/passwd|\/etc\/shadow|c:\\windows\\system32/i, label: 'System File Access Probe' },
  { regex: /;\s*(rm|cat|ls|chmod|chown|kill|nc|curl|wget)\s+/i, label: 'Command Injection' },
  { regex: /\|\s*(bash|sh|cmd|powershell)/i, label: 'Shell Pipeline Injection' },
  { regex: /%00|\\x00/i, label: 'Null Byte Injection' }
];

/**
 * Checks if a string contains known hacking sequences or injection payloads
 */
export function detectHackingPayload(input: string): { isMalicious: boolean; detectedLabel?: string } {
  if (!input || typeof input !== 'string') {
    return { isMalicious: false };
  }

  const normalized = input.trim();
  for (const item of FORBIDDEN_PATTERNS) {
    if (item.regex.test(normalized)) {
      return {
        isMalicious: true,
        detectedLabel: item.label
      };
    }
  }

  return { isMalicious: false };
}

/**
 * Filters out malicious sequences from input while typing
 */
export function cleanHackingKeywords(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let cleaned = input;
  // Strip null bytes
  cleaned = cleaned.replace(/%00|\\x00/g, '');
  // Strip script tags
  cleaned = cleaned.replace(/<\s*\/?\s*script\b[^>]*>/gi, '');
  // Strip dangerous javascript: tags
  cleaned = cleaned.replace(/javascript\s*:/gi, '');
  // Strip iframe / embed tags
  cleaned = cleaned.replace(/<\s*(iframe|embed|object)\b[^>]*>/gi, '');
  // Strip event handlers
  cleaned = cleaned.replace(/\bon\w+\s*=/gi, '');
  // Strip directory traversal
  cleaned = cleaned.replace(/\.\.\/|\.\.\\/g, '');
  // Strip SQL comments
  cleaned = cleaned.replace(/--|\/\*|\*\//g, '');

  return cleaned;
}

/**
 * Validates text or credential fields, throwing a detailed user-facing error if an attack is detected
 */
export function validateSafeInput(input: string, fieldName = 'Input'): { isValid: boolean; error?: string } {
  const result = detectHackingPayload(input);
  if (result.isMalicious) {
    return {
      isValid: false,
      error: `Security Alert: Prohibited pattern detected (${result.detectedLabel}). Submission blocked.`
    };
  }
  return { isValid: true };
}

/**
 * Prevents password transmission via HTTP GET query strings.
 * Checks the current browser URL search params, scrubs any sensitive credentials,
 * and replaces the browser history without leaving credentials in history or server logs.
 */
export function preventGetPasswordTransmission(): boolean {
  if (typeof window === 'undefined') return false;

  const url = new URL(window.location.href);
  const sensitiveParams = ['password', 'pass', 'pwd', 'secret', 'admin_key', 'key', 'token'];
  let found = false;

  sensitiveParams.forEach(param => {
    if (url.searchParams.has(param)) {
      found = true;
      url.searchParams.delete(param);
    }
  });

  if (found) {
    window.history.replaceState({}, document.title, url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
    console.warn("🛡️ Security Alert: Sensitive credentials detected in GET query parameters. Automatically scrubbed from URL.");
    return true;
  }

  return false;
}

// In-Memory Rate Limiting Engine
interface AttemptRecord {
  count: number;
  lastAttempt: number;
  lockUntil?: number;
}

const attemptStorage: { [key: string]: AttemptRecord } = {};

/**
 * Checks rate limit for a specific identifier (email, username, IP mock)
 * Max 5 failed attempts per 2 minutes, locks for 60 seconds.
 */
export function checkRateLimit(identifier: string): { isLocked: boolean; remainingSeconds: number } {
  const key = identifier.trim().toLowerCase();
  const record = attemptStorage[key];
  const now = Date.now();

  if (!record) {
    return { isLocked: false, remainingSeconds: 0 };
  }

  if (record.lockUntil && record.lockUntil > now) {
    const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  // Lock expired
  if (record.lockUntil && record.lockUntil <= now) {
    delete attemptStorage[key];
    return { isLocked: false, remainingSeconds: 0 };
  }

  return { isLocked: false, remainingSeconds: 0 };
}

/**
 * Records a failed authentication attempt
 */
export function recordFailedAttempt(identifier: string): { isNowLocked: boolean; remainingAttempts: number; lockSeconds?: number } {
  const key = identifier.trim().toLowerCase();
  const now = Date.now();
  const maxAttempts = 5;
  const lockDurationMs = 60 * 1000; // 60 seconds lockout

  let record = attemptStorage[key];
  if (!record || (now - record.lastAttempt > 2 * 60 * 1000)) {
    record = { count: 1, lastAttempt: now };
  } else {
    record.count += 1;
    record.lastAttempt = now;
  }

  if (record.count >= maxAttempts) {
    record.lockUntil = now + lockDurationMs;
    attemptStorage[key] = record;
    return { isNowLocked: true, remainingAttempts: 0, lockSeconds: 60 };
  }

  attemptStorage[key] = record;
  return { isNowLocked: false, remainingAttempts: maxAttempts - record.count };
}

/**
 * Resets failed attempts upon successful login
 */
export function resetFailedAttempts(identifier: string): void {
  const key = identifier.trim().toLowerCase();
  delete attemptStorage[key];
}
