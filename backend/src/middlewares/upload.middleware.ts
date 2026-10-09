import multer from "multer";
import { MAX_FILE_SIZE_BYTES } from "../../../shared/files.ts";

export const uploadSingleFile = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1, fields: 5 },
	defParamCharset: "utf8",
}).single("file");
