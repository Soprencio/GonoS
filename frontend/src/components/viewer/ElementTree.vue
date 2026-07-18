<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  hierarchy: {
    type: Array,
    default: () => []
  },
  selectedId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select'])

function toggle(node) {
  node._expanded = !node._expanded
}

function select(node) {
  emit('select', node.id)
}

function hasChildren(node) {
  return node.children && node.children.length > 0
}

function isSelected(node) {
  return node.id === props.selectedId
}
</script>

<template>
  <div class="element-tree">
    <p v-if="hierarchy.length === 0" class="empty">Sin piezas para mostrar</p>
    <ul v-else class="tree-list">
      <li v-for="node in hierarchy" :key="node.id" class="tree-node">
        <div
          class="node-row"
          :class="{ selected: isSelected(node) }"
          @click="select(node)"
        >
          <span
            v-if="hasChildren(node)"
            class="toggle"
            @click.stop="toggle(node)"
          >{{ node._expanded ? '▾' : '▸' }}</span>
          <span v-else class="toggle spacer"></span>
          <span class="node-name">{{ node.name }}</span>
          <span class="node-type">{{ node.type }}</span>
        </div>
        <ul v-if="hasChildren(node) && node._expanded" class="tree-children">
          <li v-for="child in node.children" :key="child.id" class="tree-node">
            <div
              class="node-row"
              :class="{ selected: isSelected(child) }"
              @click="select(child)"
            >
              <span
                v-if="hasChildren(child)"
                class="toggle"
                @click.stop="toggle(child)"
              >{{ child._expanded ? '▾' : '▸' }}</span>
              <span v-else class="toggle spacer"></span>
              <span class="node-name">{{ child.name }}</span>
              <span class="node-type">{{ child.type }}</span>
            </div>
            <ul v-if="hasChildren(child) && child._expanded" class="tree-children">
              <li v-for="gc in child.children" :key="gc.id" class="tree-node">
                <div
                  class="node-row"
                  :class="{ selected: isSelected(gc) }"
                  @click="select(gc)"
                >
                  <span class="toggle spacer"></span>
                  <span class="node-name">{{ gc.name }}</span>
                  <span class="node-type">{{ gc.type }}</span>
                </div>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.element-tree {
  height: 100%;
  overflow-y: auto;
  font-size: 0.82rem;
}

.empty {
  color: var(--color-text-muted);
  padding: 16px;
  margin: 0;
  text-align: center;
}

.tree-list {
  list-style: none;
  padding: 4px 0;
  margin: 0;
}

.tree-children {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tree-node {
  margin: 0;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background var(--transition-fast);
}

.node-row:hover {
  background: var(--color-accent-soft);
}

.node-row.selected {
  background: var(--color-accent-soft);
  border-left-color: var(--color-accent);
}

.toggle {
  flex-shrink: 0;
  width: 14px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  user-select: none;
}

.spacer {
  visibility: hidden;
}

.node-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text);
}

.node-type {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--color-text-disabled);
  font-family: monospace;
}
</style>
