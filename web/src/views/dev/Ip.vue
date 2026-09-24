<template>
  <div class="lb-card">
    <ToolHeader tool-id="ip" />
    <el-tabs v-model="tab">
      <el-tab-pane label="IPv4 转换" name="ipv4">
        <div class="lb-row lb-section">
          <el-input v-model="ipv4" placeholder="如 192.168.1.1" style="width: 260px" @keyup.enter="convertV4" />
          <el-button type="primary" @click="convertV4">转换</el-button>
        </div>
        <el-alert v-if="v4Error" type="error" :title="v4Error" :closable="false" show-icon class="lb-section" />
        <el-descriptions v-if="v4" :column="1" border size="small">
          <el-descriptions-item label="点分十进制">{{ v4.ip }}</el-descriptions-item>
          <el-descriptions-item label="整数（Decimal）">
            {{ v4.integer }}
            <el-button link type="primary" size="small" @click="copy(v4.integer)">复制</el-button>
          </el-descriptions-item>
          <el-descriptions-item label="二进制">{{ v4.binary }}</el-descriptions-item>
          <el-descriptions-item label="32位二进制">{{ v4.binaryPlain }}</el-descriptions-item>
          <el-descriptions-item label="十六进制">{{ v4.hex }}</el-descriptions-item>
          <el-descriptions-item label="地址类型">{{ v4.isPrivate ? '私有地址' : '公网地址' }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <el-tab-pane label="子网计算" name="subnet">
        <div class="lb-row lb-section">
          <el-input v-model="cidr" placeholder="如 192.168.1.10/24 或 192.168.1.10/255.255.255.0" style="width: 420px" @keyup.enter="calc" />
          <el-button type="primary" @click="calc">计算</el-button>
        </div>
        <el-alert v-if="subnetError" type="error" :title="subnetError" :closable="false" show-icon class="lb-section" />
        <el-descriptions v-if="subnet" :column="2" border size="small">
          <el-descriptions-item label="CIDR">{{ subnet.cidr }}</el-descriptions-item>
          <el-descriptions-item label="子网掩码">{{ subnet.netmask }}</el-descriptions-item>
          <el-descriptions-item label="网络地址">{{ subnet.network }}</el-descriptions-item>
          <el-descriptions-item label="广播地址">{{ subnet.broadcast }}</el-descriptions-item>
          <el-descriptions-item label="可用主机范围">{{ subnet.firstHost }} ~ {{ subnet.lastHost }}</el-descriptions-item>
          <el-descriptions-item label="反掩码（通配符）">{{ subnet.wildcard }}</el-descriptions-item>
          <el-descriptions-item label="地址总数">{{ subnet.totalAddresses }}</el-descriptions-item>
          <el-descriptions-item label="可用主机数">{{ subnet.usableHosts }}</el-descriptions-item>
          <el-descriptions-item label="地址类别">{{ subnet.ipClass }}</el-descriptions-item>
          <el-descriptions-item label="用途">{{ subnet.scope }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <el-tab-pane label="IPv6 转换" name="ipv6">
        <div class="lb-row lb-section">
          <el-input v-model="ipv6" placeholder="如 2001:db8::1" style="width: 340px" @keyup.enter="convertV6" />
          <el-button type="primary" @click="convertV6">转换</el-button>
        </div>
        <el-alert v-if="v6Error" type="error" :title="v6Error" :closable="false" show-icon class="lb-section" />
        <el-descriptions v-if="v6" :column="1" border size="small">
          <el-descriptions-item label="压缩格式">{{ v6.compressed }}</el-descriptions-item>
          <el-descriptions-item label="完整格式">{{ v6.full }}</el-descriptions-item>
          <el-descriptions-item label="整数（十进制）">
            {{ v6.integer }}
            <el-button link type="primary" size="small" @click="copy(v6.integer)">复制</el-button>
          </el-descriptions-item>
          <el-descriptions-item v-if="v6.mappedIpv4" label="对应 IPv4">{{ v6.mappedIpv4 }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <el-tab-pane label="IPv4 → IPv6" name="map">
        <div class="lb-row lb-section">
          <el-input v-model="mapIp" placeholder="如 192.168.1.1" style="width: 260px" @keyup.enter="convertMap" />
          <el-button type="primary" @click="convertMap">映射</el-button>
        </div>
        <el-alert v-if="mapError" type="error" :title="mapError" :closable="false" show-icon class="lb-section" />
        <el-descriptions v-if="mapped" :column="1" border size="small">
          <el-descriptions-item label="IPv4 映射地址">{{ mapped }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import {
  ipTools,
  type Ipv4FullInfo,
  type Ipv6FullInfo,
  type SubnetInfo,
} from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const tab = ref('ipv4')
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

async function copy(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}
</script>
