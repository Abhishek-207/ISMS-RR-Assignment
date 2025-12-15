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
  Tooltip
} from 'antd'
import { 
  SearchOutlined, 
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  StopOutlined,
  ShoppingCartOutlined
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
  requestedQuantity: number
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
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    direction: 'all'
  })

  const [actionModalVisible, setActionModalVisible] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'cancel'>('approve')
  const [actionForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

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
      setRequests(response.data.items)
      setPagination(prev => ({ ...prev, total: response.data.total }))
    } catch (error) {
      message.error('Failed to fetch procurement requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [pagination.current, pagination.pageSize, filters])

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
      message.error(error.response?.data?.error || `Failed to ${actionType} request`)
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
      dataIndex: 'requestedQuantity',
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
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                Modal.info({
                  title: 'Procurement Request Details',
                  width: 600,
                  content: (
                    <div style={{ marginTop: 16 }}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div><Text strong>Material:</Text> {record.materialId.name}</div>
                        <div><Text strong>Condition:</Text> <Tag color={getConditionColor(record.materialId.condition)}>{record.materialId.condition.replace(/_/g, ' ')}</Tag></div>
                        <div><Text strong>From:</Text> {record.fromOrganizationId.name}</div>
                        <div><Text strong>To:</Text> {record.toOrganizationId.name}</div>
                        <div><Text strong>Quantity:</Text> {record.requestedQuantity} {record.materialId.unit}</div>
                        <div><Text strong>Purpose:</Text> {record.purpose}</div>
                        <div><Text strong>Status:</Text> <Tag color={getStatusColor(record.status)}>{record.status}</Tag></div>
                        <div><Text strong>Requested By:</Text> {record.requestedBy.name}</div>
                        <div><Text strong>Requested On:</Text> {dayjs(record.createdAt).format('DD MMM YYYY, HH:mm')}</div>
                        {record.approvedBy && (
                          <>
                            <div><Text strong>Approved By:</Text> {record.approvedBy.name}</div>
                            <div><Text strong>Approved On:</Text> {dayjs(record.approvedAt).format('DD MMM YYYY, HH:mm')}</div>
                          </>
                        )}
                        {record.rejectedBy && (
                          <>
                            <div><Text strong>Rejected By:</Text> {record.rejectedBy.name}</div>
                            <div><Text strong>Rejected On:</Text> {dayjs(record.rejectedAt).format('DD MMM YYYY, HH:mm')}</div>
                          </>
                        )}
                        {record.comments && (
                          <div><Text strong>Comments:</Text> {record.comments}</div>
                        )}
                      </Space>
                    </div>
                  )
                })
              }}
            />
          </Tooltip>
          
          {canApprove(record) && (
            <>
              <Tooltip title="Approve">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => openActionModal(record, 'approve')}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button
                  danger
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => openActionModal(record, 'reject')}
                />
              </Tooltip>
            </>
          )}

          {canCancel(record) && (
            <Tooltip title="Cancel Request">
              <Button
                danger
                size="small"
                icon={<StopOutlined />}
                onClick={() => openActionModal(record, 'cancel')}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
            Procurement Requests
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
            Manage surplus material procurement across organizations
          </Paragraph>
        </div>
        <Button 
          type="primary"
          icon={<ShoppingCartOutlined />}
          onClick={() => navigate('/surplus')}
        >
          Browse Surplus
        </Button>
      </div>

      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={7}>
            <Input
              placeholder="Search requests..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="APPROVED">Approved</Select.Option>
              <Select.Option value="REJECTED">Rejected</Select.Option>
              <Select.Option value="CANCELLED">Cancelled</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
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
          <Col xs={24} sm={12} md={4}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchRequests}
              loading={loading}
              block
            >
              Refresh
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={requests}
          loading={loading}
          rowKey="_id"
          size="small"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} requests`,
            size: 'small'
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
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
              <Text>{selectedRequest.requestedQuantity} {selectedRequest.materialId.unit}</Text>
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
