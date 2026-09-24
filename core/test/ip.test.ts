import { describe, expect, it } from 'vitest'
import {
  parseIpv4,
  isValidIpv4,
  ipv4ToInt,
  intToIpv4,
  ipv4ToBinary,
  ipv4ToHex,
  ipv4ToInfo,
  isPrivateIpv4,
  calcSubnet,
  expandIpv6,
  compressIpv6,
  isValidIpv6,
  ipv6ToBigInt,
  bigIntToIpv6,
  ipv4ToMappedIpv6,
  ipv6ToIpv4,
} from '../src/tools/ip'

describe('IPv4 转换', () => {
  it('点分十进制与整数互转', () => {
    expect(ipv4ToInt('192.168.1.1')).toBe(3232235777)
    expect(intToIpv4(3232235777)).toBe('192.168.1.1')
    expect(intToIpv4(0)).toBe('0.0.0.0')
    expect(intToIpv4(4294967295)).toBe('255.255.255.255')
  })

  it('二进制与十六进制', () => {
    expect(ipv4ToBinary('192.168.1.1')).toBe('11000000.10101000.00000001.00000001')
    expect(ipv4ToBinary('192.168.1.1', false)).toHaveLength(32)
    expect(ipv4ToHex('192.168.1.1')).toBe('0xc0a80101')
    expect(ipv4ToHex('192.168.1.1', true)).toBe('c0.a8.01.01')
  })

  it('非法地址报错', () => {
    expect(isValidIpv4('256.1.1.1')).toBe(false)
    expect(isValidIpv4('1.2.3')).toBe(false)
    expect(() => parseIpv4('a.b.c.d')).toThrow()
  })

  it('私有地址判断', () => {
    expect(isPrivateIpv4('10.0.0.1')).toBe(true)
    expect(isPrivateIpv4('172.16.5.4')).toBe(true)
    expect(isPrivateIpv4('192.168.1.1')).toBe(true)
    expect(isPrivateIpv4('8.8.8.8')).toBe(false)
  })
})

describe('CIDR 子网计算', () => {
  it('常见 /24 子网', () => {
    const r = calcSubnet('192.168.1.10/24')
    expect(r.network).toBe('192.168.1.0')
    expect(r.broadcast).toBe('192.168.1.255')
    expect(r.netmask).toBe('255.255.255.0')
    expect(r.firstHost).toBe('192.168.1.1')
    expect(r.lastHost).toBe('192.168.1.254')
    expect(r.usableHosts).toBe(254)
    expect(r.ipClass).toBe('C')
  })

  it('支持掩码写法', () => {
    const r = calcSubnet('10.1.2.3/255.255.0.0')
    expect(r.prefix).toBe(16)
    expect(r.network).toBe('10.1.0.0')
    expect(r.broadcast).toBe('10.1.255.255')
  })

  it('/31 与 /32 的特殊可用主机数', () => {
    expect(calcSubnet('192.168.1.0/31').usableHosts).toBe(2)
    expect(calcSubnet('192.168.1.5/32').usableHosts).toBe(1)
    expect(calcSubnet('192.168.1.5/32').network).toBe('192.168.1.5')
  })

  it('非法掩码报错', () => {
    expect(() => calcSubnet('192.168.1.1/255.0.255.0')).toThrow()
  })
})

describe('IPv6 转换', () => {
  it('展开与压缩', () => {
    expect(expandIpv6('2001:db8::1')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001')
    expect(compressIpv6('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe('2001:db8::1')
    expect(compressIpv6('::1')).toBe('::1')
    expect(expandIpv6('::1')).toBe('0000:0000:0000:0000:0000:0000:0000:0001')
  })

  it('整段压缩选择最长零段', () => {
    expect(compressIpv6('1:0:0:2:0:0:0:3')).toBe('1:0:0:2::3')
  })

  it('与整数互转', () => {
    const n = ipv6ToBigInt('::1')
    expect(n).toBe(1n)
    expect(bigIntToIpv6(1n)).toBe('0000:0000:0000:0000:0000:0000:0000:0001')
    expect(compressIpv6(bigIntToIpv6(ipv6ToBigInt('2001:db8::')))).toBe('2001:db8::')
  })

  it('非法地址判断', () => {
    expect(isValidIpv6('::')).toBe(true)
    expect(isValidIpv6('2001:db8::1::2')).toBe(false)
    expect(isValidIpv6('gggg::1')).toBe(false)
  })

  it('IPv4 映射地址互转', () => {
    expect(ipv4ToMappedIpv6('192.168.1.1')).toBe('::ffff:c0a8:101')
    expect(ipv6ToIpv4('::ffff:192.168.1.1')).toBe('192.168.1.1')
    expect(ipv6ToIpv4('2001:db8::1')).toBeNull()
  })
})

describe('IPv4 综合信息', () => {
  it('返回多种表示', () => {
    const info = ipv4ToInfo('8.8.8.8')
    expect(info.integer).toBe('134744072')
    expect(info.isPrivate).toBe(false)
    expect(info.hex).toBe('0x08080808')
  })
})
