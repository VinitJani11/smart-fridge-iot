import { useFridge } from "@/context/FridgeContext";
import { useColors } from "@/hooks/useColors";
import { FEEDS, sendValue } from "@/constants/aio";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

function MiniBarChart({ data, colors }: { data: Array<{ time: string; temp: number }>; colors: ReturnType<typeof useColors> }) {
  if (data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="bar-chart-outline" size={28} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No history yet</Text>
      </View>
    );
  }

  const max = Math.max(...data.map(d => d.temp), 10);
  const min = Math.min(...data.map(d => d.temp), 0);
  const range = max - min || 1;

  return (
    <View style={styles.chart}>
      {data.map((d, i) => {
        const heightPct = ((d.temp - min) / range) * 0.75 + 0.1;
        return (
          <View key={i} style={styles.barCol}>
            <Text style={[styles.barValue, { color: colors.mutedForeground }]}>{d.temp.toFixed(1)}</Text>
            <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${heightPct * 100}%` as unknown as number,
                    backgroundColor: d.temp > 8 ? colors.destructive : colors.primary,
                    borderRadius: 3,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barTime, { color: colors.mutedForeground }]}>{d.time}</Text>
          </View>
        );
      })}
    </View>
  );
}

type ThresholdInputProps = {
  testID?: string;
  value: string;
  onChangeText: (v: string) => void;
  unit: string;
  placeholder: string;
  onPress: () => void;
  saving: boolean;
  colors: ReturnType<typeof useColors>;
};

function ThresholdInput({ testID, value, onChangeText, unit, placeholder, onPress, saving, colors }: ThresholdInputProps) {
  return (
    <View style={styles.inputRow}>
      <TextInput
        testID={testID}
        style={[
          styles.input,
          {
            backgroundColor: colors.muted,
            color: colors.foreground,
            borderColor: colors.border,
            borderRadius: colors.radius - 4,
            fontFamily: "Inter_500Medium",
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        maxLength={6}
      />
      <Text style={[styles.inputUnit, { color: colors.mutedForeground }]}>{unit}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.btnSmall,
          { backgroundColor: colors.warning, borderRadius: colors.radius - 4, opacity: pressed || saving ? 0.75 : 1 },
        ]}
        onPress={onPress}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.btnText, { color: "#fff" }]}>Update</Text>
        )}
      </Pressable>
    </View>
  );
}

export default function ControlsScreen() {
  const colors = useColors();
  const { milk, tempHistory, refresh, mangoThreshold, milkThreshold, minTemp, maxTemp } = useFridge();
  const isWeb = Platform.OS === "web";

  const [maxTempInput, setMaxTempInput] = useState<string>(String(maxTemp));
  const [minTempInput, setMinTempInput] = useState<string>(String(minTemp));
  const [mangoThreshInput, setMangoThreshInput] = useState<string>(String(mangoThreshold));
  const [milkThreshInput, setMilkThreshInput] = useState<string>(String(milkThreshold));

  const [resetting, setResetting] = useState<boolean>(false);
  const [savingMaxTemp, setSavingMaxTemp] = useState<boolean>(false);
  const [savingMinTemp, setSavingMinTemp] = useState<boolean>(false);
  const [savingMango, setSavingMango] = useState<boolean>(false);
  const [savingMilk, setSavingMilk] = useState<boolean>(false);

  useEffect(() => { setMaxTempInput(String(maxTemp)); }, [maxTemp]);
  useEffect(() => { setMinTempInput(String(minTemp)); }, [minTemp]);
  useEffect(() => { setMangoThreshInput(String(mangoThreshold)); }, [mangoThreshold]);
  useEffect(() => { setMilkThreshInput(String(milkThreshold)); }, [milkThreshold]);

  const haptic = async () => {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleResetMilk = async () => {
    try {
      setResetting(true);
      await haptic();
      await sendValue(FEEDS.resetMilk, "1");
      refresh();
      Alert.alert("Done", "Milk counter reset to 10.");
    } catch {
      Alert.alert("Error", "Could not reset milk counter. Check your AIO connection.");
    } finally {
      setResetting(false);
    }
  };

  const handleSetMaxTemp = async () => {
    const num = parseFloat(maxTempInput);
    if (isNaN(num) || num < -10 || num > 30) {
      Alert.alert("Invalid", "Enter a temperature between -10 and 30°C.");
      return;
    }
    try {
      setSavingMaxTemp(true);
      await haptic();
      await sendValue(FEEDS.maxTemp, maxTempInput);
      refresh();
      Alert.alert("Done", `Max temperature set to ${maxTempInput}°C.`);
    } catch {
      Alert.alert("Error", "Could not update max temperature threshold.");
    } finally {
      setSavingMaxTemp(false);
    }
  };

  const handleSetMinTemp = async () => {
    const num = parseFloat(minTempInput);
    if (isNaN(num) || num < -10 || num > 30) {
      Alert.alert("Invalid", "Enter a temperature between -10 and 30°C.");
      return;
    }
    try {
      setSavingMinTemp(true);
      await haptic();
      await sendValue(FEEDS.minTemp, minTempInput);
      refresh();
      Alert.alert("Done", `Min temperature set to ${minTempInput}°C.`);
    } catch {
      Alert.alert("Error", "Could not update min temperature threshold.");
    } finally {
      setSavingMinTemp(false);
    }
  };

  const handleSetMangoThreshold = async () => {
    const num = parseFloat(mangoThreshInput);
    if (isNaN(num) || num < 0 || num > 5000) {
      Alert.alert("Invalid", "Enter a weight between 0 and 5000g.");
      return;
    }
    try {
      setSavingMango(true);
      await haptic();
      await sendValue(FEEDS.mangoThreshold, mangoThreshInput);
      refresh();
      Alert.alert("Done", `Mango low alert set to ≤${mangoThreshInput}g.`);
    } catch {
      Alert.alert("Error", "Could not update mango threshold.");
    } finally {
      setSavingMango(false);
    }
  };

  const handleSetMilkThreshold = async () => {
    const num = parseFloat(milkThreshInput);
    if (isNaN(num) || num < 0 || num > 100) {
      Alert.alert("Invalid", "Enter a value between 0 and 100 units.");
      return;
    }
    try {
      setSavingMilk(true);
      await haptic();
      await sendValue(FEEDS.milkThreshold, milkThreshInput);
      refresh();
      Alert.alert("Done", `Milk low alert set to ≤${milkThreshInput} units.`);
    } catch {
      Alert.alert("Error", "Could not update milk threshold.");
    } finally {
      setSavingMilk(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, isWeb && { paddingTop: 67, paddingBottom: 34 }]}
      testID="controls-scroll"
    >
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Device Controls</Text>
      <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
        Send commands to your ESP32 via Adafruit IO
      </Text>

      {/* Reset Milk */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="refresh-circle-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Reset Milk Counter</Text>
            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
              Current: {milk === "--" ? "–" : `${milk} units`} · Resets to 10
            </Text>
          </View>
        </View>
        <Pressable
          testID="button-reset-milk"
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.primary, borderRadius: colors.radius - 4, opacity: pressed || resetting ? 0.75 : 1 },
          ]}
          onPress={handleResetMilk}
          disabled={resetting}
        >
          {resetting ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Reset to 10</Text>
          )}
        </Pressable>
      </View>

      {/* Temperature Range */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.warning}15` }]}>
            <Ionicons name="thermometer-outline" size={24} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Temperature Range</Text>
            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
              Current safe range: {minTemp}°C – {maxTemp}°C
            </Text>
          </View>
        </View>
        <View style={styles.thresholdRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.thresholdLabel, { color: colors.mutedForeground }]}>Min °C</Text>
            <ThresholdInput
              testID="input-min-temp"
              value={minTempInput}
              onChangeText={setMinTempInput}
              unit=""
              placeholder="0"
              onPress={handleSetMinTemp}
              saving={savingMinTemp}
              colors={colors}
            />
          </View>
          <View style={[styles.thresholdDivider, { backgroundColor: colors.border }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.thresholdLabel, { color: colors.mutedForeground }]}>Max °C</Text>
            <ThresholdInput
              testID="input-max-temp"
              value={maxTempInput}
              onChangeText={setMaxTempInput}
              unit=""
              placeholder="8"
              onPress={handleSetMaxTemp}
              saving={savingMaxTemp}
              colors={colors}
            />
          </View>
        </View>
      </View>

      {/* Mango Low Threshold */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.warning}15` }]}>
            <Ionicons name="scale-outline" size={24} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Mango Low Alert</Text>
            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
              Alerts when weight drops to ≤{mangoThreshold}g
            </Text>
          </View>
        </View>
        <ThresholdInput
          testID="input-mango-threshold"
          value={mangoThreshInput}
          onChangeText={setMangoThreshInput}
          unit="g"
          placeholder="50"
          onPress={handleSetMangoThreshold}
          saving={savingMango}
          colors={colors}
        />
      </View>

      {/* Milk Low Threshold */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.warning}15` }]}>
            <Ionicons name="beaker-outline" size={24} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Milk Low Alert</Text>
            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
              Alerts when supply drops to ≤{milkThreshold} units
            </Text>
          </View>
        </View>
        <ThresholdInput
          testID="input-milk-threshold"
          value={milkThreshInput}
          onChangeText={setMilkThreshInput}
          unit="units"
          placeholder="2"
          onPress={handleSetMilkThreshold}
          saving={savingMilk}
          colors={colors}
        />
      </View>

      {/* Temperature History */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="analytics-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Temperature History</Text>
            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>Last 10 readings from fridge</Text>
          </View>
        </View>
        <MiniBarChart data={tempHistory} colors={colors} />
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Connected to Adafruit IO · VinitIOT
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  btn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSmall: {
    height: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    width: 72,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    fontSize: 16,
    textAlign: "center",
  },
  inputUnit: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  thresholdRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  thresholdDivider: {
    width: 1,
    alignSelf: "stretch",
    marginTop: 20,
  },
  thresholdLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 140,
    gap: 6,
    paddingTop: 8,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    gap: 4,
  },
  barValue: {
    fontSize: 8,
    fontFamily: "Inter_400Regular",
  },
  barTrack: {
    flex: 1,
    width: "100%",
    borderRadius: 3,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    width: "100%",
  },
  barTime: {
    fontSize: 7,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  emptyChart: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingBottom: 8,
  },
});
