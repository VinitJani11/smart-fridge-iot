import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

type Props = {
  label: string;
  value: string;
  unit?: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: "ok" | "warning" | "loading";
  badge?: string;
  testID?: string;
};

export function SensorCard({ label, value, unit, icon, status, badge, testID }: Props) {
  const colors = useColors();
  const isWeb = Platform.OS === "web";

  const statusColor =
    status === "ok" ? colors.success :
    status === "warning" ? colors.destructive :
    colors.mutedForeground;

  const borderColor =
    status === "ok" ? colors.success :
    status === "warning" ? colors.destructive :
    colors.border;

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor,
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
    >
      <View style={styles.top}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Ionicons name={icon} size={16} color={statusColor} />
      </View>
      <View style={styles.bottom}>
        <Text style={[styles.value, { color: status === "loading" ? colors.mutedForeground : colors.foreground }]}>
          {value}
          {unit && value !== "--" ? (
            <Text style={[styles.unit, { color: colors.mutedForeground }]}>{unit}</Text>
          ) : null}
        </Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: `${colors.destructive}20` }]}>
            <Text style={[styles.badgeText, { color: colors.destructive }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  bottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
  },
  value: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  unit: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});
