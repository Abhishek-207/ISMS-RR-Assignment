import { useState, useEffect } from 'react'
import { 
  Table, 
  Card, 
  Button, 
  Input, 
  Select, 
  DatePicker, 
  Tag, 
  Typography, 
  Row, 
  Col,
  Modal,
  message,
  Dropdown
} from 'antd'
import { 
  PlusOutlined, 
  SearchOutlined, 
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  MoreOutlined,
  ShareAltOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { getCurrentUser as getUser, isOrgAdmin } from '../lib/auth'
import dayjs from 'dayjs'

const { Title } = Typography
const { RangePicker } = DatePicker

interface Material {
  _id: string
  name: string
  categoryId: { name: string }
  quantity: number
  unit: string
  organizationId: { _id: string; name: string }
  status: string
  condition: string
  isSurplus: boolean
  availableFrom: string
  availableUntil: string
  estimatedCost?: number
  location?: string
  notes?: string
  createdBy: { _id: string; name: string }
  createdAt: string
}

export default function MaterialsList() {
  const navigate = useNavigate()
  const user = getUser()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    status: '',
    condition: '',
    isSurplus: '',
    dateRange: null as any
  })

  const [categories, setCategories] = useState<any[]>([])

  const fetchMaterials = async () => {
    setLoading(true)
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize
      }

      if (filters.search) params.q = filters.search
      if (filters.categoryId) params.categoryId = filters.categoryId
      if (filters.status) params.status = filters.status
      if (filters.condition) params.condition = filters.condition
      if (filters.isSurplus !== '') params.isSurplus = filters.isSurplus === 'true'
      if (filters.dateRange) {
        params.fromDate = filters.dateRange[0].format('YYYY-MM-DD')
        params.toDate = filters.dateRange[1].format('YYYY-MM-DD')
      }

      const response = await api.get('/materials', { params })
      setMaterials(response.data.data)
      setPagination(prev => ({ ...prev, total: response.data.meta.total }))
    } catch (error) {
      message.error('Failed to fetch inventory')
    } finally {
      setLoading(false)
    }
  }

  const fetchMasterData = async () => {
    try {
      const categoriesRes = await api.get('/masters/material-categories')
      setCategories(categoriesRes.data.data || [])
    } catch (error) {
      console.error('Failed to fetch material categories:', error)
    }
  }

  useEffect(() => {
    fetchMasterData()
  }, [])

  useEffect(() => {
    fetchMaterials()
  }, [pagination.current, pagination.pageSize, filters])

  const handleTableChange = (pagination: any) => {
    setPagination(pagination)
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const handleMarkAsSurplus = async (material: Material) => {
    if (material.quantity <= 0) {
      message.warning('Cannot mark as surplus. Quantity must be greater than zero.')
      return
    }

    Modal.confirm({
      title: 'Mark as Surplus',
      content: `Are you sure you want to mark "${material.name}" as surplus? This will make it visible to other organizations in your category.`,
      okText: 'Mark as Surplus',
      onOk: async () => {
        try {
          await api.patch(`/materials/${material._id}/mark-surplus`)
          message.success('Material marked as surplus successfully')
          fetchMaterials()
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to mark as surplus')
        }
      }
    })
  }

  const handleDelete = (material: Material) => {
    Modal.confirm({
      title: 'Delete Material',
      content: `Are you sure you want to delete "${material.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/materials/${material._id}`)
          message.success('Material deleted successfully')
          fetchMaterials()
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to delete material')
        }
      }
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'AVAILABLE': 'green',
      'RESERVED': 'orange',
      'TRANSFERRED': 'purple',
      'ARCHIVED': 'default'
    }
    return colors[status] || 'default'
  }

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      'NEW': 'green',
      'GOOD': 'blue',
      'SLIGHTLY_DAMAGED': 'orange',
      'NEEDS_REPAIR': 'red',
      'SCRAP': 'red'
    }
    return colors[condition] || 'default'
  }

  const canEditMaterial = (materialCreatorId: string) => {
    return user?._id === materialCreatorId || isOrgAdmin()
  }

  const handleExportReport = async () => {
    setExportLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (filters.search) params.append('q', filters.search)
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.status) params.append('status', filters.status)
      if (filters.condition) params.append('condition', filters.condition)
      if (filters.isSurplus !== '') params.append('isSurplus', filters.isSurplus)
      if (filters.dateRange) {
        params.append('fromDate', filters.dateRange[0].format('YYYY-MM-DD'))
        params.append('toDate', filters.dateRange[1].format('YYYY-MM-DD'))
      }
      
      const response = await api.get(`/analytics/export?${params.toString()}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `inventory-report-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      message.success('Report exported successfully')
      
    } catch (error) {
      console.error('Failed to export report:', error)
      message.error('Failed to export report')
    } finally {
      setExportLoading(false)
    }
  }

  const clearAllFilters = () => {
    setFilters({
      search: '',
      categoryId: '',
      status: '',
      condition: '',
      isSurplus: '',
      dateRange: null
    })
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const columns = [
    {
      title: 'Material',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text: string, record: Material) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>
            {text}
            {record.isSurplus && (
              <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>
                SURPLUS
              </Tag>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            {record.categoryId.name}
          </div>
        </div>
      )
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (quantity: number, record: Material) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{quantity} {record.unit}</div>
          {record.location && (
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
              📍 {record.location}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} style={{ fontSize: 11, padding: '2px 6px' }}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Condition',
      dataIndex: 'condition',
      key: 'condition',
      width: 120,
      render: (condition: string) => (
        <Tag color={getConditionColor(condition)} style={{ fontSize: 11, padding: '2px 6px' }}>
          {condition.replace(/_/g, ' ')}
        </Tag>
      )
    },
    {
      title: 'Available Period',
      key: 'period',
      width: 140,
      render: (record: Material) => (
        <div style={{ fontSize: 12 }}>
          <div>{dayjs(record.availableFrom).format('DD/MM/YY')}</div>
          {record.availableUntil && (
            <div style={{ color: '#666' }}>
              to {dayjs(record.availableUntil).format('DD/MM/YY')}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Cost',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 100,
      render: (cost: number) => cost ? `₹${cost.toLocaleString()}` : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right' as const,
      render: (record: Material) => {
        const menuItems: any[] = [
          {
            key: 'view',
            label: 'View Details',
            icon: <EyeOutlined />,
            onClick: () => navigate(`/inventory/${record._id}`)
          }
        ]

        if (canEditMaterial(record.createdBy._id)) {
          if (!record.isSurplus && record.status === 'AVAILABLE' && record.quantity > 0) {
            menuItems.push({
              key: 'mark-surplus',
              label: 'Mark as Surplus',
              icon: <ShareAltOutlined />,
              onClick: () => handleMarkAsSurplus(record)
            })
          }

          menuItems.push(
            {
              key: 'edit',
              label: 'Edit',
              icon: <EditOutlined />,
              onClick: () => navigate(`/inventory/${record._id}/edit`)
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => handleDelete(record)
            }
          )
        }

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button 
              type="text" 
              icon={<MoreOutlined />}
              size="small"
            />
          </Dropdown>
        )
      }
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Title level={4} style={{ margin: 0 }}>
          My Inventory
        </Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={clearAllFilters}>
            Clear Filters
          </Button>
          <Button 
            icon={<DownloadOutlined />}
            onClick={handleExportReport}
            loading={exportLoading}
          >
            Export Report
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/inventory/new')}
          >
            Add Item
          </Button>
        </div>
      </div>

      <Card>
        <div style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Search materials..."
                prefix={<SearchOutlined />}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <RangePicker
                style={{ width: '100%' }}
                value={filters.dateRange}
                onChange={(dates) => handleFilterChange('dateRange', dates)}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                placeholder="Category"
                style={{ width: '100%' }}
                value={filters.categoryId}
                onChange={(value) => handleFilterChange('categoryId', value)}
              >
                <Select.Option value="">All Categories</Select.Option>
                {categories.map((category: any) => (
                  <Select.Option key={category._id} value={category._id}>
                    {category.name}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={5}>
              <Select
                placeholder="Status"
                style={{ width: '100%' }}
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
              >
                <Select.Option value="">All Statuses</Select.Option>
                <Select.Option value="AVAILABLE">Available</Select.Option>
                <Select.Option value="RESERVED">Reserved</Select.Option>
                <Select.Option value="TRANSFERRED">Transferred</Select.Option>
                <Select.Option value="ARCHIVED">Archived</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={5}>
              <Select
                placeholder="Condition"
                style={{ width: '100%' }}
                value={filters.condition}
                onChange={(value) => handleFilterChange('condition', value)}
              >
                <Select.Option value="">All Conditions</Select.Option>
                <Select.Option value="NEW">New</Select.Option>
                <Select.Option value="GOOD">Good</Select.Option>
                <Select.Option value="SLIGHTLY_DAMAGED">Slightly Damaged</Select.Option>
                <Select.Option value="NEEDS_REPAIR">Needs Repair</Select.Option>
                <Select.Option value="SCRAP">Scrap</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={5}>
              <Select
                placeholder="Items"
                style={{ width: '100%' }}
                value={filters.isSurplus}
                onChange={(value) => handleFilterChange('isSurplus', value)}
              >
                <Select.Option value="">All Items</Select.Option>
                <Select.Option value="true">Surplus Only</Select.Option>
                <Select.Option value="false">Non-Surplus Only</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={3}>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchMaterials}
                loading={loading}
                block
              >
                Refresh
              </Button>
            </Col>
          </Row>
        </div>

        {loading && materials.length === 0 ? (
          <div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="shimmer-table-row">
                <div className="shimmer-table-cell">
                  <div className="shimmer-wrapper" />
                  <div className="shimmer-wrapper" />
                </div>
                <div className="shimmer-wrapper" />
                <div className="shimmer-wrapper" />
                <div className="shimmer-wrapper" />
                <div className="shimmer-wrapper" />
                <div className="shimmer-wrapper" />
              </div>
            ))}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={materials}
            loading={loading && materials.length > 0}
            rowKey="_id"
            size="small"
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} items`,
              size: 'small'
            }}
            onChange={handleTableChange}
            scroll={{ x: 1100 }}
          />
        )}
      </Card>
    </div>
  )
}
