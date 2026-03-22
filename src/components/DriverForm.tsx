import { useState } from 'react'
import {
  Popup,
  NavBar,
  Form,
  Input,
  TextArea,
  Button,
  Toast,
} from 'antd-mobile'
import { useDriverStore } from '@/stores/driverStore'
import type { Driver } from '@/types'

interface DriverFormProps {
  driver?: Driver
  onClose: () => void
  onSaved: () => void
}

export default function DriverForm({ driver, onClose, onSaved }: DriverFormProps) {
  const { addDriver, updateDriver } = useDriverStore()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const isEdit = !!driver

  const handleSave = async () => {
    try {
      await form.validateFields()
    } catch {
      return
    }
    const values = form.getFieldsValue()
    setSaving(true)
    try {
      const data = {
        name: (values.name as string).trim(),
        phone: ((values.phone as string | undefined) ?? '').trim(),
        vehicleInfo: ((values.vehicleInfo as string | undefined) ?? '').trim(),
        notes: ((values.notes as string | undefined) ?? '').trim(),
      }
      if (isEdit && driver.id !== undefined) {
        await updateDriver(driver.id, data)
        Toast.show({ icon: 'success', content: '已更新' })
      } else {
        await addDriver(data)
        Toast.show({ icon: 'success', content: '已添加' })
      }
      onSaved()
    } catch {
      Toast.show({ icon: 'fail', content: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popup
      visible
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{ height: '60vh', borderRadius: '16px 16px 0 0', overflow: 'auto' }}
    >
      <NavBar
        onBack={onClose}
        right={
          <Button size="mini" color="primary" loading={saving} onClick={() => void handleSave()}>
            保存
          </Button>
        }
      >
        {isEdit ? '编辑司机' : '新增司机'}
      </NavBar>

      <Form
        form={form}
        initialValues={{
          name: driver?.name ?? '',
          phone: driver?.phone ?? '',
          vehicleInfo: driver?.vehicleInfo ?? '',
          notes: driver?.notes ?? '',
        }}
        layout="horizontal"
        style={{ '--prefix-width': '5em' }}
      >
        <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入司机姓名' }]}>
          <Input placeholder="例：张三" clearable />
        </Form.Item>
        <Form.Item name="phone" label="电话">
          <Input placeholder="例：13800138000" type="tel" clearable />
        </Form.Item>
        <Form.Item name="vehicleInfo" label="车辆">
          <Input placeholder="例：京A12345 皮卡" clearable />
        </Form.Item>
        <Form.Item name="notes" label="备注">
          <TextArea placeholder="可选备注" maxLength={100} rows={2} />
        </Form.Item>
      </Form>
    </Popup>
  )
}
