<template>
  <div class="lb-card">
    <ToolHeader tool-id="todo" />

    <div class="todo-layout">
      <!-- 左：添加 + 统计 + 视图 -->
      <aside class="todo-side">
        <div class="lb-label">快速添加</div>
        <el-input v-model="draft" placeholder="要做什么？回车添加" @keyup.enter="add" />
        <div class="todo-quick">
          <button
            v-for="q in QUICK_DUE"
            :key="q.label"
            type="button"
            class="todo-chip"
            :class="{ active: dueChoice === q.key }"
            @click="dueChoice = q.key"
          >
            {{ q.label }}
          </button>
          <button
            type="button"
            class="todo-chip"
            :class="{ active: dueChoice === 'custom' }"
            @click="dueChoice = 'custom'"
          >
            自定义
          </button>
        </div>
        <el-date-picker
          v-if="dueChoice === 'custom'"
          v-model="customDue"
          type="date"
          placeholder="选择截止日期"
          value-format="x"
          :clearable="true"
          style="width: 100%; margin-bottom: 10px"
        />
        <div class="todo-quick">
          <button
            v-for="r in REPEATS"
            :key="r.value"
            type="button"
            class="todo-chip"
            :class="{ active: repeat === r.value }"
            @click="repeat = r.value"
          >
            {{ r.label }}
          </button>
        </div>
        <el-button
          type="primary"
          style="width: 100%; margin-top: 10px"
          :disabled="!draft.trim()"
          @click="add"
        >
          添加待办
        </el-button>

        <div class="todo-stat">
          <div class="lb-label">今日完成度</div>
          <el-progress :percentage="progress.percent" :stroke-width="10" />
          <div class="todo-nums">
            <span>今天 {{ progress.total }} 项</span>
            <span>已完成 {{ progress.done }}</span>
            <span :class="{ warn: overdueCount > 0 }">逾期 {{ overdueCount }}</span>
          </div>
        </div>

        <div class="todo-views">
          <button
            type="button"
            class="todo-view"
            :class="{ active: view === 'today' }"
            @click="view = 'today'"
          >
            今天
          </button>
          <button
            type="button"
            class="todo-view"
            :class="{ active: view === 'all' }"
            @click="view = 'all'"
          >
            全部
          </button>
        </div>
      </aside>

      <!-- 右：列表 -->
      <section class="todo-main">
        <div v-if="!todos.length" class="todo-hero">
          <div class="hero-icon">✅</div>
          <div class="hero-title">还没有待办</div>
          <div class="hero-desc">在左侧写下第一件事，按天或按周重复的任务会自动重新出现。</div>
        </div>

        <template v-else-if="view === 'today'">
          <div class="todo-group">
            <div class="todo-group-head">待办 · {{ today.pending.length }}</div>
            <div
              v-for="t in today.pending"
              :key="t.id"
              class="todo-item"
              :class="{ overdue: isOverdue(t) }"
            >
              <el-checkbox :model-value="false" @change="toggle(t)" />
              <div class="todo-body" @click="toggle(t)">
                <span class="todo-title">{{ t.title }}</span>
                <span class="todo-badges">
                  <span v-if="t.repeat !== 'none'" class="todo-badge repeat">
                    {{ t.repeat === 'daily' ? '每天' : '每周' }}
                  </span>
                  <span v-if="t.due" class="todo-badge" :class="{ warn: isOverdue(t) }">
                    {{ dueLabel(t.due) }}
                  </span>
                </span>
              </div>
              <button type="button" class="todo-del" title="删除" @click="askDelete(t)">×</button>
            </div>
            <div v-if="!today.pending.length" class="todo-empty">今天没有待办，去干点别的 🎉</div>
          </div>

          <div v-if="today.done.length" class="todo-group">
            <div class="todo-group-head">已完成 · {{ today.done.length }}</div>
            <div v-for="t in today.done" :key="t.id" class="todo-item done">
              <el-checkbox :model-value="true" @change="toggle(t)" />
              <div class="todo-body" @click="toggle(t)">
                <span class="todo-title">{{ t.title }}</span>
                <span class="todo-badges">
                  <span v-if="t.repeat !== 'none'" class="todo-badge repeat">
                    {{ t.repeat === 'daily' ? '每天' : '每周' }}
                  </span>
                </span>
              </div>
              <button type="button" class="todo-del" title="删除" @click="askDelete(t)">×</button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="todo-group">
            <div class="todo-group-head">未完成 · {{ allPending.length }}</div>
            <div
              v-for="t in allPending"
              :key="t.id"
              class="todo-item"
              :class="{ overdue: isOverdue(t) }"
            >
              <el-checkbox :model-value="false" @change="toggle(t)" />
              <div class="todo-body" @click="toggle(t)">
                <span class="todo-title">{{ t.title }}</span>
                <span class="todo-badges">
                  <span v-if="t.repeat !== 'none'" class="todo-badge repeat">
                    {{ t.repeat === 'daily' ? '每天' : '每周' }}
                  </span>
                  <span v-if="t.due" class="todo-badge" :class="{ warn: isOverdue(t) }">
                    {{ dueLabel(t.due) }}
                  </span>
                </span>
              </div>
              <button type="button" class="todo-del" title="删除" @click="askDelete(t)">×</button>
            </div>
            <div v-if="!allPending.length" class="todo-empty">全部完成</div>
          </div>

          <div v-if="allDone.length" class="todo-group">
            <div class="todo-group-head">已完成 · {{ allDone.length }}</div>
            <div v-for="t in allDone" :key="t.id" class="todo-item done">
              <el-checkbox :model-value="true" @change="toggle(t)" />
              <div class="todo-body" @click="toggle(t)">
                <span class="todo-title">{{ t.title }}</span>
              </div>
              <button type="button" class="todo-del" title="删除" @click="askDelete(t)">×</button>
            </div>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { store } from '../../store/bootstrap'
import { todoTools, type TodoItem, type TodoRepeat } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

type DueChoice = 'none' | 'today' | 'tomorrow' | 'custom'

const QUICK_DUE: { key: DueChoice; label: string }[] = [
  { key: 'none', label: '无期限' },
  { key: 'today', label: '今天' },
  { key: 'tomorrow', label: '明天' },
]
const REPEATS: { value: TodoRepeat; label: string }[] = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
]

const todos = ref<TodoItem[]>([])
const draft = ref('')
const dueChoice = ref<DueChoice>('none')
const customDue = ref('')
const repeat = ref<TodoRepeat>('none')
const view = ref<'today' | 'all'>('today')
const record = useToolHistory('todo')

const isDone = (t: TodoItem): boolean => todoTools.isDoneInCycle(t)
const isOverdue = (t: TodoItem): boolean => t.due !== undefined && t.due < todoTools.startOfDay()
const dueLabel = (due: number): string => todoTools.dueLabel(due)

function sortPending(list: TodoItem[]): TodoItem[] {
  const day = todoTools.startOfDay()
  const rank = (t: TodoItem): number => {
    if (t.due === undefined) return 2
    return t.due < day ? 0 : 1
  }
  return [...list].sort((a, b) => rank(a) - rank(b) || a.createdAt - b.createdAt)
}

const today = computed(() => {
  const { pending, done } = todoTools.splitToday(todos.value)
  return { pending: sortPending(pending), done }
})
const allPending = computed(() => sortPending(todos.value.filter((t) => !isDone(t))))
const allDone = computed(() => todos.value.filter((t) => isDone(t)))
const progress = computed(() => todoTools.todayProgress(todos.value))
const overdueCount = computed(
  () => todos.value.filter((t) => !isDone(t) && t.due !== undefined && t.due < todoTools.startOfDay())
    .length,
)

function resolveDue(): number | undefined {
  if (dueChoice.value === 'today') return todoTools.startOfDay()
  if (dueChoice.value === 'tomorrow') return todoTools.startOfDay() + 86400000
  if (dueChoice.value === 'custom') {
    const v = Number(customDue.value)
    return Number.isFinite(v) && customDue.value ? v : undefined
  }
  return undefined
}

async function add(): Promise<void> {
  const title = draft.value.trim()
  if (!title) return
  const saved = await store.upsertTodo({ title, due: resolveDue(), repeat: repeat.value })
  draft.value = ''
  customDue.value = ''
  dueChoice.value = 'none'
  repeat.value = 'none'
  await reload()
  view.value = 'today'
  record('新建待办', saved.title)
}

async function toggle(t: TodoItem): Promise<void> {
  const next = !isDone(t)
  const saved = await store.setTodoDone(t.id, next)
  if (!saved) return
  await reload()
  if (next) record('完成待办', t.title)
}

async function askDelete(t: TodoItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`删除待办「${t.title}」？`, '删除待办', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await store.deleteTodo(t.id)
  await reload()
  record('删除待办', t.title)
}

async function reload(): Promise<void> {
  todos.value = await store.getTodos()
}

onMounted(reload)
</script>

<style scoped>
.todo-layout {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(420px, 1fr);
  gap: 20px;
  align-items: start;
}
.todo-side {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.todo-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0;
}
.todo-chip {
  border: 1px solid var(--color-border);
  background: var(--color-bg-page);
  color: var(--color-text-secondary);
  border-radius: 999px;
  font-size: 12px;
  padding: 5px 12px;
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease;
}
.todo-chip:hover {
  border-color: var(--color-primary);
}
.todo-chip.active {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  font-weight: 600;
}
.todo-stat {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-top: 16px;
}
.todo-nums {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 8px;
}
.todo-nums .warn {
  color: var(--color-error);
  font-weight: 600;
}
.todo-views {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.todo-view {
  flex: 1;
  border: 1px solid var(--color-border);
  background: var(--color-bg-page);
  color: var(--color-text-secondary);
  border-radius: 6px;
  font-size: 13px;
  padding: 7px 0;
  cursor: pointer;
}
.todo-view.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 600;
}

.todo-main {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 4px;
  min-height: 320px;
}
.todo-group {
  margin-bottom: 6px;
}
.todo-group-head {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 8px 14px 4px;
}
.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 8px;
  transition: background-color 120ms ease;
}
.todo-item:hover {
  background: var(--color-primary-light);
}
.todo-item.overdue .todo-title {
  color: var(--color-error);
}
.todo-item.done .todo-title {
  color: var(--color-text-secondary);
  text-decoration: line-through;
}
.todo-body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.todo-title {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.todo-badges {
  display: inline-flex;
  gap: 6px;
  flex-shrink: 0;
}
.todo-badge {
  font-size: 11px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px 6px;
}
.todo-badge.repeat {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.todo-badge.warn {
  color: var(--color-error);
  border-color: var(--color-error);
}
.todo-del {
  opacity: 0;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
.todo-item:hover .todo-del {
  opacity: 1;
}
.todo-del:hover {
  color: var(--color-error);
}
.todo-empty {
  padding: 22px 14px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.todo-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 300px;
  gap: 6px;
  padding: 20px;
}
.hero-icon {
  font-size: 40px;
}
.hero-title {
  font-size: 17px;
  font-weight: 600;
}
.hero-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  max-width: 360px;
  line-height: 1.7;
}
</style>
