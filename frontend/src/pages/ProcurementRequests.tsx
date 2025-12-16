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
  Tooltip,
  Dropdown
} from 'antd'
import { 
  SearchOutlined, 
  ReloadOutlined,
  EyeOutlined,
  ShoppingCartOutlined,
  MoreOutlined,
  DownloadOutlined,
  FilterOutlined
} from '@ant-design/icons'
import { api } from '../lib/api'
import { getCurrentUser, isOrgAdmin } from '../lib/auth'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface ProcurementRequest {
  _id: string
  materialId: { 
    _id: string
    name: string 
    quantity: number 
    unit: string 
    condition: string 
  }
  fromOrganizationId: { _id: string; name: string; category: string }
  toOrganizationId: { _id: string; name: string; category: string }
  quantityRequested: number
  purpose: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  requestedBy: { _id: string; name: string }
  approvedBy?: { _id: string; name: string }
  rejectedBy?: { _id: string; name: string }
  comments?: string
  approvedAt?: string
  rejectedAt?: string
  createdAt: string
}

export default function ProcurementRequests() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [requests, setRequests] = useState<ProcurementRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    direction: 'all'
  })
  const [searchInput, setSearchInput] = useState('')

  const [actionModalVisible, setActionModalVisible] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'cancel'>('approve')
  const [actionForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize
      }

      if (filters.search) params.q = filters.search
      if (filters.status) params.status = filters.status
      if (filters.direction === 'incoming') params.incoming = true
      if (filters.direction === 'outgoing') params.outgoing = true

      const response = await api.get('/transfers', { params })
      setRequests(response.data.data)
      setPagination(prev => ({ ...prev, total: response.data.meta.total }))
    } catch (error) {
      message.error('Failed to fetch procurement requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [pagination.current, pagination.pageSize, filters])

  // Debounce search input
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }))
      setPagination(prev => ({ ...prev, current: 1 }))
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [searchInput])

  const handleTableChange = (pagination: any) => {
    setPagination(pagination)
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const openActionModal = (request: ProcurementRequest, action: 'approve' | 'reject' | 'cancel') => {
    setSelectedRequest(request)
    setActionType(action)
    actionForm.resetFields()
    setActionModalVisible(true)
  }

  const handleActionSubmit = async (values: any) => {
    if (!selectedRequest) return

    setSubmitting(true)
    try {
      let endpoint = ''
      let successMessage = ''

      if (actionType === 'approve') {
        endpoint = `/transfers/${selectedRequest._id}/approve`
        successMessage = 'Procurement request approved successfully'
      } else if (actionType === 'reject') {
        endpoint = `/transfers/${selectedRequest._id}/reject`
        successMessage = 'Procurement request rejected'
      } else if (actionType === 'cancel') {
        endpoint = `/transfers/${selectedRequest._id}/cancel`
        successMessage = 'Procurement request cancelled'
      }

      await api.patch(endpoint, { comments: values.comments })
      message.success(successMessage)
      setActionModalVisible(false)
      actionForm.resetFields()
      fetchRequests()
    } catch (error: any) {
      message.error(error.response?.data?.message || `Failed to ${actionType} request`)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'orange',
      'APPROVED': 'green',
      'REJECTED': 'red',
      'CANCELLED': 'default'
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

  const isIncomingRequest = (request: ProcurementRequest) => {
    return user?.organizationId === request.fromOrganizationId._id
  }

  const canApprove = (request: ProcurementRequest) => {
    return isOrgAdmin() && isIncomingRequest(request) && request.status === 'PENDING'
  }

  const canCancel = (request: ProcurementRequest) => {
    return request.requestedBy._id === user?._id && request.status === 'PENDING'
  }

  const handleExportReport = async () => {
    setExportLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (filters.search) params.append('q', filters.search)
      if (filters.status) params.append('status', filters.status)
      if (filters.direction === 'incoming') params.append('incoming', 'true')
      if (filters.direction === 'outgoing') params.append('outgoing', 'true')
      
      const response = await api.get(`/analytics/export?${params.toString()}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `procurement-requests-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.csv`)
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
      status: '',
      direction: 'all'
    })
    setSearchInput('')
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const columns = [
    {
      title: 'Material',
      dataIndex: 'materialId',
      key: 'material',
      width: 180,
      render: (material: any) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{material.name}</div>
          <Tag color={getConditionColor(material.condition)} style={{ fontSize: 10, marginTop: 4 }}>
            {material.condition.replace(/_/g, ' ')}
          </Tag>
        </div>
      )
    },
    {
      title: 'From',
      dataIndex: 'fromOrganizationId',
      key: 'from',
      width: 160,
      render: (org: any) => (
        <Tooltip title={`${org.name} (${org.category.replace(/_/g, ' ')})`}>
          <div style={{ maxWidth: 150 }}>
            <div style={{ fontWeight: 500, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {org.name}
            </div>
            <div style={{ fontSize: 10, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {org.category.replace(/_/g, ' ')}
            </div>
          </div>
        </Tooltip>
      )
    },
    {
      title: 'To',
      dataIndex: 'toOrganizationId',
      key: 'to',
      width: 160,
      render: (org: any) => (
        <Tooltip title={`${org.name} (${org.category.replace(/_/g, ' ')})`}>
          <div style={{ maxWidth: 150 }}>
            <div style={{ fontWeight: 500, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {org.name}
            </div>
            <div style={{ fontSize: 10, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {org.category.replace(/_/g, ' ')}
            </div>
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Quantity',
      dataIndex: 'quantityRequested',
      key: 'quantity',
      width: 100,
      render: (qty: number, record: ProcurementRequest) => (
        <Text strong style={{ fontSize: 13 }}>{qty} {record.materialId.unit}</Text>
      )
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      width: 180,
      render: (purpose: string) => (
        <Tooltip title={purpose}>
          <div style={{ 
            maxWidth: 170, 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            fontSize: 12
          }}>
            {purpose}
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} style={{ fontSize: 11 }}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      width: 110,
      render: (date: string) => dayjs(date).format('DD MMM YY')
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (record: ProcurementRequest) => (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <EyeOutlined />,
                onClick: () => navigate(`/procurement/${record._id}`)
              },
              ...(canApprove(record)
                ? [
                    {
                      key: 'approve',
                      label: 'Approve',
                      onClick: () => openActionModal(record, 'approve')
                    },
                    {
                      key: 'reject',
                      label: 'Reject',
                      onClick: () => openActionModal(record, 'reject'),
                      danger: true
                    }
                  ]
                : []),
              ...(canCancel(record)
                ? [
                    {
                      key: 'cancel',
                      label: 'Cancel Request',
                      onClick: () => openActionModal(record, 'cancel'),
                      danger: true
                    }
                  ]
                : [])
            ]
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
          />
        </Dropdown>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
            Procurement Requests
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
            Manage surplus item procurement across organizations
          </Paragraph>
        </div>
        <Space wrap>
          <Button 
            icon={<ReloadOutlined />}
            onClick={fetchRequests}
            loading={loading}
          >
            <span className="hide-on-mobile">Refresh</span>
            <span className="show-on-mobile">Refresh</span>
          </Button>
          <Button 
            icon={<DownloadOutlined />}
            onClick={handleExportReport}
            loading={exportLoading}
          >
            <span className="hide-on-mobile">Export Report</span>
            <span className="show-on-mobile">Export</span>
          </Button>
          <Button 
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => navigate('/surplus')}
          >
            <span className="hide-on-mobile">Browse Surplus</span>
            <span className="show-on-mobile">Browse</span>
          </Button>
        </Space>
      </div>

      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={7}>
            <Input
              placeholder="Search requests..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              allowClear
              onClear={() => setSearchInput('')}
            />
          </Col>
          <Col xs={24} sm={12} md={5} className="hide-on-mobile">
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Select.Option value="">All Statuses</Select.Option>
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="APPROVED">Approved</Select.Option>
              <Select.Option value="REJECTED">Rejected</Select.Option>
              <Select.Option value="CANCELLED">Cancelled</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} className="hide-on-mobile">
            <Select
              placeholder="Direction"
              style={{ width: '100%' }}
              value={filters.direction}
              onChange={(value) => handleFilterChange('direction', value)}
            >
              <Select.Option value="all">All Requests</Select.Option>
              <Select.Option value="incoming">Incoming (To Approve)</Select.Option>
              <Select.Option value="outgoing">Outgoing (My Requests)</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} className="hide-on-mobile">
            <Button 
              onClick={clearAllFilters}
              block
            >
              Clear Filters
            </Button>
          </Col>
          <Col xs={12} className="show-on-mobile">
            <Button 
              icon={<FilterOutlined />} 
              onClick={() => setShowFilters(!showFilters)}
              block
              style={{ height: 32 }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </Col>
          <Col xs={12} className="show-on-mobile">
            <Button 
              onClick={clearAllFilters}
              block
              style={{ height: 32 }}
            >
              Clear Filters
            </Button>
          </Col>
        </Row>
        <div className="show-on-mobile" style={{ display: showFilters ? 'block' : 'none', marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Select
                placeholder="Status"
                style={{ width: '100%' }}
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
              >
                <Select.Option value="">All Statuses</Select.Option>
                <Select.Option value="PENDING">Pending</Select.Option>
                <Select.Option value="APPROVED">Approved</Select.Option>
                <Select.Option value="REJECTED">Rejected</Select.Option>
                <Select.Option value="CANCELLED">Cancelled</Select.Option>
              </Select>
            </Col>
            <Col xs={24}>
              <Select
                placeholder="Direction"
                style={{ width: '100%' }}
                value={filters.direction}
                onChange={(value) => handleFilterChange('direction', value)}
              >
                <Select.Option value="all">All Requests</Select.Option>
                <Select.Option value="incoming">Incoming (To Approve)</Select.Option>
                <Select.Option value="outgoing">Outgoing (My Requests)</Select.Option>
              </Select>
            </Col>
          </Row>
        </div>

        {loading && requests.length === 0 ? (
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
            dataSource={requests}
            loading={loading && requests.length > 0}
            rowKey="_id"
            size="small"
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: false,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} requests`,
              size: 'small'
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>

      <Modal
        title={
          actionType === 'approve' 
            ? 'Approve Procurement Request' 
            : actionType === 'reject'
            ? 'Reject Procurement Request'
            : 'Cancel Procurement Request'
        }
        open={actionModalVisible}
        onCancel={() => {
          setActionModalVisible(false)
          actionForm.resetFields()
        }}
        footer={null}
      >
        {selectedRequest && (
          <div>
            <div style={{ marginBottom: 20, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <Text strong>Material: </Text>
              <Text>{selectedRequest.materialId.name}</Text>
              <br />
              <Text strong>From: </Text>
              <Text>{selectedRequest.fromOrganizationId.name}</Text>
              <br />
              <Text strong>To: </Text>
              <Text>{selectedRequest.toOrganizationId.name}</Text>
              <br />
              <Text strong>Quantity: </Text>
              <Text>{selectedRequest.quantityRequested} {selectedRequest.materialId.unit}</Text>
              <br />
              <Text strong>Purpose: </Text>
              <Text>{selectedRequest.purpose}</Text>
            </div>

            <Form
              form={actionForm}
              layout="vertical"
              onFinish={handleActionSubmit}
            >
              <Form.Item
                name="comments"
                label="Comments (Optional)"
              >
                <TextArea
                  rows={3}
                  placeholder={
                    actionType === 'approve'
                      ? 'Add any comments regarding the approval...'
                      : actionType === 'reject'
                      ? 'Please provide a reason for rejection...'
                      : 'Reason for cancellation...'
                  }
                  maxLength={500}
                  showCount
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button onClick={() => {
                    setActionModalVisible(false)
                    actionForm.resetFields()
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={submitting}
                    danger={actionType !== 'approve'}
                  >
                    {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Cancel Request'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  )
}
