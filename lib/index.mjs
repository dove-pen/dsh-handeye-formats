// 公共格式的入口。
//
// 任何工具（不只本插件）都可以 import 这里来校验/生成技能、判据、领域包。
// 版本号在 FORMATS_VERSION 里：格式只加字段不改语义，破坏性变更才进 2.x。

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { validate, summarize } from './validate.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const schemaDir = path.join(here, '..', 'schemas')

export const FORMATS_VERSION = '1.0.0'

function load(name) {
  return JSON.parse(readFileSync(path.join(schemaDir, name), 'utf8'))
}

export const schemas = {
  skill: load('skill.schema.json'),
  verify: load('verify.schema.json'),
  domainPack: load('domain-pack.schema.json'),
}

/** 校验一份技能。返回 { ok, errors } —— 不抛异常，调用方自己决定怎么处理。 */
export function validateSkill(skill) {
  const errors = validate(schemas.skill, skill)
  return { ok: errors.length === 0, errors, message: summarize(errors) }
}

/** 校验判据数组（卡片/步骤/领域包里都用它）。 */
export function validateVerify(checks) {
  const errors = validate(schemas.verify, checks)
  return { ok: errors.length === 0, errors, message: summarize(errors) }
}

/** 校验一个领域包。 */
export function validateDomainPack(pack) {
  const errors = validate(schemas.domainPack, pack)
  return { ok: errors.length === 0, errors, message: summarize(errors) }
}

export { validate, summarize }
