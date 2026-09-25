<template>
  <div class="lb-card">
    <ToolHeader tool-id="calculator" />

    <div class="calc-layout">
      <!-- 左侧：显示屏 + 键盘 -->
      <div class="calc-main">
        <div class="calc-screen">
          <input
            ref="inputRef"
            v-model="expr"
            class="calc-input"
            type="text"
            spellcheck="false"
            autocomplete="off"
            placeholder="输入表达式，如 (1+2)*3"
            @keydown.enter.prevent="calc"
            @keydown.esc.prevent="clearAll"
          />
          <div class="calc-meta">
            <span v-if="error" class="calc-err">{{ error }}</span>
            <span v-else class="calc-tip">{{ preview ? '实时预览' : '回车计算 · Esc 清空' }}</span>
            <span class="calc-badge">{{ angle === 'deg' ? 'DEG' : 'RAD' }}</span>
          </div>
          <div
            class="calc-result"
            :style="{ fontSize: resultSize + 'px' }"
            title="点击复制结果"
            @click="copyResult"
          >
            {{ display }}
          </div>
        </div>

        <div class="lb-row calc-toolbar">
          <el-radio-group v-model="angle" size="small">
            <el-radio-button label="deg">角度制 deg</el-radio-button>
            <el-radio-button label="rad">弧度制 rad</el-radio-button>
          </el-radio-group>
          <el-switch v-model="showSci" size="small" active-text="科学函数" />
          <el-button size="small" :disabled="!hasValue" @click="copyResult">复制结果</el-button>
        </div>

        <transition name="calc-slide">
          <div v-if="showSci" class="calc-keys calc-keys-sci">
            <button
              v-for="k in sciKeys"
              :key="k.label"
              type="button"
              class="calc-key k-sci"
              @mousedown.prevent
              @click="press(k)"
            >
              {{ k.label }}
            </button>
          </div>
        </transition>

        <div class="calc-keys">
          <button
            v-for="k in basicKeys"
            :key="k.label"
            type="button"
            class="calc-key"
            :class="k.cls"
            @mousedown.prevent
            @click="press(k)"
          >
            {{ k.label }}
          </button>
        </div>
      </div>

      <!-- 右侧：历史与说明 -->
      <div class="calc-side">
        <div class="calc-panel">
          <div class="calc-panel-head">
            <span>计算历史</span>
            <button
              type="button"
              class="calc-clear"
              :disabled="!recent.length"
              @click="recent = []"
            >
              清空
            </button>
          </div>
          <div v-if="!recent.length" class="calc-empty">暂无记录，计算结果会自动记录在这里</div>
          <div v-for="(h, i) in recent" :key="i" class="calc-h-item" @click="reuse(h)">
            <span class="calc-h-expr">{{ h.expr }}</span>
            <span class="calc-h-val">{{ h.formatted }}</span>
          </div>
        </div>

        <div class="calc-panel">
          <div class="calc-panel-head"><span>函数与常量</span></div>
          <div class="calc-doc-line">
            常量：
            <el-tag
              v-for="c in constants"
              :key="c.name"
              size="small"
              effect="plain"
              :title="c.desc"
              class="calc-tag"
              @click="insert(c.name)"
            >
              {{ c.name }}
            </el-tag>
          </div>
          <div class="calc-doc-line">
            函数（点击填入）：
            <el-tag
              v-for="f in functions"
              :key="f.name"
              size="small"
              effect="plain"
              :title="f.desc"
              class="calc-tag calc-tag-fn"
              @click="insert(`${f.name}(`)"
            >
              {{ f.name }}({{ f.args }})
            </el-tag>
          </div>
          <div class="calc-doc-note">
            运算符 <code>+ − × ÷ ^ % !</code> 与括号；<code>%</code> 为百分号（10% = 0.1），
            隐式乘法 <code>2(3+4)</code>、<code>2pi</code>，支持千分位 <code>1,000</code> 与全角
            <code>×÷－（）</code>，结果保留 12 位有效数字。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { calcTools, type CalcAngle, type CalcResult } from '@localbox/core/index'
import { useToolHistory, useToolParams } from '../../composables/useTool'

interface Key {
  label: string
  kind: 'ins' | 'calc' | 'clear' | 'back'
  text?: string
  cls?: string
}

const basicKeys: Key[] = [
  { label: 'C', kind: 'clear', cls: 'k-act' },
  { label: '⌫', kind: 'back', cls: 'k-act' },
  { label: '(', kind: 'ins', text: '(', cls: 'k-fn' },
  { label: ')', kind: 'ins', text: ')', cls: 'k-fn' },
  { label: '÷', kind: 'ins', text: '/', cls: 'k-op' },
  { label: '7', kind: 'ins', text: '7' },
  { label: '8', kind: 'ins', text: '8' },
  { label: '9', kind: 'ins', text: '9' },
  { label: '%', kind: 'ins', text: '%', cls: 'k-fn' },
  { label: '×', kind: 'ins', text: '*', cls: 'k-op' },
  { label: '4', kind: 'ins', text: '4' },
  { label: '5', kind: 'ins', text: '5' },
  { label: '6', kind: 'ins', text: '6' },
  { label: 'x^y', kind: 'ins', text: '^', cls: 'k-fn' },
  { label: '−', kind: 'ins', text: '-', cls: 'k-op' },
  { label: '1', kind: 'ins', text: '1' },
  { label: '2', kind: 'ins', text: '2' },
  { label: '3', kind: 'ins', text: '3' },
  { label: 'n!', kind: 'ins', text: '!', cls: 'k-fn' },
  { label: '+', kind: 'ins', text: '+', cls: 'k-op' },
  { label: '0', kind: 'ins', text: '0' },
  { label: '.', kind: 'ins', text: '.' },
  { label: 'π', kind: 'ins', text: 'pi', cls: 'k-fn' },
  { label: 'e', kind: 'ins', text: 'e', cls: 'k-fn' },
  { label: '=', kind: 'calc', cls: 'k-eq' },
]

const sciKeys: Key[] = [
  { label: 'sin(', kind: 'ins', text: 'sin(' },
  { label: 'cos(', kind: 'ins', text: 'cos(' },
  { label: 'tan(', kind: 'ins', text: 'tan(' },
  { label: 'ln(', kind: 'ins', text: 'ln(' },
  { label: 'log(', kind: 'ins', text: 'log(' },
  { label: '√(', kind: 'ins', text: 'sqrt(' },
  { label: 'asin(', kind: 'ins', text: 'asin(' },
  { label: 'acos(', kind: 'ins', text: 'acos(' },
  { label: 'atan(', kind: 'ins', text: 'atan(' },
  { label: 'exp(', kind: 'ins', text: 'exp(' },
  { label: 'log2(', kind: 'ins', text: 'log2(' },
  { label: '∛(', kind: 'ins', text: 'cbrt(' },
  { label: 'abs(', kind: 'ins', text: 'abs(' },
  { label: 'floor(', kind: 'ins', text: 'floor(' },
  { label: 'round(', kind: 'ins', text: 'round(' },
  { label: 'ceil(', kind: 'ins', text: 'ceil(' },
  { label: 'mod(', kind: 'ins', text: 'mod(' },
  { label: 'min(', kind: 'ins', text: 'min(' },
]

const record = useToolHistory('calculator')
const { params } = useToolParams('calculator', { angle: 'deg' as CalcAngle, showSci: false })
const angle = computed({
  get: (): CalcAngle => params.value.angle,
  set: (v: CalcAngle) => {
    params.value.angle = v
  },
})
const showSci = computed({
  get: (): boolean => params.value.showSci,
  set: (v: boolean) => {
    params.value.showSci = v
  },
})

const inputRef = ref<HTMLInputElement | null>(null)
const expr = ref('')
const result = ref<CalcResult | null>(null)
const error = ref('')
const recent = ref<{ expr: string; formatted: string }[]>([])
const functions = calcTools.CALC_FUNCTIONS
const constants = calcTools.CALC_CONSTANTS

/** 输入过程中实时预览（不写历史） */
const preview = computed((): string => {
  const input = expr.value.trim()
  if (!input) return ''
  try {
    return calcTools.evaluate(input, { angle: angle.value }).formatted
  } catch {
    return ''
  }
})

const display = computed(() => preview.value || result.value?.formatted || '0')
const hasValue = computed(() => display.value !== '0')

/** 结果过长时自动缩小字号，避免溢出 */
const resultSize = computed(() => {
  const n = display.value.replace(/,/g, '').length
  if (n <= 10) return 40
  if (n <= 16) return 32
  if (n <= 24) return 24
  return 18
})

/** 手动编辑表达式时清除上次的报错 */
watch(expr, () => {
  if (error.value) error.value = ''
})

onMounted(() => {
  inputRef.value?.focus()
})

function calc(): void {
  const input = expr.value.trim()
  if (!input) {
    result.value = null
    error.value = ''
    return
  }
  try {
    const r = calcTools.evaluate(input, { angle: angle.value })
    result.value = r
    error.value = ''
    pushRecent(r.expr, r.formatted)
    void record('计算', `${r.expr} = ${r.formatted}`)
  } catch (e) {
    result.value = null
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function clearAll(): void {
  expr.value = ''
  result.value = null
  error.value = ''
}

function pushRecent(e: string, formatted: string): void {
  if (recent.value[0]?.expr === e && recent.value[0]?.formatted === formatted) return
  recent.value = [{ expr: e, formatted }, ...recent.value.filter((h) => h.expr !== e)].slice(0, 20)
}

function press(k: Key): void {
  if (k.kind === 'clear') {
    clearAll()
    return
  }
  if (k.kind === 'back') {
    expr.value = expr.value.slice(0, -1)
    return
  }
  if (k.kind === 'calc') {
    calc()
    inputRef.value?.focus()
    return
  }
  const text = k.text ?? ''
  if (result.value && expr.value.trim() === result.value.expr) {
    // 刚按过 “=”：数字/字母/左括号重新开始，运算符接着上一个结果
    const startsNew = /^[0-9.]/.test(text) || /^[a-z]/i.test(text)
    expr.value = startsNew ? text : `${String(result.value.value)}${text}`
    return
  }
  expr.value += text
}

function insert(text: string): void {
  expr.value += text
  inputRef.value?.focus()
}

function reuse(h: { expr: string }): void {
  expr.value = h.expr
  calc()
  inputRef.value?.focus()
}

async function copyResult(): Promise<void> {
  if (!hasValue.value) return
  await navigator.clipboard.writeText(display.value)
  ElMessage.success('已复制结果')
}
</script>

<style scoped>
.calc-layout {
  display: grid;
  grid-template-columns: minmax(420px, 470px) minmax(320px, 1fr);
  gap: 20px;
  align-items: start;
}

/* ---------- 显示屏 ---------- */
.calc-screen {
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px 16px 12px;
  margin-bottom: 12px;
}
.calc-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  text-align: right;
  font-family: Consolas, Monaco, monospace;
  font-size: 17px;
  color: var(--color-text-secondary);
  padding: 4px 0;
  word-break: break-all;
}
.calc-input::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.55;
  font-size: 14px;
}
.calc-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 18px;
  margin-top: 4px;
}
.calc-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.calc-err {
  font-size: 13px;
  color: var(--color-error);
  text-align: right;
}
.calc-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 4px;
  padding: 2px 6px;
  flex-shrink: 0;
}
.calc-result {
  margin-top: 6px;
  font-family: Consolas, Monaco, monospace;
  font-weight: 600;
  line-height: 1.2;
  text-align: right;
  word-break: break-all;
  cursor: copy;
  min-height: 48px;
  transition: font-size 120ms ease;
}

/* ---------- 工具条 ---------- */
.calc-toolbar {
  justify-content: space-between;
  margin-bottom: 12px;
}

/* ---------- 键盘 ---------- */
.calc-keys {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.calc-keys-sci {
  grid-template-columns: repeat(6, 1fr);
  margin-bottom: 8px;
}
.calc-key {
  height: 52px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  font-size: 17px;
  font-family: Consolas, Monaco, monospace;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, transform 60ms ease;
}
.calc-key:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}
.calc-key:active {
  transform: scale(0.96);
}
.k-num {
  font-size: 18px;
}
.k-op {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: transparent;
  font-size: 20px;
  font-weight: 600;
}
.k-fn {
  color: var(--color-text-secondary);
  font-size: 14px;
}
.k-act {
  color: var(--color-warning);
  font-weight: 600;
}
.k-eq {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  font-size: 20px;
  font-weight: 600;
}
.k-eq:hover {
  filter: brightness(1.08);
}
.k-sci {
  height: 40px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 科学键展开动画 */
.calc-slide-enter-active,
.calc-slide-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.calc-slide-enter-from,
.calc-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---------- 右侧面板 ---------- */
.calc-panel {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
}
.calc-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 10px;
}
.calc-clear {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
}
.calc-clear:hover:not(:disabled) {
  color: var(--color-error);
}
.calc-clear:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.calc-empty {
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: 6px 0 10px;
}
.calc-h-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.calc-h-item + .calc-h-item {
  margin-top: 4px;
}
.calc-h-item:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}
.calc-h-expr {
  color: var(--color-text-secondary);
  word-break: break-all;
}
.calc-h-val {
  font-family: Consolas, Monaco, monospace;
  font-weight: 600;
  white-space: nowrap;
}
.calc-doc-line {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 2;
  margin-bottom: 6px;
}
.calc-tag {
  margin: 0 6px 6px 0;
  cursor: pointer;
}
.calc-tag-fn {
  font-family: Consolas, Monaco, monospace;
}
.calc-doc-note {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.8;
  border-top: 1px dashed var(--color-border);
  padding-top: 10px;
}
.calc-doc-note code {
  background: var(--color-bg-page);
  border-radius: 4px;
  padding: 1px 5px;
}
</style>
