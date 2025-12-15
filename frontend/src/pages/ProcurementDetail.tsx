import { useState, useEffect } from 'react'
import { 
  Card, 
  Typography, 
  Tag, 
  Button, 
  Space, 
  Row, 
  Col, 
  Descriptions,
  message,
  Modal,
  Form,
  Input,
  Image
} from 'antd'
import { 
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  StopOutlined,
  EyeOutlined,
  FileOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { getCurrentUser, isOrgAdmin } from '../lib/auth'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

interface Attachment {
  _id: string
  path?: string
  originalName?: string
  size?: number
}

interface ProcurementRequest {
  _id: string
  materialId: { 
    _id: string
    name: string 
    quantity: number 
    unit: string 
    condition: string 
    categoryId?: { name: string }
    estimatedCost?: number
    attachments?: Attachment[]
  }
  fromOrganizationId: { _id: string; name: string; category: string }
  toOrganizationId: { _id: string; name: string; category: string }
  requestedQuantity: number
  purpose: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  requestedBy: { _id: string; name: string }
  approvedBy?: { _id: string; name: string }
  rejectedBy?: { _id: string; name: string }
  comments?: Array<{
    comment: string
    createdAt: string
    createdBy: { _id: string; name: string }
    type: 'REQUEST' | 'APPROVAL' | 'REJECTION' | 'COMPLETION' | 'CANCELLATION'
    _id: string
  }>
  approvedAt?: string
  rejectedAt?: string
  createdAt: string
  updatedAt: string
}

export default function ProcurementDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [request, setRequest] = useState<ProcurementRequest | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionModalVisible, setActionModalVisible] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'cancel'>('approve')
  const [actionForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) {
      fetchRequest()
    }
  }, [id])

  const fetchRequest = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/transfers/${id}`)
      setRequest(response.data.data)
    } catch (error) {
      message.error('Failed to fetch procurement request details')
      navigate('/procurement')
    } finally {
      setLoading(false)
    }
  }

  const openActionModal = (action: 'approve' | 'reject' | 'cancel') => {
    setActionType(action)
    actionForm.resetFields()
    setActionModalVisible(true)
  }

  const handleActionSubmit = async (values: any) => {
    if (!request) return

    setSubmitting(true)
    try {
      let endpoint = ''
      let successMessage = ''

      if (actionType === 'approve') {
        endpoint = `/transfers/${request._id}/approve`
        successMessage = 'Procurement request approved successfully'
      } else if (actionType === 'reject') {
        endpoint = `/transfers/${request._id}/reject`
        successMessage = 'Procurement request rejected'
      } else if (actionType === 'cancel') {
        endpoint = `/transfers/${request._id}/cancel`
        successMessage = 'Procurement request cancelled'
      }

      await api.patch(endpoint, { comments: values.comments })
      message.success(successMessage)
      setActionModalVisible(false)
      actionForm.resetFields()
      fetchRequest()
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

  const isIncomingRequest = () => {
    if (!request) return false
    if (!user) return false
    if (!user.organizationId) return false
    return user.organizationId === request.fromOrganizationId._id
  }

  const canApprove = () => {
    if (!request) return false
    if (!user) return false
    if (!user.organizationId) return false
    return isOrgAdmin() && isIncomingRequest() && request.status === 'PENDING'
  }

  const canCancel = () => {
    if (!request) return false
    if (!user) return false
    if (!user._id) return false
    return request.requestedBy._id === user._id && request.status === 'PENDING'
  }

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  }

  if (!request) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Request not found</div>
  }

  if (!user) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Loading user information...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/procurement')}
          style={{ marginRight: 16 }}
        >
          Back to Procurement
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          Procurement Request Details
        </Title>
        <div style={{ marginLeft: 'auto' }}>
          <Space>
            {canApprove() && (
              <>
                <Button 
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => openActionModal('approve')}
                >
                  Approve
                </Button>
                <Button 
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => openActionModal('reject')}
                >
                  Reject
                </Button>
              </>
            )}
            {canCancel() && (
              <Button 
                danger
                icon={<StopOutlined />}
                onClick={() => openActionModal('cancel')}
              >
                Cancel Request
              </Button>
            )}
          </Space>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="Request Information">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Status" span={2}>
                <Tag color={getStatusColor(request.status)} style={{ fontSize: 13 }}>
                  {request.status}
                </Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="Material Name" span={2}>
                <Text strong style={{ fontSize: 15 }}>{request.materialId.name}</Text>
              </Descriptions.Item>

              {request.materialId.categoryId && (
                <Descriptions.Item label="Category">
                  {request.materialId.categoryId.name}
                </Descriptions.Item>
              )}

              <Descriptions.Item label="Condition">
                <Tag color={getConditionColor(request.materialId.condition)}>
                  {request.materialId.condition.replace(/_/g, ' ')}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Requested Quantity">
                <Text strong style={{ fontSize: 14 }}>
                  {request.requestedQuantity} {request.materialId.unit}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Available Quantity">
                <Text style={{ fontSize: 14 }}>
                  {request.materialId.quantity} {request.materialId.unit}
                </Text>
              </Descriptions.Item>

              {typeof request.materialId.estimatedCost === 'number' ? (
                <Descriptions.Item label="Estimated Value" span={2}>
                  ₹{(request.materialId.estimatedCost * request.materialId.quantity).toLocaleString()}
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    (₹{request.materialId.estimatedCost} per {request.materialId.unit}, using available qty)
                  </Text>
                </Descriptions.Item>
              ) : null}

              <Descriptions.Item label="Purpose" span={2}>
                {request.purpose}
              </Descriptions.Item>

              {request.comments && request.comments.length > 0 && (
                <Descriptions.Item label="Comments" span={2}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {request.comments.map((comment) => (
                      <div key={comment._id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <Text>{comment.comment}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {comment.createdBy?.name || 'Unknown'} • {dayjs(comment.createdAt).format('DD MMM YYYY, HH:mm')} • {comment.type}
                        </Text>
                      </div>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title="Timeline" style={{ marginTop: 16 }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Requested By">
                <Space direction="vertical" size={0}>
                  <Text strong>{request.requestedBy.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(request.createdAt).format('DD MMM YYYY, HH:mm')}
                  </Text>
                </Space>
              </Descriptions.Item>

              {request.approvedBy && request.approvedAt && (
                <Descriptions.Item label="Approved By">
                  <Space direction="vertical" size={0}>
                    <Text strong>{request.approvedBy.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(request.approvedAt).format('DD MMM YYYY, HH:mm')}
                    </Text>
                  </Space>
                </Descriptions.Item>
              )}

              {request.rejectedBy && request.rejectedAt && (
                <Descriptions.Item label="Rejected By">
                  <Space direction="vertical" size={0}>
                    <Text strong>{request.rejectedBy.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(request.rejectedAt).format('DD MMM YYYY, HH:mm')}
                    </Text>
                  </Space>
                </Descriptions.Item>
              )}

              {request.updatedAt && request.updatedAt !== request.createdAt && (
                <Descriptions.Item label="Last Updated">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(request.updatedAt).format('DD MMM YYYY, HH:mm')}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Organizations" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  From (Supplier)
                </Text>
                <Text strong style={{ fontSize: 14, display: 'block' }}>
                  {request.fromOrganizationId.name}
                </Text>
                <Tag style={{ marginTop: 4, fontSize: 11 }}>
                  {request.fromOrganizationId.category.replace(/_/g, ' ')}
                </Tag>
              </div>

              <div style={{ textAlign: 'center', color: '#999' }}>
                ↓
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  To (Requester)
                </Text>
                <Text strong style={{ fontSize: 14, display: 'block' }}>
                  {request.toOrganizationId.name}
                </Text>
                <Tag style={{ marginTop: 4, fontSize: 11 }}>
                  {request.toOrganizationId.category.replace(/_/g, ' ')}
                </Tag>
              </div>
            </Space>
          </Card>

          {request.materialId.attachments && request.materialId.attachments.length > 0 && (
            <Card
              title={`Attachments (${request.materialId.attachments.length})`}
              size="small"
              style={{ marginTop: 16 }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {request.materialId.attachments.map((attachment) => (
                  <Card key={attachment._id} size="small" style={{ background: '#fafafa' }}>
                    {attachment.path ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Image
                          src={attachment.path}
                          alt={attachment.originalName || 'Attachment'}
                          style={{
                            width: 120,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '1px solid #d9d9d9'
                          }}
                          preview={{
                            mask: <EyeOutlined />,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div>
                            <Text strong>{attachment.originalName || 'Attachment'}</Text>
                          </div>
                          {typeof attachment.size === 'number' && (
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {(attachment.size / 1024).toFixed(2)} KB
                              </Text>
                            </div>
                          )}
                          <div style={{ marginTop: 4 }}>
                            <Button
                              type="link"
                              size="small"
                              icon={<FileOutlined />}
                              onClick={() => window.open(attachment.path!, '_blank')}
                              style={{ padding: 0, height: 'auto' }}
                            >
                              Open in new tab
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="link"
                        size="small"
                        icon={<FileOutlined />}
                        onClick={() => window.open(`/api/files/${attachment._id}`, '_blank')}
                        style={{ padding: 0, height: 'auto' }}
                      >
                        {attachment.originalName || 'Attachment'}
                      </Button>
                    )}
                  </Card>
                ))}
              </Space>
            </Card>
          )}

          <Card 
            title="Request Type" 
            size="small" 
            style={{ marginTop: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>
                  {isIncomingRequest() ? 'Incoming Request' : 'Outgoing Request'}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {isIncomingRequest() 
                    ? 'Another organization is requesting your surplus material'
                    : 'You have requested material from another organization'}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        title={
          actionType === 'approve' 
            ? 'Approve Procurement Request' 
            : actionType === 'reject'
            ? 'Reject Procurement Request'
            : 'Cancel Procurement Request'
        }
        open={actionModalVisible}
        onCancel={() => setActionModalVisible(false)}
        footer={null}
      >
        <Form
          form={actionForm}
          layout="vertical"
          onFinish={handleActionSubmit}
        >
          <Form.Item
            name="comments"
            label="Comments"
            rules={[
              { 
                required: actionType !== 'approve', 
                message: 'Please provide a reason' 
              }
            ]}
          >
            <TextArea 
              rows={4} 
              placeholder={
                actionType === 'approve'
                  ? 'Optional comments...'
                  : 'Please provide a reason...'
              }
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting}
                danger={actionType !== 'approve'}
              >
                {actionType === 'approve' 
                  ? 'Approve' 
                  : actionType === 'reject'
                  ? 'Reject'
                  : 'Cancel'}
              </Button>
              <Button onClick={() => setActionModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
