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
  Space
} from 'antd'
import { 
  UploadOutlined, 
  SaveOutlined 
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { fetchMaterialCategories } from '../lib/masters'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

export default function MaterialCreate() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const categoriesRes = await fetchMaterialCategories()
        setCategories(categoriesRes)
      } catch (error) {
        message.error('Failed to fetch material categories')
      }
    }

    fetchMasterData()
  }, [])

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
      const materialData = {
        ...values,
        availableFrom: values.availableFrom.format('YYYY-MM-DD'),
        availableUntil: values.availableUntil ? values.availableUntil.format('YYYY-MM-DD') : null,
        attachments,
        status: 'AVAILABLE'
      }

      await api.post('/materials', materialData)
      message.success('Inventory item created successfully!')
      navigate('/inventory')
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to create inventory item')
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
            availableUntil: dayjs().add(6, 'month')
          }}
        >
          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Material Name"
                rules={[{ required: true, message: 'Please enter material name!' }]}
              >
                <Input placeholder="Enter material name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="categoryId"
                label="Category"
                rules={[{ required: true, message: 'Please select category!' }]}
              >
                <Select placeholder="Select category">
                  {categories.map((category: any) => (
                    <Select.Option key={category._id} value={category._id}>
                      {category.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
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
                <Input placeholder="e.g., meters, kg, pieces" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="condition"
                label="Condition"
                rules={[{ required: true, message: 'Please select condition!' }]}
              >
                <Select placeholder="Select condition">
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
            <Col xs={24} md={12}>
              <Form.Item
                name="availableFrom"
                label="Available From"
                rules={[{ required: true, message: 'Please select available from date!' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="availableUntil"
                label="Available Until"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="estimatedCost"
                label="Estimated Cost (Optional)"
                tooltip="Used for cost avoidance analytics"
              >
                <InputNumber 
                  placeholder="Enter estimated cost"
                  style={{ width: '100%' }}
                  min={0}
                  prefix="₹"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="location"
                label="Storage Location (Optional)"
              >
                <Input placeholder="e.g., Warehouse A, Shelf 12" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea 
              placeholder="Additional notes about the material..."
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Attachments (Optional)"
          >
            <Upload
              beforeUpload={handleFileUpload}
              showUploadList={false}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              multiple
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
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

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SaveOutlined />}
              >
                Add to Inventory
              </Button>
              <Button onClick={() => navigate('/materials')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
