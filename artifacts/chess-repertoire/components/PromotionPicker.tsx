import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PieceColor } from "@/types/chess";
import ChessPiece from "@/components/ChessPiece";

interface PromotionPickerProps {
  color: PieceColor;
  onSelect: (piece: string) => void;
  onCancel: () => void;
  lightColor: string;
  darkColor: string;
}

const PROMOTION_PIECES = ["q", "r", "b", "n"] as const;

export default function PromotionPicker({ color, onSelect, onCancel, lightColor, darkColor }: PromotionPickerProps) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} onPress={onCancel} activeOpacity={1}>
        <View style={styles.container}>
          <Text style={styles.title}>Promote to:</Text>
          <View style={styles.pieces}>
            {PROMOTION_PIECES.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.pieceButton, { backgroundColor: lightColor }]}
                onPress={() => onSelect(p)}
              >
                <ChessPiece piece={{ type: p, color }} size={52} />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  title: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "600",
  },
  pieces: {
    flexDirection: "row",
    gap: 8,
  },
  pieceButton: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancel: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  cancelText: {
    color: "#94a3b8",
    fontSize: 14,
  },
});
