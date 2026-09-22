import { LocalStore } from '@localbox/core/index'
import { UniStorageAdapter } from '@localbox/core/storage/uni'

/**
 * 安卓端本地存储：uni.setStorage（本机，不跨设备同步）。
 * 主题、收藏、历史、参数配置全部保存在手机本地。
 */
export const uniAdapter = new UniStorageAdapter()
export const store = new LocalStore(uniAdapter)
