<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Braces,
  Github,
  ShieldCheck,
  Zap,
  Code2,
  AlignLeft,
  Minimize2,
  CheckCircle2,
  Copy,
  Trash2,
  RotateCcw,
  FileJson,
  ClipboardCheck,
  Network,
} from 'lucide-vue-next'
import JsonTreeViewer from './components/JsonTreeViewer.vue'
import SmartErrorAlert from './components/SmartErrorAlert.vue'
import { analyzeJson, autoFixJson, type SmartJsonError } from './utils/jsonErrorDetector'

type Action = 'format' | 'minify' | 'validate' | 'tree'
type ResultType = 'idle' | 'success' | 'error' | 'info'

const outputMode = ref<'text' | 'tree'>('text')

const sampleJson = `{
  "name": "JSONPilot",
  "version": "1.0.0",
  "description": "Your everyday JSON workspace",
  "features": [
    "Format JSON",
    "Minify JSON",
    "Validate JSON",
    "Tree View"
  ],
  "openSource": true,
  "settings": {
    "theme": "dark",
    "indent": 2
  }
}`

const input = ref(sampleJson)
const output = ref('')
const resultType = ref<ResultType>('idle')
const message = ref('')
const lastAction = ref('')
const smartError = ref<SmartJsonError | null>(null)

const lineCount = computed(() => {
  return input.value.length === 0 ? 0 : input.value.split('\n').length
})

const characterCount = computed(() => input.value.length)

const resultLabel = computed(() => {
  if (resultType.value === 'success') return 'Valid JSON'
  if (resultType.value === 'error') return 'Needs attention'
  if (resultType.value === 'info') return 'Ready'
  return 'Awaiting input'
})

function resetStatus() {
  resultType.value = 'idle'
  message.value = ''
  lastAction.value = ''
  smartError.value = null
}

function runAction(action: Action) {
  if (!input.value.trim()) {
    output.value = ''
    resultType.value = 'info'
    message.value = 'Enter some JSON or load the example to get started.'
    smartError.value = null
    return
  }

  try {
    const parsed: unknown = JSON.parse(input.value)
    smartError.value = null

    if (action === 'minify') {
      output.value = JSON.stringify(parsed)
      outputMode.value = 'text'
      lastAction.value = 'Minified'
      message.value = 'JSON minified successfully.'
    } else if (action === 'format') {
      output.value = JSON.stringify(parsed, null, 2)
      outputMode.value = 'text'
      lastAction.value = 'Formatted'
      message.value = 'JSON formatted successfully with 2-space indentation.'
    } else if (action === 'validate') {
      output.value = JSON.stringify(parsed, null, 2)
      lastAction.value = 'Validated'
      message.value = 'Your JSON syntax is valid.'
    } else if (action === 'tree') {
      output.value = JSON.stringify(parsed, null, 2)
      outputMode.value = 'tree'
      lastAction.value = 'Tree View'
      message.value = 'JSON tree structure generated successfully.'
    }

    resultType.value = 'success'
  } catch (_error: unknown) {
    lastAction.value = ''

    const diagnosis = analyzeJson(input.value)
    smartError.value = diagnosis

    resultType.value = 'error'
    message.value = diagnosis.title
      ? `${diagnosis.title}: ${diagnosis.suggestion}`
      : `Invalid JSON: ${diagnosis.message}`

    if (action === 'tree') {
      outputMode.value = 'tree'
    }
  }
}

function handleAutoFix() {
  const result = autoFixJson(input.value)
  if (result.fixes.length > 0) {
    input.value = result.fixed
    runAction('format')
    message.value = `Auto-fixed successfully (${result.fixes.join(', ')}). Formatted with 2-space indentation.`
  }
}

function setOutputMode(mode: 'text' | 'tree') {
  outputMode.value = mode
  if (mode === 'tree' && !output.value && input.value.trim()) {
    try {
      const parsed: unknown = JSON.parse(input.value)
      output.value = JSON.stringify(parsed, null, 2)
    } catch {
      // Let JsonTreeViewer handle and display error
    }
  }
}

async function copyOutput() {
  const textToCopy = output.value || input.value
  if (!textToCopy) {
    resultType.value = 'info'
    message.value = 'There is no JSON to copy. Run an operation first.'
    return
  }

  try {
    await navigator.clipboard.writeText(textToCopy)
    resultType.value = 'success'
    message.value = 'JSON copied to your clipboard.'
  } catch {
    resultType.value = 'error'
    message.value =
      'Clipboard access failed. Select the output and copy it manually.'
  }
}

function loadSample() {
  input.value = sampleJson
  output.value = ''
  lastAction.value = ''
  smartError.value = null
  resultType.value = 'info'
  message.value = 'Example JSON loaded. Choose an operation to begin.'
}

function clearAll() {
  input.value = ''
  output.value = ''
  lastAction.value = ''
  smartError.value = null
  resultType.value = 'idle'
  message.value = ''
}

function handleTab(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    event.preventDefault()

    const textarea = event.target as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    input.value =
      input.value.substring(0, start) +
      '  ' +
      input.value.substring(end)

    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2
    })
  }

  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    runAction('format')
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="JSONPilot home">
        <span class="brand-mark">
          <Braces :size="21" />
        </span>
        <span>JSONPilot</span>
      </a>

      <div class="topbar-right">
        <div class="topbar-status">
          <span class="status-dot"></span>
          <span>Browser processing enabled</span>
        </div>

        <a
          class="github-link"
          href="https://github.com/xVepy/jsonpilot"
          target="_blank"
          rel="noreferrer"
        >
          <Github :size="17" />
          <span>Open Source</span>
        </a>
      </div>
    </header>

    <main class="workspace">
      <section>
        <div class="eyebrow">Developer tools / JSON utilities</div>

        <h1 class="page-heading">
          Your JSON workspace<span style="color: #94a3b8">.</span>
        </h1>

        <p class="page-description">
          Format, validate, minify, and explore JSON in an interactive tree without sending your data
          to a server. Simple tools for your everyday workflow.
        </p>
      </section>

      <section class="stats-grid" aria-label="Tool information">
        <article class="stat-card">
          <div class="stat-label">Available operations</div>
          <div class="stat-value">04</div>
          <div class="stat-subtitle">Format · Minify · Validate · Tree</div>
        </article>

        <article class="stat-card">
          <div class="stat-label">Data processing</div>
          <div class="stat-value">Local</div>
          <div class="stat-subtitle">Processed in your browser</div>
        </article>

        <article class="stat-card">
          <div class="stat-label">Current status</div>
          <div class="stat-value" :style="resultType === 'error' ? 'color: #f87171' : ''">{{ resultLabel }}</div>
          <div class="stat-subtitle">{{ smartError && smartError.line ? `${smartError.title} (Line ${smartError.line})` : 'Based on your latest operation' }}</div>
        </article>
      </section>

      <section class="tool-panel">
        <div class="panel-header">
          <div class="section-title">
            <span class="section-icon">
              <Code2 :size="17" />
            </span>
            <span>JSON Editor</span>
          </div>

          <div class="panel-actions">
            <button class="btn" @click="loadSample">
              <RotateCcw :size="14" />
              Load example
            </button>

            <button class="btn" @click="clearAll">
              <Trash2 :size="14" />
              Clear
            </button>
          </div>
        </div>

        <!-- Action Buttons Row -->
        <div class="button-row" style="padding: 14px 18px; border-bottom: 1px solid #202a39">
          <button
            class="btn btn-primary"
            @click="runAction('format')"
          >
            <AlignLeft :size="15" />
            Format JSON
          </button>

          <button
            class="btn"
            @click="runAction('minify')"
          >
            <Minimize2 :size="15" />
            Minify
          </button>

          <button
            class="btn"
            @click="runAction('validate')"
          >
            <CheckCircle2 :size="15" />
            Validate
          </button>

          <!-- JsonTree Button right next to validate -->
          <button
            class="btn"
            :class="{ 'btn-active': outputMode === 'tree' }"
            @click="runAction('tree')"
          >
            <Network :size="15" />
            Tree View
          </button>
        </div>

        <div class="editor-grid">
          <!-- Input Editor -->
          <section class="editor-panel">
            <div class="editor-toolbar">
              <div class="file-label">
                <FileJson :size="16" color="#94a3b8" />
                <span>Input</span>
                <span class="file-extension">JSON</span>
              </div>

              <span class="editor-meta">
                {{ lineCount }} lines
              </span>
            </div>

            <div class="editor-body">
              <textarea
                v-model="input"
                class="code-editor"
                aria-label="JSON input editor"
                placeholder="Paste or type your JSON here..."
                spellcheck="false"
                autocomplete="off"
                autocapitalize="off"
                @input="resetStatus"
                @keydown="handleTab"
              ></textarea>
            </div>
          </section>

          <!-- Output Panel -->
          <section class="editor-panel">
            <div class="editor-toolbar">
              <div class="file-label">
                <ClipboardCheck :size="16" color="#6ee7b7" />
                <span>Output</span>
                <span class="file-extension">{{ outputMode === 'tree' ? 'TREE' : 'RESULT' }}</span>
              </div>

              <div class="toolbar-actions">
                <!-- Mode switcher: Code / Tree -->
                <div class="view-tabs" role="tablist" aria-label="Output view mode">
                  <button
                    class="view-tab"
                    :class="{ active: outputMode === 'text' }"
                    role="tab"
                    :aria-selected="outputMode === 'text'"
                    title="Code View"
                    @click="setOutputMode('text')"
                  >
                    <Code2 :size="12" />
                    <span>Code</span>
                  </button>
                  <button
                    class="view-tab"
                    :class="{ active: outputMode === 'tree' }"
                    role="tab"
                    :aria-selected="outputMode === 'tree'"
                    title="Tree View"
                    @click="setOutputMode('tree')"
                  >
                    <Network :size="12" />
                    <span>Tree</span>
                  </button>
                </div>

                <button
                  class="btn"
                  :disabled="!output && !input"
                  aria-label="Copy JSON output"
                  @click="copyOutput"
                >
                  <Copy :size="14" />
                  Copy
                </button>
              </div>
            </div>

            <div class="editor-body">
              <!-- Interactive Tree View Mode -->
              <JsonTreeViewer
                v-if="outputMode === 'tree'"
                :json-text="input"
              />

              <!-- Standard Code / Formatted Output Mode -->
              <template v-else>
                <pre
                  v-if="output"
                  class="output-content"
                  aria-label="JSON output"
                ><code>{{ output }}</code></pre>

                <div v-else class="output-empty">
                  <Braces :size="32" />
                  <strong>Nothing here yet</strong>
                  <p>
                    Your processed JSON will appear here when you run
                    an operation.
                  </p>
                </div>
              </template>
            </div>
          </section>
        </div>

        <!-- Smart Error Diagnostic Card -->
        <SmartErrorAlert
          v-if="resultType === 'error' && smartError"
          :error="smartError"
          @apply-fix="handleAutoFix"
        />

        <div
          v-else-if="message"
          class="result-message"
          :class="resultType"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2
            v-if="resultType === 'success'"
            :size="16"
          />
          <Zap v-else :size="16" />

          <span>{{ message }}</span>
        </div>

        <footer class="panel-footer">
          <div class="status-left">
            <span class="status-item">
              <ShieldCheck :size="14" color="#34d399" />
              Local processing
            </span>

            <span class="status-item">
              {{ characterCount }} characters
            </span>
          </div>

          <div class="status-right">
            <span class="status-item">
              <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
              Format
            </span>
            <span>JSONPilot v1.0.0</span>
          </div>
        </footer>
      </section>

      <p class="tool-hint">
        <strong style="color: #a8b5c7">Quick tip:</strong>
        Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to format JSON.
        Click <strong style="color: #cbd5e1">Tree View</strong> next to Validate to visualize nested nodes.
      </p>
    </main>
  </div>
</template>
