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
  Modal
} from 'antd'
import { 
  EditOutlined, 
  DeleteOutlined, 
  ArrowLeftOutlined,
  ShareAltOutlined,
  FileOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { getCurrentUser as getUser, isOrgAdmin } from '../lib/auth'
import dayjs from 'dayjs'

const { Title, Text } = Typography

interface Material {
  _id: string
  name: string
  categoryId: { _id: string; name: string }
  quantity: number
  unit: string
  organizationId: { _id: string; name: string; category: string }
  status: string
  condition: string
  isSurplus: boolean
  availableFrom: string
  availableUntil: string
  estimatedCost?: number
  location?: string
  notes?: string
  attachments: any[]
  allocationHistory: any[]
  createdBy: { _id: string; name: string }
  updatedBy?: { _id: string; name: string }
  createdAt: string
  updatedAt: string
}

export default function MaterialDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getUser()
  const [material, setMaterial] = useState<Material | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchMaterial()
    }
  }, [id])

  const fetchMaterial = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/materials/${id}`)
      setMaterial(response.data.data)
    } catch (error) {
      message.error('Failed to fetch material details')
      navigate('/materials')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsSurplus = async () => {
    if (!material) return
    
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
          await api.patch(`/materials/${id}/mark-surplus`)
          message.success('Material marked as surplus successfully')
          fetchMaterial()
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to mark as surplus')
        }
      }
    })
  }

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Material',
      content: `Are you sure you want to delete "${material?.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/materials/${id}`)
          message.success('Material deleted successfully')
          navigate('/materials')
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

  const canEditMaterial = () => {
    if (!material || !user) return false
    return user._id === material.createdBy._id || isOrgAdmin()
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!material) {
    return <div>Material not found</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/materials')}
          style={{ marginRight: 16 }}
        >
          Back to Inventory
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          {material.name}
          {material.isSurplus && (
            <Tag color="blue" style={{ marginLeft: 12, fontSize: 12 }}>
              SURPLUS
            </Tag>
          )}
        </Title>
        <div style={{ marginLeft: 'auto' }}>
          <Space>
            {canEditMaterial() && (
              <>
                {!material.isSurplus && material.status === 'AVAILABLE' && material.quantity > 0 && (
                  <Button 
                    icon={<ShareAltOutlined />}
                    onClick={handleMarkAsSurplus}
                  >
                    Mark as Surplus
                  </Button>
                )}
                <Button 
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/materials/${id}/edit`)}
                >
                  Edit
                </Button>
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </>
            )}
          </Space>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="Material Details">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Name" span={2}>
                <Text strong style={{ fontSize: 15 }}>{material.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                {material.categoryId.name}
              </Descriptions.Item>
              <Descriptions.Item label="Organization">
                <div>
                  <div>{material.organizationId.name}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {material.organizationId.category.replace(/_/g, ' ')}
                  </Text>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Quantity">
                <Text strong style={{ fontSize: 15 }}>
                  {material.quantity} {material.unit}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {material.location || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(material.status)}>
                  {material.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Condition">
                <Tag color={getConditionColor(material.condition)}>
                  {material.condition.replace(/_/g, ' ')}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Available From">
                {dayjs(material.availableFrom).format('DD MMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Available Until">
                {material.availableUntil 
                  ? dayjs(material.availableUntil).format('DD MMM YYYY') 
                  : 'Not specified'}
              </Descriptions.Item>
              <Descriptions.Item label="Estimated Cost">
                {typeof material.estimatedCost === 'number'
                  ? (
                    <>
                      ₹{(material.estimatedCost * material.quantity).toLocaleString()}
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        (₹{material.estimatedCost} per {material.unit}, using available qty)
                      </Text>
                    </>
                  )
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Surplus Status">
                {material.isSurplus ? (
                  <Tag color="blue">Listed as Surplus</Tag>
                ) : (
                  <Tag>Internal Inventory</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Created By">
                {material.createdBy.name}
              </Descriptions.Item>
              <Descriptions.Item label="Created At">
                {dayjs(material.createdAt).format('DD MMM YYYY, HH:mm')}
              </Descriptions.Item>
              {material.updatedBy && (
                <>
                  <Descriptions.Item label="Last Updated By">
                    {material.updatedBy.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Updated At">
                    {dayjs(material.updatedAt).format('DD MMM YYYY, HH:mm')}
                  </Descriptions.Item>
                </>
              )}
              {material.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {material.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Allocation History" size="small">
            {material.allocationHistory && material.allocationHistory.length > 0 ? (
              <Timeline>
                {material.allocationHistory.map((allocation: any, index: number) => (
                  <Timeline.Item key={index}>
                    <div>
                      <Text strong>{allocation.quantityAllocated} {material.unit}</Text>
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

          {material.attachments && material.attachments.length > 0 && (
            <Card title="Attachments" size="small" style={{ marginTop: 24 }}>
              {material.attachments.map((attachment: any, index: number) => (
                <div key={index} style={{ marginBottom: 8 }}>
                  <Button 
                    type="link" 
                    icon={<FileOutlined />}
                    onClick={() => window.open(`/api/files/${attachment._id}`, '_blank')}
                    style={{ padding: 0 }}
                  >
                    {attachment.originalName || `Attachment ${index + 1}`}
                  </Button>
                </div>
              ))}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  )
}
