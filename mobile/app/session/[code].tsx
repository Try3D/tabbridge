import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchSession, type TabData } from '@/lib/api'
import { TabRow } from '@/components/TabRow'
import { colors } from '@/lib/theme'

type ListItem =
  | { kind: 'separator'; label: string; key: string }
  | { kind: 'tab'; tab: TabData; key: string }

export default function SessionScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const [tabs, setTabs] = useState<TabData[]>([])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const session = await fetchSession(code)
      if (!session) {
        setNotFound(true)
      } else {
        setTabs(session.tabs)
        setUpdatedAt(session.updated_at)
        setNotFound(false)
      }
    } catch {
      // keep stale data on network error
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [code])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.mauve} />
      </SafeAreaView>
    )
  }

  if (notFound) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.notFoundTitle}>Session not found</Text>
        <Text style={styles.notFoundSub}>This code has expired or doesn't exist.</Text>
      </SafeAreaView>
    )
  }

  const windows: Record<number, TabData[]> = {}
  for (const tab of tabs) {
    if (!windows[tab.windowId]) windows[tab.windowId] = []
    windows[tab.windowId].push(tab)
  }
  const windowGroups = Object.entries(windows)
  const multiWindow = windowGroups.length > 1

  const items: ListItem[] = []
  windowGroups.forEach(([windowId, windowTabs], i) => {
    if (multiWindow) {
      items.push({ kind: 'separator', label: `Window ${i + 1}`, key: `sep-${windowId}` })
    }
    windowTabs.forEach(tab => {
      items.push({ kind: 'tab', tab, key: `${tab.windowId}-${tab.id}` })
    })
  })

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={item => item.key}
        renderItem={({ item }) =>
          item.kind === 'separator' ? (
            <View style={styles.separator}>
              <Text style={styles.separatorText}>{item.label}</Text>
            </View>
          ) : (
            <TabRow tab={item.tab} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            tintColor={colors.mauve}
          />
        }
        ListHeaderComponent={
          updatedAt ? (
            <View style={styles.header}>
              <Text style={styles.updatedText}>
                Updated {new Date(updatedAt * 1000).toLocaleTimeString()}
              </Text>
              <Text style={styles.countText}>
                {tabs.length} tab{tabs.length !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No tabs shared yet</Text>
          </View>
        }
        contentContainerStyle={tabs.length === 0 ? styles.emptyContainer : undefined}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.base,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.base,
    gap: 8,
    padding: 24,
  },
  notFoundTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.red,
  },
  notFoundSub: {
    fontSize: 13,
    color: colors.overlay0,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface0,
  },
  updatedText: {
    fontSize: 11,
    color: colors.overlay0,
  },
  countText: {
    fontSize: 11,
    color: colors.overlay0,
    backgroundColor: colors.surface0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  separator: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  separatorText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.surface1,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: colors.overlay0,
  },
})
