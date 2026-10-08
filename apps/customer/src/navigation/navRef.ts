/**
 * Shared navigation ref — lets non-screen code (push tap handler)
 * deep-link into the app.
 */
import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
