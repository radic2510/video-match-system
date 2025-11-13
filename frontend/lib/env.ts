/**
 * Environment variable validation and access
 * Ensures all required environment variables are present
 */

interface EnvConfig {
  apiUrl: string
  appName: string
  isDevelopment: boolean
  isProduction: boolean
  isTest: boolean
}

function validateEnv(): EnvConfig {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Video Match System'
  const nodeEnv = process.env.NODE_ENV || 'development'

  if (!apiUrl) {
    throw new Error('NEXT_PUBLIC_API_URL environment variable is required')
  }

  // Validate URL format
  try {
    new URL(apiUrl)
  } catch (error) {
    throw new Error(`NEXT_PUBLIC_API_URL must be a valid URL: ${apiUrl}`)
  }

  return {
    apiUrl,
    appName,
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
  }
}

// Validate and export environment configuration
export const env = validateEnv()

// Log environment info in development
if (env.isDevelopment && typeof window !== 'undefined') {
  console.log('[ENV] Environment configured:', {
    apiUrl: env.apiUrl,
    appName: env.appName,
    mode: process.env.NODE_ENV,
  })
}
