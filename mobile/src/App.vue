<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { initTheme } from './composables/useTheme'
import { autoCheckUpgrade } from './utils/upgrade'

onLaunch(() => {
  void initTheme()
  // 应用内升级：启动稍后静默检查（仅安卓壳内生效，6 小时节流、失败静默、同版本只提醒一次）
  setTimeout(() => void autoCheckUpgrade(), 1500)
})
</script>

<style lang="scss">
/* 主题 CSS 变量（与 Web/Electron 同一套色值，PRD 5） */
.theme-light {
  --color-bg-page: #f5f7fa;
  --color-bg-card: #ffffff;
  --color-text-primary: #1d2129;
  --color-text-secondary: #6e7681;
  --color-border: #e5e6eb;
  --color-primary: #1677ff;
  --color-primary-light: #e8f3ff;
  --color-success: #00b42a;
  --color-warning: #ff7d00;
  --color-error: #f53f3f;
  --color-shadow: rgba(0, 0, 0, 0.08);
}
.theme-dark {
  --color-bg-page: #17171a;
  --color-bg-card: #232324;
  --color-text-primary: #f2f3f5;
  --color-text-secondary: #86909c;
  --color-border: #2e2e30;
  --color-primary: #4096ff;
  --color-primary-light: #192945;
  --color-success: #00c48c;
  --color-warning: #ff9500;
  --color-error: #f53f3f;
  --color-shadow: rgba(0, 0, 0, 0.3);
}

page {
  background-color: var(--color-bg-page, #f5f7fa);
  -webkit-font-smoothing: antialiased;
}

/* 消除移动端点击时的灰色闪屏 */
view,
text,
button,
input,
textarea,
picker,
slider,
image,
scroll-view,
label {
  -webkit-tap-highlight-color: transparent;
}

.lb-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  padding: 24rpx;
  /* 底部安全区（刘海屏手势条不遮挡内容），旧内核不支持 env 时回退上一行 */
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  transition: background-color 200ms ease, color 200ms ease;
}
.lb-card {
  background: var(--color-bg-card);
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx var(--color-shadow);
}
.lb-title {
  font-size: 34rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.lb-desc {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 16rpx;
}
.lb-label {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 24rpx 0 12rpx;
}
.lb-input {
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: var(--color-text-primary);
  width: 100%;
  box-sizing: border-box;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.lb-input:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4rpx var(--color-primary-light);
}
.lb-textarea {
  min-height: 220rpx;
}
.lb-btn {
  display: block;
  width: 100%;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  padding: 22rpx 16rpx;
  margin: 16rpx 0;
  min-height: 88rpx;
  line-height: 1.4;
  box-sizing: border-box;
  transition: opacity 120ms ease, transform 120ms ease;
}
.lb-btn::after {
  display: none;
}
.lb-btn:active {
  opacity: 0.8;
  transform: scale(0.99);
}
.lb-btn[disabled] {
  background: var(--color-primary);
  color: #fff;
  opacity: 0.45;
}
.lb-btn-plain {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  font-weight: 500;
}
.lb-btn-plain[disabled] {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}
.lb-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
  flex-wrap: wrap;
}
.lb-row .lb-btn {
  flex: 1;
  margin: 0;
}
.lb-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 64rpx;
  box-sizing: border-box;
  padding: 14rpx 28rpx;
  border-radius: 14rpx;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  font-size: 26rpx;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}
.lb-chip:active {
  opacity: 0.75;
}
.lb-chip.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-color: var(--color-primary);
  font-weight: 600;
}
.lb-chip-row {
  display: flex;
  flex-wrap: wrap;
  margin-top: 12rpx;
}
.lb-chip-row .lb-chip {
  margin: 0 16rpx 16rpx 0;
}
/* 通用列表行（首页工具列表等）：整行可点、通栏按压态、右侧箭头暗示可进入 */
.lb-item {
  position: relative;
  display: flex;
  align-items: center;
  margin: 0 -28rpx;
  padding: 22rpx 76rpx 22rpx 28rpx;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 120ms ease;
}
.lb-item:last-child {
  border-bottom: none;
}
.lb-item:active {
  background-color: var(--color-primary-light);
}
.lb-item::after {
  content: '›';
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  font-size: 40rpx;
  line-height: 1;
}
.lb-item-icon {
  width: 52rpx;
  flex-shrink: 0;
  font-size: 40rpx;
  line-height: 1.2;
  text-align: center;
  margin-right: 20rpx;
}
.lb-item-main {
  flex: 1;
  min-width: 0;
}
.lb-item-name {
  font-size: 30rpx;
  font-weight: 500;
}
.lb-item-desc {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 6rpx;
  line-height: 1.5;
  word-break: break-all;
}
/* 文件名行 + 右侧保存按钮（原6个页面各自 scoped，收编为全局） */
.lb-file {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 26rpx;
  line-height: 1.5;
  word-break: break-all;
}
.lb-save {
  margin-left: auto;
  padding: 12rpx 28rpx;
  min-height: 56rpx;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 10rpx;
  font-size: 26rpx;
  font-weight: 600;
  transition: opacity 120ms ease;
}
.lb-save:active {
  opacity: 0.7;
}
.lb-notice {
  margin-top: 16rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  line-height: 1.6;
}
.lb-output {
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
