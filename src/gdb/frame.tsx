import { createContext, useContext } from "react";
import { useWindowDimensions } from "react-native";

// Ancho del «teléfono»: en nativo es la ventana; en la vista web de demo (back office + teléfono) es el marco del teléfono.
export const FrameWidthContext = createContext<number | null>(null);

export function useFrameWidth(): number {
  const frame = useContext(FrameWidthContext);
  const { width } = useWindowDimensions();
  return frame ?? width;
}
