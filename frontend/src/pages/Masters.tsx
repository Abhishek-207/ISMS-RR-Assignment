import { useState, useEffect } from 'react'
import { 
  Typography, 
  Table, 
  Button, 
  Input, 
  Modal, 
  Form, 
  Select, 
  Space,
  message,
  Popconfirm,
  Collapse,
  Switch,
  Row,
  Col
} from 'antd'
import { 
  EditOutlined, 
  DeleteOutlined,
  ReloadOutlined,
  UserOutlined,
  PlusOutlined
} from '@ant-design/icons'
import { api } from '../lib/api'
import { fetchStates, fetchSites, fetchProjects, fetchClients, fetchMaterialCategories, fetchMaterialStatuses } from '../lib/masters'

const { Title } = Typography

export default function Masters() {
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editingType, setEditingType] = useState<string>('')
  const [form] = Form.useForm()

  const [states, setStates] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statesRes, sitesRes, projectsRes, clientsRes, categoriesRes, statusesRes, usersRes] = await Promise.all([
        fetchStates(),
        fetchSites(),
        fetchProjects(),
        fetchClients(),
        fetchMaterialCategories(),
        fetchMaterialStatuses(),
        api.get('/users', { params: { pageSize: 1000 } })
      ])

      setStates(statesRes)
      setSites(sitesRes)
      setProjects(projectsRes)
      setClients(clientsRes)
      setCategories(categoriesRes)
      setStatuses(statusesRes)
      setUsers(usersRes.data.items || [])
    } catch (error) {
      message.error('Failed to fetch master data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = (type: string) => {
    setEditingItem(null)
    setEditingType(type)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (item: any, type: string) => {
    setEditingItem(item)
    setEditingType(type)
    form.setFieldsValue(item)
    setModalVisible(true)
  }

  const handleDelete = async (id: string, type: string) => {
    try {
      await api.delete(`/masters/${type}/${id}`)
      message.success('Item deleted successfully')
      fetchData()
    } catch (error) {
      message.error('Failed to delete item')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingItem) {
        await api.patch(`/masters/${editingType}/${editingItem._id}`, values)
        message.success('Item updated successfully')
      } else {
        await api.post(`/masters/${editingType}`, values)
        message.success('Item created successfully')
      }
      setModalVisible(false)
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to save item')
    }
  }

  const handleInlineUpdate = async (type: string, id: string, updates: any, callback?: () => void) => {
    try {
      if (type === 'users') {
        await api.patch(`/users/${id}`, updates)
      } else {
        await api.patch(`/masters/${type}/${id}`, updates)
      }
      message.success('Status updated successfully')
      if (callback) callback()
    } catch (error) {
      message.error('Failed to update status')
    }
  }

  const getColumns = (type: string) => {
    const baseColumns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: 'Active',
        dataIndex: 'isActive',
        key: 'isActive',
        render: (isActive: boolean, record: any) => (
          <Switch 
            checked={!!isActive} 
            onChange={(checked) => handleInlineUpdate(type, record._id, { isActive: checked }, () => fetchData())} 
          />
        )
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (record: any) => (
          <Space>
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record, type)}
            />
            <Popconfirm
              title="Are you sure you want to delete this item?"
              onConfirm={() => handleDelete(record._id, type)}
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        )
      }
    ]

    if (type === 'sites') {
      return baseColumns
    }

    if (type === 'projects') {
      return baseColumns
    }

    if (type === 'clients') {
      return baseColumns
    }

    if (type === 'users') {
      return [
        {
          title: 'Name',
          dataIndex: 'name',
          key: 'name',
          render: (text: string, record: any) => (
            <div>
              <div style={{ fontWeight: 500 }}>{text}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{record.email}</div>
            </div>
          )
        },
        {
          title: 'Role',
          dataIndex: 'role',
          key: 'role',
          render: (role: string) => (
            <span style={{ 
              backgroundColor: '#f0f0f0', 
              color: '#666', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '12px',
              fontWeight: 'normal'
            }}>
              {role.replace('_', ' ')}
            </span>
          )
        },
        {
          title: 'Active',
          dataIndex: 'isActive',
          key: 'isActive',
          render: (isActive: boolean, record: any) => (
            <Switch 
              checked={!!isActive} 
              onChange={(checked) => handleInlineUpdate(type, record._id, { isActive: checked }, () => fetchData())} 
            />
          )
        },
        {
          title: 'Actions',
          key: 'actions',
          render: (record: any) => (
            <Space>
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                onClick={() => handleEdit(record, type)}
              />
              <Popconfirm
                title="Are you sure you want to delete this user?"
                onConfirm={() => handleDelete(record._id, type)}
              >
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Space>
          )
        }
      ]
    }

    return baseColumns
  }

  const getFormFields = () => {
    switch (editingType) {
      case 'states':
        return (
          <Form.Item
            name="name"
            label="State Name"
            rules={[{ required: true, message: 'Please enter state name!' }]}
          >
            <Input placeholder="Enter state name" />
          </Form.Item>
        )
      
      case 'sites':
        return (
          <Form.Item
            name="name"
            label="Site Name"
            rules={[{ required: true, message: 'Please enter site name!' }]}
          >
            <Input placeholder="Enter site name" />
          </Form.Item>
        )
      
      case 'projects':
        return (
          <Form.Item
            name="name"
            label="Project Name"
            rules={[{ required: true, message: 'Please enter project name!' }]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>
        )
      
      case 'clients':
        return (
          <Form.Item
            name="name"
            label="Client Name"
            rules={[{ required: true, message: 'Please enter client name!' }]}
          >
            <Input placeholder="Enter client name" />
          </Form.Item>
        )
      
      case 'material-categories':
        return (
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter category name!' }]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>
        )
      
      case 'material-statuses':
        return (
          <Form.Item
            name="name"
            label="Status Name"
            rules={[{ required: true, message: 'Please enter status name!' }]}
          >
            <Input placeholder="Enter status name" />
          </Form.Item>
        )
      
      case 'users':
        return (
          <>
            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Full Name"
                  rules={[{ required: true, message: 'Please enter full name!' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Enter full name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Please enter email!' },
                    { type: 'email', message: 'Please enter valid email!' }
                  ]}
                >
                  <Input placeholder="Enter email" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item
                  name="role"
                  label="Role"
                  rules={[{ required: true, message: 'Please select role!' }]}
                >
                  <Select placeholder="Select role">
                    <Select.Option value="SITE_ENGINEER">Site Engineer</Select.Option>
                    <Select.Option value="PROJECT_MANAGER">Project Manager</Select.Option>
                    <Select.Option value="ADMIN">Admin</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="isActive"
                  label="Status"
                  rules={[{ required: true, message: 'Please select status!' }]}
                >
                  <Select placeholder="Select status">
                    <Select.Option value={true}>Active</Select.Option>
                    <Select.Option value={false}>Inactive</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {!editingItem && (
              <Row gutter={[16, 0]}>
                <Col span={12}>
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
                </Col>
              </Row>
            )}
          </>
        )
      
      default:
        return null
    }
  }

  const getData = (type: string) => {
    switch (type) {
      case 'states': return states
      case 'sites': return sites
      case 'projects': return projects
      case 'clients': return clients
      case 'material-categories': return categories
      case 'material-statuses': return statuses
      case 'users': return users
      default: return []
    }
  }

  const getFormTitle = () => {
    const typeNames: Record<string, string> = {
      'states': 'State',
      'sites': 'Site',
      'projects': 'Project',
      'clients': 'Client',
      'material-categories': 'Material Category',
      'material-statuses': 'Material Status',
      'users': 'User'
    }
    return editingItem ? `Edit ${typeNames[editingType]}` : `Add ${typeNames[editingType]}`
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Title level={4} style={{ margin: 0 }}>

          Configuration settings
        </Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={fetchData}
          loading={loading}
        >
          Refresh All
        </Button>
      </div>

      <Collapse defaultActiveKey={[]} size="small" accordion>
        {/* Users */}
        <Collapse.Panel 
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>Users</span>
              <span style={{ 
                backgroundColor: '#f0f0f0', 
                color: '#666', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'normal'
              }}>
                {users.length}
              </span>
            </div>
          } 
          key="users"
        >
          <div style={{ marginBottom: 12 }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => handleCreate('users')}
            >
              Add User
            </Button>
          </div>
          <Table
            columns={getColumns('users')}
            dataSource={getData('users')}
            loading={loading}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </Collapse.Panel>

        {/* States */}
        <Collapse.Panel 
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>States</span>
              <span style={{ 
                backgroundColor: '#f0f0f0', 
                color: '#666', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'normal'
              }}>
                {states.length}
              </span>
            </div>
          } 
          key="states"
        >
          <Form layout="inline" onFinish={async (values) => {
            try {
              await api.post('/masters/states', values)
              message.success('State created successfully')
              fetchData()
            } catch (error: any) {
              message.error(error.response?.data?.error || 'Failed to create state')
            }
          }} style={{ width: '100%', marginBottom: 12 }}>
            <Form.Item name="name" rules={[{ required: true, whitespace: true, message: 'Please enter state name' }]} style={{ flex: 1 }}>
              <Input placeholder="Enter state name" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">Add</Button>
            </Form.Item>
          </Form>
          <Table
            columns={getColumns('states')}
            dataSource={getData('states')}
            loading={loading}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </Collapse.Panel>

        {/* Sites */}
        <Collapse.Panel 
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>Sites</span>
              <span style={{ 
                backgroundColor: '#f0f0f0', 
                color: '#666', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'normal'
              }}>
                {sites.length}
              </span>
            </div>
          } 
          key="sites"
        >
          <Form layout="inline" onFinish={async (values) => {
            try {
              await api.post('/masters/sites', values)
              message.success('Site created successfully')
              fetchData()
            } catch (error: any) {
              message.error(error.response?.data?.error || 'Failed to create site')
            }
          }} style={{ width: '100%', marginBottom: 12 }}>
            <Form.Item name="name" rules={[{ required: true, whitespace: true, message: 'Please enter site name' }]} style={{ flex: 1 }}>
              <Input placeholder="Enter site name" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">Add</Button>
            </Form.Item>
          </Form>
          <Table
            columns={getColumns('sites')}
            dataSource={getData('sites')}
            loading={loading}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </Collapse.Panel>

        {/* Projects */}
        <Collapse.Panel 
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>Projects</span>
              <span style={{ 
                backgroundColor: '#f0f0f0', 
                color: '#666', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'normal'
              }}>
                {projects.length}
              </span>
            </div>
          } 
          key="projects"
        >
          <Form layout="inline" onFinish={async (values) => {
            try {
              await api.post('/masters/projects', values)
              message.success('Project created successfully')
              fetchData()
            } catch (error: any) {
              message.error(error.response?.data?.error || 'Failed to create project')
            }
          }} style={{ width: '100%', marginBottom: 12 }}>
            <Form.Item name="name" rules={[{ required: true, whitespace: true, message: 'Please enter project name' }]} style={{ flex: 1 }}>
              <Input placeholder="Enter project name" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">Add</Button>
            </Form.Item>
          </Form>
          <Table
            columns={getColumns('projects')}
            dataSource={getData('projects')}
            loading={loading}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </Collapse.Panel>

        {/* Clients */}
        <Collapse.Panel 
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>Clients</span>
              <span style={{ 
                backgroundColor: '#f0f0f0', 
                color: '#666', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'normal'
              }}>
                {clients.length}
              </span>
            </div>
          } 
          key="clients"
        >
          <Form layout="inline" onFinish={async (values) => {
            try {
              await api.post('/masters/clients', values)
              message.success('Client created successfully')
              fetchData()
            } catch (error: any) {
              message.error(error.response?.data?.error || 'Failed to create client')
            }
          }} style={{ width: '100%', marginBottom: 12 }}>
            <Form.Item name="name" rules={[{ required: true, whitespace: true, message: 'Please enter client name' }]} style={{ flex: 1 }}>
              <Input placeholder="Enter client name" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">Add</Button>
            </Form.Item>
          </Form>
          <Table
            columns={getColumns('clients')}
            dataSource={getData('clients')}
            loading={loading}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </Collapse.Panel>

        {/* Material Categories */}
        <Collapse.Panel 
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>Material Categories</span>
              <span style={{ 
                backgroundColor: '#f0f0f0', 
                color: '#666', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'normal'
              }}>
                {categories.length}
              </span>
            </div>
          } 
          key="material-categories"
        >
          <Form layout="inline" onFinish={async (values) => {
            try {
              await api.post('/masters/material-categories', values)
              message.success('Category created successfully')
              fetchData()
            } catch (error: any) {
              message.error(error.response?.data?.error || 'Failed to create category')
            }
          }} style={{ width: '100%', marginBottom: 12 }}>
            <Form.Item name="name" rules={[{ required: true, whitespace: true, message: 'Please enter category name' }]} style={{ flex: 1 }}>
              <Input placeholder="Enter category name" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">Add</Button>
            </Form.Item>
          </Form>
          <Table
            columns={getColumns('material-categories')}
            dataSource={getData('material-categories')}
            loading={loading}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </Collapse.Panel>

        {/* Material Statuses */}
        <Collapse.Panel 
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>Material Statuses</span>
              <span style={{ 
                backgroundColor: '#f0f0f0', 
                color: '#666', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'normal'
              }}>
                {statuses.length}
              </span>
            </div>
          } 
          key="material-statuses"
        >
          <Form layout="inline" onFinish={async (values) => {
            try {
              await api.post('/masters/material-statuses', values)
              message.success('Status created successfully')
              fetchData()
            } catch (error: any) {
              message.error(error.response?.data?.error || 'Failed to create status')
            }
          }} style={{ width: '100%', marginBottom: 12 }}>
            <Form.Item name="name" rules={[{ required: true, whitespace: true, message: 'Please enter status name' }]} style={{ flex: 1 }}>
              <Input placeholder="Enter status name" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">Add</Button>
            </Form.Item>
          </Form>
          <Table
            columns={getColumns('material-statuses')}
            dataSource={getData('material-statuses')}
            loading={loading}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </Collapse.Panel>

      </Collapse>

      {/* Create/Edit Modal */}
      <Modal
        title={getFormTitle()}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {getFormFields()}
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingItem ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
