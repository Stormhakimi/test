import { TabBar } from 'antd-mobile'
import {
  AppOutline,
  EnvironmentOutline,
  UserOutline,
  SetOutline,
} from 'antd-mobile-icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import styles from './Layout.module.css'

const tabs = [
  { key: '/', title: '调度', icon: <AppOutline /> },
  { key: '/locations', title: '地点', icon: <EnvironmentOutline /> },
  { key: '/drivers', title: '司机', icon: <UserOutline /> },
  { key: '/settings', title: '设置', icon: <SetOutline /> },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()

  // Determine active tab key from current path
  const activeKey = tabs.find(t => t.key !== '/' && location.pathname.startsWith(t.key))?.key ?? '/'

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Outlet />
      </div>
      <div className={styles.tabBar}>
        <TabBar
          activeKey={activeKey}
          onChange={key => navigate(key)}
        >
          {tabs.map(tab => (
            <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
          ))}
        </TabBar>
      </div>
    </div>
  )
}
