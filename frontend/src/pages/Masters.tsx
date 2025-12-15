import { useState, useEffect } from 'react'
import { 
  Typography, 
  Table, 
  Button, 
  Input, 
  Modal, 
  Form, 
  Space,
  message,
  Popconfirm,
  Collapse,
  Switch,
  Dropdown
} from 'antd'
import { 
  EditOutlined, 
  DeleteOutlined,
  ReloadOutlined,
  MoreOutlined
} from '@ant-design/icons'
import { api } from '../lib/api'
import { fetchMaterialCategories, fetchMaterialStatuses } from '../lib/masters'
import Users from './Users'

const { Title } = Typography

export default function Masters() {
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editingType, setEditingType] = useState<string>('')
  const [form] = Form.useForm()

  const [categories, setCategories] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [categoriesRes, statusesRes] = await Promise.all([
        fetchMaterialCategories({ includeInactive: true }),
        fetchMaterialStatuses({ includeInactive: true })
      ])

      // Ensure we always store arrays to avoid runtime errors when accessing .length
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : [])
      setStatuses(Array.isArray(statusesRes) ? statusesRes : [])
    } catch (error) {
      message.error('Failed to fetch configuration data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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
      message.error(error.response?.data?.message || 'Failed to save item')
    }
  }

  const handleInlineUpdate = async (type: string, id: string, updates: any, callback?: () => void) => {
    try {
      await api.patch(`/masters/${type}/${id}`, updates)
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
        key: 'name',
        render: (text: string, record: any) => (
          <span style={{ color: record.isActive ? undefined : '#999' }}>
            {text}
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
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: 'edit',
                  label: 'Edit',
                  icon: <EditOutlined />,
                  onClick: () => handleEdit(record, type)
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => {
                    Modal.confirm({
                      title: 'Delete Item',
                      content: 'Are you sure you want to delete this item?',
                      okText: 'Delete',
                      okType: 'danger',
                      cancelText: 'Cancel',
                      onOk: () => handleDelete(record._id, type)
                    })
                  }
                }
              ]
            }}
          >
            <Button 
              type="text" 
              icon={<MoreOutlined />} 
            />
          </Dropdown>
        )
      }
    ]

    return baseColumns
  }

  const getFormFields = () => {
    switch (editingType) {
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
      
      default:
        return null
    }
  }

  const getData = (type: string) => {
    switch (type) {
      case 'material-categories': return categories
      case 'material-statuses': return statuses
      default: return []
    }
  }

  const getFormTitle = () => {
    const typeNames: Record<string, string> = {
      'material-categories': 'Material Category',
      'material-statuses': 'Material Status'
    }
    return editingItem ? `Edit ${typeNames[editingType]}` : `Add ${typeNames[editingType]}`
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Title level={4} style={{ margin: 0 }}>
          Configuration Settings
        </Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={fetchData}
          loading={loading}
        >
          Refresh All
        </Button>
      </div>

      <Collapse defaultActiveKey={['users']} size="small" accordion>
        {/* Users (managed as part of configuration) */}
        <Collapse.Panel 
          header="Users"
          key="users"
        >
          <Users />
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
              message.error(error.response?.data?.message || 'Failed to create category')
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
              message.error(error.response?.data?.message || 'Failed to create status')
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
