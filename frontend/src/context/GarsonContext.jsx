import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStaff } from '../lib/api/tables';

/**
 * GarsonContext - Global state for waiter/staff management
 * Manages staff list and their assigned tables
 */

const GarsonContext = createContext();

export const useGarson = () => {
  const context = useContext(GarsonContext);
  if (!context) {
    throw new Error('useGarson must be used within GarsonProvider');
  }
  return context;
};

export const GarsonProvider = ({ children }) => {
  const [garsonlar, setGarsonlar] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch staff on mount
  useEffect(() => {
    const fetchGarsonlar = async () => {
      try {
        setLoading(true);
        const staff = await getStaff();
        // Filter only waiters (garson role)
        const garsonlarData = staff
          .filter(s => s.role === 'garson')
          .map(g => ({
            id: g.id,
            ad: g.name,
            aktifMasalar: [] // Will be populated from table assignments
          }));
        setGarsonlar(garsonlarData);
      } catch (error) {
        console.error('Garsonlar yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGarsonlar();
  }, []);

  // Assign waiter to a table
  const garsonAta = (masaId, garsonId) => {
    setGarsonlar(prev =>
      prev.map(g => {
        // Remove table from all waiters first
        if (g.aktifMasalar.includes(masaId)) {
          return { ...g, aktifMasalar: g.aktifMasalar.filter(m => m !== masaId) };
        }
        return g;
      }).map(g => {
        // Add table to selected waiter (if garsonId is not null)
        if (garsonId && g.id === garsonId && !g.aktifMasalar.includes(masaId)) {
          return { ...g, aktifMasalar: [...g.aktifMasalar, masaId] };
        }
        return g;
      })
    );
  };

  // Remove waiter from a table
  const garsonKaldir = (masaId) => {
    setGarsonlar(prev =>
      prev.map(g => ({
        ...g,
        aktifMasalar: g.aktifMasalar.filter(m => m !== masaId)
      }))
    );
  };

  // Get waiter assigned to a table
  const getGarsonByMasa = (masaId) => {
    return garsonlar.find(g => g.aktifMasalar.includes(masaId));
  };

  // Update waiter's assigned tables (sync with table data)
  const syncGarsonMasalar = (masalar) => {
    setGarsonlar(prev =>
      prev.map(g => {
        const assignedMasalar = masalar
          .filter(m => {
            // Support both assigneeId and garsonId fields
            const assignee = m.assigneeId || m.garsonId;
            return assignee === g.id;
          })
          .map(m => m.id);
        return { ...g, aktifMasalar: assignedMasalar };
      })
    );
  };

  const value = {
    garsonlar,
    loading,
    garsonAta,
    garsonKaldir,
    getGarsonByMasa,
    syncGarsonMasalar
  };

  return <GarsonContext.Provider value={value}>{children}</GarsonContext.Provider>;
};

export default GarsonContext;

