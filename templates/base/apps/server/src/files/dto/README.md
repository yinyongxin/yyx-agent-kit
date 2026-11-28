# files/dto

| 文件 | 作用 |
| --- | --- |
| `query-files.dto.ts` | `QueryFilesDto`：分页、关键词、`category`（image/document/other） |
| `file-response.dto.ts` | `FileResponseDto` / `FileListResponseDto` |

`category` 的 MIME 归类逻辑在 `../repositories/files.repository.ts`；新增分类时两处一起改。
