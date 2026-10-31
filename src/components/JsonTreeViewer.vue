<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import {
  Search,
  ChevronsUpDown,
  Minimize2,
  CircleAlert,
  Network,
  X,
  Layers,
} from 'lucide-vue-next'
import JsonTreeNode from './JsonTreeNode.vue'
import { analyzeJson, type SmartJsonError } from '../utils/jsonErrorDetector'

const props = defineProps<{
  jsonText: string
}>()

const searchQuery = ref('')
const expandAllSignal = ref(0)
const collapseAllSignal = ref(0)

provide('expandAllSignal', expandAllSignal)
provide('collapseAllSignal', collapseAllSignal)
provide('searchQuery', searchQuery)

const parsed = computed(() => {
  if (!props.jsonText.trim()) {
    return {
      empty: true,
      valid: false,
      value: null,
      error: '',
      diagnosis: null as SmartJsonError | null,
    }
  }

  try {
    const val: unknown = JSON.parse(props.jsonText)
    return {
      empty: false,
      valid: true,
      value: val,
      error: '',
      diagnosis: null as SmartJsonError | null,
    }
  } catch {
    const diagnosis = analyzeJson(props.jsonText)
    return {
      empty: false,
      valid: false,
      value: null,
      error: diagnosis.message,
      diagnosis,
    }
  }
})

// Count total nodes recursively (capped for performance)
const nodeCount = computed(() => {
  if (!parsed.value.valid || parsed.value.value === null) return 0

  let count = 0
  function walk(item: unknown) {
    count++
    if (count > 5000) return
    if (item && typeof item === 'object') {
      if (Array.isArray(item)) {
        for (const child of item) walk(child)
      } else {
        for (const val of Object.values(item)) walk(val)
      }
    }
  }

  walk(parsed.value.value)
  return count
})

function expandAll() {
  expandAllSignal.value++
}

function collapseAll() {
  collapseAllSignal.value++
}

function clearSearch() {
  searchQuery.value = ''
}
</script>

<template>
  <div class="tree-viewer-container">
    <!-- Tree Toolbar (visible when valid JSON exists) -->
    <div v-if="parsed.valid" class="tree-toolbar">
      <div class="search-box">
        <Search :size="13" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter keys or values..."
          class="search-input"
          spellcheck="false"
        />
        <button
          v-if="searchQuery"
          class="clear-search-btn"
          aria-label="Clear filter"
          @click="clearSearch"
        >
          <X :size="12" />
        </button>
      </div>

      <div class="tree-actions">
        <button
          class="tree-tool-btn"
          title="Expand all nodes"
          @click="expandAll"
        >
          <ChevronsUpDown :size="13" />
          <span>Expand all</span>
        </button>

        <button
          class="tree-tool-btn"
          title="Collapse all nodes"
          @click="collapseAll"
        >
          <Minimize2 :size="13" />
          <span>Collapse all</span>
        </button>

        <div class="node-count-badge" title="Total element count">
          <Layers :size="12" />
          <span>{{ nodeCount }}{{ nodeCount >= 5000 ? '+' : '' }} items</span>
        </div>
      </div>
    </div>

    <!-- Tree Body -->
    <div class="tree-viewport">
      <!-- Empty state -->
      <div v-if="parsed.empty" class="tree-empty-state">
        <Network :size="34" class="empty-icon" />
        <strong class="empty-title">Nothing to visualize yet</strong>
        <p class="empty-desc">
          Enter valid JSON in the editor to inspect its hierarchical structure.
        </p>
      </div>

      <!-- Parse Error state -->
      <div v-else-if="!parsed.valid" class="tree-error-state">
        <div class="error-badge">
          <CircleAlert :size="18" />
          <span>{{ parsed.diagnosis?.title || 'Invalid JSON' }}</span>
          <span v-if="parsed.diagnosis?.line" style="font-size: 11px; opacity: 0.85; font-family: monospace;">
            (Line {{ parsed.diagnosis.line }}, Col {{ parsed.diagnosis.column }})
          </span>
        </div>
        <p class="error-desc">{{ parsed.diagnosis?.suggestion || parsed.error }}</p>
        <span class="error-hint">
          Switch to Code view to inspect diagnostics or use Auto-Fix.
        </span>
      </div>

      <!-- Rendered Tree -->
      <div v-else class="tree-root-wrapper">
        <JsonTreeNode
          name="root"
          :value="parsed.value"
          :depth="0"
          path="root"
          :is-last="true"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tree-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 360px;
  background: #0b111a;
  overflow: hidden;
}

.tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 16px;
  background: #0f1724;
  border-bottom: 1px solid #1c2736;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 260px;
  min-width: 160px;
}

.search-icon {
  position: absolute;
  left: 9px;
  color: #64748b;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 5px 26px 5px 28px;
  background: #090e17;
  border: 1px solid #202a39;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 11.5px;
  outline: none;
  transition: border-color 150ms ease;
}

.search-input:focus {
  border-color: #64748b;
}

.search-input::placeholder {
  color: #475569;
}

.clear-search-btn {
  position: absolute;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 3px;
}

.clear-search-btn:hover {
  color: #cbd5e1;
}

.tree-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tree-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border: 1px solid #263345;
  border-radius: 6px;
  background: #141d2a;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
}

.tree-tool-btn:hover {
  background: #1e293b;
  color: #e2e8f0;
  border-color: #64748b;
}

.node-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 6px;
  background: #090e17;
  border: 1px solid #1c2736;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 600;
}

.tree-viewport {
  flex: 1;
  padding: 16px 18px;
  overflow: auto;
  max-height: 580px;
}

.tree-root-wrapper {
  min-width: max-content;
}

/* Empty State */
.tree-empty-state {
  display: grid;
  min-height: 320px;
  place-content: center;
  justify-items: center;
  gap: 10px;
  padding: 24px;
  color: #64748b;
  text-align: center;
}

.empty-icon {
  color: #38485e;
}

.empty-title {
  color: #a8b5c7;
  font-size: 13px;
}

.empty-desc {
  max-width: 260px;
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
}

/* Error State */
.tree-error-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  margin: 12px 0;
  border: 1px solid rgba(248, 113, 113, 0.25);
  border-radius: 8px;
  background: rgba(42, 17, 23, 0.7);
}

.error-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #fca5a5;
  font-size: 13px;
  font-weight: 600;
}

.error-desc {
  margin: 0;
  color: #f87171;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
}

.error-hint {
  color: #94a3b8;
  font-size: 11.5px;
}
</style>
