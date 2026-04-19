import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ANNOTATION_COLORS, ANNOTATION_SYMBOLS, MoveAnnotation } from "@/types/chess";
import { useColors } from "@/hooks/useColors";

const ANNOTATIONS: MoveAnnotation[] = [
  "brilliant", "great", "good", "best", "second_best", "book",
  "inaccuracy", "mistake", "blunder",
];

interface AnnotationPickerProps {
  currentAnnotation?: MoveAnnotation;
  onSelect: (annotation: MoveAnnotation | undefined) => void;
}

export default function AnnotationPicker({ currentAnnotation, onSelect }: AnnotationPickerProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Annotate move:</Text>
      <View style={styles.row}>
        {ANNOTATIONS.map(ann => {
          const isSelected = currentAnnotation === ann;
          const color = ANNOTATION_COLORS[ann];
          return (
            <TouchableOpacity
              key={ann}
              style={[
                styles.btn,
                { borderColor: color, backgroundColor: isSelected ? color : "transparent" },
              ]}
              onPress={() => onSelect(isSelected ? undefined : ann)}
            >
              {ann === "book" ? (
                <Feather
                  name="book"
                  size={15}
                  color={isSelected ? "#fff" : color}
                />
              ) : (
                <Text style={[styles.symbol, { color: isSelected ? "#fff" : color }]}>
                  {ANNOTATION_SYMBOLS[ann]}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  symbol: {
    fontSize: 13,
    fontWeight: "800",
  },
});
