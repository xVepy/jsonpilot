
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
  CircleAlert,
  FileJson,
  ClipboardCheck,
} from 'lucide-vue-next'

type Action = 'format' | 'minify' | 'validate'
type ResultType = 'idle' | 'success' | 'error' | 'info'

const sampleJson = `{
  "name": "JSONPilot",
  "version": "1.0.0",
  "description": "Your everyday JSON workspace",
  "features": [
    "Format JSON",
    "Minify JSON",
    "Validate JSON"
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

const lineCount = computed(() => {
  return input.value.length === 0
    ? 0
    : input.value.split('\n').length
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
}

function runAction(action: Action) {
  if (!input.value.trim()) {
    output.value = ''
    resultType.value = 'info'
    message.value = 'Enter some JSON or load the example to get started.'
    return
  }

  try {
    const parsed: unknown = JSON.parse(input.value)

    if (action === 'minify') {
      output.value = JSON.stringify(parsed)
      lastAction.value = 'Minified'
      message.value = 'JSON minified successfully.'
    } else {
      output.value = JSON.stringify(parsed, null, 2)
      lastAction.value = action === 'format' ? 'Formatted' : 'Validated'
      message.value =
        action === 'format'
          ? 'JSON formatted successfully with 2-space indentation.'
          : 'Your JSON syntax is valid.'
    }

    resultType.value = 'success'
  } catch (error: unknown) {
    output.value = ''
    lastAction.value = ''

    const details =
      error instanceof Error ? error.message : 'Unknown parsing error'

    resultType.value = 'error'
    message.value = `Invalid JSON: ${details}`
  }
}

async function copyOutput() {
  if (!output.value) {
    resultType.value = 'info'
    message.value = 'There is no output to copy. Run a JSON operation first.'
    return
  }

  try {
    await navigator.clipboard.writeText(output.value)
    resultType.value = 'success'
    message.value = 'Output copied to your clipboard.'
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
  resultType.value = 'idle'
  message.value = 'Example JSON loaded. Choose an operation to begin.'
  resultType.value = 'info'
}

function clearAll() {
  input.value = ''
  output.value = ''
  lastAction.value = ''
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
          href="https://github.com"
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
          Your JSON workspace<span style="color: #38bdf8">.</span>
        </h1>

        <p class="page-description">
          Format, validate, and minify JSON without sending your data
          to a server. Simple tools for your everyday workflow.
        </p>
      </section>

      <section class="stats-grid" aria-label="Tool information">
        <article class="stat-card">
          <div class="stat-label">Available operations</div>
          <div class="stat-value">03</div>
          <div class="stat-subtitle">Format · Minify · Validate</div>
        </article>

        <article class="stat-card">
          <div class="stat-label">Data processing</div>
          <div class="stat-value">Local</div>
          <div class="stat-subtitle">Processed in your browser</div>
        </article>

        <article class="stat-card">
          <div class="stat-label">Current status</div>
          <div class="stat-value">{{ resultLabel }}</div>
          <div class="stat-subtitle">Based on your latest operation</div>
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
        </div>

        <div class="editor-grid">
          <section class="editor-panel">
            <div class="editor-toolbar">
              <div class="file-label">
                <FileJson :size="16" color="#7dd3fc" />
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

          <section class="editor-panel">
            <div class="editor-toolbar">
              <div class="file-label">
                <ClipboardCheck :size="16" color="#6ee7b7" />
                <span>Output</span>
                <span class="file-extension">RESULT</span>
              </div>

              <button
                class="btn"
                :disabled="!output"
                aria-label="Copy JSON output"
                @click="copyOutput"
              >
                <Copy :size="14" />
                Copy
              </button>
            </div>

            <div class="editor-body">
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
            </div>
          </section>
        </div>

        <div
          v-if="message"
          class="result-message"
          :class="resultType"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2
            v-if="resultType === 'success'"
            :size="16"
          />
          <CircleAlert
            v-else-if="resultType === 'error'"
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
        Use <kbd>Tab</kbd> in the editor to insert indentation.
      </p>
    </main>
  </div>
</template>
