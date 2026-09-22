<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { initTheme } from './composables/useTheme'

onLaunch(() => {
  void initTheme()
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
  --color-error: #ff4d4f;
  --color-shadow: rgba(0, 0, 0, 0.3);
}

page {
  background-color: var(--color-bg-page, #f5f7fa);
}

.lb-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  padding: 24rpx;
  box-sizing: border-box;
  transition: background-color 200ms ease, color 200ms ease;
}
.lb-card {
  background: var(--color-bg-card);
  border-radius: 16rpx;
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
  color: var(--color-text-secondary);
  margin: 16rpx 0 8rpx;
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
}
.lb-textarea {
  min-height: 220rpx;
}
.lb-btn {
  background: var(--color-primary);
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
  padding: 24rpx 0;
  margin: 12rpx 0;
  min-height: 80rpx;
}
.lb-btn-plain {
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
.lb-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
  flex-wrap: wrap;
}
.lb-chip {
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  font-size: 26rpx;
}
.lb-chip.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.lb-output {
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
