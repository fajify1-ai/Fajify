import { useState } from 'react'
import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { IconArrowRight, IconGlyph, type IconName } from '../components/Icons'
import { useDarkMode } from '../store/darkMode'

type Props = {
 navigate: NavigateFn
 onPersonalInformation?:()=>void
 onSecurity?:()=>void
}

const RED = '#FA3F38'
const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French']
const CURRENCIES = ['NGN ₦', 'USD $', 'GBP £', 'EUR €', 'GHS ₵', 'KES KSh']

function PickerSheet({
  title, options, value, onSelect, onClose, dark,
}: {
  title: string; options: string[]; value: string; onSelect: (v: string) => void; onClose: () => void; dark: boolean
}) {
  const surface = dark ? '#1C1C1C' : '#fff'
  const ink = dark ? '#F0F0F0' : '#1A1A1A'
  const border = dark ? '#2A2A2A' : '#F0F0F0'

  return (
    <>
      <button aria-label="Close" onClick={onClose} className="fixed inset-0 z-[100] bg-black/40" />
      <div className="fixed bottom-0 left-1/2 z-[110] w-full max-w-[430px] -translate-x-1/2 rounded-t-[28px] pb-10 md:bottom-1/2 md:max-w-[560px] md:translate-y-1/2 md:rounded-[28px]"
        style={{ background: surface, boxShadow: '0 -8px 40px rgba(0,0,0,.2)' }}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full" style={{ background: border }} />
        </div>
        <h2 className="px-5 pb-4 text-[18px] font-black" style={{ color: ink }}>{title}</h2>
        <div className="flex flex-col" style={{ borderTop: `1px solid ${border}` }}>
          {options.map(opt => (
            <button key={opt} onClick={() => { onSelect(opt); onClose() }}
              className="flex items-center justify-between px-5 py-4 text-left"
              style={{ borderBottom: `1px solid ${border}`, background: 'none', border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: border }}>
              <span className="text-[15px] font-semibold" style={{ color: ink }}>{opt}</span>
              {value === opt && <span className="text-[18px]" style={{ color: RED }}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default function SettingsScreen({ navigate,onPersonalInformation,onSecurity }: Props) {
  const { dark, mode: themeMode, setMode } = useDarkMode()
  const [notifications, setNotifications] = useState(true)
  const [locationServices, setLocationServices] = useState(true)
  const [emailUpdates, setEmailUpdates] = useState(false)
  const [language, setLanguage] = useState('English')
  const [currency, setCurrency] = useState('NGN ₦')
  const [picker, setPicker] = useState<'language' | 'currency' | null>(null)

  const surface  = dark ? '#1C1C1C' : '#FFFFFF'
  const bg       = dark ? '#0F0F0F' : '#F8F8F8'
  const ink      = dark ? '#F0F0F0' : '#1A1A1A'
  const muted    = dark ? '#888' : '#777477'
  const border   = dark ? '#2A2A2A' : '#E8E8E8'
  const divider  = dark ? '#2A2A2A' : '#F3F3F3'
  const labelClr = dark ? '#666' : '#999'

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <div onClick={onChange}
      className="relative cursor-pointer transition-all duration-200 shrink-0"
      style={{ width: 46, height: 26, borderRadius: 999, background: value ? RED : (dark ? '#3A3A3A' : '#E0E0E0') }}>
      <div className="absolute top-[4px] rounded-full bg-white shadow-sm transition-all duration-200"
        style={{ left: value ? 24 : 4, width: 18, height: 18 }} />
    </div>
  )

  const Row = ({ icon, label, right }: { icon: IconName; label: string; right: React.ReactNode }) => (
    <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: `1px solid ${divider}` }}>
      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] shrink-0"
        style={{ background: dark ? '#2A2A2A' : '#FFF1F0' }}>
        <IconGlyph name={icon} size={18} color={RED} />
      </div>
      <span className="flex-1 text-[14px] font-semibold" style={{ color: ink }}>{label}</span>
      {right}
    </div>
  )

  const ArrowRow = ({ icon, label, value, onPress }: { icon: IconName; label: string; value?: string; onPress?: () => void }) => (
    <button onClick={onPress} className="w-full text-left" style={{ background: 'none', border: 'none', padding: 0 }}>
      <Row icon={icon} label={label} right={
        <div className="flex items-center gap-2">
          {value && <span className="text-[13px] font-semibold" style={{ color: muted }}>{value}</span>}
          <IconArrowRight size={16} color={muted} />
        </div>
      } />
    </button>
  )

  const SectionLabel = ({ text }: { text: string }) => (
    <p className="px-1 pb-2 pt-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: labelClr }}>{text}</p>
  )

  return (
    <div className="min-h-screen w-full pb-24 font-[family-name:var(--font-ui)] md:pl-24" style={{ background: bg }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-5 pt-14 pb-5 md:px-10 md:pt-8 lg:px-16" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <button onClick={() => navigate({ name: 'profile' })} className="grid h-10 w-10 place-items-center rounded-full border" style={{ borderColor: border }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="m-0 text-[24px] font-black tracking-[-0.03em] md:text-[32px]" style={{ color: ink }}>Settings</h1>
      </div>

      <div className="grid w-full grid-cols-1 gap-5 px-5 py-6 pb-32 md:grid-cols-2 md:px-10 lg:px-16">

        {/* Account */}
        <section>
          <SectionLabel text="Account" />
          <div className="rounded-[18px] overflow-hidden border" style={{ background: surface, borderColor: border }}>
            <ArrowRow icon="user" label="Personal Information" onPress={onPersonalInformation??(()=>navigate({name:'profile'}))} />
            <ArrowRow icon="lock" label="Change Password" onPress={onSecurity} />
            <ArrowRow icon="mail" label="Email Preferences" onPress={onSecurity} />
            <div style={{ borderBottom: 'none' }}>
              <ArrowRow icon="phone" label="Phone Number" onPress={onSecurity} />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <SectionLabel text="Notifications" />
          <div className="rounded-[18px] overflow-hidden border" style={{ background: surface, borderColor: border }}>
            <Row icon="message" label="Push Notifications" right={<Toggle value={notifications} onChange={() => setNotifications(v => !v)} />} />
            <Row icon="mail" label="Email Updates" right={<Toggle value={emailUpdates} onChange={() => setEmailUpdates(v => !v)} />} />
            <div style={{ borderBottom: 'none' }}>
              <Row icon="pin" label="Location Services" right={<Toggle value={locationServices} onChange={() => setLocationServices(v => !v)} />} />
            </div>
          </div>
        </section>

        {/* App preferences */}
        <section>
          <SectionLabel text="Preferences" />
          <div className="rounded-[18px] overflow-hidden border" style={{ background: surface, borderColor: border }}>
            <ArrowRow icon="globe" label="Language" value={language} onPress={() => setPicker('language')} />
            <ArrowRow icon="wallet" label="Currency" value={currency} onPress={() => setPicker('currency')} />
            <div style={{ borderBottom: 'none' }}>
              <Row icon="moon" label="Theme" right={
                <div className="flex rounded-[10px] p-[3px] gap-[2px]" style={{ background: dark ? '#2A2A2A' : '#EDEDED' }}>
                  {(['light', 'dark', 'system'] as const).map(opt => (
                    <button key={opt} onClick={() => setMode(opt)}
                      className="px-3 py-1 rounded-[8px] text-[11px] font-bold capitalize transition-all duration-150"
                      style={{
                        background: themeMode === opt ? (dark ? '#3A3A3A' : '#FFF') : 'transparent',
                        color: themeMode === opt ? (dark ? '#F0F0F0' : '#1A1A1A') : muted,
                        boxShadow: themeMode === opt ? '0 1px 4px rgba(0,0,0,.12)' : 'none',
                        border: 'none',
                      }}>
                      {opt === 'light' ? '☀ Light' : opt === 'dark' ? '◗ Dark' : '⊙ System'}
                    </button>
                  ))}
                </div>
              } />
            </div>
          </div>
        </section>

        {/* Info */}
        <section>
          <SectionLabel text="Info" />
          <div className="rounded-[18px] overflow-hidden border" style={{ background: surface, borderColor: border }}>
            <ArrowRow icon="heart" label="About fajify" />
            <ArrowRow icon="file" label="Terms & Conditions" />
            <div style={{ borderBottom: 'none' }}>
              <ArrowRow icon="shield" label="Privacy Policy" />
            </div>
          </div>
        </section>

        <p className="text-center text-[12px] md:col-span-2" style={{ color: labelClr }}>fajify · Version 1.0.0</p>
      </div>

      {picker === 'language' && (
        <PickerSheet title="Language" options={LANGUAGES} value={language}
          onSelect={setLanguage} onClose={() => setPicker(null)} dark={dark} />
      )}
      {picker === 'currency' && (
        <PickerSheet title="Currency" options={CURRENCIES} value={currency}
          onSelect={setCurrency} onClose={() => setPicker(null)} dark={dark} />
      )}

      <BottomNav active="profile" navigate={navigate} />
    </div>
  )
}
