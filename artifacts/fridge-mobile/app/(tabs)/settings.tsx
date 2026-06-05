import { useFridge } from "@/context/FridgeContext";
import { useColors } from "@/hooks/useColors";
import { saveAioCredentials, clearAioCredentials } from "@/constants/storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";

export default function SettingsScreen() {
  const colors = useColors();
  const { aioKey, aioUsername, noKey, reloadKey, refresh } = useFridge();
  const isWeb = Platform.OS === "web";

  const [keyInput, setKeyInput] = useState<string>(aioKey);
  const [usernameInput, setUsernameInput] = useState<string>(aioUsername || "VinitIOT");
  const [saving, setSaving] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);

  const handleSave = async () => {
    if (!keyInput.trim()) {
      Alert.alert("Missing Key", "Please enter your Adafruit IO key.");
      return;
    }
    if (!usernameInput.trim()) {
      Alert.alert("Missing Username", "Please enter your Adafruit IO username.");
      return;
    }
    try {
      setSaving(true);
      await saveAioCredentials(keyInput.trim(), usernameInput.trim());
      await reloadKey();
      refresh();
      Alert.alert("✓ Saved", "Connected to Adafruit IO! Your dashboard will load now.");
    } catch {
      Alert.alert("Error", "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      "Clear Credentials",
      "This will disconnect the app from Adafruit IO. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearAioCredentials();
            setKeyInput("");
            await reloadKey();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, isWeb && { paddingTop: 67, paddingBottom: 34 }]}
    >
      {/* Status banner */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: noKey ? `${colors.destructive}12` : `${colors.success}12`,
            borderColor: noKey ? `${colors.destructive}35` : `${colors.success}35`,
            borderRadius: colors.radius,
          },
        ]}
      >
        <Ionicons
          name={noKey ? "warning-outline" : "checkmark-circle-outline"}
          size={20}
          color={noKey ? colors.destructive : colors.success}
        />
        <Text style={[styles.statusText, { color: noKey ? colors.destructive : colors.success }]}>
          {noKey
            ? "Not connected — enter your AIO key below"
            : `Connected as ${aioUsername}`}
        </Text>
      </View>

      {/* How to get key */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="key-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Adafruit IO Credentials</Text>
            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
              Find your key at io.adafruit.com → click the yellow key icon (My Key)
            </Text>
          </View>
        </View>

        {/* Username */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>AIO Username</Text>
          <TextInput
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
            value={usernameInput}
            onChangeText={setUsernameInput}
            placeholder="e.g. VinitIOT"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* AIO Key */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>AIO Key</Text>
          <View style={styles.keyRow}>
            <TextInput
              style={[
                styles.input,
                styles.keyInput,
                {
                  backgroundColor: colors.muted,
                  color: colors.foreground,
                  borderColor: colors.border,
                  borderRadius: colors.radius - 4,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={keyInput}
              onChangeText={setKeyInput}
              placeholder="aio_xxxxxxxxxxxxxxxxxxxx"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={() => setShowKey(v => !v)}
              style={[styles.eyeBtn, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius - 4 }]}
            >
              <Ionicons name={showKey ? "eye-off-outline" : "eye-outline"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Save button */}
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius - 4, opacity: pressed || saving ? 0.75 : 1 },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color={colors.primaryForeground} />
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save & Connect</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* How-to guide */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.warning}15` }]}>
            <Ionicons name="help-circle-outline" size={22} color={colors.warning} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>How to get your AIO Key</Text>
        </View>
        {[
          "1. Open io.adafruit.com in your browser",
          "2. Sign in to your Adafruit account",
          "3. Click the yellow key icon (🔑) in the top right",
          "4. Copy the \"Active Key\" value",
          "5. Paste it in the field above",
        ].map((step, i) => (
          <Text key={i} style={[styles.step, { color: colors.mutedForeground }]}>{step}</Text>
        ))}
      </View>

      {/* About */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>About</Text>
          </View>
        </View>
        <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>Smart Fridge IoT — VinitIOT</Text>
        <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>Monitors temperature, humidity, mango weight, and milk supply via Adafruit IO feeds.</Text>
        <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>Your AIO key is stored securely on this device only.</Text>
      </View>

      {/* Clear credentials */}
      {!noKey && (
        <Pressable
          style={({ pressed }) => [
            styles.clearBtn,
            { borderColor: colors.destructive, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleClear}
        >
          <Ionicons name="trash-outline" size={16} color={colors.destructive} />
          <Text style={[styles.clearText, { color: colors.destructive }]}>Disconnect & Clear Key</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 16,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
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
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  input: {
    height: 46,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 15,
  },
  keyRow: {
    flexDirection: "row",
    gap: 8,
  },
  keyInput: {
    flex: 1,
  },
  eyeBtn: {
    width: 46,
    height: 46,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  step: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  aboutText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1,
  },
  clearText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
