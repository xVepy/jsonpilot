<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertTriangle,
  Wrench,
  Sparkles,
  Info,
  Copy,
  Check,
} from 'lucide-vue-next'
import { ref } from 'vue'
import type { SmartJsonError } from '../utils/jsonErrorDetector'

const props = defineProps<{
  error: SmartJsonError
}>()

const emit = defineEmits<{
  (e: 'apply-fix'): void
}>()

const copied = ref(false)

const categoryLabel = computed(() => {
  switch (props.error.category) {
    case 'trailing-comma':
      return 'Trailing Comma'
    case 'single-quote':
      return 'Single Quotes'
    case 'unquoted-key':
      return 'Unquoted Key'
    case 'missing-comma':
      return 'Missing Comma'
    case 'comment':
      return 'Invalid Comment'
    case 'unclosed-bracket':
      return 'Unclosed Bracket'
    case 'python-literal':
      return 'Python Literal'
    default:
      return 'Syntax Error'
  }
})

function copyDetails() {
  const text = `[JSONPilot Diagnostic]
Issue: ${props.error.title} (${categoryLabel.value})
Location: Line ${props.error.line}, Column ${props.error.column}
Raw Error: ${props.error.message}
Suggestion: ${props.error.suggestion}`

  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  })
}
</script>

<template>
  <aside
    class="smart-error-card"
    role="alert"
    aria-label="Smart JSON error diagnosis"
  >
    <!-- Card Header -->
    <div class="smart-error-header">
      <div class="smart-error-title-row">
        <span class="error-badge-icon">
          <AlertTriangle :size="16" />
        </span>
        <div class="title-meta">
          <strong class="error-title">{{ error.title }}</strong>
          <div class="tags-row">
            <span class="category-pill">{{ categoryLabel }}</span>
            <span v-if="error.line" class="position-pill">
              Line {{ error.line }}, Col {{ error.column }}
            </span>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <button
          class="btn-icon"
          title="Copy error diagnostic"
          aria-label="Copy error diagnostic"
          @click="copyDetails"
        >
          <Check v-if="copied" :size="13" color="#34d399" />
          <Copy v-else :size="13" />
          <span>{{ copied ? 'Copied' : 'Copy details' }}</span>
        </button>
      </div>
    </div>

    <!-- Suggestion Box -->
    <div class="smart-suggestion">
      <Info :size="15" class="suggestion-icon" />
      <span class="suggestion-text">{{ error.suggestion }}</span>
    </div>

    <!-- Code Snippet Preview -->
    <div v-if="error.previewLines.length" class="code-preview-box">
      <div class="preview-header">
        <span>Location Preview</span>
      </div>
      <div class="preview-content font-mono">
        <div
          v-for="p in error.previewLines"
          :key="p.lineNum"
          class="preview-line-wrapper"
          :class="{ 'is-error-line': p.isError }"
        >
          <span class="line-num-gutter">
            <span v-if="p.isError" class="gutter-arrow">&gt;</span>
            <span v-else class="gutter-arrow">&nbsp;</span>
            {{ p.lineNum }}
          </span>
          <pre class="line-code-text">{{ p.content || ' ' }}</pre>

          <!-- Pointer Indicator on Error Line -->
          <div
            v-if="p.isError && error.pointerCol"
            class="pointer-line"
            aria-hidden="true"
          >
            <span class="line-num-gutter">&nbsp;</span>
            <pre class="pointer-track"><span :style="{ display: 'inline-block', width: `${Math.max(0, (error.pointerCol || 1) - 1)}ch` }"></span><span class="caret">^</span></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Auto-Fix Action Bar -->
    <div v-if="error.canAutoFix" class="auto-fix-banner">
      <div class="fix-info">
        <Sparkles :size="15" class="fix-icon" />
        <div>
          <span class="fix-title">Quick Fix Available</span>
          <p class="fix-desc">{{ error.autoFixDescription || 'Automatically resolve common syntax issues.' }}</p>
        </div>
      </div>

      <button class="btn btn-fix" @click="emit('apply-fix')">
        <Wrench :size="13" />
        <span>Auto-Fix This</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.smart-error-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  background: #180d12;
  border-top: 1px solid #4a1d24;
  border-bottom: 1px solid #4a1d24;
  color: #fecdd3;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.smart-error-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.smart-error-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-badge-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #3f121a;
  color: #f87171;
  border: 1px solid #5c1d28;
  flex-shrink: 0;
}

.title-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.error-title {
  color: #fca5a5;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.2px;
}

.tags-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.category-pill {
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 9999px;
  background: #38151c;
  color: #fda4af;
  border: 1px solid #5a1f29;
}

.position-pill {
  padding: 2px 7px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 500;
  border-radius: 9999px;
  background: #251217;
  color: #f43f5e;
  border: 1px solid #4c1822;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 6px;
  background: #231116;
  border: 1px solid #4a1c24;
  color: #e2e8f0;
  font-size: 11px;
  transition: all 0.15s ease;
}

.btn-icon:hover {
  background: #36171e;
  border-color: #63232f;
  color: #fff;
}

.smart-suggestion {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #fda4af;
}

.suggestion-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: #fb7185;
}

.suggestion-text {
  flex: 1;
}

.code-preview-box {
  background: #0f0709;
  border: 1px solid #36141a;
  border-radius: 8px;
  overflow: hidden;
  font-size: 12px;
}

.preview-header {
  padding: 5px 12px;
  background: #170b0e;
  border-bottom: 1px solid #301116;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #a87d85;
}

.preview-content {
  padding: 8px 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.preview-line-wrapper {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  padding: 1px 12px;
}

.preview-line-wrapper.is-error-line {
  background: rgba(225, 29, 72, 0.15);
}

.line-num-gutter {
  width: 44px;
  flex-shrink: 0;
  color: #7f535a;
  user-select: none;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.gutter-arrow {
  color: #f43f5e;
  font-weight: bold;
}

.line-code-text {
  margin: 0;
  flex: 1;
  color: #fce7f3;
  white-space: pre-wrap;
  word-break: break-all;
}

.is-error-line .line-code-text {
  color: #fff;
  font-weight: 500;
}

.pointer-line {
  width: 100%;
  display: flex;
  margin-top: -2px;
  margin-bottom: 2px;
}

.pointer-track {
  margin: 0;
  flex: 1;
  color: #f43f5e;
  font-weight: bold;
}

.caret {
  color: #f43f5e;
  font-size: 13px;
  line-height: 1;
}

.auto-fix-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 14px;
  background: #191e2b;
  border: 1px solid #283e58;
  border-radius: 8px;
}

.fix-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fix-icon {
  color: #38bdf8;
  flex-shrink: 0;
}

.fix-title {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #7dd3fc;
}

.fix-desc {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
}

.btn-fix {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #0284c7;
  color: #fff;
  border: 1px solid #38bdf8;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-fix:hover {
  background: #0369a1;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
}
</style>
