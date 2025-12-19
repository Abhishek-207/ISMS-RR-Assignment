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
  Timeline,
  message,
  Modal,
  Switch,
  Image
} from 'antd'
import { 
  EditOutlined, 
  DeleteOutlined, 
  ArrowLeftOutlined,
  FileOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { getCurrentUser as getUser, isOrgAdmin } from '../../lib/auth'
import dayjs from 'dayjs'

const { Title, Text } = Typography

interface InventoryItem {
  _id: string
  name: string
  categoryId?: { _id: string; name: string } | string
  quantity: number
  unit: string
  organizationId?: { _id: string; name: string; category: string }
  status?: string
  condition?: string
  isSurplus: boolean
  availableFrom: string
  availableUntil: string
  estimatedCost?: number
  location?: string
  notes?: string
  attachments: any[]
  allocationHistory: any[]
  createdBy?: { _id: string; name: string }
  updatedBy?: { _id: string; name: string }
  createdAt: string
  updatedAt: string
}

export default function InventoryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getUser()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchItem()
    }
  }, [id])

  const fetchItem = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/materials/${id}`)
      setItem(response.data.data)
    } catch (error) {
      message.error('Failed to fetch item details')
      navigate('/inventory')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSurplus = async () => {
    if (!item) return
    
    if (!item.isSurplus && item.quantity <= 0) {
      message.warning('Cannot mark as surplus. Quantity must be greater than zero.')
      return
    }

    const action = item.isSurplus ? 'unmark' : 'mark'
    const title = item.isSurplus ? 'Remove from Surplus' : 'Mark as Surplus'
    const content = item.isSurplus 
      ? `Are you sure you want to remove "${item.name}" from surplus? It will no longer be visible to other organizations.`
      : `Are you sure you want to mark "${item.name}" as surplus? This will make it visible to other organizations in your category.`

    Modal.confirm({
      title,
      content,
      okText: item.isSurplus ? 'Remove from Surplus' : 'Mark as Surplus',
      onOk: async () => {
        setToggleLoading(true)
        try {
          const endpoint = item.isSurplus 
            ? `/materials/${id}/unmark-surplus` 
            : `/materials/${id}/mark-surplus`
          await api.patch(endpoint)
          message.success(`Item ${action}ed as surplus successfully`)
          fetchItem()
        } catch (error: any) {
          message.error(error.response?.data?.message || `Failed to ${action} as surplus`)
        } finally {
          setToggleLoading(false)
        }
      }
    })
  }

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Item',
      content: `Are you sure you want to delete "${item?.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/materials/${id}`)
          message.success('Item deleted successfully')
          navigate('/inventory')
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to delete item')
        }
      }
    })
  }

  const getStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      'AVAILABLE': 'green',
      'RESERVED': 'orange',
      'TRANSFERRED': 'purple',
      'ARCHIVED': 'default'
    }
    return status ? (colors[status] || 'default') : 'default'
  }

  const getConditionColor = (condition?: string) => {
    const colors: Record<string, string> = {
      'NEW': 'green',
      'GOOD': 'blue',
      'SLIGHTLY_DAMAGED': 'orange',
      'NEEDS_REPAIR': 'red',
      'SCRAP': 'red'
    }
    return condition ? (colors[condition] || 'default') : 'default'
  }

  const canEditItem = () => {
    if (!item) return false
    if (!user) return false
    if (!user._id) return false
    if (!item.createdBy?._id) return false
    return user._id === item.createdBy._id || isOrgAdmin()
  }

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  }

  if (!item) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Item not found</div>
  }

  if (!user) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Loading user information...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/inventory')}
          style={{ marginRight: 8 }}
        >
          <span className="hide-on-mobile">Back to Inventory</span>
          <span className="show-on-mobile">Back</span>
        </Button>
        <Title level={4} style={{ margin: 0, flex: 1, minWidth: 'fit-content' }}>
          {item.name}
          {item.isSurplus && (
            <Tag color="blue" style={{ marginLeft: 12, fontSize: 12 }}>
              SURPLUS
            </Tag>
          )}
        </Title>
        <div style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Space>
            {canEditItem() && (
              <>
                <Button 
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/inventory/${id}/edit`)}
                >
                  <span className="hide-on-mobile">Edit</span>
                </Button>
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                >
                  <span className="hide-on-mobile">Delete</span>
                </Button>
              </>
            )}
          </Space>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="Item Details">
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Name" span={2}>
                <Text strong style={{ fontSize: 15 }}>{item.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                {typeof item.categoryId === 'object' ? item.categoryId?.name : item.categoryId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Organization">
                {item.organizationId ? (
                  <div>
                    <div>{item.organizationId.name}</div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {item.organizationId.category ? item.organizationId.category.replace(/_/g, ' ') : '-'}
                    </Text>
                  </div>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Quantity">
                <Text strong style={{ fontSize: 15 }}>
                  {item.quantity} {item.unit}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {item.location || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(item.status)}>
                  {item.status || '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Condition">
                <Tag color={getConditionColor(item.condition)}>
                  {item.condition ? item.condition.replace(/_/g, ' ') : '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Available From">
                {dayjs(item.availableFrom).format('DD MMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Available Until">
                {item.availableUntil 
                  ? dayjs(item.availableUntil).format('DD MMM YYYY') 
                  : 'Not specified'}
              </Descriptions.Item>
              <Descriptions.Item label="Estimated Cost">
                {typeof item.estimatedCost === 'number'
                  ? (
                    <>
                      ₹{(item.estimatedCost * item.quantity).toLocaleString()}
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        (₹{item.estimatedCost} per {item.unit}, using available qty)
                      </Text>
                    </>
                  )
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Created By">
                {item.createdBy?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Created At">
                {dayjs(item.createdAt).format('DD MMM YYYY, HH:mm')}
              </Descriptions.Item>
              {item.updatedBy && (
                <>
                  <Descriptions.Item label="Last Updated By">
                    {item.updatedBy?.name || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Updated At">
                    {dayjs(item.updatedAt).format('DD MMM YYYY, HH:mm')}
                  </Descriptions.Item>
                </>
              )}
              {item.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {item.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {isOrgAdmin() && canEditItem() && (
            <Card 
              title="Surplus Management" 
              size="small" 
              style={{ marginTop: 16 }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>Surplus Status</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.isSurplus 
                        ? 'This item is visible to other organizations in your category'
                        : 'This item is private to your organization'}
                    </Text>
                  </div>
                  <Switch 
                    checked={item.isSurplus}
                    onChange={handleToggleSurplus}
                    loading={toggleLoading}
                    checkedChildren="Surplus"
                    unCheckedChildren="Private"
                  />
                </div>
              </Space>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Allocation History" size="small">
            {item.allocationHistory && item.allocationHistory.length > 0 ? (
              <Timeline>
                {item.allocationHistory.map((allocation: any, index: number) => (
                  <Timeline.Item key={index}>
                    <div>
                      <Text strong>{allocation.quantityAllocated} {item.unit}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Allocated by {allocation.allocatedBy?.name || 'Unknown'}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(allocation.allocatedAt).format('DD MMM YYYY, HH:mm')}
                      </Text>
                      {allocation.notes && (
                        <>
                          <br />
                          <Text style={{ fontSize: 12 }}>{allocation.notes}</Text>
                        </>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Text type="secondary">No allocation history available</Text>
            )}
          </Card>

          {item.attachments && item.attachments.length > 0 && (
            <Card title="Attachments" size="small" style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {item.attachments.map((attachment: any, index: number) => (
                  <div key={index} style={{ marginBottom: 8 }}>
                    {attachment.path ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Image
                          src={attachment.path}
                          alt={attachment.originalName || `Attachment ${index + 1}`}
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
                        <div>
                          <div>
                            <Text strong>{attachment.originalName || `Attachment ${index + 1}`}</Text>
                          </div>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : 'Unknown size'}
                            </Text>
                          </div>
                          <div>
                            <Button 
                              type="link" 
                              size="small"
                              icon={<FileOutlined />}
                              onClick={() => window.open(attachment.path, '_blank')}
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
                        icon={<FileOutlined />}
                        onClick={() => window.open(`/api/files/${attachment._id}`, '_blank')}
                        style={{ padding: 0 }}
                      >
                        {attachment.originalName || `Attachment ${index + 1}`}
                      </Button>
                    )}
                  </div>
                ))}
              </Space>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  )
}
