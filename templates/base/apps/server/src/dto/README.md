# src/dto

## 职责

跨模块共享的 DTO（目前只有运维探活响应）。模块专属 DTO 放各自 `<feature>/dto/`，不要堆在这里。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `health.dto.ts` | `HealthDto`：`GET /api/health` 的响应 |

## 注意事项

- 这里只放**确实被多个模块复用**的 DTO（分页、排序、通用响应包装等）。
- 模块内 DTO 放 `<feature>/dto/`。
