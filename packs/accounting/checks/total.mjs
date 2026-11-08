// 会计领域的判据脚本：核对一张明细表的"合计"和"笔数"。
//
// 为什么是脚本而不是纯文本判据：会计的核心验收是**数量对得上**，
// 而 text 判据只能查"某某字符串出现了"。这里是可执行、可复现的真校验。
//
// 两种用法：
//   1) 命令行：node total.mjs <csv> --total 1234.56 [--count 5] [--amount-col 2]
//   2) 当函数：import { checkTotals } from './total.mjs'
//
// 退出码：0 通过；1 不通过；2 用法错误。

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * 拆一行 CSV。**必须处理引号**：真实会计表里金额常写成 "￥1,200.00"，
 * 简单 split(',') 会把它切成两格（实测踩过，合计直接从 1288 变成 89）。
 */
export function splitCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((cell) => cell.trim())
}

/** 极简 CSV：够用就好。去掉 Excel 的 BOM，否则第一列会带隐形字符。 */
export function parseCsv(text) {
  return String(text)
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map(splitCsvLine)
}

export function toAmount(cell) {
  const cleaned = String(cell ?? '').replace(/[,\s￥¥元$]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * 核对合计与笔数。纯函数，方便单测。
 * @returns {{ok:boolean, problems:string[], sum:number, count:number, amountCol:number}}
 */
export function checkTotals({ csvText, expectedTotal = null, expectedCount = null, amountCol = 0 }) {
  const rows = parseCsv(csvText)
  if (rows.length < 2) {
    return { ok: false, problems: ['这张表里没有数据行（至少要有表头 + 1 行）'], sum: 0, count: 0, amountCol }
  }

  const header = rows[0]
  const body = rows.slice(1)
  const bad = []
  let sum = 0
  body.forEach((row, index) => {
    const value = toAmount(row[amountCol])
    if (value === null) bad.push(index + 2) // +2：表头占 1 行，行号从 1 开始
    else sum += value
  })
  if (bad.length) {
    return {
      ok: false,
      problems: [`第 ${bad.slice(0, 5).join('、')} 行的金额不是数字（列索引 ${amountCol}）`],
      sum: 0,
      count: body.length,
      amountCol,
    }
  }

  const problems = []
  if (expectedCount !== null && Number(expectedCount) !== body.length) {
    problems.push(`笔数不对：期望 ${expectedCount}，实际 ${body.length}`)
  }
  if (expectedTotal !== null) {
    const want = Number(String(expectedTotal).replace(/[,\s￥¥]/g, ''))
    if (!Number.isFinite(want)) return { ok: false, problems: ['--total 不是数字'], sum, count: body.length, amountCol }
    // 分位比较，避免浮点误差把 0.01 的差错吃掉
    if (Math.round(sum * 100) !== Math.round(want * 100)) {
      problems.push(`合计不对：期望 ${want.toFixed(2)}，实际 ${sum.toFixed(2)}（差 ${(sum - want).toFixed(2)}）`)
    }
  }

  return { ok: problems.length === 0, problems, sum, count: body.length, amountCol, header }
}

function main(argv) {
  const file = argv[0]
  if (!file) {
    console.error('用法：node total.mjs <csv> --total 1234.56 [--count 5] [--amount-col 2]')
    return 2
  }
  const arg = (name, fallback = null) => {
    const i = argv.indexOf(name)
    return i > 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
  }

  let csvText
  try {
    csvText = readFileSync(file, 'utf8')
  } catch (e) {
    console.error(`失败：读不到文件 ${file}（${e instanceof Error ? e.message : String(e)}）`)
    return 1
  }

  const result = checkTotals({
    csvText,
    expectedTotal: arg('--total'),
    expectedCount: arg('--count'),
    amountCol: Number(arg('--amount-col', '0')),
  })

  if (!result.ok) {
    console.error('失败：' + result.problems.join('；'))
    return 1
  }
  const column = result.header?.[result.amountCol] ?? result.amountCol
  console.log(`通过：${result.count} 笔，合计 ${result.sum.toFixed(2)}（列「${column}」）`)
  return 0
}

// 只在被直接执行时跑命令行（被 import 时不跑）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)))
}
