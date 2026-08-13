import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app } from '../src/app.js'
import { testSupabaseConnection } from '../lib/supabase.js'

const hasSupabaseCredentials = Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY))

test('health endpoint responds successfully', async () => {
  const response = await request(app).get('/api/v1/health').expect(200)

  assert.equal(response.body.success, true)
  assert.equal(response.body.data.service, 'InterviewAI API')
  assert.equal(response.body.data.status, 'healthy')
})

test('swagger docs endpoint exposes the OpenAPI document', async () => {
  const response = await request(app).get('/api/v1/docs.json').expect(200)

  assert.equal(response.body.openapi, '3.0.3')
  assert.ok(response.body.info.title.includes('InterviewAI'))
  assert.ok(response.body.paths['/api/v1/auth/register'])
  assert.ok(response.body.paths['/api/v1/auth/login'])
  assert.ok(response.body.paths['/api/v1/auth/me'])
  assert.ok(response.body.paths['/api/v1/profile'])
  assert.ok(response.body.paths['/api/v1/resumes'])
  assert.ok(response.body.paths['/api/v1/jobs'])
  assert.ok(response.body.paths['/api/v1/interviews'])
  assert.ok(response.body.paths['/api/v1/reports'])
  assert.ok(response.body.paths['/api/v1/recommendations'])
})

if (hasSupabaseCredentials) {
  test('supabase connection is configured and reachable', async () => {
    const result = await testSupabaseConnection()
    assert.equal(result.ok, true, `${result.message} ${result.details || ''}`)
  })
} else {
  test.skip('supabase connection is configured and reachable', () => {
    // Skipped because Supabase credentials are not configured.
  })
}
