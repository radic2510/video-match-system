'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogIn, UserPlus } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const { login, register, isLoading, error, clearError } = useAuthStore()

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({})

  // Register form state
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({})

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateLoginForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!validateEmail(loginEmail)) {
      errors.email = 'Please enter a valid email address'
    }

    if (loginPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    setLoginErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateRegisterForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!registerName.trim()) {
      errors.name = 'Name is required'
    }

    if (!validateEmail(registerEmail)) {
      errors.email = 'Please enter a valid email address'
    }

    if (registerPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    setRegisterErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    clearError()
    setLoginErrors({})

    if (!validateLoginForm()) {
      return
    }

    try {
      await login({
        email: loginEmail,
        password: loginPassword,
      })

      // Clear form
      setLoginEmail('')
      setLoginPassword('')

      // Redirect to home
      router.push('/')
    } catch (err) {
      // Error is handled by the store
    }
  }

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    clearError()
    setRegisterErrors({})

    if (!validateRegisterForm()) {
      return
    }

    try {
      await register({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      })

      // Clear form
      setRegisterName('')
      setRegisterEmail('')
      setRegisterPassword('')

      // Redirect to home
      router.push('/')
    } catch (err) {
      // Error is handled by the store
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'login' | 'register')
    clearError()
    setLoginErrors({})
    setRegisterErrors({})
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Video Match System
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="login-email"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Email
                  </label>
                  <Input
                    id="login-email"
                    type="text"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isLoading}
                    aria-label="Email"
                    autoComplete="email"
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-red-500">{loginErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="login-password"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Password
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLoading}
                    aria-label="Password"
                  />
                  {loginErrors.password && (
                    <p className="text-sm text-red-500">{loginErrors.password}</p>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>Signing in...</>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="register-name"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Name
                  </label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="John Doe"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    disabled={isLoading}
                    aria-label="Name"
                  />
                  {registerErrors.name && (
                    <p className="text-sm text-red-500">{registerErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="register-email"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Email
                  </label>
                  <Input
                    id="register-email"
                    type="text"
                    placeholder="your@email.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    disabled={isLoading}
                    aria-label="Email"
                    autoComplete="email"
                  />
                  {registerErrors.email && (
                    <p className="text-sm text-red-500">{registerErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="register-password"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Password
                  </label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={isLoading}
                    aria-label="Password"
                  />
                  {registerErrors.password && (
                    <p className="text-sm text-red-500">{registerErrors.password}</p>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>Creating account...</>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
