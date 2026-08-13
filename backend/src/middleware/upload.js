import path from 'node:path'
import fs from 'node:fs'
import multer from 'multer'
import { env } from '../config/env.js'
import { AppError } from '../utils/http.js'

const uploadPath = path.resolve(process.cwd(), env.uploadDir)
const audioPath = path.resolve(process.cwd(), 'storage/audio')
fs.mkdirSync(uploadPath, { recursive: true })
fs.mkdirSync(audioPath, { recursive: true })
const allowed = new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
export const resumeUpload = multer({
  storage: multer.diskStorage({ destination: uploadPath, filename: (_req,file,done) => done(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req,file,done) => allowed.has(file.mimetype) ? done(null,true) : done(new AppError(415,'Only PDF, DOC, and DOCX files are supported.','UNSUPPORTED_FILE')),
})

const audioMime = new Set(['audio/webm','audio/ogg','audio/mpeg','audio/mp3','audio/wav','audio/mp4','audio/x-m4a','audio/wav'])
export const audioUpload = multer({
  storage: multer.diskStorage({ destination: audioPath, filename: (_req,file,done) => done(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname || '.webm').toLowerCase()}`) }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req,file,done) => audioMime.has(file.mimetype) ? done(null,true) : done(new AppError(415,'Unsupported audio format.','UNSUPPORTED_AUDIO')),
})
