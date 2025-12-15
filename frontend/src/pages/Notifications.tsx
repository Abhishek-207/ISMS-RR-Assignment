import React, { useEffect, useState } from 'react'
import { Card, List, Typography, Tag, Button, Empty, Space, Badge, message } from 'antd'
import { BellOutlined, CheckOutlined, DeleteOutlined, InfoCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { Grid } from 'antd'
import { api } from '../lib/api'
import { getCurrentUser } from '../lib/auth'

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
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true)
      try {
        const user = getCurrentUser()
        const response = await api.get('/transfers', {
          params: {
            page: 1,
            pageSize: 20
          }
        })

        const orgId = user?.organizationId
        const items = response.data?.data || []

        const mapped: Notification[] = items.map((item: any) => {
          const status: string = item.status || 'PENDING'
          const materialName = item.materialId?.name || 'Material'
          const quantityRequested = item.quantityRequested ?? item.requestedQuantity
          const unit = item.materialId?.unit || ''
          const fromOrg = item.fromOrganizationId?.name || 'Unknown'
          const toOrg = item.toOrganizationId?.name || 'Unknown'
          const createdAt = item.createdAt
          const approvedAt = item.approvedAt
          const isOrgInvolved =
            orgId && (item.fromOrganizationId?._id === orgId || item.toOrganizationId?._id === orgId)

          let type: Notification['type'] = 'info'
          if (status === 'APPROVED') type = 'success'
          else if (status === 'PENDING') type = 'warning'
          else if (status === 'REJECTED' || status === 'CANCELLED') type = 'error'

          const priority: Notification['priority'] =
            status === 'PENDING' ? 'high' : status === 'APPROVED' ? 'medium' : 'low'

          const title = `Procurement ${status === 'PENDING' ? 'request pending' : status.toLowerCase()}`

          const messageText = `${materialName} • ${quantityRequested} ${unit} • ${fromOrg} → ${toOrg}`

          return {
            id: item._id,
            title,
            message: messageText,
            type,
            timestamp: approvedAt || createdAt,
            read: !isOrgInvolved ? true : status !== 'PENDING',
            priority
          }
        })

        setNotifications(mapped)
      } catch (error) {
        console.error('Failed to load notifications', error)
        message.error('Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

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
            loading={loading}
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
