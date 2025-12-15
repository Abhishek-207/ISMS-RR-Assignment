import { useState, useEffect } from 'react'
import { 
  Table, 
  Card, 
  Button, 
  Input, 
  Select, 
  Space, 
  Tag, 
  Typography, 
  Row, 
  Col,
  Modal,
  message,
  Form,
  Popconfirm
} from 'antd'
import { 
  PlusOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined
} from '@ant-design/icons'
import { api } from '../lib/api'
import { isPlatformAdmin, isOrgAdmin } from '../lib/auth'
import dayjs from 'dayjs'

const { Title } = Typography

interface User {
  _id: string
  name: string
  email: string
  role: 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'ORG_USER'
  organizationId: { _id: string; name: string; category: string }
  organizationCategory: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isActive: ''
  })

  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()

  const canManage = isPlatformAdmin() || isOrgAdmin()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize
      }

      if (filters.search) params.q = filters.search
      if (filters.role) params.role = filters.role
      if (filters.isActive !== '') params.isActive = filters.isActive === 'true'

      const response = await api.get('/users', { params })
      setUsers(response.data.data)
      setPagination(prev => ({ ...prev, total: response.data.meta.total }))
    } catch (error) {
      message.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [pagination.current, pagination.pageSize, filters])

  const handleTableChange = (pagination: any) => {
    setPagination(pagination)
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const handleCreate = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    })
    setModalVisible(true)
  }

  const handleDelete = async (userId: string) => {
    try {
      await api.delete(`/users/${userId}`)
      message.success('User deleted successfully')
      fetchUsers()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete user')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser) {
        await api.patch(`/users/${editingUser._id}`, values)
        message.success('User updated successfully')
      } else {
        await api.post('/users', values)
        message.success('User created successfully')
      }
      setModalVisible(false)
      form.resetFields()
      fetchUsers()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to save user')
    }
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'PLATFORM_ADMIN': 'red',
      'ORG_ADMIN': 'orange',
      'ORG_USER': 'blue'
    }
    return colors[role] || 'default'
  }

  const getRoleDisplay = (role: string) => {
    const displays: Record<string, string> = {
      'PLATFORM_ADMIN': 'Platform Admin',
      'ORG_ADMIN': 'Org Admin',
      'ORG_USER': 'User'
    }
    return displays[role] || role
  }

  const columns = [
    {
      title: 'User',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: User) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>
            <UserOutlined style={{ marginRight: 6 }} />
            {text}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            {record.email}
          </div>
        </div>
      )
    },
    {
      title: 'Organization',
      key: 'organization',
      width: 200,
      render: (record: User) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>
            {record.organizationId?.name || 'N/A'}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            {record.organizationCategory?.replace(/_/g, ' ') || ''}
          </div>
        </div>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 130,
      render: (role: string) => (
        <Tag color={getRoleColor(role)} style={{ fontSize: 11 }}>
          {getRoleDisplay(role)}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'} style={{ fontSize: 11 }}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLoginAt',
      key: 'lastLogin',
      width: 140,
      render: (date: string) => date ? dayjs(date).format('DD MMM YYYY') : 'Never'
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'created',
      width: 120,
      render: (date: string) => dayjs(date).format('DD MMM YYYY')
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (record: User) => (
        canManage ? (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
            <Popconfirm
              title="Delete User"
              description="Are you sure you want to delete this user?"
              onConfirm={() => handleDelete(record._id)}
              okText="Delete"
              okType="danger"
              cancelText="Cancel"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        ) : (
          <span style={{ color: '#999', fontSize: 12 }}>-</span>
        )
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Title level={4} style={{ margin: 0 }}>
          Users
        </Title>
        {canManage && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Add User
          </Button>
        )}
      </div>

      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search users..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Role"
              style={{ width: '100%' }}
              value={filters.role}
              onChange={(value) => handleFilterChange('role', value)}
              allowClear
            >
              <Select.Option value="PLATFORM_ADMIN">Platform Admin</Select.Option>
              <Select.Option value="ORG_ADMIN">Org Admin</Select.Option>
              <Select.Option value="ORG_USER">User</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              value={filters.isActive}
              onChange={(value) => handleFilterChange('isActive', value)}
              allowClear
            >
              <Select.Option value="true">Active</Select.Option>
              <Select.Option value="false">Inactive</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchUsers}
              loading={loading}
              block
            >
              Refresh
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey="_id"
          size="small"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} users`,
            size: 'small'
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingUser ? 'Edit User' : 'Add User'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter name!' }]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email!' },
              { type: 'email', message: 'Please enter valid email!' }
            ]}
          >
            <Input 
              placeholder="user@example.com" 
              disabled={!!editingUser}
            />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please enter password!' },
                { min: 6, message: 'Password must be at least 6 characters!' }
              ]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select role!' }]}
          >
            <Select placeholder="Select role">
              {isPlatformAdmin() && (
                <Select.Option value="PLATFORM_ADMIN">Platform Admin</Select.Option>
              )}
              <Select.Option value="ORG_ADMIN">Org Admin</Select.Option>
              <Select.Option value="ORG_USER">User</Select.Option>
            </Select>
          </Form.Item>

          {editingUser && (
            <Form.Item
              name="isActive"
              label="Status"
              valuePropName="checked"
            >
              <Select>
                <Select.Option value={true}>Active</Select.Option>
                <Select.Option value={false}>Inactive</Select.Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalVisible(false)
                form.resetFields()
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
