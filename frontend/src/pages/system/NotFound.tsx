import { Button, Result, Grid } from 'antd'
import { Link } from 'react-router-dom'

const { useBreakpoint } = Grid

export default function NotFound() {
  const screens = useBreakpoint()
  const isMobile = !screens.md

  return (
    <div className="auth-page" style={{ minHeight: '70vh' }}>
      <Result
        status="404"
        title="Page not found"
        subTitle="The page you are looking for doesn't exist or may have been moved."
        style={{ padding: isMobile ? '16px 8px' : '24px 0' }}
        extra={
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, justifyContent: 'center' }}>
            <Link to="/">
              <Button type="primary" size={isMobile ? 'middle' : 'large'}>
                Go to Home
              </Button>
            </Link>
            <Button
              size={isMobile ? 'middle' : 'large'}
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        }
      />
    </div>
  )
}


