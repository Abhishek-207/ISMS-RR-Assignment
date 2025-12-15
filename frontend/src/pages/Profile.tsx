import { useState, useEffect } from 'react'
import { Card, Descriptions, Button, Typography, Grid, message, Form, Input, Modal, Tag } from 'antd'
import { EditOutlined, SaveOutlined, TeamOutlined, BankOutlined } from '@ant-design/icons'
import { getCurrentUser } from '../lib/auth'
import { api } from '../lib/api'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

interface User {
  _id: string
  name: string
  email: string
  role: 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'ORG_USER'
  organizationId: string
  organizationCategory: string
  organization?: {
    _id: string
    name: string
    category: string
    userCount?: number
  }
}

export default function Profile() {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [organizationLoading, setOrganizationLoading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    
   
    if (currentUser?.organizationId) {
      fetchOrganizationDetails(currentUser)
    }
  }, [])

  const fetchOrganizationDetails = async (currentUser: User) => {
    try {
      setOrganizationLoading(true)
      console.log('Fetching organization details for:', currentUser.organizationId)
      
     
      const { data } = await api.get('/users', {
        params: {
          page: 1,
          pageSize: 1
        }
      })
      console.log('Users API response:', data)
      console.log('Users meta.total:', data?.meta?.total)
      
      
      if (data && data.meta && typeof data.meta.total === 'number') {
        const updatedUser = {
          ...currentUser,
          organization: {
            _id: currentUser.organization?._id || currentUser.organizationId,
            name: currentUser.organization?.name || '',
            category: currentUser.organization?.category || currentUser.organizationCategory,
            userCount: data.meta.total
          }
        }
        console.log('Updated user with organization user count:', updatedUser)
        console.log('User count set to:', updatedUser.organization.userCount)
        setUser(updatedUser)
      } else {
        console.error('No meta.total found in response')
      }
    } catch (error: any) {
      console.error('Failed to fetch organization details:', error)
      console.error('Error response:', error?.response?.data)
      message.error('Failed to load organization details')
    } finally {
      setOrganizationLoading(false)
    }
  }

  const handleEditProfile = () => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email
      })
      setEditModalVisible(true)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()
      
      const updatedUser = { ...user, ...values }
      setUser(updatedUser as User)
      
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      message.success('Profile updated successfully!')
      setEditModalVisible(false)
    } catch (error) {
      message.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text>Loading user information...</Text>
      </div>
    )
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'PLATFORM_ADMIN': 'red',
      'ORG_ADMIN': 'blue',
      'ORG_USER': 'green'
    }
    return colors[role] || 'default'
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'PLATFORM_ADMIN': 'Platform Admin',
      'ORG_ADMIN': 'Organization Admin',
      'ORG_USER': 'Organization User'
    }
    return labels[role] || role
  }

  const getCategoryLabel = (category: string) => {
    return category?.replace(/_/g, ' ') || '-'
  }

  return (
    <div style={{ display: 'grid', gap: isMobile ? 12 : 16 }}>
      <Title level={4} style={{ marginTop: 0 }}>My Profile</Title>
      
      <Card 
        title={
          <span>
            <TeamOutlined style={{ marginRight: 8 }} />
            Account Information
          </span>
        }
        bodyStyle={{ padding: isMobile ? 12 : 16 }}
      >
        <Descriptions
          column={isMobile ? 1 : 2}
          labelStyle={{ width: 180, fontWeight: 600 }}
          bordered
          size={isMobile ? 'small' : 'middle'}
        >
          <Descriptions.Item label="Name">
            <Text strong>{user.name || '-'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            <Text>{user.email || '-'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Role">
            <Tag color={getRoleColor(user.role)}>
              {getRoleLabel(user.role)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="User ID">
            <Text code style={{ fontSize: 11 }}>{user._id || '-'}</Text>
          </Descriptions.Item>
        </Descriptions>
        
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={handleEditProfile}
          >
            Edit Profile
          </Button>
        </div>
      </Card>

      <Card 
        title={
          <span>
            <BankOutlined style={{ marginRight: 8 }} />
            Organization
          </span>
        }
        bodyStyle={{ padding: isMobile ? 12 : 16 }}
        loading={organizationLoading}
      >
        <Descriptions
          column={isMobile ? 1 : 2}
          labelStyle={{ width: 180, fontWeight: 600 }}
          bordered
          size={isMobile ? 'small' : 'middle'}
        >
          <Descriptions.Item label="Organization Name">
            <Text strong>{user.organization?.name || '-'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Category">
            <Tag color="blue">
              {getCategoryLabel(user.organizationCategory || user.organization?.category || '')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Organization ID">
            <Text code style={{ fontSize: 11 }}>{user.organizationId || user.organization?._id || '-'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Total Users">
            <Text strong>{user.organization?.userCount !== undefined ? user.organization.userCount : '-'}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Modal
        title="Edit Profile"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setEditModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            loading={loading}
            onClick={handleSaveProfile}
            icon={<SaveOutlined />}
          >
            Save Changes
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[
              { required: true, message: 'Please enter your name' },
              { min: 2, message: 'Name must be at least 2 characters' }
            ]}
          >
            <Input placeholder="Enter your full name" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter your email address" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
