export interface UnitDef {
  id: string
  name: string
  /** 到基准单位的换算系数（乘） */
  factor: number
}

export interface UnitCategory {
  id: string
  name: string
  base: string
  units: UnitDef[]
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: '长度',
    base: 'm',
    units: [
      { id: 'nm', name: '纳米', factor: 1e-9 },
      { id: 'um', name: '微米', factor: 1e-6 },
      { id: 'mm', name: '毫米', factor: 1e-3 },
      { id: 'cm', name: '厘米', factor: 1e-2 },
      { id: 'm', name: '米', factor: 1 },
      { id: 'km', name: '千米', factor: 1e3 },
      { id: 'in', name: '英寸', factor: 0.0254 },
      { id: 'ft', name: '英尺', factor: 0.3048 },
      { id: 'yd', name: '码', factor: 0.9144 },
      { id: 'mi', name: '英里', factor: 1609.344 },
      { id: 'nmi', name: '海里', factor: 1852 },
      { id: 'li', name: '市里', factor: 500 },
      { id: 'zhang', name: '市丈', factor: 10 / 3 },
      { id: 'chi', name: '市尺', factor: 1 / 3 },
      { id: 'cun', name: '市寸', factor: 1 / 30 },
    ],
  },
  {
    id: 'area',
    name: '面积',
    base: 'm2',
    units: [
      { id: 'mm2', name: '平方毫米', factor: 1e-6 },
      { id: 'cm2', name: '平方厘米', factor: 1e-4 },
      { id: 'm2', name: '平方米', factor: 1 },
      { id: 'ha', name: '公顷', factor: 1e4 },
      { id: 'km2', name: '平方千米', factor: 1e6 },
      { id: 'mu', name: '亩', factor: 2000 / 3 },
      { id: 'ft2', name: '平方英尺', factor: 0.09290304 },
      { id: 'acre', name: '英亩', factor: 4046.8564224 },
    ],
  },
  {
    id: 'volume',
    name: '体积/容积',
    base: 'l',
    units: [
      { id: 'ml', name: '毫升', factor: 1e-3 },
      { id: 'l', name: '升', factor: 1 },
      { id: 'm3', name: '立方米', factor: 1000 },
      { id: 'cm3', name: '立方厘米', factor: 1e-3 },
      { id: 'gal-us', name: '美制加仑', factor: 3.785411784 },
      { id: 'gal-uk', name: '英制加仑', factor: 4.54609 },
      { id: 'qt', name: '夸脱', factor: 0.946352946 },
      { id: 'pt', name: '品脱', factor: 0.473176473 },
    ],
  },
  {
    id: 'weight',
    name: '重量',
    base: 'kg',
    units: [
      { id: 'mg', name: '毫克', factor: 1e-6 },
      { id: 'g', name: '克', factor: 1e-3 },
      { id: 'kg', name: '千克', factor: 1 },
      { id: 't', name: '吨', factor: 1000 },
      { id: 'jin', name: '市斤', factor: 0.5 },
      { id: 'liang', name: '市两', factor: 0.05 },
      { id: 'lb', name: '磅', factor: 0.45359237 },
      { id: 'oz', name: '盎司', factor: 0.028349523125 },
    ],
  },
  {
    id: 'speed',
    name: '速度',
    base: 'ms',
    units: [
      { id: 'ms', name: '米/秒', factor: 1 },
      { id: 'kmh', name: '千米/时', factor: 1 / 3.6 },
      { id: 'mph', name: '英里/时', factor: 0.44704 },
      { id: 'kn', name: '节', factor: 0.514444444 },
      { id: 'mach', name: '马赫', factor: 340.29 },
    ],
  },
  {
    id: 'time',
    name: '时间',
    base: 's',
    units: [
      { id: 'ms', name: '毫秒', factor: 1e-3 },
      { id: 's', name: '秒', factor: 1 },
      { id: 'min', name: '分钟', factor: 60 },
      { id: 'h', name: '小时', factor: 3600 },
      { id: 'd', name: '天', factor: 86400 },
      { id: 'wk', name: '周', factor: 604800 },
      { id: 'mo', name: '月(30天)', factor: 2592000 },
      { id: 'yr', name: '年(365天)', factor: 31536000 },
    ],
  },
  {
    id: 'data',
    name: '数据存储',
    base: 'b',
    units: [
      { id: 'bit', name: '比特', factor: 1 / 8 },
      { id: 'b', name: '字节', factor: 1 },
      { id: 'kb', name: 'KB', factor: 1024 },
      { id: 'mb', name: 'MB', factor: 1024 ** 2 },
      { id: 'gb', name: 'GB', factor: 1024 ** 3 },
      { id: 'tb', name: 'TB', factor: 1024 ** 4 },
      { id: 'pb', name: 'PB', factor: 1024 ** 5 },
    ],
  },
  {
    id: 'pressure',
    name: '压强',
    base: 'pa',
    units: [
      { id: 'pa', name: '帕斯卡', factor: 1 },
      { id: 'kpa', name: '千帕', factor: 1000 },
      { id: 'mpa', name: '兆帕', factor: 1e6 },
      { id: 'bar', name: '巴', factor: 1e5 },
      { id: 'atm', name: '标准大气压', factor: 101325 },
      { id: 'mmhg', name: '毫米汞柱', factor: 133.322387415 },
      { id: 'psi', name: 'psi', factor: 6894.757293168 },
    ],
  },
  {
    id: 'power',
    name: '功率',
    base: 'w',
    units: [
      { id: 'w', name: '瓦特', factor: 1 },
      { id: 'kw', name: '千瓦', factor: 1000 },
      { id: 'mw', name: '兆瓦', factor: 1e6 },
      { id: 'hp', name: '英制马力', factor: 745.699871582 },
      { id: 'ps', name: '公制马力', factor: 735.49875 },
    ],
  },
]

export function convertUnit(catId: string, fromId: string, toId: string, value: number): number {
  const cat = UNIT_CATEGORIES.find((c) => c.id === catId)
  if (!cat) throw new Error(`未知单位类别: ${catId}`)
  const from = cat.units.find((u) => u.id === fromId)
  const to = cat.units.find((u) => u.id === toId)
  if (!from || !to) throw new Error(`未知单位: ${fromId} / ${toId}`)
  if (catId === 'temperature') throw new Error('温度请使用 convertTemperature')
  return (value * from.factor) / to.factor
}

export function convertTemperature(value: number, from: 'c' | 'f' | 'k', to: 'c' | 'f' | 'k'): number {
  let c: number
  switch (from) {
    case 'c':
      c = value
      break
    case 'f':
      c = (value - 32) / 1.8
      break
    case 'k':
      c = value - 273.15
      break
  }
  switch (to) {
    case 'c':
      return c
    case 'f':
      return c * 1.8 + 32
    case 'k':
      return c + 273.15
  }
}

export function roundSmart(n: number): number {
  if (!Number.isFinite(n)) return n
  const abs = Math.abs(n)
  const digits = abs >= 100 ? 4 : abs >= 1 ? 6 : 8
  return parseFloat(n.toFixed(digits))
}
