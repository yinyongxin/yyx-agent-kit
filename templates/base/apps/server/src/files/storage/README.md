# files/storage

| 文件 | 作用 |
| --- | --- |
| `file-storage.ts` | `FileStorage` 接口与 `FILE_STORAGE` 注入 token |
| `local-file.storage.ts` | `LocalFileStorage`：基于 `FILES_DIR` 的本地磁盘实现 |

## 换存储

生产用 S3 / OSS 时新增实现类，在 `files.module.ts` 把 `FILE_STORAGE` 指向它即可，业务层不改。

## 约束

- `key` 由服务端生成，禁止用户可控路径
- 本地驱动仍会校验 `resolve` 后路径在 root 内，防止数据库被篡改时穿越
- `delete` 对 `ENOENT` 视为成功，便于幂等清理
