import { app } from './app.js'
import { checkDatabaseConnection } from './config/database.js'
import { env } from './config/env.js'

try {
  await checkDatabaseConnection()
  app.listen(env.port,()=>console.log(`InterviewAI API listening on http://localhost:${env.port}`))
} catch(error) {
  console.error('Could not start the API. Check the MySQL configuration.',error.message)
  process.exit(1)
}
