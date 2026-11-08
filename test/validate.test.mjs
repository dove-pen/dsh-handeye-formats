import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateSkill, validateVerify, validateDomainPack, FORMATS_VERSION } from '../lib/index.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const example = (name) => JSON.parse(readFileSync(path.join(here, '..', 'examples', name), 'utf8'))

test('version is semver-ish and exported', () => {
  assert.match(FORMATS_VERSION, /^\d+\.\d+\.\d+$/)
})

test('the shipped examples validate', () => {
  assert.equal(validateSkill(example('skill.example.json')).ok, true)
  assert.equal(validateVerify(example('verify.example.json')).ok, true)
  assert.equal(validateDomainPack(example('domain-pack.example.json')).ok, true)
})

test('a skill without steps is rejected', () => {
  const r = validateSkill({ ...example('skill.example.json'), steps: [] })
  assert.equal(r.ok, false)
  assert.match(r.message, /steps/)
})

test('a skill with an unknown field is rejected (no silent extras)', () => {
  const r = validateSkill({ ...example('skill.example.json'), surprise: 1 })
  assert.equal(r.ok, false)
  assert.match(r.message, /not allowed/)
})

test('verify rejects a file check without a path', () => {
  const r = validateVerify([{ type: 'file' }])
  assert.equal(r.ok, false)
})

test('verify rejects an unknown check type', () => {
  const r = validateVerify([{ type: 'guess', path: 'x' }])
  assert.equal(r.ok, false)
})

test('verify rejects an empty array', () => {
  assert.equal(validateVerify([]).ok, false)
})

test('a domain pack without cards is rejected', () => {
  const pack = example('domain-pack.example.json')
  delete pack.cards
  assert.equal(validateDomainPack(pack).ok, false)
})