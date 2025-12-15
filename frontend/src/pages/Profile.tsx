import React, { useState, useEffect } from 'react'
import { Card, Descriptions, Button, Typography, Grid, message, Form, Input, Modal, Tag } from 'antd'
import { EditOutlined, SaveOutlined } from '@ant-design/icons'
import { getCurrentUser } from '../lib/auth'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

interface User {
  id: string
  name: string
  email: string
  role: string
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
      
      // Here you would typically make an API call to update the user profile
      // For now, we'll just update the local state
      const updatedUser = { ...user, ...values }
      setUser(updatedUser)
      
      // Update localStorage
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

  const roleColors: any = {
    'admin': 'red',
    'user': 'blue',
    'manager': 'green'
  }

  return (
    <div style={{ display: 'grid', gap: isMobile ? 12 : 16 }}>
      <Title level={4} style={{ marginTop: 0 }}>About</Title>
      <Card bodyStyle={{ padding: isMobile ? 12 : 16 }}>
        <Descriptions
          column={isMobile ? 1 : 2}
          labelStyle={{ width: 180, fontWeight: 600 }}
          bordered
          size={isMobile ? 'small' : 'middle'}
        >
          <Descriptions.Item label="Name">
            <Text>{user.name || '-'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            <Text>{user.email || '-'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Role">
            <Tag color={roleColors[user.role?.toLowerCase()] || 'default'}>
              {user.role || '-'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="User ID">
            <Text code>{user.id || '-'}</Text>
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
