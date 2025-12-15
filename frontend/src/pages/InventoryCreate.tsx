import { useState } from 'react'
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
  Space
} from 'antd'
import { 
  UploadOutlined, 
  SaveOutlined 
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

export default function InventoryCreate() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])
  const [isSurplus, setIsSurplus] = useState(false)

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setAttachments(prev => [...prev, response.data.id])
      message.success('File uploaded successfully')
      return false
    } catch (error) {
      message.error('Failed to upload file')
      return false
    } finally {
      setUploading(false)
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      const inventoryData = {
        name: values.name,
        category: values.category,
        quantity: values.quantity,
        unit: values.unit,
        condition: values.condition,
        availableFrom: values.availableFrom.format('YYYY-MM-DD'),
        availableUntil: values.availableUntil ? values.availableUntil.format('YYYY-MM-DD') : null,
        location: values.location,
        estimatedCost: values.estimatedCost,
        notes: values.notes,
        isSurplus: isSurplus,
        attachments,
        status: 'AVAILABLE'
      }

      await api.post('/materials', inventoryData)
      message.success('Inventory item created successfully!')
      navigate('/inventory')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create inventory item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 15 }}>
        <Title level={4} style={{ margin: 0 }}>
          Add Inventory Item
        </Title>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            availableFrom: dayjs(),
            availableUntil: dayjs().add(6, 'month'),
            condition: 'GOOD'
          }}
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
                rules={[{ required: true, message: 'Please enter item name!' }]}
              >
                <Input placeholder="e.g., Office Chairs, Laptops, Steel Pipes" size="middle" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please enter category!' }]}
              >
                <Input placeholder="e.g., Furniture, Electronics, Raw Materials" size="middle" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24}>
              <Title level={5} style={{ marginTop: 8, marginBottom: 16 }}>
                Quantity & Condition
              </Title>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={8}>
              <Form.Item
                name="quantity"
                label="Quantity"
                rules={[{ required: true, message: 'Please enter quantity!' }]}
              >
                <InputNumber 
                  placeholder="Enter quantity" 
                  style={{ width: '100%' }}
                  size="middle"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="unit"
                label="Unit"
                rules={[{ required: true, message: 'Please enter unit!' }]}
              >
                <Input placeholder="e.g., pieces, kg, meters" size="middle" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
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
              >
                <Input placeholder="e.g., Warehouse A, Shelf 12" size="middle" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="estimatedCost"
                label="Estimated Cost (Optional)"
                tooltip="Used for cost avoidance analytics"
              >
                <InputNumber 
                  placeholder="Enter estimated cost"
                  style={{ width: '100%' }}
                  size="middle"
                  min={0}
                  prefix="₹"
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
                label="Attachments (Optional)"
              >
                <Upload
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                >
                  <Button icon={<UploadOutlined />} loading={uploading} size="middle">
                    Upload Files
                  </Button>
                </Upload>
                {attachments.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      {attachments.length} file(s) uploaded
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
                Add to Inventory
              </Button>
              <Button onClick={() => navigate('/inventory')} size="middle">
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
