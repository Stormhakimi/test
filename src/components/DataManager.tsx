import { useRef, useState } from 'react'
import { Button, Dialog, Toast } from 'antd-mobile'
import { exportData, downloadJson, readJsonFile, importData } from '@/lib/data-io'
import { useLocationStore } from '@/stores/locationStore'
import { useDriverStore } from '@/stores/driverStore'
import { useSettingsStore } from '@/stores/settingsStore'

export default function DataManager() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const { loadLocations } = useLocationStore()
  const { loadDrivers } = useDriverStore()
  const { loadSettings } = useSettingsStore()

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportData()
      const date = new Date().toISOString().slice(0, 10)
      downloadJson(data, `油田调度-备份-${date}.json`)
      Toast.show({ icon: 'success', content: '数据已导出' })
    } catch {
      Toast.show({ icon: 'fail', content: '导出失败' })
    } finally {
      setExporting(false)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''

    const confirmed = await Dialog.confirm({
      title: '确认导入',
      content: '导入将覆盖所有现有数据（地点、司机、历史记录和设置），确认继续？',
      confirmText: '确认导入',
      cancelText: '取消',
    })
    if (!confirmed) return

    setImporting(true)
    try {
      const data = await readJsonFile(file)
      await importData(data)
      // Reload all stores
      await Promise.all([loadLocations(), loadDrivers(), loadSettings()])
      Toast.show({
        icon: 'success',
        content: `导入成功！已恢复 ${data.locations.length} 个地点、${data.drivers.length} 名司机`,
      })
    } catch (err) {
      Toast.show({ icon: 'fail', content: err instanceof Error ? err.message : '导入失败' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={(e) => void handleImportFile(e)}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button
          block
          color="default"
          loading={exporting}
          onClick={() => void handleExport()}
        >
          导出数据备份
        </Button>
        <Button
          block
          color="default"
          loading={importing}
          onClick={() => fileInputRef.current?.click()}
        >
          导入数据备份
        </Button>
      </div>
    </div>
  )
}
