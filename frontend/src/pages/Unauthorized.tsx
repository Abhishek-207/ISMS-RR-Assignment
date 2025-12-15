import { Button, Result, Grid } from 'antd'
import { Link } from 'react-router-dom'

const { useBreakpoint } = Grid

export default function Unauthorized() {
  const screens = useBreakpoint()
  const isMobile = !screens.md

  return (
    <div className="auth-page" style={{ minHeight: '70vh' }}>
      <Result
        status="403"
        title="Access denied"
        subTitle="You don't have permission to view this page. Please contact your administrator if you believe this is a mistake."
        style={{ padding: isMobile ? '16px 8px' : '24px 0' }}
        extra={
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, justifyContent: 'center' }}>
            <Link to="/">
              <Button type="primary" size={isMobile ? 'middle' : 'large'}>
                Go to Home
              </Button>
            </Link>
            <Link to="/login">
              <Button size={isMobile ? 'middle' : 'large'}>
                Sign in with another account
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  )
}


