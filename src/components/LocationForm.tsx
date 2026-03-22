import { useState } from 'react'
import {
  Popup,
  NavBar,
  Form,
  Input,
  Picker,
  TextArea,
  Button,
  Toast,
} from 'antd-mobile'
import { useLocationStore } from '@/stores/locationStore'
import type { Location, LocationType } from '@/types'
import LocationPicker from './LocationPicker'

const LOCATION_TYPE_OPTIONS = [
  [
    { label: '🛢️ 油井', value: 'oil_well' },
    { label: '🏭 仓库', value: 'warehouse' },
    { label: '⛽ 加油站', value: 'gas_station' },
    { label: '📍 其他', value: 'other' },
  ],
]

interface LocationFormProps {
  location?: Location
  onClose: () => void
  onSaved: () => void
}

export default function LocationForm({ location, onClose, onSaved }: LocationFormProps) {
  const { addLocation, updateLocation } = useLocationStore()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [typeVisible, setTypeVisible] = useState(false)
  const [selectedType, setSelectedType] = useState<LocationType>(location?.type ?? 'oil_well')
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [pickedCoords, setPickedCoords] = useState<[number, number]>(
    location?.coordinates ?? [0, 0]
  )

  const isEdit = !!location

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
        type: selectedType,
        address: ((values.address as string | undefined) ?? '').trim(),
        coordinates: pickedCoords,
        notes: ((values.notes as string | undefined) ?? '').trim(),
      }
      if (isEdit && location.id !== undefined) {
        await updateLocation(location.id, data)
        Toast.show({ icon: 'success', content: '已更新' })
      } else {
        await addLocation(data)
        Toast.show({ icon: 'success', content: '已添加' })
      }
      onSaved()
    } catch (err) {
      Toast.show({ icon: 'fail', content: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const typeLabel =
    LOCATION_TYPE_OPTIONS[0].find(o => o.value === selectedType)?.label ?? '请选择类型'

  return (
    <Popup
      visible
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{ height: '70vh', borderRadius: '16px 16px 0 0', overflow: 'auto' }}
    >
      <NavBar
        onBack={onClose}
        right={
          <Button size="mini" color="primary" loading={saving} onClick={() => void handleSave()}>
            保存
          </Button>
        }
      >
        {isEdit ? '编辑地点' : '新增地点'}
      </NavBar>

      <Form
        form={form}
        initialValues={{
          name: location?.name ?? '',
          address: location?.address ?? '',
          notes: location?.notes ?? '',
        }}
        layout="horizontal"
        style={{ '--prefix-width': '5em' }}
      >
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入地点名称' }]}>
          <Input placeholder="例：油井A-01" clearable />
        </Form.Item>

        <Form.Item label="类型" onClick={() => setTypeVisible(true)} clickable arrow>
          <span style={{ color: selectedType ? '#000' : '#ccc' }}>{typeLabel}</span>
        </Form.Item>

        <Form.Item name="address" label="地址">
          <Input placeholder="例：克拉玛依市白碱滩区" clearable />
        </Form.Item>

        <Form.Item name="notes" label="备注">
          <TextArea placeholder="可选备注信息" maxLength={100} rows={2} />
        </Form.Item>

        <Form.Item label="坐标" extra={
          <Button size="mini" color="default" onClick={() => setShowMapPicker(true)}>
            地图选点 🗺️
          </Button>
        }>
          <span style={{ fontSize: '13px', color: pickedCoords[0] !== 0 ? '#333' : '#ccc' }}>
            {pickedCoords[0] !== 0
              ? `${pickedCoords[0].toFixed(4)}, ${pickedCoords[1].toFixed(4)}`
              : '点击"地图选点"设置坐标'}
          </span>
        </Form.Item>
      </Form>

      <Picker
        columns={LOCATION_TYPE_OPTIONS}
        visible={typeVisible}
        onClose={() => setTypeVisible(false)}
        value={[selectedType]}
        onConfirm={v => setSelectedType(v[0] as LocationType)}
      />

      {showMapPicker && (
        <LocationPicker
          initialCoordinates={pickedCoords[0] !== 0 ? pickedCoords : undefined}
          onConfirm={(coords, address) => {
            setPickedCoords(coords)
            // Also fill address field if it's empty
            const currentAddress = form.getFieldValue('address') as string
            if (!currentAddress && address) {
              form.setFieldValue('address', address)
            }
            setShowMapPicker(false)
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </Popup>
  )
}
