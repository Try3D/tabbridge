import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/lib/theme'

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanning, setScanning] = useState(false)
  const [code, setCode] = useState('')
  const scanned = useRef(false)

  function navigateTo(raw: string) {
    // Accept full URL (https://tabbridge.pages.dev/word-word) or bare code
    const extracted = raw.includes('/')
      ? raw.split('/').pop()?.trim().toLowerCase()
      : raw.trim().toLowerCase()
    if (extracted) router.push(`/session/${extracted}`)
  }

  async function handleScanPress() {
    if (!permission?.granted) {
      const result = await requestPermission()
      if (!result.granted) return
    }
    scanned.current = false
    setScanning(true)
  }

  function handleBarcode({ data }: { data: string }) {
    if (scanned.current) return
    scanned.current = true
    setScanning(false)
    navigateTo(data)
  }

  function handleSubmit() {
    navigateTo(code)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.brandIcon}>⇄</Text>
          <Text style={styles.brandName}>TabBridge</Text>
        </View>

        <Text style={styles.subtitle}>
          Scan a QR code or enter a share code to view tabs from another device
        </Text>

        {/* QR Scanner */}
        {scanning ? (
          <View style={styles.scannerWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={handleBarcode}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
            <Pressable style={styles.cancelBtn} onPress={() => setScanning(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.scanBtn} onPress={handleScanPress}>
            <Text style={styles.scanIcon}>⊡</Text>
            <Text style={styles.scanBtnText}>Scan QR Code</Text>
          </Pressable>
        )}

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or enter code</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Manual entry */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="word-word-word-word"
            placeholderTextColor={colors.surface1}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
          <Pressable
            style={[styles.goBtn, !code.trim() && styles.goBtnDisabled]}
            onPress={handleSubmit}
            disabled={!code.trim()}
          >
            <Text style={styles.goBtnText}>Go</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.base,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 20,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  brandIcon: {
    fontSize: 24,
    color: colors.mauve,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.mauve,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.overlay0,
    textAlign: 'center',
    lineHeight: 20,
  },
  scannerWrap: {
    gap: 12,
  },
  camera: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface0,
  },
  cancelBtn: {
    backgroundColor: colors.surface0,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface0,
    borderRadius: 14,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanIcon: {
    fontSize: 22,
    color: colors.mauve,
  },
  scanBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface1,
  },
  dividerText: {
    fontSize: 11,
    color: colors.overlay0,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  goBtn: {
    backgroundColor: colors.mauve,
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goBtnDisabled: {
    opacity: 0.35,
  },
  goBtnText: {
    color: colors.base,
    fontWeight: '700',
    fontSize: 14,
  },
})
