import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';

const TabBarVisibilityContext = createContext<{
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
}>({
  visible: true,
  setVisible: () => {},
});

export function TabBarVisibilityProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(true);
  return (
    <TabBarVisibilityContext.Provider value={{ visible, setVisible }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  return useContext(TabBarVisibilityContext);
}
