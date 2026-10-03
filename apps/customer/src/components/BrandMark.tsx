import React from "react";
import { Image, Text, View } from "react-native";

/**
 * Brand lockup for app headers: the real W3ctrl logo mark followed by a
 * dark bold "Track", mirroring the web app's logo component.
 * The source PNG is 179x70; width is derived to preserve the aspect ratio.
 */
export function BrandMark({ height = 30 }: { height?: number }) {
  const width = (height * 179) / 70;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Image
        source={require("../../assets/w3ctrl-logo.png")}
        style={{ height, width }}
        resizeMode="contain"
      />
      <Text
        style={{
          fontSize: 17,
          fontWeight: "800",
          color: "#101014",
          letterSpacing: -0.2,
        }}
      >
        Track
      </Text>
    </View>
  );
}

export default BrandMark;
