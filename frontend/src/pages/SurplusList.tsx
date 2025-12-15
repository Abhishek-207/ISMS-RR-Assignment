import { useState, useEffect } from 'react'
import { 
  Table, 
  Card, 
  Button, 
  Input, 
  InputNumber,
  Select, 
  Tag, 
  Typography, 
  Row, 
  Col,
  Modal,
  message,
  Form,
  Descriptions,
  Image,
  Space,
  Divider,
  Dropdown
} from 'antd'
import { 
  SearchOutlined, 
  ShoppingOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileOutlined,
  MoreOutlined
} from '@ant-design/icons'
import { api } from '../lib/api'
import { getOrganizationCategory } from '../lib/auth'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface Material {
  _id: string
  name: string
  categoryId: { _id: string; name: string }
  quantity: number
  unit: string
  organizationId: { _id: string; name: string; category: string }
  condition: string
  availableFrom: string
  availableUntil: string
  estimatedCost?: number
  location?: string
  notes?: string
  attachments?: any[]
  createdBy?: { _id: string; name: string }
  createdAt?: string
  updatedAt?: string
}

export default function SurplusList() {
  const orgCategory = getOrganizationCategory()
  
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    condition: '',
    dateRange: null as any
  })

  const [categories, setCategories] = useState<any[]>([])
  const [requestModalVisible, setRequestModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [requestForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const fetchSurplusMaterials = async () => {
    setLoading(true)
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize
      }

      if (filters.search) params.q = filters.search
      if (filters.categoryId) params.categoryId = filters.categoryId
      if (filters.condition) params.condition = filters.condition
      if (filters.dateRange) {
        params.fromDate = filters.dateRange[0].format('YYYY-MM-DD')
        params.toDate = filters.dateRange[1].format('YYYY-MM-DD')
      }

      const response = await api.get('/materials/surplus', { params })
      setMaterials(response.data.data)
      setPagination(prev => ({ ...prev, total: response.data.meta.total }))
    } catch (error) {
      message.error('Failed to fetch surplus materials')
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
    fetchSurplusMaterials()
  }, [pagination.current, pagination.pageSize, filters])

  const handleTableChange = (pagination: any) => {
    setPagination(pagination)
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const openDetailModal = (material: Material) => {
    setSelectedMaterial(material)
    setDetailModalVisible(true)
  }

  const openRequestModal = (material: Material) => {
    setSelectedMaterial(material)
    requestForm.setFieldsValue({
      materialId: material._id,
      requestedQuantity: material.quantity,
      purpose: ''
    })
    setRequestModalVisible(true)
  }

  const handleRequestSubmit = async (values: any) => {
    if (!selectedMaterial) return

    setSubmitting(true)
    try {
      await api.post('/transfers', {
        materialId: selectedMaterial._id,
        quantityRequested: parseFloat(values.requestedQuantity),
        purpose: values.purpose,
        comment: values.comment
      })

      message.success('Procurement request submitted successfully!')
      setRequestModalVisible(false)
      requestForm.resetFields()
      setSelectedMaterial(null)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to submit procurement request')
    } finally {
      setSubmitting(false)
    }
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

  const handleExportReport = async () => {
    setExportLoading(true)
    try {
      const params = new URLSearchParams()
      
      params.append('isSurplus', 'true')
      if (filters.search) params.append('q', filters.search)
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.condition) params.append('condition', filters.condition)
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
      link.setAttribute('download', `surplus-materials-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.csv`)
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
      condition: '',
      dateRange: null
    })
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const columns = [
    {
      title: 'Material',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Material) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{text}</div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            {record.categoryId.name}
          </div>
        </div>
      )
    },
    {
      title: 'Source Organization',
      key: 'organization',
      width: 180,
      render: (record: Material) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>
            {record.organizationId.name}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            {record.organizationId.category.replace(/_/g, ' ')}
          </div>
        </div>
      )
    },
    {
      title: 'Available Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 140,
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
      title: 'Available Until',
      dataIndex: 'availableUntil',
      key: 'availableUntil',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-'
    },
    {
      title: 'Est. Cost',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 100,
      render: (cost: number) => cost ? `₹${cost.toLocaleString()}` : '-'
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (record: Material) => (
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <EyeOutlined />,
                onClick: () => openDetailModal(record)
              },
              {
                key: 'request',
                label: 'Request',
                icon: <ShoppingOutlined />,
                onClick: () => openRequestModal(record)
              }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
            Available Surplus ({orgCategory?.replace(/_/g, ' ')})
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Discover surplus materials from other organizations in your category. Submit procurement requests to acquire materials.
          </Paragraph>
        </div>
        <Space>
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
        </Space>
      </div>

      <Card>
        <div style={{ 
          background: '#e6f7ff', 
          border: '1px solid #91d5ff', 
          borderRadius: 4, 
          padding: 12, 
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start'
        }}>
          <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8, marginTop: 2 }} />
          <div>
            <Text style={{ fontSize: 13 }}>
              You can only view and request surplus materials from organizations in the same category as yours.
              All requests require approval from the source organization.
            </Text>
          </div>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={7}>
            <Input
              placeholder="Search surplus materials..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
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
          <Col xs={24} sm={12} md={4}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchSurplusMaterials}
              loading={loading}
              block
            >
              Refresh
            </Button>
          </Col>
        </Row>

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
                `${range[0]}-${range[1]} of ${total} surplus items`,
              size: 'small'
            }}
            onChange={handleTableChange}
            scroll={{ x: 1100 }}
          />
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <span>Material Details</span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedMaterial(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false)
            setSelectedMaterial(null)
          }}>
            Close
          </Button>,
          <Button 
            key="request" 
            type="primary" 
            icon={<ShoppingOutlined />}
            onClick={() => {
              setDetailModalVisible(false)
              openRequestModal(selectedMaterial!)
            }}
          >
            Request Material
          </Button>
        ]}
        width={800}
      >
        {selectedMaterial && (
          <div>
            {/* Basic Information */}
            <Descriptions 
              bordered 
              size="small" 
              column={2}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="Material Name" span={2}>
                <Text strong style={{ fontSize: 15 }}>{selectedMaterial.name}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Category">
                {selectedMaterial.categoryId.name}
              </Descriptions.Item>
              
              <Descriptions.Item label="Condition">
                <Tag color={getConditionColor(selectedMaterial.condition)}>
                  {selectedMaterial.condition.replace(/_/g, ' ')}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Available Quantity" span={2}>
                <Text strong style={{ fontSize: 15 }}>
                  {selectedMaterial.quantity} {selectedMaterial.unit}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Estimated Cost">
                {typeof selectedMaterial.estimatedCost === 'number'
                  ? (
                    <>
                      ₹{(selectedMaterial.estimatedCost * selectedMaterial.quantity).toLocaleString()}
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        (₹{selectedMaterial.estimatedCost} per {selectedMaterial.unit}, using available qty)
                      </Text>
                    </>
                  )
                  : 'Not specified'}
              </Descriptions.Item>

              <Descriptions.Item label="Location">
                {selectedMaterial.location || 'Not specified'}
              </Descriptions.Item>

              <Descriptions.Item label="Available From">
                {selectedMaterial.availableFrom 
                  ? dayjs(selectedMaterial.availableFrom).format('DD MMM YYYY') 
                  : '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Available Until">
                {selectedMaterial.availableUntil 
                  ? dayjs(selectedMaterial.availableUntil).format('DD MMM YYYY') 
                  : 'Not specified'}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ marginTop: 16, marginBottom: 16 }}>
              Source Organization
            </Divider>
            
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Organization Name" span={2}>
                <Text strong>{selectedMaterial.organizationId.name}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Category" span={2}>
                {selectedMaterial.organizationId.category.replace(/_/g, ' ')}
              </Descriptions.Item>
            </Descriptions>

            {selectedMaterial.notes && (
              <>
                <Divider orientation="left" style={{ marginTop: 16, marginBottom: 16 }}>
                  Additional Notes
                </Divider>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Text>{selectedMaterial.notes}</Text>
                </Card>
              </>
            )}

            {selectedMaterial.attachments && selectedMaterial.attachments.length > 0 && (
              <>
                <Divider orientation="left" style={{ marginTop: 16, marginBottom: 16 }}>
                  Attachments ({selectedMaterial.attachments.length})
                </Divider>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedMaterial.attachments.map((attachment: any, index: number) => (
                    <Card key={index} size="small" style={{ background: '#fafafa' }}>
                      {attachment.path ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Image
                            src={attachment.path}
                            alt={attachment.originalName || `Attachment ${index + 1}`}
                            style={{ 
                              width: 100, 
                              height: 100, 
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
                              <Text strong>{attachment.originalName || `Attachment ${index + 1}`}</Text>
                            </div>
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : 'Unknown size'}
                              </Text>
                            </div>
                            <div style={{ marginTop: 4 }}>
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
                    </Card>
                  ))}
                </Space>
              </>
            )}

            {selectedMaterial.createdBy && (
              <>
                <Divider orientation="left" style={{ marginTop: 16, marginBottom: 16 }}>
                  Record Information
                </Divider>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Created By">
                    {selectedMaterial.createdBy.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Created At">
                    {selectedMaterial.createdAt 
                      ? dayjs(selectedMaterial.createdAt).format('DD MMM YYYY, HH:mm')
                      : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="Submit Procurement Request"
        open={requestModalVisible}
        onCancel={() => {
          setRequestModalVisible(false)
          requestForm.resetFields()
          setSelectedMaterial(null)
        }}
        footer={null}
        width={600}
      >
        {selectedMaterial && (
          <div>
            <div style={{ marginBottom: 20, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <Text strong>Material: </Text>
              <Text>{selectedMaterial.name}</Text>
              <br />
              <Text strong>Source: </Text>
              <Text>{selectedMaterial.organizationId.name}</Text>
              <br />
              <Text strong>Available: </Text>
              <Text>{selectedMaterial.quantity} {selectedMaterial.unit}</Text>
              <br />
              <Text strong>Condition: </Text>
              <Tag color={getConditionColor(selectedMaterial.condition)} style={{ marginTop: 4 }}>
                {selectedMaterial.condition.replace(/_/g, ' ')}
              </Tag>
            </div>

            <Form
              form={requestForm}
              layout="vertical"
              onFinish={handleRequestSubmit}
            >
              <Form.Item
                name="requestedQuantity"
                label="Requested Quantity"
                rules={[
                  { required: true, message: 'Please enter quantity!' },
                  { 
                    type: 'number', 
                    min: 1, 
                    max: selectedMaterial.quantity, 
                    message: `Must be between 1 and ${selectedMaterial.quantity}` 
                  }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={selectedMaterial.quantity}
                  addonAfter={selectedMaterial.unit}
                  placeholder={`Max: ${selectedMaterial.quantity}`}
                />
              </Form.Item>

              <Form.Item
                name="purpose"
                label="Purpose / Justification"
                rules={[
                  { required: true, message: 'Please describe the purpose!' },
                  { min: 10, message: 'Purpose must be at least 10 characters!' }
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="Describe why you need this material and how it will be used..."
                  showCount
                  maxLength={500}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button onClick={() => {
                    setRequestModalVisible(false)
                    requestForm.resetFields()
                    setSelectedMaterial(null)
                  }}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit" loading={submitting}>
                    Submit Request
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  )
}
