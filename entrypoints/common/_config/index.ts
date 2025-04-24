import * as developmentConfig from './development'
import * as productionConfig from './production'
import * as testConfig from './test'

// @ts-ignore
const env = (import.meta.env.WXT_APP_ENV || '').toLowerCase()

if (!['development', 'production', 'test'].includes(env)) {
  throw new Error(`Invalid environment: ${env}`)
}

const configs = {
  development: developmentConfig,
  production: productionConfig,
  test: testConfig,
}

export default configs[env]
