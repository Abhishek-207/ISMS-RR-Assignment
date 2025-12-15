import React, { useState } from 'react'
import { Card, List, Typography, Tag, Button, Empty, Space, Badge, Divider } from 'antd'
import { BellOutlined, CheckOutlined, DeleteOutlined, InfoCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { Grid } from 'antd'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  timestamp: string
  read: boolean
  priority: 'low' | 'medium' | 'high'
}

export default function Notifications() {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'New Inventory Added',
      message: 'Office Chairs (25 units) have been added to your organization\'s inventory.',
      type: 'success',
      timestamp: '2024-12-15T10:30:00Z',
      read: false,
      priority: 'medium'
    },
    {
      id: '2',
      title: 'Procurement Request Pending',
      message: 'A procurement request for 10 Laptops from TechCorp Industries is awaiting your approval.',
      type: 'warning',
      timestamp: '2024-12-15T09:15:00Z',
      read: false,
      priority: 'high'
    },
    {
      id: '3',
      title: 'Low Stock Alert',
      message: 'Printer Cartridges inventory is below minimum threshold. Consider restocking or marking as surplus.',
      type: 'error',
      timestamp: '2024-12-15T08:45:00Z',
      read: true,
      priority: 'high'
    },
    {
      id: '5',
      title: 'Procurement Completed',
      message: 'Your procurement request for 15 Monitors has been approved and transferred to your inventory.',
      type: 'success',
      timestamp: '2024-12-14T14:30:00Z',
      read: true,
      priority: 'medium'
    },
    {
      id: '7',
      title: 'Surplus Item Procured',
      message: 'Your surplus item "Steel Filing Cabinets" has been procured by Metro Healthcare Network.',
      type: 'success',
      timestamp: '2024-12-14T09:30:00Z',
      read: true,
      priority: 'medium'
    },
    {
      id: '8',
      title: 'New Surplus Available',
      message: 'New surplus items matching your category are available from organizations in your network.',
      type: 'info',
      timestamp: '2024-12-13T15:45:00Z',
      read: true,
      priority: 'low'
    }
  ])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red'
      case 'medium':
        return 'orange'
      default:
        return 'green'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div style={{ display: 'grid', gap: isMobile ? 12 : 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 0 }}>
        
          Notifications
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ marginLeft: 8 }} />
          )}
        </Title>
        {unreadCount > 0 && (
          <Button 
            type="primary" 
            size="small"
            onClick={markAllAsRead}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications yet"
          />
        </Card>
      ) : (
        <Card bodyStyle={{ padding: isMobile ? 12 : 16 }}>
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                style={{
                  backgroundColor: notification.read ? 'transparent' : '#f6ffed',
                  border: notification.read ? 'none' : '1px solid #b7eb8f',
                  borderRadius: 8,
                  marginBottom: 8,
                  padding: isMobile ? 8 : 12
                }}
                actions={[
                  <Button
                    key="read"
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={() => markAsRead(notification.id)}
                    disabled={notification.read}
                    title="Mark as read"
                  />,
                  <Button
                    key="delete"
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => deleteNotification(notification.id)}
                    title="Delete notification"
                  />
                ]}
              >
                <List.Item.Meta
                  avatar={getNotificationIcon(notification.type)}
                  title={
                    <Space>
                      <Text strong={!notification.read}>{notification.title}</Text>
                      <Tag color={getPriorityColor(notification.priority)} size="small">
                        {notification.priority.toUpperCase()}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Text type={notification.read ? 'secondary' : 'default'}>
                        {notification.message}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatTimestamp(notification.timestamp)}
                        </Text>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  )
}
