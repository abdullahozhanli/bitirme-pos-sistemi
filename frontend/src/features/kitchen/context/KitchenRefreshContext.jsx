import { createContext, useContext } from 'react';

export const RefreshContext = createContext(null);

export const useRefresh = () => useContext(RefreshContext);








