import fs from 'node:fs/promises'
import pdf from 'pdf-parse'
import mammoth from 'mammoth'
export async function extractDocumentText(file){
  const buffer=await fs.readFile(file.path)
  if(file.mimetype==='application/pdf') return (await pdf(buffer)).text.trim()
  if(file.mimetype==='application/vnd.openxmlformats-officedocument.wordprocessingml.document') return (await mammoth.extractRawText({buffer})).value.trim()
  return '' // Legacy .doc files are stored safely but require an external converter.
}
