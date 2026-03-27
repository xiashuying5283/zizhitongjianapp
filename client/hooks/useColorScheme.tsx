import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { ColorSchemeName, useColorScheme as useReactNativeColorScheme } from 'react-native';

const ColorSchemeContext = createContext<'light' | 'dark' | null | undefined>(null);

const ColorSchemeProvider = function ({ children }: { children?: ReactNode }) {
  const systemColorScheme = useReactNativeColorScheme();
  const [colorScheme, setColorScheme] = useState(systemColorScheme);

  useEffect(() => {
    setColorScheme(systemColorScheme);
  }, [systemColorScheme]);

  return <ColorSchemeContext.Provider value={colorScheme}>
    {children}
  </ColorSchemeContext.Provider>
};

function useColorScheme() {
  const colorScheme = useContext(ColorSchemeContext);
  return colorScheme;
}

export {
  ColorSchemeProvider,
  useColorScheme,
}
