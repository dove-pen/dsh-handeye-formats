import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkTotals, parseCsv, toAmount } from '../packs/accounting/checks/total.mjs'
import { validateDomainPack } from '../lib/index.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const csv = readFileSync(path.join(here, '..', 'packs', 'accounting', 'examples', 'invoices.csv'), 'utf8')

test('the accounting pack validates against the published format', () => {
  const pack = JSON.parse(readFileSync(path.join(here, '..', 'packs', 'accounting', 'pack.json'), 'utf8'))
  const shape = validateDomainPack(pack)
  assert.equal(shape.ok, true, shape.message)
  assert.equal(pack.cards.length, 3)
})

test('a matching total and count passes', () => {
  const r = checkTotals({ csvText: csv, expectedTotal: '7244.50', expectedCount: '4', amountCol: 2 })
  assert.equal(r.ok, true, r.problems.join('；'))
  assert.equal(r.count, 4)
  assert.equal(Math.round(r.sum * 100), 724450)
})

test('a wrong total fails with the actual difference', () => {
  const r = checkTotals({ csvText: csv, expectedTotal: '7000', amountCol: 2 })
  assert.equal(r.ok, false)
  assert.match(r.problems[0], /合计不对/)
  assert.match(r.problems[0], /244\.50/)
})

test('a wrong count fails', () => {
  const r = checkTotals({ csvText: csv, expectedCount: '5', amountCol: 2 })
  assert.equal(r.ok, false)
  assert.match(r.problems[0], /笔数不对/)
})

test('one-yuan-of-cents errors are not swallowed by float rounding', () => {
  const r = checkTotals({ csvText: csv, expectedTotal: '7244.51', amountCol: 2 })
  assert.equal(r.ok, false, '差 1 分也要报出来')
})

test('BOM and currency symbols do not break parsing', () => {
  const text = '\uFEFF日期,金额\n2026-10-01,"￥1,200.00"\n2026-10-02,¥88\n'
  const r = checkTotals({ csvText: text, expectedTotal: '1288', amountCol: 1 })
  assert.equal(r.ok, true, r.problems.join('；'))
})

test('a non-numeric amount row is reported with its line number', () => {
  const text = 'a,b\nx,100\ny,待确认\n'
  const r = checkTotals({ csvText: text, amountCol: 1 })
  assert.equal(r.ok, false)
  assert.match(r.problems[0], /第 3 行/)
})

test('empty data is rejected, not treated as zero', () => {
  assert.equal(checkTotals({ csvText: 'a,b\n' }).ok, false)
  assert.equal(parseCsv('').length, 0)
  assert.equal(toAmount('￥1,234.50'), 1234.5)
  assert.equal(toAmount('待确认'), null)
})