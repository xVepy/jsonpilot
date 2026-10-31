export interface CodeSnippetPreview {
  lineNum: number
  content: string
  isError: boolean
}

export type ErrorCategory =
  | 'trailing-comma'
  | 'single-quote'
  | 'unquoted-key'
  | 'missing-comma'
  | 'comment'
  | 'unclosed-bracket'
  | 'unclosed-string'
  | 'python-literal'
  | 'invalid-number'
  | 'general'

export interface SmartJsonError {
  isValid: boolean
  message: string
  title: string
  line?: number
  column?: number
  position?: number
  category: ErrorCategory
  suggestion: string
  previewLines: CodeSnippetPreview[]
  pointerCol?: number
  canAutoFix: boolean
  autoFixDescription?: string
}

/**
 * Parses raw JSON and performs smart diagnostics if parsing fails.
 */
export function analyzeJson(raw: string): SmartJsonError {
  if (!raw.trim()) {
    return {
      isValid: true,
      message: '',
      title: 'Valid',
      category: 'general',
      suggestion: '',
      previewLines: [],
      canAutoFix: false,
    }
  }

  try {
    JSON.parse(raw)
    return {
      isValid: true,
      message: '',
      title: 'Valid JSON',
      category: 'general',
      suggestion: '',
      previewLines: [],
      canAutoFix: false,
    }
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : String(err)
    return diagnoseJsonError(raw, rawError)
  }
}

/**
 * Extracts line, column and position from JSON.parse error message or scans character offsets.
 */
function extractErrorPosition(
  raw: string,
  errorMsg: string
): { line: number; column: number; position: number } {
  const lines = raw.split('\n')
  let line = 1
  let column = 1
  let position = -1

  // Format 1: "... at position 123 (line 4 column 5)"
  const posLineColMatch = errorMsg.match(/position\s+(\d+)\s*\(line\s+(\d+)\s+column\s+(\d+)\)/i)
  if (posLineColMatch) {
    position = parseInt(posLineColMatch[1], 10)
    line = parseInt(posLineColMatch[2], 10)
    column = parseInt(posLineColMatch[3], 10)
    return { line, column, position }
  }

  // Format 2: "... line 4 column 5"
  const lineColMatch = errorMsg.match(/line\s+(\d+)\s+column\s+(\d+)/i)
  if (lineColMatch) {
    line = parseInt(lineColMatch[1], 10)
    column = parseInt(lineColMatch[2], 10)
    // calculate position from line & column
    position = 0
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      position += lines[i].length + 1
    }
    position += column - 1
    return { line, column, position }
  }

  // Format 3: "... at position 123"
  const posMatch = errorMsg.match(/position\s+(\d+)/i)
  if (posMatch) {
    position = parseInt(posMatch[1], 10)
    let charCount = 0
    for (let i = 0; i < lines.length; i++) {
      const lineLen = lines[i].length + 1 // +1 for newline
      if (charCount + lineLen > position || i === lines.length - 1) {
        line = i + 1
        column = Math.max(1, position - charCount + 1)
        break
      }
      charCount += lineLen
    }
    return { line, column, position }
  }

  // Fallback: estimate from scanning
  return { line: 1, column: 1, position: 0 }
}

/**
 * Diagnoses the root cause of the error, categorizes it, and builds a smart snippet & suggestion.
 */
function diagnoseJsonError(raw: string, rawError: string): SmartJsonError {
  const { line, column, position } = extractErrorPosition(raw, rawError)
  const lines = raw.split('\n')

  let category: ErrorCategory = 'general'
  let title = 'Syntax Error'
  let suggestion = 'Check your syntax near the highlighted character.'
  let canAutoFix = false
  let autoFixDescription = ''

  // 1. Check for Comments: // or /* */
  const hasLineComment = /(^|[^\\])\/\/.*/.test(raw)
  const hasBlockComment = /\/\*[\s\S]*?\*\//.test(raw)
  if (hasLineComment || hasBlockComment) {
    category = 'comment'
    title = 'Comment in JSON Detected'
    suggestion =
      'Standard JSON does not permit comments. Remove the JavaScript comments (// or /* */).'
    canAutoFix = true
    autoFixDescription = 'Remove all comments automatically'
  }

  // 2. Check for Python-like literals (True, False, None)
  else if (/\b(True|False|None)\b/.test(raw)) {
    category = 'python-literal'
    title = 'Python Literal Detected'
    suggestion =
      'JSON requires lowercase booleans and null. Replace `True` with `true`, `False` with `false`, and `None` with `null`.'
    canAutoFix = true
    autoFixDescription = 'Convert Python literals to valid JSON (true, false, null)'
  }

  // 3. Check for Trailing Comma: comma before closing } or ]
  else if (/,\s*([}\]])/.test(raw)) {
    category = 'trailing-comma'
    title = 'Trailing Comma Detected'
    suggestion =
      'JSON does not allow trailing commas before a closing bracket `]` or brace `}`. Remove the extra comma.'
    canAutoFix = true
    autoFixDescription = 'Remove trailing commas'
  }

  // 4. Check for Single Quotes instead of Double Quotes
  else if (/'([^'\\]|\\.)*'/.test(raw) || /'[^']*'\s*:/.test(raw)) {
    category = 'single-quote'
    title = 'Single-Quoted String or Key'
    suggestion =
      'JSON strictly requires double quotes (") for strings and object keys. Replace single quotes (\') with double quotes (").'
    canAutoFix = true
    autoFixDescription = 'Convert single quotes to double quotes'
  }

  // 5. Check for Unquoted Keys: { key: "value" }
  else if (/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/.test(raw)) {
    category = 'unquoted-key'
    title = 'Unquoted Object Key'
    suggestion =
      'In JSON, all object property keys must be enclosed in double quotes (e.g. `"key": value`).'
    canAutoFix = true
    autoFixDescription = 'Wrap unquoted keys in double quotes'
  }

  // 6. Check for Missing Commas between properties/items
  else if (
    /("[^"]*"\s*:\s*(?:"[^"]*"|\d+|true|false|null|[}\]])\s+("[^"]*"\s*:|{|\[))/.test(raw) ||
    /rawError/i.test('unexpected token')
  ) {
    const errorLineContent = lines[line - 1] || ''
    // Check if error is around unclosed brackets or quotes
    const openBraces = (raw.match(/{/g) || []).length
    const closeBraces = (raw.match(/}/g) || []).length
    const openBrackets = (raw.match(/\[/g) || []).length
    const closeBrackets = (raw.match(/\]/g) || []).length

    if (openBraces !== closeBraces) {
      category = 'unclosed-bracket'
      title = openBraces > closeBraces ? 'Unclosed Brace `{`' : 'Extra Closing Brace `}`'
      suggestion =
        openBraces > closeBraces
          ? `Missing ${openBraces - closeBraces} closing brace(s) '}'.`
          : `Extra ${closeBraces - openBraces} closing brace(s) '}'.`
    } else if (openBrackets !== closeBrackets) {
      category = 'unclosed-bracket'
      title = openBrackets > closeBrackets ? 'Unclosed Bracket `[`' : 'Extra Closing Bracket `]`'
      suggestion =
        openBrackets > closeBrackets
          ? `Missing ${openBrackets - closeBrackets} closing bracket(s) ']'.`
          : `Extra ${closeBrackets - openBrackets} closing bracket(s) ']'.`
    } else if (errorLineContent.trim().length > 0) {
      category = 'missing-comma'
      title = 'Missing Comma or Separator'
      suggestion =
        'Items in arrays or properties in objects must be separated by commas `,`. Check if a comma is missing on this or the preceding line.'
    }
  }

  // Generate code snippet preview (up to 3 context lines: before, error line, after)
  const previewLines: CodeSnippetPreview[] = []
  const startLine = Math.max(1, line - 1)
  const endLine = Math.min(lines.length, line + 1)

  for (let i = startLine; i <= endLine; i++) {
    previewLines.push({
      lineNum: i,
      content: lines[i - 1] ?? '',
      isError: i === line,
    })
  }

  // Pointer position column (1-based)
  const pointerCol = Math.max(1, Math.min(column, (lines[line - 1] ?? '').length + 1))

  return {
    isValid: false,
    message: rawError,
    title,
    line,
    column,
    position: position >= 0 ? position : undefined,
    category,
    suggestion,
    previewLines,
    pointerCol,
    canAutoFix,
    autoFixDescription,
  }
}

/**
 * Intelligent JSON Auto-Fixer:
 * Automatically cleans comments, converts Python literals, single quotes, unquoted keys, and trailing commas.
 */
export function autoFixJson(raw: string): { fixed: string; success: boolean; fixes: string[] } {
  let content = raw
  const fixes: string[] = []

  // 1. Remove JavaScript comments (preserving URLs like https://)
  const beforeComments = content
  // Remove multi-line comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, '')
  // Remove single-line comments not inside quotes
  content = content.replace(/(^|[^:])\/\/.*$/gm, '$1')
  if (beforeComments !== content) {
    fixes.push('Removed comments')
  }

  // 2. Convert Python literals: True -> true, False -> false, None -> null
  const beforePython = content
  content = content.replace(/\bTrue\b/g, 'true')
  content = content.replace(/\bFalse\b/g, 'false')
  content = content.replace(/\bNone\b/g, 'null')
  if (beforePython !== content) {
    fixes.push('Converted Python literals (True/False/None) to JSON')
  }

  // 3. Remove trailing commas in arrays & objects: , \s* } or , \s* ]
  const beforeTrailing = content
  content = content.replace(/,(\s*[}\]])/g, '$1')
  if (beforeTrailing !== content) {
    fixes.push('Removed trailing commas')
  }

  // 4. Convert single quotes to double quotes for strings & keys
  // Match 'string' and convert to "string" with escaped internal double quotes
  const beforeSingle = content
  content = content.replace(/'((?:\\.|[^'])*)'/g, (_match, group) => {
    // Unescape escaped single quotes, escape unescaped double quotes
    const unescaped = group.replace(/\\'/g, "'").replace(/"/g, '\\"')
    return `"${unescaped}"`
  })
  if (beforeSingle !== content) {
    fixes.push('Replaced single quotes with double quotes')
  }

  // 5. Wrap unquoted keys: { key: "value" } -> { "key": "value" }
  const beforeKeys = content
  content = content.replace(
    /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g,
    '$1"$2":'
  )
  if (beforeKeys !== content) {
    fixes.push('Enclosed unquoted object keys in double quotes')
  }

  // Verify if fixed output is valid JSON
  let success = false
  try {
    JSON.parse(content)
    success = true
  } catch {
    success = false
  }

  return {
    fixed: content,
    success,
    fixes,
  }
}
