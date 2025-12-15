import React, { useState, useEffect } from 'react'
import { Card, Descriptions, Button, Typography, Grid, message, Form, Input, Modal, Tag, Divider } from 'antd'
import { EditOutlined, SaveOutlined, TeamOutlined, BankOutlined } from '@ant-design/icons'
import { getCurrentUser } from '../lib/auth'

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
  }
}

export default function Profile() {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
  }, [])

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
              {getCategoryLabel(user.organizationCategory || user.organization?.category)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Organization ID">
            <Text code style={{ fontSize: 11 }}>{user.organizationId || user.organization?._id || '-'}</Text>
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
