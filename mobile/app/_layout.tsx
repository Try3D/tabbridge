import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { colors } from '@/lib/theme'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.mantle },
          headerTintColor: colors.mauve,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.base },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'TabBridge', headerShown: false }} />
        <Stack.Screen
          name="session/[code]"
          options={({ route }) => ({
            // @ts-expect-error params typing
            title: route.params?.code ?? 'Tabs',
            headerBackTitle: 'Back',
          })}
        />
      </Stack>
    </>
  )
}
