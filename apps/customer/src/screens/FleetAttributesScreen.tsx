import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Plus, Sigma, Trash2 } from "lucide-react-native";
import {
  AppHeader,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingView,
  Rise,
  Txt,
  useTheme,
} from "@w3ctrl/ui";
import { useT } from "@w3ctrl/i18n";
import type { TraccarComputedAttribute } from "@w3ctrl/api";
import {
  useComputedAttributes,
  useCreateComputedAttribute,
  useDeleteComputedAttribute,
} from "../api/hooks";
import type { RootNav } from "../navigation/types";

function AttributeRow({
  attr,
  index,
  onDelete,
}: {
  attr: TraccarComputedAttribute;
  index: number;
  onDelete: () => void;
}) {
  const p = useTheme();
  const t = useT();
  return (
    <Rise delay={Math.min(index, 8) * 60}>
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: p.brandSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sigma size={20} color={p.brandInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="subtitle" style={{ fontWeight: "700" }}>
              {attr.attribute}
            </Txt>
            <View style={{ marginTop: 4, flexDirection: "row" }}>
              <Badge text={attr.expression} tone="neutral" />
            </View>
            {attr.description ? (
              <Txt variant="small" color={p.muted} style={{ marginTop: 4 }}>
                {attr.description}
              </Txt>
            ) : null}
          </View>
          <Pressable
            onPress={onDelete}
            hitSlop={10}
            accessibilityLabel={t("Delete attribute")}
            style={{ padding: 6 }}
          >
            <Trash2 size={18} color={p.alert} />
          </Pressable>
        </View>
      </Card>
    </Rise>
  );
}

export default function FleetAttributesScreen() {
  const p = useTheme();
  const t = useT();
  const navigation = useNavigation<RootNav>();
  const { data, isLoading, isRefetching, refetch, isError } =
    useComputedAttributes();
  const createAttr = useCreateComputedAttribute();
  const deleteAttr = useDeleteComputedAttribute();

  const [adding, setAdding] = useState(false);
  const [attribute, setAttribute] = useState("");
  const [expression, setExpression] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setAdding(false);
    setAttribute("");
    setExpression("");
    setDescription("");
    setFormError(null);
  };

  const handleCreate = () => {
    if (!attribute.trim()) {
      setFormError(t("Attribute name is required."));
      return;
    }
    if (!expression.trim()) {
      setFormError(t("Expression is required."));
      return;
    }
    setFormError(null);
    const payload: Omit<TraccarComputedAttribute, "id"> = {
      attribute: attribute.trim(),
      expression: expression.trim(),
      description: description.trim() || undefined,
    };
    createAttr.mutate(payload, {
      onSuccess: resetForm,
      onError: (e) =>
        setFormError(
          e instanceof Error ? e.message : t("Couldn't add the attribute."),
        ),
    });
  };

  const handleDelete = (attr: TraccarComputedAttribute) => {
    Alert.alert(t("Delete attribute"), `${t("Remove")} ${attr.attribute}?`, [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: () =>
          deleteAttr.mutate(attr.id, {
            onError: (e) =>
              Alert.alert(
                t("Couldn't delete"),
                e instanceof Error ? e.message : "",
              ),
          }),
      },
    ]);
  };

  if (isLoading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: p.paper }}>
        <AppHeader
          title={t("Computed attributes")}
          subtitle={t("Formulas on every position")}
          onBack={() => navigation.goBack()}
        />
        <LoadingView text={t("Loading attributes…")} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <AppHeader
        title={t("Computed attributes")}
        subtitle={
          data && data.length > 0
            ? `${data.length} ${t("attributes")}`
            : undefined
        }
        onBack={() => navigation.goBack()}
        right={
          <Pressable
            onPress={() => setAdding((a) => !a)}
            hitSlop={12}
            accessibilityLabel={t("Add attribute")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: p.brand,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Plus size={15} color="#181200" />
            <Txt variant="small" style={{ fontWeight: "700", color: "#181200" }}>
              {t("Add")}
            </Txt>
          </Pressable>
        }
      />
      <FlatList
        data={data ?? []}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={p.brand}
          />
        }
        ListHeaderComponent={
          <>
            {adding ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <Card>
                  <Field
                    label={t("Attribute")}
                    value={attribute}
                    onChangeText={setAttribute}
                    placeholder={t("e.g. fuelUsed")}
                    autoCapitalize="none"
                  />
                  <Field
                    label={t("Expression")}
                    value={expression}
                    onChangeText={setExpression}
                    placeholder={t("e.g. fuel * distance")}
                    autoCapitalize="none"
                    hint={t("Uses position values like speed, distance, fuel, ignition.")}
                  />
                  <Field
                    label={t("Description (optional)")}
                    value={description}
                    onChangeText={setDescription}
                    placeholder={t("What this attribute means")}
                    autoCapitalize="sentences"
                  />
                  {formError ? (
                    <Txt
                      variant="small"
                      color={p.alert}
                      style={{ marginBottom: 8 }}
                    >
                      {formError}
                    </Txt>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title={t("Add attribute")}
                        onPress={handleCreate}
                        loading={createAttr.isPending}
                        disabled={!attribute.trim() || !expression.trim()}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        title={t("Cancel")}
                        kind="secondary"
                        onPress={resetForm}
                      />
                    </View>
                  </View>
                </Card>
              </View>
            ) : null}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: adding ? 0 : 12,
                paddingBottom: 12,
              }}
            >
              <Txt variant="small" color={p.muted}>
                {t(
                  "Live formulas evaluated on every position — fuel math, night flags and custom scores.",
                )}
              </Txt>
            </View>
            {isError && !data ? (
              <EmptyState
                title={t("Couldn't load attributes")}
                hint={t("Pull to refresh or try again later.")}
              />
            ) : !data || data.length === 0 ? (
              <EmptyState
                title={t("No computed attributes yet")}
                hint={t("Add a formula, e.g. fuel * distance, and it will be evaluated on every position.")}
              />
            ) : null}
          </>
        }
        ListHeaderComponentStyle={{ paddingBottom: 4 }}
        renderItem={({ item, index }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <AttributeRow
              attr={item}
              index={index}
              onDelete={() => handleDelete(item)}
            />
          </View>
        )}
      />
    </View>
  );
}
