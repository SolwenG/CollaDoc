import multer from "multer";
import { MAX_FILE_SIZE_BYTES } from "../../../shared/files.ts";

// Kept in memory until its real type and its target folder are checked:
// a rejected upload never touches the disk
export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1, fields: 5 },
  // Busboy reads file names as latin1 by default, which garbles "été.pdf"
  defParamCharset: "utf8",
}).single("file");
