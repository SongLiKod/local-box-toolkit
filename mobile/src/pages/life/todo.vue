<template>
  <ToolPage tool-id="todo">
    <view class="lb-card">
      <view class="todo-top">
        <text class="lb-title">待办清单</text>
        <text class="todo-progress">{{ progress.done }}/{{ progress.total }}</text>
      </view>

      <input
        v-model="draft"
        class="lb-input"
        placeholder="要做什么？回车添加"
        confirm-type="done"
        @confirm="add"
      />
      <view class="todo-chips">
        <text
          v-for="q in QUICK_DUE"
          :key="q.key"
          class="todo-chip"
          :class="{ on: dueChoice === q.key }"
          @click="dueChoice = q.key"
          >{{ q.label }}</text
        >
      </view>
      <view class="todo-chips">
        <text
          v-for="r in REPEATS"
          :key="r.value"
          class="todo-chip"
          :class="{ on: repeat === r.value }"
          @click="repeat = r.value"
          >{{ r.label }}</text
        >
        <text class="todo-chip todo-add" @click="add">＋ 添加</text>
      </view>

      <view class="todo-tabs">
        <text class="todo-tab" :class="{ on: view === 'today' }" @click="view = 'today'"
          >今天 {{ progress.total }}</text
        >
        <text class="todo-tab" :class="{ on: view === 'all' }" @click="view = 'all'"
          >全部 {{ todos.length }}</text
        >
      </view>

      <view v-if="!todos.length" class="lb-empty todo-empty">
        <text>还没有待办，写下第一件事吧</text>
      </view>

      <view v-for="t in list.pending" :key="t.id" class="todo-item" @click="toggle(t)">
        <view class="todo-check" :class="{ on: isDone(t) }">{{ isDone(t) ? '✓' : '' }}</view>
        <view class="todo-body">
          <text class="todo-title">{{ t.title }}</text>
          <view class="todo-badges">
            <text v-if="t.repeat !== 'none'" class="todo-badge repeat">{{
              t.repeat === 'daily' ? '每天' : '每周'
            }}</text>
            <text v-if="t.due" class="todo-badge" :class="{ warn: isOverdue(t) }">{{
              dueLabel(t.due)
            }}</text>
          </view>
        </view>
        <text class="todo-del" @click.stop="askDelete(t)">×</text>
      </view>
      <view v-if="todos.length && !list.pending.length" class="lb-empty todo-empty">
        <text>已全部完成 🎉</text>
      </view>

      <template v-if="list.done.length">
        <view class="todo-group">已完成 · {{ list.done.length }}</view>
        <view v-for="t in list.done" :key="t.id" class="todo-item done" @click="toggle(t)">
          <view class="todo-check on">✓</view>
          <view class="todo-body">
            <text class="todo-title">{{ t.title }}</text>
          </view>
          <text class="todo-del" @click.stop="askDelete(t)">×</text>
        </view>
      </template>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { store } from '../../store'
import { todoTools, type TodoItem, type TodoRepeat } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

type DueChoice = 'none' | 'today' | 'tomorrow'

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
const repeat = ref<TodoRepeat>('none')
const view = ref<'today' | 'all'>('today')
const record = useToolHistory('todo')

const isDone = (t: TodoItem): boolean => todoTools.isDoneInCycle(t)
const isOverdue = (t: TodoItem): boolean => t.due !== undefined && t.due < todoTools.startOfDay()
const dueLabel = (due: number): string => todoTools.dueLabel(due)

function sortPending(list: TodoItem[]): TodoItem[] {
  const day = todoTools.startOfDay()
  const rank = (t: TodoItem): number => (t.due === undefined ? 2 : t.due < day ? 0 : 1)
  return [...list].sort((a, b) => rank(a) - rank(b) || a.createdAt - b.createdAt)
}

const progress = computed(() => todoTools.todayProgress(todos.value))

const list = computed(() => {
  if (view.value === 'today') {
    const { pending, done } = todoTools.splitToday(todos.value)
    return { pending: sortPending(pending), done }
  }
  return {
    pending: sortPending(todos.value.filter((t) => !isDone(t))),
    done: todos.value.filter((t) => isDone(t)),
  }
})

async function reload(): Promise<void> {
  todos.value = await store.getTodos()
}

function resolveDue(): number | undefined {
  if (dueChoice.value === 'today') return todoTools.startOfDay()
  if (dueChoice.value === 'tomorrow') return todoTools.startOfDay() + 86400000
  return undefined
}

async function add(): Promise<void> {
  const title = draft.value.trim()
  if (!title) return
  const saved = await store.upsertTodo({ title, due: resolveDue(), repeat: repeat.value })
  draft.value = ''
  dueChoice.value = 'none'
  repeat.value = 'none'
  view.value = 'today'
  await reload()
  record('新建待办', saved.title)
}

async function toggle(t: TodoItem): Promise<void> {
  const next = !isDone(t)
  const saved = await store.setTodoDone(t.id, next)
  if (!saved) return
  await reload()
  if (next) record('完成待办', t.title)
}

function askDelete(t: TodoItem): void {
  uni.showModal({
    title: '删除待办',
    content: `删除「${t.title}」？`,
    confirmText: '删除',
    confirmColor: '#F53F3F',
    success: (res) => {
      if (!res.confirm) return
      void store.deleteTodo(t.id).then(() => {
        void reload()
        record('删除待办', t.title)
      })
    },
  })
}

reload()
</script>

<style scoped>
.todo-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}
.todo-progress {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--color-primary);
}
.todo-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 14rpx;
}
.todo-chip {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 999rpx;
  padding: 8rpx 22rpx;
  background: var(--color-bg-page);
}
.todo-chip.on {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  font-weight: 600;
}
.todo-chip.add {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
  font-weight: 600;
}
.todo-tabs {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 12rpx;
}
.todo-tab {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
}
.todo-tab.on {
  color: #fff;
  background: var(--color-primary);
  font-weight: 600;
}
.todo-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 0;
  border-bottom: 1px solid var(--color-border);
}
.todo-item:active {
  opacity: 0.75;
}
.todo-check {
  width: 44rpx;
  height: 44rpx;
  border: 2rpx solid var(--color-border);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 26rpx;
  flex-shrink: 0;
  box-sizing: border-box;
}
.todo-check.on {
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.todo-body {
  flex: 1;
  min-width: 0;
}
.todo-title {
  font-size: 28rpx;
}
.todo-item.done .todo-title {
  color: var(--color-text-secondary);
  text-decoration: line-through;
}
.todo-badges {
  display: flex;
  gap: 10rpx;
  margin-top: 6rpx;
}
.todo-badge {
  font-size: 20rpx;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
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
  font-size: 34rpx;
  color: var(--color-text-secondary);
  padding: 0 10rpx;
}
.todo-group {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  font-weight: 600;
  margin-top: 24rpx;
}
.todo-empty {
  text-align: center;
  padding: 30rpx 0;
}
</style>
