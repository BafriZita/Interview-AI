import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db } from '../../config/database.js'
import { env } from '../../config/env.js'
import { AppError, sendData } from '../../utils/http.js'

const publicUser = (row) => ({ id: row.id, fullName: row.full_name, email: row.email, createdAt: row.created_at })
export async function register(req,res) {
  const { fullName,email,password } = req.body
  const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email])
  if (existing.length) throw new AppError(409,'An account with this email already exists.','EMAIL_EXISTS')
  const hash = await bcrypt.hash(password,12)
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.execute('INSERT INTO users (full_name,email,password_hash) VALUES (?,?,?)',[fullName,email,hash])
    await connection.execute('INSERT INTO profiles (user_id) VALUES (?)',[result.insertId])
    await connection.commit()
    req.session.userId = result.insertId
    sendData(res,{ user:{ id:result.insertId,fullName,email } },201)
  } catch(error) { await connection.rollback(); throw error } finally { connection.release() }
}
export async function login(req,res) {
  const [rows] = await db.execute('SELECT id,full_name,email,password_hash,status,created_at FROM users WHERE email = ? LIMIT 1',[req.body.email])
  const user=rows[0]
  if (!user || !(await bcrypt.compare(req.body.password,user.password_hash))) throw new AppError(401,'Incorrect email or password.','INVALID_CREDENTIALS')
  if(user.status!=='active') throw new AppError(403,'This account is disabled.','ACCOUNT_DISABLED')
  await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()))
  req.session.userId=user.id
  sendData(res,{user:publicUser(user)})
}
export async function logout(req,res) { await new Promise((resolve,reject)=>req.session.destroy(e=>e?reject(e):resolve())); res.clearCookie(env.sessionName); res.status(204).end() }
export async function me(req,res) { const [rows]=await db.execute('SELECT id,full_name,email,created_at FROM users WHERE id = ?',[req.session.userId]); if(!rows[0]) throw new AppError(404,'User not found.'); sendData(res,{user:publicUser(rows[0])}) }
export async function forgotPassword(req,res) {
  const [users]=await db.execute('SELECT id FROM users WHERE email = ?',[req.body.email])
  let resetToken
  if(users[0]) { resetToken=crypto.randomBytes(32).toString('hex'); const hash=crypto.createHash('sha256').update(resetToken).digest('hex'); await db.execute('INSERT INTO password_reset_tokens (user_id,token_hash,expires_at) VALUES (?,?,DATE_ADD(NOW(),INTERVAL 30 MINUTE))',[users[0].id,hash]) }
  sendData(res,{message:'If that account exists, a reset link will be sent.', ...(process.env.NODE_ENV==='development'&&resetToken?{developmentToken:resetToken}:{})})
}
export async function resetPassword(req,res) {
  const hash=crypto.createHash('sha256').update(req.body.token).digest('hex')
  const [tokens]=await db.execute('SELECT id,user_id FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>NOW()',[hash])
  if(!tokens[0]) throw new AppError(400,'This reset link is invalid or expired.','INVALID_RESET_TOKEN')
  const passwordHash=await bcrypt.hash(req.body.password,12)
  const connection=await db.getConnection()
  try { await connection.beginTransaction(); await connection.execute('UPDATE users SET password_hash=? WHERE id=?',[passwordHash,tokens[0].user_id]); await connection.execute('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=?',[tokens[0].id]); await connection.commit() } catch(e){await connection.rollback();throw e}finally{connection.release()}
  sendData(res,{message:'Password updated successfully.'})
}
