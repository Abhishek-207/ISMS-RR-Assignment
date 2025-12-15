import { Button, Card, Form, Input, Typography, message, Grid, Alert } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { setAuth } from '../lib/auth'
import { useEffect, useState } from 'react'

const { Title } = Typography

export default function Login() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [showSessionExpired, setShowSessionExpired] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if session expired flag is set
    const sessionExpired = sessionStorage.getItem('sessionExpired')
    if (sessionExpired === 'true') {
      setShowSessionExpired(true)
      sessionStorage.removeItem('sessionExpired')
    }
  }, [])

  const onFinish = async (values: any) => {
    try {
      setLoading(true)
      const { data } = await api.post('/auth/login', values)
      setAuth(data.data)
      
      if (data.data.user.organization) {
        localStorage.setItem('organization', JSON.stringify(data.data.user.organization))
        console.log('Login: Organization -', data.data.user.organization.name, `(${data.data.user.organization.category})`)
      }
      
      message.success(`Welcome back, ${data.data.user.name}!`)
      navigate('/')
    } catch (e: any) {
      console.error('Login error:', e)
      
      // Display specific error messages
      const errorMessage = e?.response?.data?.message || 'Login failed. Please check your credentials.'
      
      // Use setTimeout to ensure message shows after form validation
      setTimeout(() => {
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('credential')) {
          message.error({
            content: 'Invalid email or password. Please try again.',
            duration: 4,
            key: 'login-error'
          })
        } else if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('does not exist')) {
          message.error({
            content: 'User does not exist. Please check your email or sign up.',
            duration: 4,
            key: 'login-error'
          })
        } else {
          message.error({
            content: errorMessage,
            duration: 4,
            key: 'login-error'
          })
        }
      }, 100)
      
      // Do NOT reset the form - keep the user's input
      // The form will retain the values automatically
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Card
        className="auth-card auth-card--login"
        style={{ width: '100%', maxWidth: 420 }}
      >
        <Title level={4} style={{ textAlign: 'center', marginBottom: 8 }}>
          Sign in
        </Title>
        
        {showSessionExpired && (
          <Alert
            message="Session Expired"
            description="Your session has expired. Please login again."
            type="warning"
            showIcon
            closable
            onClose={() => setShowSessionExpired(false)}
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={onFinish} 
          className="auth-form"
          preserve={true}
          validateTrigger="onSubmit"
        >
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
            <Input 
              placeholder="you@example.com" 
              size={isMobile ? 'middle' : undefined} 
              disabled={loading}
              autoComplete="email"
            />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}>
            <Input.Password 
              placeholder="••••••••" 
              size={isMobile ? 'middle' : undefined} 
              disabled={loading}
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size={isMobile ? 'middle' : 'large'} loading={loading}>
              Sign In
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ textAlign: 'center', marginTop: isMobile ? 4 : 8 }}>
          Don't have an account? <Link to="/signup">Create account</Link>
        </div>
      </Card>
    </div>
  )
}
