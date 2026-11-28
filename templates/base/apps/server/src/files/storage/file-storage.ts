/** 文件内容存储抽象：本地磁盘默认实现，生产可换 S3 / OSS。 */
export interface FileStorage {
  /** 写入对象；key 由服务端生成，不能包含用户可控路径片段。 */
  put(key: string, content: Buffer): Promise<void>;
  /** 读取对象内容。 */
  get(key: string): Promise<Buffer>;
  /** 删除对象；对象不存在时视为成功。 */
  delete(key: string): Promise<void>;
}

export const FILE_STORAGE = Symbol("FILE_STORAGE");
