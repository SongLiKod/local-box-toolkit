import { describe, expect, it } from 'vitest'
import { evaluate, formatNumber, isValid } from '../src/tools/calc'

const v = (s: string, angle?: 'deg' | 'rad'): number => evaluate(s, angle ? { angle } : {}).value

describe('表达式求值', () => {
  it('四则运算优先级与结合性', () => {
    expect(v('1+2*3')).toBe(7)
    expect(v('(1+2)*3')).toBe(9)
    expect(v('2*(3+(4-1))')).toBe(12)
    expect(v('10-2-3')).toBe(5)
    expect(v('100/10/2')).toBe(5)
    expect(v('2+3*4-6/2')).toBe(11)
  })

  it('幂运算右结合与一元负号', () => {
    expect(v('2^3^2')).toBe(512)
    expect(v('-2^2')).toBe(-4)
    expect(v('2^-1')).toBe(0.5)
    expect(v('3^0.5')).toBeCloseTo(Math.sqrt(3), 12)
    expect(v('2^0')).toBe(1)
  })

  it('千分位、科学计数与小数', () => {
    expect(v('1,000+1')).toBe(1001)
    expect(v('1,000,000/1000')).toBe(1000)
    expect(v('1.5e3')).toBe(1500)
    expect(v('.5*4')).toBe(2)
    expect(v('1e-3*2')).toBeCloseTo(0.002, 12)
  })

  it('隐式乘法', () => {
    expect(v('2(3+4)')).toBe(14)
    expect(v('(1+1)(2+2)')).toBe(8)
    expect(v('2pi')).toBeCloseTo(Math.PI * 2, 12)
  })

  it('百分号与阶乘', () => {
    expect(v('200*10%')).toBe(20)
    expect(v('10%*50')).toBe(5)
    expect(v('(50+50)%')).toBe(1)
    expect(v('2+3!')).toBe(8)
    expect(v('fact(5)')).toBe(120)
    expect(v('3!^2')).toBe(36)
  })

  it('函数与常量', () => {
    expect(v('sqrt(16)+abs(-3)')).toBe(7)
    expect(v('max(3,1,2)+min(4,2)')).toBe(5)
    expect(v('min(123,456)')).toBe(123) // 参数分隔符不能被当作千分位
    expect(v('round(3.14159,2)')).toBe(3.14)
    expect(v('floor(2.7)+ceil(2.1)+trunc(-2.7)')).toBe(3)
    expect(v('mod(7,3)')).toBe(1)
    expect(v('log(1000)')).toBe(3)
    expect(v('log2(1024)')).toBe(10)
    expect(v('round(ln(e),10)')).toBe(1)
    expect(v('hypot(3,4)')).toBe(5)
    expect(v('pow(2,10)')).toBe(1024)
    expect(v('pi')).toBeCloseTo(Math.PI, 12)
    expect(v('e')).toBeCloseTo(Math.E, 12)
    expect(v('tau/2')).toBeCloseTo(Math.PI, 12)
  })

  it('三角函数：角度与弧度模式', () => {
    expect(v('sin(30)')).toBeCloseTo(0.5, 12)
    expect(v('cos(60)')).toBeCloseTo(0.5, 12)
    expect(v('tan(45)')).toBeCloseTo(1, 12)
    expect(v('asin(0.5)')).toBeCloseTo(30, 10)
    expect(v('atan(1)')).toBeCloseTo(45, 10)
    expect(v('sin(pi/2)', 'rad')).toBeCloseTo(1, 12)
    expect(v('cos(0)', 'rad')).toBe(1)
    expect(v('radians(180)')).toBeCloseTo(Math.PI, 12)
    expect(v('degrees(pi)')).toBeCloseTo(180, 10)
  })

  it('全角符号归一化', () => {
    expect(v('（1+2）×2')).toBe(6)
    expect(v('10÷4')).toBe(2.5)
    expect(v('5＋3')).toBe(8)
    expect(() => v('１＋２')).toThrow('无法解析的字符')
  })
})

describe('错误提示', () => {
  it('除零与定义域', () => {
    expect(() => v('1/0')).toThrow('除数不能为 0')
    expect(() => v('mod(1,0)')).toThrow('除数不能为 0')
    expect(() => v('sqrt(-1)')).toThrow('定义域')
    expect(() => v('ln(-1)')).toThrow('定义域')
    expect(() => v('asin(2)')).toThrow('定义域')
  })
  it('语法错误', () => {
    expect(() => v('')).toThrow('请输入表达式')
    expect(() => v('1+')).toThrow('表达式不完整')
    expect(() => v('(1+2')).toThrow('缺少右括号')
    expect(() => v('1+2)')).toThrow('多余的符号')
    expect(() => v('foo')).toThrow('未知的名称')
    expect(() => v('unknown(1)')).toThrow('未知的函数')
    expect(() => v('1 + $')).toThrow('无法解析的字符')
    expect(() => v('pow(1)')).toThrow('需要 2 个参数')
    expect(() => v('sqrt(1,2)')).toThrow('需要 1 个参数')
  })
  it('数值与规模限制', () => {
    expect(() => v('2^2000')).toThrow('超出范围')
    expect(() => v('fact(-1)')).toThrow('非负整数')
    expect(() => v('fact(200)')).toThrow('超出范围')
    expect(() => v('1e400')).toThrow('数字格式错误')
    expect(() => v('('.repeat(300) + '1' + ')'.repeat(300))).toThrow('嵌套过深')
    expect(() => v('x'.repeat(2001))).toThrow('表达式过长')
  })
})

describe('结果格式化', () => {
  it('千分位与有效数字', () => {
    expect(formatNumber(1234567.5)).toBe('1,234,567.5')
    expect(formatNumber(-1234.5)).toBe('-1,234.5')
    expect(formatNumber(1 / 3)).toBe('0.333333333333')
    expect(formatNumber(1 / 3, false)).toBe('0.333333333333')
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(-0)).toBe('0')
    expect(formatNumber(100)).toBe('100')
  })
  it('极大极小值使用科学计数法', () => {
    expect(formatNumber(1e-10)).toBe('1e-10')
    expect(formatNumber(1e21)).toBe('1e+21')
    expect(formatNumber(1.23456789e-12)).toBe('1.23456789e-12')
  })
  it('评估结果自带格式化串', () => {
    expect(evaluate('1+1').formatted).toBe('2')
    expect(evaluate('1000*1000').formatted).toBe('1,000,000')
    expect(evaluate('0.1+0.2').formatted).toBe('0.3')
  })
})

describe('表达式校验', () => {
  it('isValid 不抛异常', () => {
    expect(isValid('1+1')).toBe(true)
    expect(isValid('1+')).toBe(false)
    expect(isValid('2^10')).toBe(true)
  })
})
