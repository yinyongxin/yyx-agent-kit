/** 上传文件的最小形状（multer memory storage），避免依赖 Express 全局类型。 */
export type UploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};
