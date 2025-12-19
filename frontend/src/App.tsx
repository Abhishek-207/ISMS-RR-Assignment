import React from 'react'
import { Layout, Typography, Space, Menu, Button, Drawer, message, Dropdown } from 'antd'
import { useState, useEffect } from 'react'
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MenuOutlined, LogoutOutlined, UserOutlined, DownOutlined, BellOutlined, ShopOutlined, InboxOutlined, ShoppingCartOutlined, HomeOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons'
import Login from './pages/Login'
import Landing from './pages/Landing'
import MaterialsList from './pages/MaterialsList'
import InventoryCreate from './pages/InventoryCreate'
import InventoryDetail from './pages/InventoryDetail'
import InventoryEdit from './pages/InventoryEdit'
import SurplusList from './pages/SurplusList'
import ProcurementRequests from './pages/ProcurementRequests'
import ProcurementDetail from './pages/ProcurementDetail'
import Masters from './pages/Masters'
import Analytics from './pages/Analytics'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import NotFound from './pages/NotFound'
import Unauthorized from './pages/Unauthorized'
import Users from './pages/Users'
import { isAdmin, getCurrentUser, getToken, clearAuth } from './lib/auth'
import { api } from './lib/api'
import { storage } from './lib/storage'

const { Header, Content } = Layout
const { Title, Text } = Typography

export default function App() {
  const [user, setUser] = useState(getCurrentUser())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Auth check - only runs once on mount or when token changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me')
        console.log('Auth check response:', response.data)

        // Handle both data.data.user and data.user response structures
        const backendUser = response.data?.data?.user || response.data?.user

        if (!backendUser) {
          console.error('No user data in response:', response.data)
          throw new Error('No user data received')
        }

        const mergedUser = {
          ...getCurrentUser(),
          ...backendUser,
        }

        storage.setItem('user', JSON.stringify(mergedUser))
        setUser(mergedUser)

        if (backendUser.organization) {
          localStorage.setItem('organization', JSON.stringify(backendUser.organization))
        }
      } catch (error: any) {
        // Check if it's a token expiration error
        const errorCode = error?.response?.data?.errorCode
        const isExpired = error?.response?.data?.expired
        
        if (error?.response?.status === 401) {
          // Set flag for session expired message if token expired
          if (isExpired || errorCode === 1001) { 
            localStorage.setItem('sessionExpired', 'true')
          }
          
          clearAuth()
          setUser(null)
          
          // Only redirect to login if not already on public pages
          if (location.pathname !== '/login' && location.pathname !== '/signup') {
            navigate('/login')
          }
        } else {
          console.error('Auth check failed, keeping existing session:', error)
        }
      }
    }

    if (getCurrentUser() || getToken()) {
      checkAuth()
    }
  }, [navigate])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          setUser(getCurrentUser())
        } else {
          setUser(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    const handleAuthChange = () => {
      setUser(getCurrentUser())
    }
    window.addEventListener('auth-changed', handleAuthChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-changed', handleAuthChange)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuth()
      setUser(null)
      navigate('/')
      message.success('Logged out successfully')
    }
  }

  const RequireAuth = ({ children }: { children: React.ReactNode }) => {
    if (!user) {
      return <Navigate to="/login" replace />
    }
    return <>{children}</>
  }

  const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
    if (!user || !isAdmin()) {
      return <Navigate to="/unauthorized" replace />
    }
    return <>{children}</>
  }

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup'
  const isLoginRoute = location.pathname === '/login'
  const isSignupRoute = location.pathname === '/signup'

  const menuItems = user ? [
    {
      key: '/',
      label: 'Home',
      icon: <HomeOutlined />
    },
    {
      key: '/inventory',
      label: 'My Inventory',
      icon: <InboxOutlined />
    },
    {
      key: '/surplus',
      label: 'Browse Surplus',
      icon: <ShopOutlined />
    },
    {
      key: '/procurement',
      label: 'Procurement',
      icon: <ShoppingCartOutlined />
    },
    {
      key: '/analytics',
      label: 'Analytics',
      icon: <BarChartOutlined />
    },
    ...(isAdmin() ? [
      {
        key: '/masters',
        label: 'Configuration Settings',
        icon: <SettingOutlined />
      }
    ] : [])
  ] : [
    {
      key: '/',
      label: 'Home'
    }
  ]

  const userMenu = (
    <Menu
      items={[
       
        {
          key: 'profile',
          icon: <UserOutlined />,
          label: 'Profile',
          onClick: () => navigate('/profile')
        },
        {
          key: 'notifications',
          icon: <BellOutlined />,
          label: 'Notifications',
          onClick: () => navigate('/notifications')
        },
        {
          type: 'divider'
        },
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: 'Logout',
          onClick: handleLogout
        }
      ]}
    />
  )

  const horizontalMenu = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <Menu
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => {
          navigate(key)
          setMobileMenuOpen(false)
        }}
        style={{ border: 'none', background: 'transparent', flex: 1 }}
      />
      {user ? (
        <Space>
          <Dropdown overlay={userMenu} placement="bottomRight">
            <Button type="text" style={{ color: '#0891b2', fontWeight: 700 }}>
              <Space>
                <UserOutlined />
                {user.name}
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
        </Space>
      ) : (
        <>
          {isLoginRoute && (
            <Button type="text" style={{ color: '#0891b2', fontWeight: 500 }}>
              <Link to="/signup" style={{ color: 'inherit', textDecoration: 'none' }}>Sign Up</Link>
            </Button>
          )}
          {isSignupRoute && (
            <Button type="text" style={{ color: '#0891b2', fontWeight: 500 }}>
              <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Sign In</Link>
            </Button>
          )}
          {!isAuthRoute && (
            <Button type="text" style={{ color: '#0891b2', fontWeight: 500 }}>
              <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Sign In</Link>
            </Button>
          )}
        </>
      )}
    </div>
  )

  const mobileMenu = (
    <Menu mode="inline" selectable={false} style={{ borderRight: 'none' }}>
      <Menu.Item key="home-m" icon={<HomeOutlined />}>
        <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
      </Menu.Item>
      {user && (
        <Menu.Item key="inventory-m" icon={<InboxOutlined />}>
          <Link to="/inventory" onClick={() => setMobileMenuOpen(false)}>My Inventory</Link>
        </Menu.Item>
      )}
      {user && (
        <Menu.Item key="surplus-m" icon={<ShopOutlined />}>
          <Link to="/surplus" onClick={() => setMobileMenuOpen(false)}>Browse Surplus</Link>
        </Menu.Item>
      )}
      {user && (
        <Menu.Item key="procurement-m" icon={<ShoppingCartOutlined />}>
          <Link to="/procurement" onClick={() => setMobileMenuOpen(false)}>Procurement</Link>
        </Menu.Item>
      )}
      {user && (
        <Menu.Item key="analytics-m" icon={<BarChartOutlined />}>
          <Link to="/analytics" onClick={() => setMobileMenuOpen(false)}>Analytics</Link>
        </Menu.Item>
      )}
      {user && isAdmin() && (
        <Menu.Item key="masters-m" icon={<SettingOutlined />}>
          <Link to="/masters" onClick={() => setMobileMenuOpen(false)}>Configuration Settings</Link>
        </Menu.Item>
      )}
      {user ? (
        <Menu.Item key="org-m">
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: 'notifications', icon: <BellOutlined />, label: 'Notifications' },
                { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
                { key: 'logout', icon: <LogoutOutlined />, label: 'Logout' }
              ],
              onClick: ({ key }) => {
                if (key === 'logout') handleLogout()
                if (key === 'profile') navigate('/profile')
                if (key === 'notifications') navigate('/notifications')
                setMobileMenuOpen(false)
              }
            }}
          >
            <Button type="text" icon={<UserOutlined />} style={{ color: '#0891b2', fontWeight: 700 }}>
              {user.name}
              <DownOutlined style={{ marginLeft: 6 }} />
            </Button>
          </Dropdown>
        </Menu.Item>
      ) : (
        <>
          {isLoginRoute && (
            <Menu.Item key="signup-m">
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>Create account</Link>
            </Menu.Item>
          )}
          {isSignupRoute && (
            <Menu.Item key="login-m">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            </Menu.Item>
          )}
          {!isAuthRoute && (
            <Menu.Item key="login-main">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            </Menu.Item>
          )}
        </>
      )}
    </Menu>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0891b2', borderBottom: '0', position: 'sticky', top: 0, zIndex: 1000, width: '100%' }}>
        <div className="container" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
          <div className="show-mobile">
            <Button aria-label="Open menu" type="text" icon={<MenuOutlined style={{ color: '#fff', marginRight: 90, fontSize: 20 }} />} onClick={() => setMobileMenuOpen(true)} />
          </div>
          <Title level={4} className="header-title" style={{ color: '#fff', display: 'flex', alignItems: 'center', margin: 10 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
              <img className="hide-mobile" src="/logo1.png" alt="ISMS" style={{ height: '30px', width: 'auto', marginRight: 10 }} />
              <span className="hide-mobile" style={{ marginTop: '15px' }}>ISMS</span>
            </Link>
          </Title>
        </div>
      </Header>

      <Drawer
        placement="left"
        width={280}
        title={(
          <Link
            to="/"
            onClick={() => {
              setMobileMenuOpen(false)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', marginLeft: 17 }}
          >
            <img src="/logo1.png" alt="ISMS" style={{ height: 27, width: 'auto', marginRight: 3 }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginTop: '10px' }}>ISMS</span>
          </Link>
        )}
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        bodyStyle={{ padding: 0 }}
        styles={{ header: { background: '#0891b2', borderBottom: 'none' } }}
        closeIcon={<span style={{ color: '#fff', fontSize: 16 }}>✕</span>}
      >
        {mobileMenu}
      </Drawer>

      <Content style={{ padding: 24 }}>
        <div className="container">
          <div className="topnav hide-mobile">
            {horizontalMenu}
          </div>
          <div className="route-container">
            <Routes>
              <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
              <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
              <Route path="/" element={<Landing />} />
              <Route path="/inventory" element={<RequireAuth><MaterialsList /></RequireAuth>} />
              <Route path="/inventory/new" element={<RequireAuth><InventoryCreate /></RequireAuth>} />
              <Route path="/inventory/:id" element={<RequireAuth><InventoryDetail /></RequireAuth>} />
              <Route path="/inventory/:id/edit" element={<RequireAuth><InventoryEdit /></RequireAuth>} />
              <Route path="/surplus" element={<RequireAuth><SurplusList /></RequireAuth>} />
              <Route path="/procurement" element={<RequireAuth><ProcurementRequests /></RequireAuth>} />
              <Route path="/procurement/:id" element={<RequireAuth><ProcurementDetail /></RequireAuth>} />
              <Route path="/materials" element={<Navigate to="/inventory" replace />} />
              <Route path="/materials/new" element={<Navigate to="/inventory/new" replace />} />
              <Route path="/materials/:id" element={<RequireAuth><InventoryDetail /></RequireAuth>} />
              <Route path="/transfers" element={<Navigate to="/procurement" replace />} />
              <Route path="/users" element={<RequireAdmin><Users /></RequireAdmin>} />
              <Route path="/masters" element={<RequireAdmin><Masters /></RequireAdmin>} />
              <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </Content>
      <div style={{ borderBottom: '7px solid #0891b2', background: '#fff' }}>
        <div className="container" style={{ padding: 16, textAlign: 'center' }}>
          <Text style={{ color: '#0891b2', fontSize: 14, fontWeight: 500}}>© {new Date().getFullYear()} Inventory & Surplus Management System</Text>
        </div>
      </div>
    </Layout>
  )
}
