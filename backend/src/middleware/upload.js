import path from 'node:path'
import fs from 'node:fs'
import multer from 'multer'
import { env } from '../config/env.js'
import { AppError } from '../utils/http.js'

const uploadPath = path.resolve(process.cwd(), env.uploadDir)
fs.mkdirSync(uploadPath, { recursive: true })
const allowed = new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
export const resumeUpload = multer({
  storage: multer.diskStorage({ destination: uploadPath, filename: (_req,file,done) => done(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req,file,done) => allowed.has(file.mimetype) ? done(null,true) : done(new AppError(415,'Only PDF, DOC, and DOCX files are supported.','UNSUPPORTED_FILE')),
})
