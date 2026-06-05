import { SensorCard } from "@/components/SensorCard";
import { useFridge } from "@/context/FridgeContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function DashboardScreen() {
  const colors = useColors();
  const {
    temperature, humidity, mango, milk, door,
    alertMsg, alertTime, lastUpdated, loading, noKey, refresh,
    mangoThreshold, milkThreshold, minTemp, maxTemp,
  } = useFridge();

  const isWeb = Platform.OS === "web";

  const onRefresh = useCallback(async () => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refresh();
  }, [refresh]);

  const tempNum = parseFloat(temperature);
  const dataLoaded = temperature !== "--";
  const isTempOk = isNaN(tempNum) || (tempNum >= minTemp && tempNum <= maxTemp);
  const isMangoLow = dataLoaded && !isNaN(parseFloat(mango)) && parseFloat(mango) <= mangoThreshold;
  const isMilkLow = dataLoaded && !isNaN(parseFloat(milk)) && parseFloat(milk) <= milkThreshold;
  const isDoorOpen = dataLoaded && door.includes("OPEN");
  const hasAlerts = dataLoaded && (!isTempOk || isMangoLow || isMilkLow || isDoorOpen);
  const allClear = dataLoaded && !hasAlerts;

  if (noKey) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="key-outline" size={48} color={colors.primary} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Setup Required</Text>
        <Text style={[styles.errorMsg, { color: colors.mutedForeground }]}>
          Go to the Settings tab and enter your Adafruit IO key to connect your fridge.
        </Text>
        <View style={[{
          backgroundColor: `${colors.primary}15`,
          borderColor: `${colors.primary}35`,
          borderWidth: 1,
          borderRadius: colors.radius,
          padding: 12,
          marginTop: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }]}>
          <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", fontSize: 14 }}>
            Tap ⚙ Settings tab below
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, isWeb && { paddingTop: 67, paddingBottom: 34 }]}
      refreshControl={
        <RefreshControl
          refreshing={loading && !!lastUpdated}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      testID="dashboard-scroll"
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Smart Fridge</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>VinitIOT Control Room</Text>
        </View>
        {lastUpdated && (
          <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
            {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
      </View>

      {/* Loading on first load */}
      {loading && !lastUpdated && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Connecting to fridge...</Text>
        </View>
      )}

      {/* Status Banner */}
      {dataLoaded && (
        <View
          testID="status-banner"
          style={[
            styles.banner,
            {
              backgroundColor: allClear ? `${colors.success}15` : `${colors.destructive}12`,
              borderColor: allClear ? `${colors.success}40` : `${colors.destructive}30`,
              borderRadius: colors.radius,
            },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: allClear ? colors.success : colors.destructive }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: allClear ? colors.success : colors.destructive }]}>
              {allClear ? "All Clear" : "Attention Required"}
            </Text>
            {hasAlerts && (
              <View style={{ gap: 2, marginTop: 4 }}>
                {!isTempOk && <Text style={[styles.bannerItem, { color: colors.destructive }]}>• Temperature outside safe range (0–8°C)</Text>}
                {isMangoLow && <Text style={[styles.bannerItem, { color: colors.destructive }]}>• Mango weight low ({mango}g)</Text>}
                {isMilkLow && <Text style={[styles.bannerItem, { color: colors.destructive }]}>• Milk supply low ({milk} units)</Text>}
                {isDoorOpen && <Text style={[styles.bannerItem, { color: colors.destructive }]}>• Fridge door is open</Text>}
              </View>
            )}
            {allClear && (
              <Text style={[styles.bannerItem, { color: `${colors.success}cc` }]}>Fridge operating normally</Text>
            )}
          </View>
        </View>
      )}

      {/* Sensor Grid — Row 1 */}
      <View style={styles.row}>
        <SensorCard
          testID="card-temperature"
          label="Temp"
          value={temperature}
          unit="°C"
          icon="thermometer-outline"
          status={!dataLoaded ? "loading" : isTempOk ? "ok" : "warning"}
        />
        <SensorCard
          testID="card-humidity"
          label="Humidity"
          value={humidity}
          unit="%"
          icon="water-outline"
          status={!dataLoaded ? "loading" : "ok"}
        />
      </View>

      {/* Sensor Grid — Row 2 */}
      <View style={styles.row}>
        <SensorCard
          testID="card-mango"
          label="Mango"
          value={mango}
          unit="g"
          icon="scale-outline"
          status={!dataLoaded ? "loading" : isMangoLow ? "warning" : "ok"}
          badge={isMangoLow ? "Low" : undefined}
        />
        <SensorCard
          testID="card-milk"
          label="Milk"
          value={milk}
          unit=" units"
          icon="beaker-outline"
          status={!dataLoaded ? "loading" : isMilkLow ? "warning" : "ok"}
          badge={isMilkLow ? "Low" : undefined}
        />
      </View>

      {/* Door — full width */}
      <View style={[
        styles.doorCard,
        {
          backgroundColor: colors.card,
          borderColor: isDoorOpen ? colors.destructive : colors.success,
          borderRadius: colors.radius,
          ...(isWeb ? { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" } : {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }),
        },
      ]}
        testID="card-door"
      >
        <Ionicons
          name={isDoorOpen ? "lock-open-outline" : "lock-closed-outline"}
          size={22}
          color={isDoorOpen ? colors.destructive : colors.success}
        />
        <View>
          <Text style={[styles.doorLabel, { color: colors.mutedForeground }]}>Door</Text>
          <Text style={[styles.doorValue, { color: isDoorOpen ? colors.destructive : colors.success }]}>
            {door === "--" ? "--" : isDoorOpen ? door : "Closed"}
          </Text>
        </View>
      </View>

      {/* Latest Alert */}
      {alertMsg ? (
        <View style={[styles.alertBox, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40`, borderRadius: colors.radius }]}
          testID="latest-alert"
        >
          <Ionicons name="warning-outline" size={18} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { color: colors.foreground }]}>Latest Alert</Text>
            <Text style={[styles.alertMsg, { color: colors.foreground }]}>{alertMsg}</Text>
            {alertTime ? <Text style={[styles.alertTime, { color: colors.mutedForeground }]}>{alertTime}</Text> : null}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  bannerTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  bannerItem: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  doorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderWidth: 1.5,
  },
  doorLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  doorValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  alertBox: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  alertTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  alertMsg: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  alertTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  errorMsg: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
