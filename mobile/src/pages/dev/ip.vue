<template>
  <ToolPage tool-id="ip">
    <view class="lb-card">
      <view class="lb-row">
        <view v-for="m in modes" :key="m.id" class="lb-chip" :class="{ active: mode === m.id }" @click="mode = m.id">
          {{ m.name }}
        </view>
      </view>

      <template v-if="mode === 'ipv4'">
        <view class="lb-label">IPv4 地址</view>
        <input v-model="ipv4" class="lb-input" placeholder="192.168.1.1" />
        <button class="lb-btn" @click="convertV4">转换</button>
        <view v-if="v4Error" class="lb-error">{{ v4Error }}</view>
        <view v-else-if="v4" class="lb-output">
          <view>点分十进制：{{ v4.ip }}</view>
          <view>整数：{{ v4.integer }}</view>
          <view>二进制：{{ v4.binary }}</view>
          <view>十六进制：{{ v4.hex }}</view>
          <view>地址类型：{{ v4.isPrivate ? '私有地址' : '公网地址' }}</view>
        </view>
      </template>

      <template v-else-if="mode === 'subnet'">
        <view class="lb-label">IP/CIDR</view>
        <input v-model="cidr" class="lb-input" placeholder="192.168.1.10/24" />
        <button class="lb-btn" @click="calc">计算</button>
        <view v-if="subnetError" class="lb-error">{{ subnetError }}</view>
        <view v-else-if="subnet" class="lb-output">
          <view>CIDR：{{ subnet.cidr }}</view>
          <view>子网掩码：{{ subnet.netmask }}</view>
          <view>网络地址：{{ subnet.network }}</view>
          <view>广播地址：{{ subnet.broadcast }}</view>
          <view>可用主机：{{ subnet.firstHost }} ~ {{ subnet.lastHost }}</view>
          <view>通配符：{{ subnet.wildcard }}</view>
          <view>地址总数：{{ subnet.totalAddresses }}</view>
          <view>可用主机数：{{ subnet.usableHosts }}</view>
          <view>地址类别：{{ subnet.ipClass }} · {{ subnet.scope }}</view>
        </view>
      </template>

      <template v-else-if="mode === 'ipv6'">
        <view class="lb-label">IPv6 地址</view>
        <input v-model="ipv6" class="lb-input" placeholder="2001:db8::1" />
        <button class="lb-btn" @click="convertV6">转换</button>
        <view v-if="v6Error" class="lb-error">{{ v6Error }}</view>
        <view v-else-if="v6" class="lb-output">
          <view>压缩格式：{{ v6.compressed }}</view>
          <view>完整格式：{{ v6.full }}</view>
          <view>整数：{{ v6.integer }}</view>
          <view v-if="v6.mappedIpv4">对应 IPv4：{{ v6.mappedIpv4 }}</view>
        </view>
      </template>

      <template v-else>
        <view class="lb-label">IPv4 地址</view>
        <input v-model="mapIp" class="lb-input" placeholder="192.168.1.1" />
        <button class="lb-btn" @click="convertMap">转为 IPv4 映射 IPv6</button>
        <view v-if="mapError" class="lb-error">{{ mapError }}</view>
        <view v-else-if="mapped" class="lb-output">{{ mapped }}</view>
      </template>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import {
  ipTools,
  type Ipv4FullInfo,
  type Ipv6FullInfo,
  type SubnetInfo,
} from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const modes = [
  { id: 'ipv4', name: 'IPv4 转换' },
  { id: 'subnet', name: '子网计算' },
  { id: 'ipv6', name: 'IPv6 转换' },
  { id: 'map', name: 'IPv4→IPv6' },
] as const

const mode = ref<(typeof modes)[number]['id']>('ipv4')
const record = useToolHistory('ip')

const ipv4 = ref('')
const v4 = ref<Ipv4FullInfo | null>(null)
const v4Error = ref('')

const cidr = ref('')
const subnet = ref<SubnetInfo | null>(null)
const subnetError = ref('')

const ipv6 = ref('')
const v6 = ref<Ipv6FullInfo | null>(null)
const v6Error = ref('')

const mapIp = ref('')
const mapped = ref('')
const mapError = ref('')

function convertV4(): void {
  try {
    v4.value = ipTools.ipv4ToInfo(ipv4.value)
    v4Error.value = ''
    record('IPv4转换', v4.value.ip)
  } catch (e) {
    v4.value = null
    v4Error.value = e instanceof Error ? e.message : String(e)
  }
}

function calc(): void {
  try {
    subnet.value = ipTools.calcSubnet(cidr.value)
    subnetError.value = ''
    record('子网计算', subnet.value.cidr)
  } catch (e) {
    subnet.value = null
    subnetError.value = e instanceof Error ? e.message : String(e)
  }
}

function convertV6(): void {
  try {
    v6.value = ipTools.ipv6ToInfo(ipv6.value)
    v6Error.value = ''
    record('IPv6转换', v6.value.compressed)
  } catch (e) {
    v6.value = null
    v6Error.value = e instanceof Error ? e.message : String(e)
  }
}

function convertMap(): void {
  try {
    mapped.value = ipTools.ipv4ToMappedIpv6(mapIp.value)
    mapError.value = ''
    record('IPv4映射IPv6', mapped.value)
  } catch (e) {
    mapped.value = ''
    mapError.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<style scoped>
.lb-error {
  font-size: 24rpx;
  color: var(--color-error);
  margin-top: 12rpx;
}
</style>
