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
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  MoreOutlined,
  StopOutlined
} from '@ant-design/icons'
import { api } from '../lib/api'
import { getCurrentUser, isOrgAdmin } from '../lib/auth'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

interface TransferRequest {
  _id: string
  materialId: { 
    _id: string
    name: string 
    quantity: number 
    unit: string 
    condition: string 
  }
  fromOrganizationId: { _id: string; name: string }
  toOrganizationId: { _id: string; name: string }
  requestedQuantity: number
  purpose: string
  status: string
  requestedBy: { _id: string; name: string }
  approvedBy?: { _id: string; name: string }
  rejectedBy?: { _id: string; name: string }
  approvedAt?: string
  rejectedAt?: string
  createdAt: string
}

export default function TransfersList() {
  const user = getCurrentUser()
  const [transfers, setTransfers] = useState<TransferRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    direction: 'all'
  })

  const [actionModalVisible, setActionModalVisible] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'cancel'>('approve')
  const [actionForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const fetchTransfers = async () => {
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
      setTransfers(response.data.data)
      setPagination(prev => ({ ...prev, total: response.data.meta.total }))
    } catch (error) {
      message.error('Failed to fetch procurement requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransfers()
  }, [pagination.current, pagination.pageSize, filters])

  const handleTableChange = (pagination: any) => {
    setPagination(pagination)
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const openActionModal = (transfer: TransferRequest, action: 'approve' | 'reject' | 'cancel') => {
    setSelectedTransfer(transfer)
    setActionType(action)
    actionForm.resetFields()
    setActionModalVisible(true)
  }

  const handleActionSubmit = async (values: any) => {
    if (!selectedTransfer) return

    setSubmitting(true)
    try {
      let endpoint = ''
      let successMessage = ''

      if (actionType === 'approve') {
        endpoint = `/transfers/${selectedTransfer._id}/approve`
        successMessage = 'Procurement request approved successfully'
      } else if (actionType === 'reject') {
        endpoint = `/transfers/${selectedTransfer._id}/reject`
        successMessage = 'Procurement request rejected'
      } else if (actionType === 'cancel') {
        endpoint = `/transfers/${selectedTransfer._id}/cancel`
        successMessage = 'Procurement request cancelled'
      }

      await api.patch(endpoint, { comments: values.comments })
      message.success(successMessage)
      setActionModalVisible(false)
      actionForm.resetFields()
      fetchTransfers()
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

  const isIncomingRequest = (transfer: TransferRequest) => {
    return user?.organizationId === transfer.fromOrganizationId._id
  }

  const canApprove = (transfer: TransferRequest) => {
    return isOrgAdmin() && isIncomingRequest(transfer) && transfer.status === 'PENDING'
  }

  const canCancel = (transfer: TransferRequest) => {
    return transfer.requestedBy._id === user?._id && transfer.status === 'PENDING'
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
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            <Tag color={getConditionColor(material.condition)} style={{ fontSize: 10 }}>
              {material.condition.replace(/_/g, ' ')}
            </Tag>
          </div>
        </div>
      )
    },
    {
      title: 'From Organization',
      dataIndex: 'fromOrganizationId',
      key: 'from',
      width: 150,
      render: (org: any) => (
        <Tooltip title={org.name}>
          <Text ellipsis style={{ maxWidth: 140, display: 'block' }}>
            {org.name}
          </Text>
        </Tooltip>
      )
    },
    {
      title: 'To Organization',
      dataIndex: 'toOrganizationId',
      key: 'to',
      width: 150,
      render: (org: any) => (
        <Tooltip title={org.name}>
          <Text ellipsis style={{ maxWidth: 140, display: 'block' }}>
            {org.name}
          </Text>
        </Tooltip>
      )
    },
    {
      title: 'Quantity',
      dataIndex: 'requestedQuantity',
      key: 'quantity',
      width: 100,
      render: (qty: number, record: TransferRequest) => (
        <Text strong>{qty} {record.materialId.unit}</Text>
      )
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      width: 200,
      render: (purpose: string) => (
        <Tooltip title={purpose}>
          <Text ellipsis style={{ maxWidth: 190, display: 'block' }}>
            {purpose}
          </Text>
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
      title: 'Requested By',
      dataIndex: 'requestedBy',
      key: 'requestedBy',
      width: 120,
      render: (user: any) => user.name
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      width: 110,
      render: (date: string) => dayjs(date).format('DD MMM YYYY')
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right' as const,
      render: (record: TransferRequest) => {
        const menuItems: any[] = [
          {
            key: 'view',
            label: 'View Details',
            icon: <EyeOutlined />,
            onClick: () => {
              Modal.info({
                title: 'Procurement Request Details',
                width: 600,
                content: (
                  <div style={{ marginTop: 16 }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div><Text strong>Material:</Text> {record.materialId.name}</div>
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
                    </Space>
                  </div>
                )
              })
            }
          }
        ]

        if (canApprove(record)) {
          menuItems.push(
            {
              key: 'approve',
              label: 'Approve',
              icon: <CheckOutlined />,
              onClick: () => openActionModal(record, 'approve')
            },
            {
              key: 'reject',
              label: 'Reject',
              icon: <CloseOutlined />,
              danger: true,
              onClick: () => openActionModal(record, 'reject')
            }
          )
        }

        if (canCancel(record)) {
          menuItems.push({
            key: 'cancel',
            label: 'Cancel',
            icon: <StopOutlined />,
            danger: true,
            onClick: () => openActionModal(record, 'cancel')
          })
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
          Procurement Requests
        </Title>
        <Button type="link" onClick={() => window.location.href = '/surplus'}>
          Browse Surplus →
        </Button>
      </div>

      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8}>
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
          <Col xs={24} sm={12} md={5}>
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
              onClick={fetchTransfers}
              loading={loading}
              block
            >
              Refresh
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={transfers}
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
        {selectedTransfer && (
          <div>
            <div style={{ marginBottom: 20, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <Text strong>Material: </Text>
              <Text>{selectedTransfer.materialId.name}</Text>
              <br />
              <Text strong>From: </Text>
              <Text>{selectedTransfer.fromOrganizationId.name}</Text>
              <br />
              <Text strong>To: </Text>
              <Text>{selectedTransfer.toOrganizationId.name}</Text>
              <br />
              <Text strong>Quantity: </Text>
              <Text>{selectedTransfer.requestedQuantity} {selectedTransfer.materialId.unit}</Text>
              <br />
              <Text strong>Purpose: </Text>
              <Text>{selectedTransfer.purpose}</Text>
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
