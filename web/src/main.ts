import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/global.scss'
import App from './App.vue'
import { router } from './router'
import { initTheme } from './composables/useTheme'
import { getNative } from '@localbox/core/index'

void initTheme()

// Web 端注册 Service Worker 实现离线可用；Electron 客户端本身离线，跳过
if (!getNative()) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => undefined)
}

createApp(App).use(router).use(ElementPlus, { locale: zhCn }).mount('#app')
