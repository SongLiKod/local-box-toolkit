<template>
  <ToolPage tool-id="calculator">
    <view class="lb-card">
      <view class="calc-screen">
        <input
          v-model="expr"
          class="calc-input"
          placeholder="输入表达式，如 (1+2)*3"
          confirm-type="done"
          @confirm="calc"
        />
        <view class="calc-meta">
          <text v-if="error" class="calc-err">{{ error }}</text>
          <text v-else class="calc-tip">{{ preview ? '实时预览' : '输入后点 = 或完成键' }}</text>
          <text class="calc-badge">{{ angle === 'deg' ? 'DEG' : 'RAD' }}</text>
        </view>
        <view
          class="calc-result"
          :style="{ fontSize: resultSize + 'rpx' }"
          @click="copyResult"
        >
          {{ display }}
        </view>
      </view>

      <view class="lb-chip-row">
        <view class="lb-chip" :class="{ active: angle === 'deg' }" @click="setAngle('deg')">角度 deg</view>
        <view class="lb-chip" :class="{ active: angle === 'rad' }" @click="setAngle('rad')">弧度 rad</view>
        <view class="lb-chip" :class="{ active: showSci }" @click="toggleSci">科学函数</view>
      </view>

      <view v-if="showSci" class="kp kp-sci">
        <view v-for="k in sciKeys" :key="k.label" class="kp-key k-sci" @click="press(k)">{{ k.label }}</view>
      </view>

      <view class="kp">
        <view
          v-for="k in basicKeys"
          :key="k.label"
          class="kp-key"
          :class="k.cls"
          @click="press(k)"
        >
          {{ k.label }}
        </view>
      </view>

      <view class="calc-panel">
        <view class="calc-panel-head">
          <text>计算历史（点击复算）</text>
          <text v-if="recent.length" class="calc-clear" @click="recent = []">清空</text>
        </view>
        <view v-if="!recent.length" class="calc-empty">暂无记录，计算结果会自动记录在这里</view>
        <view v-for="(h, i) in recent" :key="i" class="calc-h" @click="reuse(h)">
          <text class="calc-h-expr">{{ h.expr }}</text>
          <text class="calc-h-val">= {{ h.formatted }}</text>
        </view>
      </view>

      <view class="calc-note">
        支持 + − × ÷ ^ % ! 括号、函数（sqrt/sin/log…）与常量（pi/e/tau）、千分位 1,000，结果保留 12 位有效数字。点结果可复制。
      </view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { calcTools, type CalcAngle, type CalcResult } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

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
  { label: 'sin', kind: 'ins', text: 'sin(' },
  { label: 'cos', kind: 'ins', text: 'cos(' },
  { label: 'tan', kind: 'ins', text: 'tan(' },
  { label: 'ln', kind: 'ins', text: 'ln(' },
  { label: 'log', kind: 'ins', text: 'log(' },
  { label: '√', kind: 'ins', text: 'sqrt(' },
  { label: 'asin', kind: 'ins', text: 'asin(' },
  { label: 'acos', kind: 'ins', text: 'acos(' },
  { label: 'atan', kind: 'ins', text: 'atan(' },
  { label: 'exp', kind: 'ins', text: 'exp(' },
  { label: 'log2', kind: 'ins', text: 'log2(' },
  { label: '∛', kind: 'ins', text: 'cbrt(' },
  { label: 'abs', kind: 'ins', text: 'abs(' },
  { label: 'floor', kind: 'ins', text: 'floor(' },
  { label: 'round', kind: 'ins', text: 'round(' },
  { label: 'ceil', kind: 'ins', text: 'ceil(' },
  { label: 'mod', kind: 'ins', text: 'mod(' },
  { label: 'min', kind: 'ins', text: 'min(' },
]

const CFG_KEY = 'localbox:calc-cfg'

function readCfg(): { angle: CalcAngle; showSci: boolean } {
  try {
    const v = uni.getStorageSync(CFG_KEY)
    const obj = typeof v === 'string' ? JSON.parse(v) : v
    return {
      angle: obj?.angle === 'rad' ? 'rad' : 'deg',
      showSci: !!obj?.showSci,
    }
  } catch {
    return { angle: 'deg', showSci: false }
  }
}

const saved = readCfg()
const angle = ref<CalcAngle>(saved.angle)
const showSci = ref(saved.showSci)

function saveCfg(): void {
  try {
    uni.setStorageSync(CFG_KEY, JSON.stringify({ angle: angle.value, showSci: showSci.value }))
  } catch {
    /* 存储失败不影响本次会话 */
  }
}
function setAngle(a: CalcAngle): void {
  angle.value = a
  saveCfg()
}
function toggleSci(): void {
  showSci.value = !showSci.value
  saveCfg()
}

const record = useToolHistory('calculator')
const expr = ref('')
const result = ref<CalcResult | null>(null)
const error = ref('')
const recent = ref<{ expr: string; formatted: string }[]>([])

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

const resultSize = computed(() => {
  const n = display.value.replace(/,/g, '').length
  if (n <= 10) return 76
  if (n <= 16) return 60
  if (n <= 24) return 46
  return 34
})

function calc(): void {
  const input = expr.value.trim()
  hideKeyboard()
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

/** 收起软键盘，避免遮挡按键 */
function hideKeyboard(): void {
  try {
    uni.hideKeyboard()
  } catch {
    /* 非 H5 端或不支持时忽略 */
  }
}

function clearAll(): void {
  expr.value = ''
  result.value = null
  error.value = ''
}

function pushRecent(e: string, formatted: string): void {
  if (recent.value[0]?.expr === e && recent.value[0]?.formatted === formatted) return
  recent.value = [{ expr: e, formatted }, ...recent.value.filter((h) => h.expr !== e)].slice(0, 10)
}

function press(k: Key): void {
  hideKeyboard()
  if (error.value) error.value = ''
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

function reuse(h: { expr: string }): void {
  expr.value = h.expr
  calc()
}

function copyResult(): void {
  if (display.value === '0' && !expr.value) return
  try {
    uni.setClipboardData({
      data: display.value,
      success: () => uni.showToast({ title: '已复制结果', icon: 'none' }),
      fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
    })
  } catch {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
}
</script>

<style scoped>
.calc-screen {
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
  background: var(--color-bg-page);
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.calc-input {
  width: 100%;
  min-height: 76rpx;
  font-size: 30rpx;
  text-align: right;
  padding: 16rpx 0;
  border-bottom: 1px dashed var(--color-border);
  font-family: Consolas, Monaco, monospace;
}
.calc-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
  min-height: 34rpx;
  margin-top: 8rpx;
}
.calc-tip {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}
.calc-err {
  font-size: 24rpx;
  color: var(--color-error);
  text-align: right;
}
.calc-badge {
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 6rpx;
  padding: 4rpx 10rpx;
  flex-shrink: 0;
}
.calc-result {
  margin-top: 10rpx;
  font-weight: 600;
  line-height: 1.2;
  text-align: right;
  word-break: break-all;
  font-family: Consolas, Monaco, monospace;
  min-height: 90rpx;
}

.kp {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.kp-sci {
  grid-template-columns: repeat(6, 1fr);
}
.kp-key {
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 14rpx;
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  font-size: 38rpx;
  font-family: Consolas, Monaco, monospace;
  transition: opacity 80ms ease, transform 80ms ease;
}
.kp-key:active {
  opacity: 0.7;
  transform: scale(0.96);
}
.k-op {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: transparent;
  font-weight: 600;
}
.k-fn {
  color: var(--color-text-secondary);
  font-size: 30rpx;
}
.k-act {
  color: var(--color-warning);
  font-weight: 600;
}
.k-eq {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 600;
}
.k-sci {
  height: 76rpx;
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.calc-panel {
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
  padding: 16rpx 18rpx;
  margin-bottom: 16rpx;
}
.calc-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 26rpx;
  font-weight: 600;
  margin-bottom: 10rpx;
}
.calc-clear {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  padding: 4rpx 8rpx;
}
.calc-empty {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  padding: 6rpx 0 10rpx;
}
.calc-h {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16rpx;
  padding: 14rpx 16rpx;
  border: 1px solid var(--color-border);
  border-radius: 10rpx;
  margin-bottom: 10rpx;
}
.calc-h-expr {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  word-break: break-all;
}
.calc-h-val {
  font-size: 26rpx;
  font-weight: 600;
  white-space: nowrap;
  font-family: Consolas, Monaco, monospace;
}
.calc-note {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  line-height: 1.7;
}
</style>
