<script setup lang="ts">
import { computed, inject, ref, watch, type Ref } from 'vue'
import {
  ChevronRight,
  Copy,
  Check,
} from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    name: string | number
    value: unknown
    depth?: number
    path?: string
    isLast?: boolean
  }>(),
  {
    depth: 0,
    path: '',
    isLast: true,
  }
)

const expandAllSignal = inject<Ref<number>>('expandAllSignal', ref(0))
const collapseAllSignal = inject<Ref<number>>('collapseAllSignal', ref(0))
const searchQuery = inject<Ref<string>>('searchQuery', ref(''))

// Expand by default for the first 2 levels
const expanded = ref(props.depth < 2)
const copied = ref(false)

watch(expandAllSignal, (val) => {
  if (val > 0) expanded.value = true
})

watch(collapseAllSignal, (val) => {
  if (val > 0) expanded.value = false
})

const isObject = computed(() => {
  return props.value !== null && typeof props.value === 'object'
})

const isArray = computed(() => Array.isArray(props.value))

const entries = computed<[string | number, unknown][]>(() => {
  if (isArray.value) {
    return (props.value as unknown[]).map((item, index) => [index, item])
  }
  if (isObject.value && props.value !== null) {
    return Object.entries(props.value as Record<string, unknown>)
  }
  return []
})

const childCount = computed(() => entries.value.length)

const typeLabel = computed<'string' | 'number' | 'boolean' | 'null' | 'array' | 'object'>(() => {
  if (props.value === null) return 'null'
  if (isArray.value) return 'array'
  if (typeof props.value === 'string') return 'string'
  if (typeof props.value === 'number') return 'number'
  if (typeof props.value === 'boolean') return 'boolean'
  return 'object'
})

const formattedValue = computed(() => {
  if (typeof props.value === 'string') {
    return `"${props.value}"`
  }
  if (props.value === null) {
    return 'null'
  }
  if (typeof props.value === 'undefined') {
    return 'undefined'
  }
  return String(props.value)
})

const collapsedPreview = computed(() => {
  if (isArray.value) {
    const arr = props.value as unknown[]
    if (arr.length === 0) return '[]'
    const previewItems = arr.slice(0, 3).map((item) => {
      if (item === null) return 'null'
      if (typeof item === 'object') return Array.isArray(item) ? '[...]' : '{...}'
      if (typeof item === 'string') return `"${item.length > 15 ? item.slice(0, 15) + '…' : item}"`
      return String(item)
    })
    return `[ ${previewItems.join(', ')}${arr.length > 3 ? ', …' : ''} ]`
  }

  if (isObject.value && props.value !== null) {
    const keys = Object.keys(props.value as Record<string, unknown>)
    if (keys.length === 0) return '{}'
    const previewKeys = keys.slice(0, 3).join(', ')
    return `{ ${previewKeys}${keys.length > 3 ? ', …' : ''} }`
  }

  return ''
})

const currentPath = computed(() => {
  if (!props.path) return String(props.name)
  if (typeof props.name === 'number') {
    return `${props.path}[${props.name}]`
  }
  return `${props.path}.${props.name}`
})

// Auto-expand if search query matches this node or key
const isMatchingSearch = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return false

  const nameMatch = String(props.name).toLowerCase().includes(query)
  if (nameMatch) return true

  if (!isObject.value) {
    return formattedValue.value.toLowerCase().includes(query)
  }
  return false
})

watch(
  isMatchingSearch,
  (matches) => {
    if (matches) expanded.value = true
  },
  { immediate: true }
)

async function copyNodeValue(event: MouseEvent) {
  event.stopPropagation()
  try {
    const textToCopy =
      typeof props.value === 'string'
        ? props.value
        : JSON.stringify(props.value, null, 2)
    await navigator.clipboard.writeText(textToCopy)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // fallback
  }
}

function toggleExpand() {
  if (isObject.value) {
    expanded.value = !expanded.value
  }
}
</script>

<template>
  <div class="tree-node" :class="{ 'has-match': isMatchingSearch }">
    <div
      class="node-row"
      :class="{ 'is-clickable': isObject }"
      @click="toggleExpand"
    >
      <!-- Expand / Collapse chevron -->
      <button
        v-if="isObject"
        class="toggle-btn"
        :class="{ expanded }"
        :aria-label="expanded ? 'Collapse node' : 'Expand node'"
        @click.stop="toggleExpand"
      >
        <ChevronRight :size="13" />
      </button>
      <span v-else class="toggle-spacer"></span>

      <!-- Key or Index -->
      <span
        class="node-key"
        :class="{ 'is-index': typeof name === 'number', highlight: isMatchingSearch }"
      >
        {{ typeof name === 'number' ? `[${name}]` : `"${name}"` }}
      </span>

      <span class="colon">:</span>

      <!-- Branch: Array or Object meta -->
      <template v-if="isObject">
        <span class="type-badge" :class="typeLabel">
          {{ isArray ? `Array(${childCount})` : `Object(${childCount})` }}
        </span>

        <!-- Collapsed preview text -->
        <span v-if="!expanded" class="preview-text">
          {{ collapsedPreview }}
        </span>
      </template>

      <!-- Primitive value -->
      <template v-else>
        <span
          class="node-val"
          :class="[`val-${typeLabel}`, { highlight: isMatchingSearch }]"
        >
          {{ formattedValue }}
        </span>
      </template>

      <!-- Comma separator if not last -->
      <span v-if="!isLast" class="comma">,</span>

      <!-- Quick action on hover: copy value -->
      <button
        class="node-action"
        :title="copied ? 'Copied!' : 'Copy value'"
        @click="copyNodeValue"
      >
        <Check v-if="copied" :size="12" class="action-check" />
        <Copy v-else :size="12" />
      </button>
    </div>

    <!-- Recursive children -->
    <div v-if="isObject && expanded && childCount > 0" class="node-children">
      <JsonTreeNode
        v-for="([childKey, childValue], idx) in entries"
        :key="childKey"
        :name="childKey"
        :value="childValue"
        :depth="depth + 1"
        :path="currentPath"
        :is-last="idx === entries.length - 1"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 12.5px;
  line-height: 1.6;
}

.node-row {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
  padding: 1px 8px;
  border-radius: 5px;
  user-select: text;
  transition: background 120ms ease;
  position: relative;
}

.node-row:hover {
  background: rgba(30, 41, 59, 0.45);
}

.node-row.is-clickable {
  cursor: pointer;
}

.toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 150ms ease, color 150ms ease, background 150ms ease;
}

.toggle-btn:hover {
  color: #e2e8f0;
  background: rgba(148, 163, 184, 0.12);
}

.toggle-btn.expanded {
  transform: rotate(90deg);
  color: #cbd5e1;
}

.toggle-spacer {
  width: 18px;
  display: inline-block;
  flex-shrink: 0;
}

.node-key {
  color: #cbd5e1;
  font-weight: 500;
}

.node-key.is-index {
  color: #64748b;
  font-size: 11.5px;
}

.colon {
  color: #475569;
}

.comma {
  color: #475569;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.type-badge.array {
  background: rgba(148, 163, 184, 0.12);
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.22);
}

.type-badge.object {
  background: rgba(168, 85, 247, 0.1);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.2);
}

.preview-text {
  color: #64748b;
  font-size: 11.5px;
  font-style: italic;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-val {
  word-break: break-all;
}

.val-string {
  color: #6ee7b7;
}

.val-number {
  color: #fcd34d;
}

.val-boolean {
  color: #f472b6;
}

.val-null {
  color: #94a3b8;
  font-style: italic;
}

.node-key.highlight,
.node-val.highlight {
  background: rgba(234, 179, 8, 0.25);
  border-radius: 2px;
  outline: 1px solid rgba(234, 179, 8, 0.5);
}

.node-action {
  opacity: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 4px;
  padding: 0;
  border: 1px solid #303c4e;
  border-radius: 4px;
  background: #141d2a;
  color: #94a3b8;
  cursor: pointer;
  transition: opacity 120ms ease, background 120ms ease, color 120ms ease;
}

.node-row:hover .node-action {
  opacity: 1;
}

.node-action:hover {
  background: #1e293b;
  color: #e2e8f0;
  border-color: #64748b;
}

.action-check {
  color: #34d399;
}

.node-children {
  margin-left: 9px;
  padding-left: 14px;
  border-left: 1px dashed #1e293b;
  transition: border-color 150ms ease;
}

.node-children:hover {
  border-left-color: #334155;
}
</style>
