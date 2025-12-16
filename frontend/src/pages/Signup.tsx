import { useState } from 'react'
import { Button, Card, Form, Input, Typography, message, Grid, Select, Radio, Space, Steps } from 'antd'
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
  
  const [currentStep, setCurrentStep] = useState(0)
  const [orgMode, setOrgMode] = useState<'create' | 'join'>('create')
  const [category, setCategory] = useState<string>()
  const [organizationName, setOrganizationName] = useState<string>()
  const [organizationId, setOrganizationId] = useState<string>()
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)

  const handleCategoryChange = async (value: string) => {
    setCategory(value)
    form.setFieldValue('organizationCategory', value)
    
    if (orgMode === 'join') {
      setLoadingOrgs(true)
      try {
        const { data } = await api.get('/auth/organizations', { params: { category: value } })
        setOrganizations(data.data || [])
      } catch (e) {
        message.error('Failed to load organizations')
      } finally {
        setLoadingOrgs(false)
      }
    }
  }

  const handleOrgModeChange = async (mode: 'create' | 'join') => {
    setOrgMode(mode)
    
    // Set default role based on organization mode
    if (mode === 'create') {
      form.setFieldValue('role', 'ORG_ADMIN')
    } else {
      form.setFieldValue('role', 'ORG_USER')
    }
    
    // Load organizations if joining and category is selected
    if (mode === 'join' && category) {
      setLoadingOrgs(true)
      try {
        const { data } = await api.get('/auth/organizations', { params: { category } })
        setOrganizations(data.data || [])
      } catch (e) {
        message.error('Failed to load organizations')
      } finally {
        setLoadingOrgs(false)
      }
    }
  }

  const onFinish = async (values: any) => {
    try {
      // console.log('Form values received:', values)
      // console.log('Category from state:', category)
      // console.log('Org name from state:', organizationName)
      // console.log('Org ID from state:', organizationId)
      
      // Use state values as fallback if form values are missing
      const finalCategory = values.organizationCategory || category
      const finalOrgName = values.organizationName || organizationName
      const finalOrgId = values.organizationId || organizationId
      
      // Ensure organizationCategory is set
      if (!finalCategory) {
        message.error('Please select an organization category')
        setCurrentStep(0)
        return
      }

      // Ensure required fields based on mode
      if (orgMode === 'create' && !finalOrgName) {
        message.error('Please enter an organization name')
        setCurrentStep(0)
        return
      }

      if (orgMode === 'join' && !finalOrgId) {
        message.error('Please select an organization')
        setCurrentStep(0)
        return
      }

      const payload = {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        organizationCategory: finalCategory,
        ...(orgMode === 'create' ? {
          organizationName: finalOrgName,
          organizationDescription: values.organizationDescription
        } : {
          organizationId: finalOrgId
        })
      }

      // console.log('Signup payload:', payload) 

      const { data } = await api.post('/auth/signup', payload)
      setAuth(data.data)
      
      if (data.data.user.organization) {
        localStorage.setItem('organization', JSON.stringify(data.data.user.organization))
      }
      
      message.success('Registration successful!')
      navigate('/')
    } catch (e: any) {
      // console.error('Signup error:', e?.response?.data)
      const errorResponse = e?.response?.data
      const errorCode = errorResponse?.errorCode
      
      // Handle specific error codes
      if (errorCode === 1301) {
        message.error('An account with this email already exists. Please use a different email or login.', 5)
      } else if (errorCode === 1401) {
        message.error('An organization with this name already exists in this category. Please choose a different name or join the existing organization.', 5)
        setCurrentStep(0) // Go back to organization setup step
      } else if (errorCode === 1100) {
        // Validation errors with details
        const validationErrors = errorResponse?.errors
        if (Array.isArray(validationErrors) && validationErrors.length > 0) {
          // Show each validation error with better messages
          validationErrors.forEach((err: any) => {
            const fieldName = err.field || err.param || 'Field'
            let errorMsg = err.message || err.msg || 'Invalid value'
            
            // Provide more helpful messages for specific fields
            if (fieldName === 'organizationCategory' && errorMsg === 'Invalid value') {
              errorMsg = 'Please select a valid organization category from the dropdown'
              setCurrentStep(0) // Go back to step 1
            }
            
            message.error(`${fieldName}: ${errorMsg}`, 5)
          })
        } else {
          // Show the main error message if no detailed errors
          message.error(errorResponse?.message || 'Validation failed. Please check your inputs.', 5)
        }
      } else {
        message.error(errorResponse?.message || 'Signup failed. Please try again.', 5)
      }
      
      // Keep form values intact after error - form.preserve={true} handles this
      // but we explicitly ensure values are retained
      const currentValues = form.getFieldsValue()
      form.setFieldsValue(currentValues)
    }
  }

  const onFinishFailed = (errorInfo: any) => {
    console.log('Form validation failed:', errorInfo)
    message.error('Please check the form and fix any errors.', 3)
  }

  const nextStep = async () => {
    try {
      // Validate current step fields
      if (currentStep === 0) {
        await form.validateFields(['organizationCategory', orgMode === 'create' ? 'organizationName' : 'organizationId'])
        const currentValues = form.getFieldsValue()
        
        // Store values in state to preserve them
        if (orgMode === 'create') {
          setOrganizationName(currentValues.organizationName)
          // console.log('Stored organization name:', currentValues.organizationName)
        } else {
          setOrganizationId(currentValues.organizationId)
          // console.log('Stored organization ID:', currentValues.organizationId)
        }
      }
      setCurrentStep(1)
    } catch (error) {
      // console.error('Validation error at step 1:', error)
      // Validation failed, don't proceed
    }
  }

  const prevStep = () => {
    setCurrentStep(0)
  }

  const steps = [
    {
      title: 'Organization Setup',
      // description: 'Create or join an organization'
    },
    {
      title: 'Your Information',
      // description: 'Complete your account details'
    }
  ]

  return (
    <div className="auth-page">
      <Card
        className="auth-card auth-card--signup"
        style={{ width: '100%', maxWidth: 520 }}
      >
        <Title level={4} style={{ textAlign: 'center', marginBottom: isMobile ? 12 : 16 }}>
          Create Your Account
        </Title>
        
        {!isMobile && (
          <Steps
            current={currentStep}
            items={steps}
            style={{ marginBottom: 24 }}
            size="default"
          />
        )}
        
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          className="auth-form"
          preserve={true}
        >
          {currentStep === 0 && (
            <>
              <Title level={5} style={{ fontSize: isMobile ? '16px' : undefined, marginBottom: isMobile ? '12px' : undefined }}>
                Organization Setup
              </Title>
              
              <Form.Item 
                name="organizationCategory" 
                label="Organization Category" 
                rules={[{ required: true, message: 'Please select an organization category' }]}
                // help="This determines which surplus items you can access"
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
              
              <Form.Item 
              // label="Do you want to create or join an organization?"
              >
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
                    rules={[{ required: true, min: 2, message: 'Please enter organization name (at least 2 characters)' }]}
                  >
                    <Input placeholder="Enter organization name" size={isMobile ? 'middle' : undefined} />
                  </Form.Item>
                  
                  {/* <Form.Item 
                    name="organizationDescription" 
                    label="Description (Optional)"
                  >
                    <Input.TextArea 
                      placeholder="Brief description of your organization" 
                      rows={3}
                      maxLength={500}
                      showCount
                    />
                  </Form.Item> */}
                </>
              ) : (
                <Form.Item 
                  name="organizationId" 
                  label="Select Organization" 
                  rules={[{ required: true, message: 'Please select an organization' }]}
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

              <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                <Button type="primary" onClick={nextStep} block size={isMobile ? 'middle' : 'large'}>
                  Next Step
                </Button>
              </Form.Item>
            </>
          )}

          {currentStep === 1 && (
            <>
              <Title level={5} style={{ fontSize: isMobile ? '16px' : undefined, marginBottom: isMobile ? '12px' : undefined }}>
                Your Information
              </Title>

              <Form.Item name="name" label="Full Name" rules={[{ required: true, min: 2, message: 'Please enter your full name' }]}>
                <Input placeholder="Enter your full name" size={isMobile ? 'middle' : undefined} />
              </Form.Item>
              
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
                <Input placeholder="you@example.com" size={isMobile ? 'middle' : undefined} />
              </Form.Item>
              
              <Form.Item 
                name="password" 
                label="Password" 
                rules={[
                  { required: true, message: 'Please enter a password' },
                  
                  {
                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                    message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
                  }
                ]}
              >
                <Input.Password placeholder="••••••••" size={isMobile ? 'middle' : undefined} />
              </Form.Item>
              
              <Form.Item 
                name="role" 
                label="Your Role" 
                rules={[{ required: true }]}
                initialValue={orgMode === 'create' ? 'ORG_ADMIN' : 'ORG_USER'}
              >
                <Select 
                  placeholder="Select your role" 
                  size={isMobile ? 'middle' : undefined}
                  disabled
                >
                  <Option value="ORG_USER">Organization User</Option>
                  <Option value="ORG_ADMIN">Organization Admin</Option>
                </Select>
              </Form.Item>

              <Space style={{ width: '100%', marginTop: 24 }} direction="vertical" size={12}>
                <Button type="primary" htmlType="submit" block size={isMobile ? 'middle' : 'large'}>
                  Create Account
                </Button>
                <Button type="default" onClick={prevStep} block size={isMobile ? 'middle' : 'large'}>
                  Back
                </Button>
              </Space>
            </>
          )}
        </Form>
        
        <div style={{ textAlign: 'center', marginTop: isMobile ? 4 : 8 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </Card>
    </div>
  )
}
