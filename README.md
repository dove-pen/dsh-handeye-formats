# dsh-handeye-formats

**https://github.com/dove-pen/dsh-handeye-formats**

手眼插件的公共格式。配套的主仓是 https://github.com/dove-pen/dsh-handeye （用格式的人）。

```bash
git clone git@github.com:dove-pen/dsh-handeye-formats.git
cd dsh-handeye-formats
node --test          # 16 条
```

手眼插件的**公共格式**：技能、判据、领域包。

这里放的是"规矩"，不是"实现"。任何工具都可以照着它实现，不需要用本插件。

## 为什么单独一个仓

因为**产品会被抄，格式会被继承**（Markdown 活下来了，Markdown 的编辑器没有）。
插件会换代、会被人改写、会被大厂的功能覆盖；但只要格式还在，这套东西就还在。

## 三份格式

| 文件 | 管什么 | 关键约束 |
|---|---|---|
| `schemas/skill.schema.json` | 一份技能：步骤、锚点、参数、判据、健康度 | **不存坐标**；每一步都该有判据；没判据要如实标 `incomplete` |
| `schemas/verify.schema.json` | 判据：这一步算不算做对了 | 五种类型：`file` / `text` / `screen` / `exit` / `changed`；**全部通过才算过** |
| `schemas/domain-pack.schema.json` | 领域包：某个行业的判据 + 卡片 + 技能模板 | 社区贡献的入口；核心不随行业变 |

## 用法

> 不想 clone 也行：三份 schema 就是三个 JSON 文件，直接复制走即可。

```js
import { validateSkill, validateVerify, validateDomainPack, FORMATS_VERSION } from 'dsh-handeye-formats'

const r = validateSkill(doc)
if (!r.ok) console.error(r.message)   // 一条人能读的失败原因
```

零依赖，只支持 schema 里实际用到的那部分 JSON Schema（`type` / `required` / `properties` /
`additionalProperties` / `items` / `enum` / `const` / `minItems` / `minimum` / `minLength` / `oneOf`）。

## 版本规则

- `1.x`：**只加字段，不改语义**。老文件永远还能读。
- `2.0`：破坏性变更，必须能自动迁移旧文件。

这条规矩比代码重要：一个标准只要破坏过一次，就没人敢依赖它。

## 写一个领域包

1. 复制 `examples/domain-pack.example.json`
2. 用 `validateDomainPack()` 校验
3. 提交 PR

要求只有一条：**判据必须机器可验**。"写得好不好"不是判据，"金额合计是否相等"是。

## 已有的领域包

| 包 | 目录 | 判据 |
|---|---|---|
| `accounting`（会计） | `packs/accounting/` | 发票合计/笔数核对（可执行脚本）、输出目录非空 |

装一个包：

```bash
node bin/he-server.js pack validate <包目录>   # 只校验
node bin/he-server.js pack install <包目录>    # 装进本地卡片库
```

包里的 `{{packCheck:xxx}}` 会在安装时替换成该包 `checks/xxx.mjs` 的真实路径，
所以判据可以是真的会跑的脚本，不是"某某字符串出现"。

```bash
# 会计包的合计校验可以直接跑
node packs/accounting/checks/total.mjs packs/accounting/examples/invoices.csv \
  --total 7244.50 --count 4 --amount-col 2
# 通过：4 笔，合计 7244.50（列「金额」）
```

## 许可

MIT。格式本身（schema 的结构）视同 CC0 —— 你实现它不需要任何授权。
