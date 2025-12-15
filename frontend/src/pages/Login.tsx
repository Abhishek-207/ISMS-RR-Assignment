import { Button, Card, Form, Input, Typography, message, Grid } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { setAuth } from '../lib/auth'

const { Title, Text } = Typography

export default function Login() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const onFinish = async (values: any) => {
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
      message.error(e?.response?.data?.message || 'Login failed')
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
        
        <Form form={form} layout="vertical" onFinish={onFinish} className="auth-form">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="you@example.com" size={isMobile ? 'middle' : undefined} />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="••••••••" size={isMobile ? 'middle' : undefined} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size={isMobile ? 'middle' : 'large'}>
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
