import { useEffect, useState } from 'react'
import {
  NavBar,
  List,
  Input,
  Switch,
  Button,
  Toast,
  Card,
} from 'antd-mobile'
import { useSettingsStore } from '@/stores/settingsStore'
import DataManager from '@/components/DataManager'

export default function SettingsPage() {
  const { settings, isLoaded, loadSettings, saveAmapKey, updateSetting } = useSettingsStore()
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [depotAddressInput, setDepotAddressInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [savingDepot, setSavingDepot] = useState(false)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (isLoaded) {
      setApiKeyInput(settings.amapKey)
      setDepotAddressInput(settings.depotAddress)
    }
  }, [isLoaded, settings.amapKey, settings.depotAddress])

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      Toast.show({ icon: 'fail', content: '请输入 API Key' })
      return
    }
    setSavingKey(true)
    try {
      await saveAmapKey(apiKeyInput.trim())
      Toast.show({ icon: 'success', content: 'API Key 已保存' })
    } finally {
      setSavingKey(false)
    }
  }

  const handleSaveDepot = async () => {
    setSavingDepot(true)
    try {
      // Save address only for now; coordinates will be added when map picker (T11) is ready
      await updateSetting('depotAddress', depotAddressInput.trim())
      Toast.show({ icon: 'success', content: '出发地已保存' })
    } finally {
      setSavingDepot(false)
    }
  }

  const handleRoundTripToggle = async (val: boolean) => {
    await updateSetting('defaultRoundTrip', val)
    Toast.show({ content: val ? '已开启往返模式' : '已切换为单程模式', duration: 1500 })
  }

  const apiKeyStatus = settings.amapKey
    ? '✅ 已配置'
    : '⚠️ 未配置'

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f5f5f5' }}>
      <NavBar back={null} style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        系统设置
      </NavBar>

      {/* API Key Setup Guide */}
      {!settings.amapKey && (
        <Card
          style={{ margin: '12px', borderRadius: '8px', background: '#fffbe6', border: '1px solid #faad14' }}
          bodyStyle={{ padding: '12px' }}
        >
          <div style={{ fontSize: '14px', color: '#8b6914' }}>
            <strong>⚠️ 需要配置高德地图 API Key</strong>
            <br />
            <br />
            地图功能需要高德地图 API Key 才能使用。注册步骤：
            <ol style={{ marginLeft: '16px', marginTop: '8px', lineHeight: '1.8' }}>
              <li>访问 <strong>console.amap.com</strong></li>
              <li>用支付宝实名认证注册</li>
              <li>创建新应用，选择 <strong>Web端(JS API)</strong></li>
              <li>复制生成的 Key 填入下方</li>
            </ol>
          </div>
        </Card>
      )}

      {/* Amap API Key Section */}
      <List header="高德地图 API Key" style={{ marginTop: '12px' }}>
        <List.Item description={apiKeyStatus} extra={null}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Input
              placeholder="粘贴您的 Web API Key"
              value={apiKeyInput}
              onChange={setApiKeyInput}
              style={{ flex: 1 }}
            />
            <Button
              size="small"
              color="primary"
              loading={savingKey}
              onClick={() => void handleSaveApiKey()}
            >
              保存
            </Button>
          </div>
        </List.Item>
      </List>

      {/* Depot / Starting Point */}
      <List header="出发地（车场位置）" style={{ marginTop: '8px' }}>
        <List.Item description="司机每天从此地出发" extra={null}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Input
              placeholder="例：克拉玛依市公司车场"
              value={depotAddressInput}
              onChange={setDepotAddressInput}
              style={{ flex: 1 }}
            />
            <Button
              size="small"
              color="primary"
              loading={savingDepot}
              onClick={() => void handleSaveDepot()}
            >
              保存
            </Button>
          </div>
        </List.Item>
        <List.Item
          description="在地图上精确选点（需要先配置 API Key）"
          extra={
            <Button size="mini" color="default" disabled={!settings.amapKey}>
              地图选点
            </Button>
          }
        >
          坐标
        </List.Item>
      </List>

      {/* Route Preferences */}
      <List header="路线偏好" style={{ marginTop: '8px' }}>
        <List.Item
          description="司机完成所有站点后返回出发地"
          extra={
            <Switch
              checked={settings.defaultRoundTrip}
              onChange={val => void handleRoundTripToggle(val)}
            />
          }
        >
          默认往返路线
        </List.Item>
      </List>

      {/* Data Management */}
      <List header="数据管理" style={{ marginTop: '8px' }}>
        <List.Item extra={null}>
          <DataManager />
        </List.Item>
      </List>

      {/* About */}
      <List header="关于" style={{ marginTop: '8px', marginBottom: '24px' }}>
        <List.Item extra="v1.0.0">油田调度助手</List.Item>
        <List.Item description="纯本地存储，数据不上传至服务器">数据存储</List.Item>
      </List>
    </div>
  )
}
