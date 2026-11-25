# deliverables — 需求交付物

## 职责

每个需求一个 `YYYYMMDD-kebab-case` 目录，放五阶段流水线产生的全部交付物。**进度靠这里实际存在的文件判断，不靠记忆。**

## 文件索引

```text
deliverables/<slug>/
├── 01-prd.md              做什么 + 验收标准
├── 01-wireframe.md        页面上显示什么
├── 01-interaction.md      页面怎么联动、状态怎么流转
├── 02-tech-design.md      可行性结论 + 任务拆分
├── 03-dev-log.md          改了什么
├── 04-test-plan.md        用例
├── 04-test-report.md      结论 + 缺陷
├── 04-visual-check.md     可选：视觉/浏览器验证
└── 05-record.md           决策与遗留
```

## 关联

- 流程与门禁定义在 `../../skills/flows/product-pipeline/SKILL.md`。
- 需求索引表在 `../README.md` 的「需求索引」，每过一道门禁追加一行。
- 历史需求可以缺某些文件（三件套是后加的规则），按实际文件判断进度即可，不必回头补。

## 同步要求

新建 slug 或调整阶段交付物清单时，同步更新本文件、`product-pipeline` skill 与 `../README.md` 的索引表；slug 目录下不要再套子目录。
