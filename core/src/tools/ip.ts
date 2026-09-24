/** IP 地址工具：IPv4/IPv6 各种格式互转、CIDR 子网计算（纯本地） */

export interface Ipv4Parts {
  a: number
  b: number
  c: number
  d: number
}

export function parseIpv4(input: string): Ipv4Parts {
  const s = input.trim()
  const parts = s.split('.')
  if (parts.length !== 4) throw new Error('IPv4 地址应为四段，如 192.168.1.1')
  const nums = parts.map((p) => {
    if (!/^\d{1,3}$/.test(p)) throw new Error(`非法 IPv4 段：${p}`)
    const n = Number(p)
    if (n < 0 || n > 255) throw new Error(`IPv4 每段范围 0~255：${p}`)
    return n
  })
  return { a: nums[0], b: nums[1], c: nums[2], d: nums[3] }
}

export function isValidIpv4(input: string): boolean {
  try {
    parseIpv4(input)
    return true
  } catch {
    return false
  }
}

export function ipv4ToInt(input: string): number {
  const { a, b, c, d } = parseIpv4(input)
  return a * 16777216 + b * 65536 + c * 256 + d
}

export function intToIpv4(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n > 4294967295 || Math.floor(n) !== n) {
    throw new Error('整数超出 IPv4 范围 0~4294967295')
  }
  const x = n >>> 0
  return [(x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255].join('.')
}

export function ipv4ToBinary(input: string, dotted = true): string {
  const { a, b, c, d } = parseIpv4(input)
  const bin = (n: number) => n.toString(2).padStart(8, '0')
  return dotted ? [bin(a), bin(b), bin(c), bin(d)].join('.') : bin(a) + bin(b) + bin(c) + bin(d)
}

export function ipv4ToHex(input: string, dotted = false): string {
  const { a, b, c, d } = parseIpv4(input)
  const h = (n: number) => n.toString(16).padStart(2, '0')
  return dotted ? [h(a), h(b), h(c), h(d)].join('.') : `0x${h(a)}${h(b)}${h(c)}${h(d)}`
}

function prefixToMask(prefix: number): number {
  if (prefix < 0 || prefix > 32) throw new Error('前缀长度范围 0~32')
  if (prefix === 0) return 0
  return (0xffffffff << (32 - prefix)) >>> 0
}

function maskToPrefix(mask: number): number {
  let count = 0
  for (let i = 31; i >= 0; i--) {
    if ((mask >>> i) & 1) count += 1
    else break
  }
  // 校验掩码为连续的 1
  if (((0xffffffff << (32 - count)) >>> 0) !== mask) throw new Error('子网掩码不是连续的 1')
  return count
}

export interface SubnetInfo {
  cidr: string
  ip: string
  prefix: number
  netmask: string
  wildcard: string
  network: string
  broadcast: string
  firstHost: string
  lastHost: string
  totalAddresses: number
  usableHosts: number
  ipClass: string
  scope: string
}

function classifyIpv4(a: number): { ipClass: string; scope: string } {
  let ipClass = 'E'
  if (a >= 1 && a <= 126) ipClass = 'A'
  else if (a >= 128 && a <= 191) ipClass = 'B'
  else if (a >= 192 && a <= 223) ipClass = 'C'
  else if (a >= 224 && a <= 239) ipClass = 'D（组播）'
  else if (a === 0 || a === 127) ipClass = a === 127 ? '回环' : 'A'
  else ipClass = 'E'

  let scope = '公网'
  if (a === 10) scope = '私有（10.0.0.0/8）'
  else if (a === 172) scope = '私有（172.16.0.0/12 的一部分）'
  else if (a === 192) scope = '可能是私有（192.168.0.0/16）'
  else if (a === 127) scope = '回环（127.0.0.0/8）'
  else if (a === 169) scope = '链路本地（可能 169.254.0.0/16）'
  else if (a >= 224) scope = '组播/保留'
  return { ipClass, scope }
}

/** 精确判断私有地址 */
export function isPrivateIpv4(input: string): boolean {
  const n = ipv4ToInt(input)
  const inRange = (base: string, prefix: number): boolean => {
    const mask = prefixToMask(prefix)
    const baseInt = ipv4ToInt(base)
    return (n & mask) >>> 0 === (baseInt & mask) >>> 0
  }
  return inRange('10.0.0.0', 8) || inRange('172.16.0.0', 12) || inRange('192.168.0.0', 16)
}

/** CIDR 子网计算：支持 "192.168.1.10/24" 或 "192.168.1.10/255.255.255.0" */
export function calcSubnet(input: string): SubnetInfo {
  const src = input.trim()
  const [ipPart, maskPart] = src.split('/')
  if (!ipPart) throw new Error('请输入 IPv4 地址或 CIDR')
  const ipInt = ipv4ToInt(ipPart)
  let prefix: number
  if (maskPart === undefined || maskPart === '') {
    prefix = 32
  } else if (maskPart.includes('.')) {
    prefix = maskToPrefix(ipv4ToInt(maskPart))
  } else {
    if (!/^\d{1,2}$/.test(maskPart)) throw new Error('前缀长度应为 0~32 的整数')
    prefix = Number(maskPart)
    if (prefix < 0 || prefix > 32) throw new Error('前缀长度范围 0~32')
  }
  const mask = prefixToMask(prefix)
  const wildcard = (~mask) >>> 0
  const network = (ipInt & mask) >>> 0
  const broadcast = (network | wildcard) >>> 0
  const total = 2 ** (32 - prefix)

  let firstHostInt = network
  let lastHostInt = broadcast
  let usableHosts = 0
  if (prefix === 32) {
    firstHostInt = network
    lastHostInt = network
    usableHosts = 1
  } else if (prefix === 31) {
    firstHostInt = network
    lastHostInt = broadcast
    usableHosts = 2
  } else {
    firstHostInt = network + 1
    lastHostInt = broadcast - 1
    usableHosts = Math.max(0, total - 2)
  }

  const { ipClass, scope } = classifyIpv4(parseIpv4(ipPart).a)
  return {
    cidr: `${intToIpv4(network)}/${prefix}`,
    ip: intToIpv4(ipInt),
    prefix,
    netmask: intToIpv4(mask),
    wildcard: intToIpv4(wildcard),
    network: intToIpv4(network),
    broadcast: intToIpv4(broadcast),
    firstHost: intToIpv4(firstHostInt),
    lastHost: intToIpv4(lastHostInt),
    totalAddresses: total,
    usableHosts,
    ipClass,
    scope,
  }
}

export interface Ipv4FullInfo {
  ip: string
  integer: string
  binary: string
  binaryPlain: string
  hex: string
  hexPlain: string
  isPrivate: boolean
}

/** IPv4 各种表示：点分十进制 / 整数 / 二进制 / 十六进制 */
export function ipv4ToInfo(input: string): Ipv4FullInfo {
  return {
    ip: intToIpv4(ipv4ToInt(input)),
    integer: String(ipv4ToInt(input)),
    binary: ipv4ToBinary(input, true),
    binaryPlain: ipv4ToBinary(input, false),
    hex: ipv4ToHex(input, false),
    hexPlain: ipv4ToHex(input, true),
    isPrivate: isPrivateIpv4(input),
  }
}

export function expandIpv6(input: string): string {
  const ip = input.trim().toLowerCase()
  if (!ip.includes(':')) throw new Error('IPv6 地址格式错误')
  const doubleCount = ip.split('::').length - 1
  if (doubleCount > 1) throw new Error('IPv6 地址只能包含一个 "::"')

  const convertV4 = (groups: string[]): string[] => {
    const last = groups[groups.length - 1]
    if (last && last.includes('.')) {
      const { a, b, c, d } = parseIpv4(last)
      return [...groups.slice(0, -1), ((a << 8) | b).toString(16), ((c << 8) | d).toString(16)]
    }
    return groups
  }

  let head: string[]
  let tail: string[] = []
  if (doubleCount === 1) {
    const [h, t] = ip.split('::')
    head = h ? h.split(':') : []
    tail = t ? t.split(':') : []
  } else {
    head = ip.split(':')
  }
  head = convertV4(head)
  tail = convertV4(tail)

  if (doubleCount === 1 && head.length + tail.length > 7) throw new Error('IPv6 地址格式错误')
  if (doubleCount === 0 && head.length !== 8) throw new Error('IPv6 地址应为 8 组')
  const missing = 8 - head.length - tail.length
  if (doubleCount === 0 && missing !== 0) throw new Error('IPv6 地址应为 8 组')

  const full = [...head, ...Array(Math.max(0, missing)).fill('0'), ...tail]
  if (full.length !== 8) throw new Error('IPv6 地址格式错误')
  return full
    .map((g) => {
      if (!/^[0-9a-f]{1,4}$/.test(g)) throw new Error(`非法 IPv6 组：${g}`)
      return g.padStart(4, '0')
    })
    .join(':')
}

export function isValidIpv6(input: string): boolean {
  try {
    expandIpv6(input)
    return true
  } catch {
    return false
  }
}

/** IPv6 压缩为最简形式（最长零段用 :: 省略） */
export function compressIpv6(input: string): string {
  const groups = expandIpv6(input)
    .split(':')
    .map((g) => g.replace(/^0+/, '') || '0')
  let bestStart = -1
  let bestLen = 0
  let curStart = -1
  let curLen = 0
  for (let i = 0; i < groups.length; i++) {
    if (groups[i] === '0') {
      if (curStart < 0) {
        curStart = i
        curLen = 1
      } else {
        curLen += 1
      }
      if (curLen > bestLen) {
        bestLen = curLen
        bestStart = curStart
      }
    } else {
      curStart = -1
      curLen = 0
    }
  }
  if (bestLen < 2) return groups.join(':')
  const head = groups.slice(0, bestStart).join(':')
  const tail = groups.slice(bestStart + bestLen).join(':')
  return `${head}::${tail}`
}

export function ipv6ToBigInt(input: string): bigint {
  const groups = expandIpv6(input).split(':')
  let n = 0n
  for (const g of groups) n = (n << 16n) + BigInt(parseInt(g, 16))
  return n
}

export function bigIntToIpv6(value: bigint): string {
  if (value < 0n || value >= 1n << 128n) throw new Error('整数超出 IPv6 范围')
  const groups: string[] = []
  let n = value
  for (let i = 0; i < 8; i++) {
    groups.unshift((n & 0xffffn).toString(16).padStart(4, '0'))
    n >>= 16n
  }
  return groups.join(':')
}

export function ipv4ToMappedIpv6(input: string): string {
  const { a, b, c, d } = parseIpv4(input)
  const hi = ((a << 8) | b).toString(16)
  const lo = ((c << 8) | d).toString(16)
  return compressIpv6(`0:0:0:0:0:ffff:${hi}:${lo}`)
}

/** 若为 IPv4 映射/兼容地址，还原成 IPv4 */
export function ipv6ToIpv4(input: string): string | null {
  const groups = expandIpv6(input).split(':')
  const allZeroExceptTail = groups.slice(0, 6).every((g, i) => (i === 5 ? g === 'ffff' || g === '0000' : g === '0000'))
  if (!allZeroExceptTail) return null
  const hi = parseInt(groups[6], 16)
  const lo = parseInt(groups[7], 16)
  return [(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255].join('.')
}

export interface Ipv6FullInfo {
  full: string
  compressed: string
  integer: string
  groups: string[]
  mappedIpv4: string | null
}

export function ipv6ToInfo(input: string): Ipv6FullInfo {
  return {
    full: expandIpv6(input),
    compressed: compressIpv6(input),
    integer: ipv6ToBigInt(input).toString(),
    groups: expandIpv6(input).split(':'),
    mappedIpv4: ipv6ToIpv4(input),
  }
}
