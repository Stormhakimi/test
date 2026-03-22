import { useState } from 'react'
import { List, Button, Tag, Picker, Toast } from 'antd-mobile'
import { useDispatchStore } from '@/stores/dispatchStore'
import { useLocationStore } from '@/stores/locationStore'
import { validateConstraints } from '@/lib/route-optimizer'
import type { DispatchConstraint } from '@/types'

export default function StepConstraints() {
  const { selectedLocationIds, constraints, addConstraint, removeConstraint } = useDispatchStore()
  const { locations } = useLocationStore()

  const [pickerVisible, setPickerVisible] = useState(false)
  const [sourceId, setSourceId] = useState<number | null>(null)
  const [targetPickerVisible, setTargetPickerVisible] = useState(false)

  const selectedLocations = locations.filter(l => l.id !== undefined && selectedLocationIds.includes(l.id))

  const handleAddConstraint = (source: number, target: number) => {
    if (source === target) {
      Toast.show({ content: '不能选择相同的地点' })
      return
    }
    const newConstraints: DispatchConstraint[] = [
      ...constraints,
      { type: 'must_before', sourceId: source, targetId: target }
    ]
    if (!validateConstraints(newConstraints)) {
      Toast.show({ icon: 'fail', content: '该约束会产生循环依赖，请重新选择' })
      return
    }
    addConstraint({ type: 'must_before', sourceId: source, targetId: target })
  }

  const locationOptions = selectedLocations.map(l => ({ label: l.name, value: l.id! }))

  const getLocName = (id: number) => selectedLocations.find(l => l.id === id)?.name ?? `#${id}`

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#333' }}>
        设置地点访问顺序约束（可选）
      </div>

      {constraints.length === 0 ? (
        <div style={{ color: '#999', fontSize: '13px', marginBottom: '12px' }}>
          未设置约束，将自动计算最优顺序
        </div>
      ) : (
        <List style={{ marginBottom: '12px' }}>
          {constraints.map((c, idx) => (
            <List.Item
              key={idx}
              extra={
                <Button size="mini" color="danger" fill="outline" onClick={() => removeConstraint(idx)}>
                  删除
                </Button>
              }
            >
              <Tag color="primary">{getLocName(c.sourceId)}</Tag>
              {' → 先于 → '}
              <Tag color="default">{getLocName(c.targetId)}</Tag>
            </List.Item>
          ))}
        </List>
      )}

      <Button
        block
        color="default"
        onClick={() => setPickerVisible(true)}
        disabled={selectedLocations.length < 2}
      >
        + 添加先后顺序约束
      </Button>

      {/* Source picker */}
      <Picker
        columns={[locationOptions]}
        visible={pickerVisible}
        title="选择先到达的地点"
        onClose={() => setPickerVisible(false)}
        onConfirm={vals => {
          setSourceId(vals[0] as number)
          setPickerVisible(false)
          setTargetPickerVisible(true)
        }}
      />

      {/* Target picker */}
      <Picker
        columns={[locationOptions.filter(o => o.value !== sourceId)]}
        visible={targetPickerVisible}
        title="选择后到达的地点"
        onClose={() => setTargetPickerVisible(false)}
        onConfirm={vals => {
          if (sourceId !== null) {
            handleAddConstraint(sourceId, vals[0] as number)
          }
          setTargetPickerVisible(false)
          setSourceId(null)
        }}
      />
    </div>
  )
}
