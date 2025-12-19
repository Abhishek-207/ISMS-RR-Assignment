import { useState, useEffect } from 'react'
import { 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  DatePicker, 
  Button, 
  Card, 
  Typography, 
  Row, 
  Col,
  message,
  Upload,
  Switch,
  Space,
  Image,
  Tooltip
} from 'antd'
import { 
  UploadOutlined, 
  SaveOutlined,
  DeleteOutlined,
  EyeOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { fetchMaterialCategories, fetchMaterialStatuses, MaterialStatus } from '../../lib/masters'
import { getCurrentUser as getUser, isOrgAdmin } from '../../lib/auth'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

interface UploadedImage {
  id: string
  url: string
  thumbnail: string
  originalName: string
  publicId: string
}

export default function InventoryEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getUser()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isSurplus, setIsSurplus] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [statuses, setStatuses] = useState<MaterialStatus[]>([])
  const [loadingStatuses, setLoadingStatuses] = useState(false)

  useEffect(() => {
    loadCategories()
    loadStatuses()
    if (id) {
      fetchItem()
    }
  }, [id])

  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const categoriesData = await fetchMaterialCategories()
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
    } catch (error) {
      message.error('Failed to load categories')
      setCategories([])
    } finally {
      setLoadingCategories(false)
    }
  }

  const loadStatuses = async () => {
    setLoadingStatuses(true)
    try {
      const statusesData = await fetchMaterialStatuses()
      setStatuses(Array.isArray(statusesData) ? statusesData : [])
    } catch (error) {
      message.error('Failed to load statuses')
      setStatuses([])
    } finally {
      setLoadingStatuses(false)
    }
  }

  const fetchItem = async () => {
    setFetchLoading(true)
    try {
      const response = await api.get(`/materials/${id}`)
      const item = response.data.data

      // Check if user can edit this item
      if (user && user._id && item.createdBy && item.createdBy._id !== user._id && !isOrgAdmin()) {
        message.error('You do not have permission to edit this item')
        navigate('/inventory')
        return
      }

      // Set form values
      form.setFieldsValue({
        name: item.name,
        categoryId: item.categoryId?._id || item.categoryId,
        quantity: item.quantity,
        unit: item.unit,
        condition: item.condition,
        availableFrom: item.availableFrom ? dayjs(item.availableFrom) : null,
        availableUntil: item.availableUntil ? dayjs(item.availableUntil) : null,
        location: item.location,
        estimatedCost: item.estimatedCost,
        notes: item.notes,
        materialStatusId: item.materialStatusId
      })

      setIsSurplus(item.isSurplus || false)

      // Set uploaded images if available
      if (item.attachments && Array.isArray(item.attachments)) {
        const images = item.attachments.map((att: any) => ({
          id: att._id || att.id,
          url: att.url,
          thumbnail: att.thumbnail || att.url,
          originalName: att.originalName || 'Image',
          publicId: att.publicId || ''
        }))
        setUploadedImages(images)
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to fetch item details')
      navigate('/inventory')
    } finally {
      setFetchLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    // Check upload limit (max 3 images)
    if (uploadedImages.length >= 3) {
      message.error('Maximum 3 images allowed')
      return false
    }

    // Validate file type (only images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      message.error('Only image files are allowed (JPEG, PNG, GIF, WebP)')
      return false
    }

    // Validate file size (max 3MB)
    const maxSize = 3 * 1024 * 1024 // 3MB
    if (file.size > maxSize) {
      message.error('Image size must not exceed 3MB')
      return false
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const newImage: UploadedImage = {
        id: response.data.data.id,
        url: response.data.data.url,
        thumbnail: response.data.data.thumbnail,
        originalName: response.data.data.originalName,
        publicId: response.data.data.publicId
      }
      
      setUploadedImages(prev => [...prev, newImage])
      message.success('Image uploaded successfully')
      return false
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to upload image'
      message.error(errorMessage)
      return false
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    try {
      await api.delete(`/files/${imageId}`)
      setUploadedImages(prev => prev.filter(img => img.id !== imageId))
      message.success('Image deleted successfully')
    } catch (error) {
      message.error('Failed to delete image')
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      const inventoryData = {
        name: values.name,
        categoryId: values.categoryId,
        quantity: values.quantity,
        unit: values.unit,
        condition: values.condition,
        availableFrom: values.availableFrom.format('YYYY-MM-DD'),
        availableUntil: values.availableUntil ? values.availableUntil.format('YYYY-MM-DD') : null,
        location: values.location,
        estimatedCost: values.estimatedCost,
        notes: values.notes,
        materialStatusId: values.materialStatusId || undefined,
        isSurplus: isSurplus,
        attachments: uploadedImages.map(img => img.id)
      }

      await api.put(`/materials/${id}`, inventoryData)
      message.success('Inventory item updated successfully!')
      navigate(`/inventory/${id}`)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to update inventory item')
    } finally {
      setLoading(false)
    }
  }

  const onFinishFailed = (errorInfo: any) => {
    const missingFields = errorInfo.errorFields.map((field: any) => {
      const fieldName = field.name[0]
      const fieldLabels: { [key: string]: string } = {
        name: 'Item Name',
        categoryId: 'Category',
        quantity: 'Quantity',
        unit: 'Unit',
        condition: 'Condition',
        availableFrom: 'Available From date'
      }
      return fieldLabels[fieldName] || fieldName
    })
    
    if (missingFields.length > 0) {
      message.error(`Please fill: ${missingFields.join(', ')}`)
    }
  }

  if (fetchLoading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 8 }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(`/inventory/${id}`)}
          style={{ marginRight: 8 }}
        >
          <span className="hide-on-mobile">Back</span>
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          Edit Inventory Item
        </Title>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          <Row gutter={[24, 0]}>
            <Col xs={24}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
                Basic Information
              </Title>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Item Name"
                rules={[
                  { required: true, message: 'Please enter item name!' },
                  { 
                    pattern: /^[a-zA-Z\s\-,.'&()]+$/, 
                    message: 'Item name should only contain letters and special characters (,-.\' & ())' 
                  }
                ]}
              >
                <Input placeholder="e.g., Office Chairs, Laptops, Steel Pipes" size="middle" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="categoryId"
                label="Category"
                rules={[{ required: true, message: 'Please select a category!' }]}
              >
                <Select 
                  showSearch
                  placeholder="Search and select a category"
                  size="middle"
                  loading={loadingCategories}
                  filterOption={(input, option) =>
                    String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                  }
                  notFoundContent={loadingCategories ? 'Loading...' : 'No categories found'}
                >
                  {categories
                    .filter(cat => cat.isActive)
                    .map(category => (
                      <Select.Option key={category._id} value={category._id}>
                        {category.name}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24}>
              <Title level={5} style={{ marginTop: 8, marginBottom: 16 }}>
                Quantity & Status
              </Title>
            </Col>
          </Row>

          {/* Row 1: Quantity & Unit */}
          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="quantity"
                label="Quantity"
                rules={[
                  { required: true, message: 'Please enter quantity!' },
                  { 
                    type: 'number',
                    min: 0,
                    message: 'Quantity must be a positive number'
                  }
                ]}
              >
                <InputNumber 
                  placeholder="Enter quantity" 
                  style={{ width: '100%' }}
                  size="middle"
                  min={0}
                  precision={0}
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="unit"
                label="Unit"
                rules={[
                  { required: true, message: 'Please enter unit!' },
                  { 
                    pattern: /^[a-zA-Z\s]+$/, 
                    message: 'Unit should only contain letters' 
                  }
                ]}
              >
                <Input placeholder="e.g., pieces, kg, meters" size="middle" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 2: Condition & Custom Status */}
          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="condition"
                label="Condition"
                rules={[{ required: true, message: 'Please select condition!' }]}
              >
                <Select placeholder="Select condition" size="middle">
                  <Select.Option value="NEW">New</Select.Option>
                  <Select.Option value="GOOD">Good</Select.Option>
                  <Select.Option value="SLIGHTLY_DAMAGED">Slightly Damaged</Select.Option>
                  <Select.Option value="NEEDS_REPAIR">Needs Repair</Select.Option>
                  <Select.Option value="SCRAP">Scrap</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="materialStatusId"
                label="Status (Custom)"
                tooltip="Optional, admin-defined status from Configuration → Material Statuses. The system still tracks lifecycle as Available / Reserved / Transferred / Archived."
              >
                <Select
                  placeholder="Select custom status (optional)"
                  size="middle"
                  loading={loadingStatuses}
                  allowClear
                  notFoundContent={loadingStatuses ? 'Loading...' : 'No statuses found'}
                >
                  {statuses
                    .filter(status => status.isActive)
                    .map(status => (
                      <Select.Option key={status._id} value={status._id}>
                        {status.name}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24}>
              <Title level={5} style={{ marginTop: 8, marginBottom: 16 }}>
                Location & Valuation
              </Title>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="location"
                label="Storage Location (Optional)"
                rules={[
                  { 
                    pattern: /^[a-zA-Z0-9\s\-,.'&()]*$/, 
                    message: 'Location should contain letters, numbers, and special characters only' 
                  }
                ]}
              >
                <Input placeholder="e.g., Warehouse A, Shelf 12" size="middle" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="estimatedCost"
                label="Estimated Cost (Optional)"
                tooltip="Used for cost avoidance analytics"
                rules={[
                  { 
                    type: 'number',
                    min: 0,
                    message: 'Cost must be a positive number'
                  }
                ]}
              >
                <InputNumber 
                  placeholder="Enter estimated cost"
                  style={{ width: '100%' }}
                  size="middle"
                  min={0}
                  prefix="₹"
                  precision={2}
                  controls={false}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24}>
              <Title level={5} style={{ marginTop: 8, marginBottom: 16 }}>
                Availability Period
              </Title>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="availableFrom"
                label="Available From"
                rules={[{ required: true, message: 'Please select available from date!' }]}
              >
                <DatePicker style={{ width: '100%' }} size="middle" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="availableUntil"
                label="Available Until (Optional)"
              >
                <DatePicker style={{ width: '100%' }} size="middle" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24}>
              <Title level={5} style={{ marginTop: 8, marginBottom: 16 }}>
                Surplus Settings
              </Title>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24}>
              <Card 
                size="small" 
                style={{ 
                  background: isSurplus ? '#e6f7ff' : '#fafafa',
                  border: isSurplus ? '1px solid #91d5ff' : '1px solid #d9d9d9'
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space align="start">
                    <Switch 
                      checked={isSurplus} 
                      onChange={setIsSurplus}
                      style={{ marginTop: 4 }}
                    />
                    <div>
                      <Text strong style={{ fontSize: 14 }}>
                        Mark as Surplus
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {isSurplus 
                          ? 'This item will be visible to other organizations in your category for procurement'
                          : 'This item will remain private to your organization'}
                      </Text>
                    </div>
                  </Space>
                </Space>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 0]} style={{ marginTop: 16 }}>
            <Col xs={24}>
              <Form.Item
                name="notes"
                label="Notes (Optional)"
                rules={[
                  { 
                    pattern: /^[a-zA-Z0-9\s\-,.'&()\n\r]*$/, 
                    message: 'Notes should only contain letters, numbers, and basic punctuation' 
                  }
                ]}
              >
                <TextArea 
                  placeholder="Additional notes about the item..."
                  rows={3}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24}>
              <Form.Item
                label={
                  <span>
                    Image Attachments (Optional){' '}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      - Max 3 images, 3MB each
                    </Text>
                  </span>
                }
              >
                <Upload
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  accept="image/*"
                  multiple={false}
                  disabled={uploadedImages.length >= 3}
                >
                  <Button 
                    icon={<UploadOutlined />} 
                    loading={uploading} 
                    size="middle"
                    disabled={uploadedImages.length >= 3}
                  >
                    {uploadedImages.length >= 3 ? 'Maximum Reached' : 'Upload Image'}
                  </Button>
                </Upload>
                
                {uploadedImages.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Row gutter={[16, 16]}>
                      {uploadedImages.map((image) => (
                        <Col key={image.id} xs={24} sm={12} md={8}>
                          <Card
                            size="small"
                            cover={
                              <div style={{ 
                                height: 200, 
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f5f5f5'
                              }}>
                                <Image
                                  src={image.thumbnail}
                                  alt={image.originalName}
                                  style={{ 
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                  preview={{
                                    src: image.url,
                                    mask: (
                                      <div>
                                        <EyeOutlined style={{ fontSize: 20 }} />
                                        <div style={{ marginTop: 8 }}>Preview</div>
                                      </div>
                                    )
                                  }}
                                />
                              </div>
                            }
                            actions={[
                              <Tooltip title="Delete image">
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleDeleteImage(image.id)}
                                >
                                  Delete
                                </Button>
                              </Tooltip>
                            ]}
                          >
                            <Card.Meta
                              description={
                                <Text 
                                  ellipsis={{ tooltip: image.originalName }}
                                  style={{ fontSize: 12 }}
                                >
                                  {image.originalName}
                                </Text>
                              }
                            />
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}
                
                {uploadedImages.length === 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      No images uploaded yet
                    </Text>
                  </div>
                )}
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 24 }}>
            <Space size="middle">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SaveOutlined />}
                size="middle"
              >
                Update Item
              </Button>
              <Button onClick={() => navigate(`/inventory/${id}`)} size="middle">
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
