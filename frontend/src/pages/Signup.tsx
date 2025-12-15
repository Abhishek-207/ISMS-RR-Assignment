import { useState } from 'react'
import { Button, Card, Form, Input, Typography, message, Grid, Select, Radio, Space, Divider } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { setAuth } from '../lib/auth'

const { Title } = Typography
const { Option } = Select

const ORGANIZATION_CATEGORIES = [
  { value: 'ENTERPRISE', label: 'Enterprise / Corporation' },
  { value: 'MANUFACTURING_CLUSTER', label: 'Manufacturing Cluster' },
  { value: 'EDUCATIONAL_INSTITUTION', label: 'Educational Institution' },
  { value: 'HEALTHCARE_NETWORK', label: 'Healthcare Network' },
  { value: 'INFRASTRUCTURE_CONSTRUCTION', label: 'Infrastructure / Construction' }
]

export default function Signup() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  
  const [orgMode, setOrgMode] = useState<'create' | 'join'>('create')
  const [category, setCategory] = useState<string>()
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)

  const handleCategoryChange = async (value: string) => {
    setCategory(value)
    form.setFieldValue('organizationCategory', value)
    
    if (orgMode === 'join') {
      setLoadingOrgs(true)
      try {
        const { data } = await api.get('/organizations', { params: { category: value, pageSize: 100 } })
        setOrganizations(data.items || [])
      } catch (e) {
        message.error('Failed to load organizations')
      } finally {
        setLoadingOrgs(false)
      }
    }
  }

  const handleOrgModeChange = async (mode: 'create' | 'join') => {
    setOrgMode(mode)
    
    if (mode === 'join' && category) {
      setLoadingOrgs(true)
      try {
        const { data } = await api.get('/organizations', { params: { category, pageSize: 100 } })
        setOrganizations(data.items || [])
      } catch (e) {
        message.error('Failed to load organizations')
      } finally {
        setLoadingOrgs(false)
      }
    }
  }

  const onFinish = async (values: any) => {
    try {
      const payload = {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        organizationCategory: values.organizationCategory,
        ...(orgMode === 'create' ? {
          organizationName: values.organizationName,
          organizationDescription: values.organizationDescription
        } : {
          organizationId: values.organizationId
        })
      }

      const { data } = await api.post('/auth/signup', payload)
      setAuth(data)
      
      if (data.user.organization) {
        localStorage.setItem('organization', JSON.stringify(data.user.organization))
      }
      
      message.success('Registration successful!')
      navigate('/')
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Signup failed')
    }
  }

  return (
    <div className="auth-page">
      <Card
        className="auth-card auth-card--signup"
        style={{ width: '100%', maxWidth: 520 }}
      >
        <Title level={4} style={{ textAlign: 'center', marginBottom: isMobile ? 12 : 16 }}>
          Create Your Account
        </Title>
        
        <Form form={form} layout="vertical" onFinish={onFinish} className="auth-form">
          <Form.Item name="name" label="Full Name" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="Enter your full name" size={isMobile ? 'middle' : undefined} />
          </Form.Item>
          
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="you@example.com" size={isMobile ? 'middle' : undefined} />
          </Form.Item>
          
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="••••••••" size={isMobile ? 'middle' : undefined} />
          </Form.Item>
          
          <Form.Item name="role" label="Your Role" rules={[{ required: true }]}>
            <Select placeholder="Select your role" size={isMobile ? 'middle' : undefined}>
              <Option value="ORG_USER">Organization User</Option>
              <Option value="ORG_ADMIN">Organization Admin</Option>
            </Select>
          </Form.Item>

          <Divider />
          
          <Title level={5}>Organization</Title>
          
          <Form.Item 
            name="organizationCategory" 
            label="Organization Category" 
            rules={[{ required: true }]}
            help="This determines which surplus items you can access"
          >
            <Select 
              placeholder="Select organization category" 
              size={isMobile ? 'middle' : undefined}
              onChange={handleCategoryChange}
            >
              {ORGANIZATION_CATEGORIES.map(cat => (
                <Option key={cat.value} value={cat.value}>{cat.label}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="Organization Setup">
            <Radio.Group 
              value={orgMode} 
              onChange={(e) => handleOrgModeChange(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="create">Create a new organization</Radio>
                <Radio value="join">Join an existing organization</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
          
          {orgMode === 'create' ? (
            <>
              <Form.Item 
                name="organizationName" 
                label="Organization Name" 
                rules={[{ required: true, min: 2 }]}
              >
                <Input placeholder="Enter organization name" size={isMobile ? 'middle' : undefined} />
              </Form.Item>
              
              <Form.Item 
                name="organizationDescription" 
                label="Description (Optional)"
              >
                <Input.TextArea 
                  placeholder="Brief description of your organization" 
                  rows={3}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </>
          ) : (
            <Form.Item 
              name="organizationId" 
              label="Select Organization" 
              rules={[{ required: true }]}
            >
              <Select 
                placeholder={category ? "Select an organization" : "Select category first"}
                loading={loadingOrgs}
                disabled={!category}
                size={isMobile ? 'middle' : undefined}
                showSearch
                filterOption={(input, option: any) =>
                  option?.children?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {organizations.map(org => (
                  <Option key={org._id} value={org._id}>
                    {org.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          
          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" block size={isMobile ? 'middle' : 'large'}>
              Create Account
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ textAlign: 'center', marginTop: isMobile ? 4 : 8 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </Card>
    </div>
  )
}
