import { useEffect } from 'react'
import { Steps, Button, NavBar } from 'antd-mobile'
import { useDispatchStore } from '@/stores/dispatchStore'
import { useLocationStore } from '@/stores/locationStore'
import { useDriverStore } from '@/stores/driverStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { assignDrivers } from '@/lib/driver-assigner'
import StepLocations from '@/components/dispatch/StepLocations'
import StepConstraints from '@/components/dispatch/StepConstraints'
import StepDrivers from '@/components/dispatch/StepDrivers'
import StepResults from '@/components/dispatch/StepResults'

export default function DispatchPage() {
  const {
    currentStep,
    selectedLocationIds,
    constraints,
    selectedDriverIds,
    isCalculating,
    calculationError,
    setCurrentStep,
    setResult,
    setIsCalculating,
    setCalculationError,
    reset,
  } = useDispatchStore()

  const { locations, loadLocations } = useLocationStore()
  const { loadDrivers } = useDriverStore()
  const { settings, loadSettings } = useSettingsStore()

  useEffect(() => {
    void loadLocations()
    void loadDrivers()
    void loadSettings()
  }, [loadLocations, loadDrivers, loadSettings])

  const handleCalculate = async () => {
    if (selectedLocationIds.length === 0) return
    if (selectedDriverIds.length === 0) return
    if (!settings.depotCoordinates) return

    setIsCalculating(true)
    setCalculationError(null)

    try {
      const coordMap: Record<number, [number, number]> = {}
      for (const loc of locations) {
        if (loc.id !== undefined) {
          coordMap[loc.id] = loc.coordinates
        }
      }

      const result = assignDrivers({
        locationIds: selectedLocationIds,
        driverIds: selectedDriverIds,
        coordinates: coordMap,
        depotCoordinates: settings.depotCoordinates,
        roundTrip: settings.defaultRoundTrip,
        constraints,
      })

      if (!result.success) {
        setCalculationError(result.error ?? '路线计算失败')
      } else {
        setResult({
          driverRoutes: result.driverRoutes,
          calculatedAt: Date.now(),
        })
        setCurrentStep(4)
      }
    } catch (err) {
      setCalculationError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setIsCalculating(false)
    }
  }

  const canProceedStep1 = selectedLocationIds.length > 0
  const canProceedStep2 = true // constraints are optional
  const canProceedStep3 = selectedDriverIds.length > 0 && settings.depotCoordinates !== null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        back={null}
        right={
          currentStep > 1 ? (
            <Button size="mini" color="default" onClick={reset}>
              重新开始
            </Button>
          ) : null
        }
      >
        今日调度
      </NavBar>

      {/* Step indicator */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Steps current={currentStep - 1} style={{ '--title-font-size': '12px' }}>
          <Steps.Step title="选地点" />
          <Steps.Step title="设约束" />
          <Steps.Step title="选司机" />
          <Steps.Step title="查结果" />
        </Steps>
      </div>

      {/* Step content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {currentStep === 1 && <StepLocations />}
        {currentStep === 2 && <StepConstraints />}
        {currentStep === 3 && <StepDrivers />}
        {currentStep === 4 && <StepResults />}
      </div>

      {/* Navigation buttons */}
      {currentStep < 4 && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          gap: '8px',
        }}>
          {currentStep > 1 && (
            <Button
              block
              size="large"
              color="default"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              上一步
            </Button>
          )}
          {currentStep < 3 && (
            <Button
              block
              size="large"
              color="primary"
              disabled={
                (currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2)
              }
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              下一步
            </Button>
          )}
          {currentStep === 3 && (
            <Button
              block
              size="large"
              color="primary"
              loading={isCalculating}
              disabled={!canProceedStep3}
              onClick={() => void handleCalculate()}
            >
              {isCalculating ? '计算中...' : '开始计算'}
            </Button>
          )}
        </div>
      )}

      {/* Error display */}
      {calculationError && (
        <div style={{ padding: '8px 16px', color: '#ff4d4f', fontSize: '13px', background: '#fff2f0' }}>
          ⚠️ {calculationError}
        </div>
      )}
    </div>
  )
}
