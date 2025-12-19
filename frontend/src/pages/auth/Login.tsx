import { Button, Card, Form, Input, Typography, Grid, Alert, App } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { setAuth } from '../../lib/auth'
import { useEffect, useState } from 'react'

const { Title } = Typography

export default function Login() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [showSessionExpired, setShowSessionExpired] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if session expired flag is set
    const sessionExpired =
      sessionStorage.getItem('sessionExpired') ||
      localStorage.getItem('sessionExpired')

    if (sessionExpired === 'true') {
      setShowSessionExpired(true)
      // Show a toast as well so the user sees it even without looking at the alert
      message.warning('Your session has expired. Please login again.', 4)

      // Clear from both storages
      sessionStorage.removeItem('sessionExpired')
      localStorage.removeItem('sessionExpired')
    }
  }, [message])

  const onFinish = async (values: any) => {
    setLoading(true)
    setShowSessionExpired(false) // Hide session expired alert on new login attempt
    
    try {
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
      console.error('Error response:', e?.response)
      
      const errorMessage = e?.response?.data?.message || ''
      console.log('Error message from backend:', errorMessage)
      
      // Show error message based on backend response
      if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('credential')) {
        message.error('Invalid email or password. Please try again.', 4)
      } else if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('does not exist')) {
        message.error('User does not exist. Please check your email or sign up.', 4)
      } else {
        message.error(errorMessage || 'Login failed. Please check your credentials.', 4)
      }
      
      
      form.setFieldsValue(values)
    } finally {
      setLoading(false)
    }
  }

  const onFinishFailed = (errorInfo: any) => {
    console.log('Form validation failed:', errorInfo)
    message.error('Please provide your email and password.', 3)
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
        
        {/* {showSessionExpired && (
          <Alert
            message="Session Expired"
            description="Your session has expired. Please login again."
            type="warning"
            showIcon
            closable
            onClose={() => setShowSessionExpired(false)}
            style={{ marginBottom: 16 }}
          />
        )} */}
        
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          className="auth-form"
          preserve={true}
          validateTrigger={["onSubmit", "onBlur"]}
        >
          <Form.Item 
            name="email" 
            label="Email" 
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email address' }
            ]}
          >
            <Input 
              placeholder="you@example.com" 
              size={isMobile ? 'middle' : undefined} 
              disabled={loading}
              autoComplete="email"
            />
          </Form.Item>
          <Form.Item 
            name="password" 
            label="Password" 
            rules={[
              { required: true, message: 'Please enter your password' },
              
            ]}
          >
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

