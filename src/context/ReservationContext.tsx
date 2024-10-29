import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, addDoc, query, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { startOfWeek, endOfWeek, parseISO } from 'date-fns';

interface Reservation {
  id: string;
  portal: string;
  floor: string;
  door: string;
  date: string;
  status: 'confirmed';
  createdAt: Timestamp;
}

interface ReservationContextType {
  reservations: Reservation[];
  createReservation: (data: Omit<Reservation, 'id' | 'createdAt'>) => Promise<void>;
  cancelReservation: (id: string) => Promise<void>;
  getWeeklyApartmentReservationsCount: (portal: string, floor: string, door: string, date: string) => number;
}

const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      const reservationsRef = collection(db, 'reservations');
      const q = query(reservationsRef);
      const querySnapshot = await getDocs(q);
      
      const loadedReservations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reservation[];

      setReservations(loadedReservations);
    } catch (error) {
      console.error('Error cargando reservas:', error);
      toast.error('Error al cargar las reservas');
    }
  };

  const getWeeklyApartmentReservationsCount = (portal: string, floor: string, door: string, date: string) => {
    const reservationDate = parseISO(date);
    const weekStart = startOfWeek(reservationDate, { weekStartsOn: 1 }); // Semana empieza en lunes
    const weekEnd = endOfWeek(reservationDate, { weekStartsOn: 1 });
    
    return reservations.filter(res => {
      const resDate = parseISO(res.date);
      return resDate >= weekStart && 
             resDate <= weekEnd &&
             res.portal === portal &&
             res.floor === floor &&
             res.door.toUpperCase() === door.toUpperCase();
    }).length;
  };

  const createReservation = async (data: Omit<Reservation, 'id' | 'createdAt'>) => {
    try {
      const existingReservation = reservations.find(r => r.date === data.date);
      
      if (existingReservation) {
        throw new Error('Esta fecha ya está reservada');
      }

      const weeklyReservationsCount = getWeeklyApartmentReservationsCount(
        data.portal,
        data.floor,
        data.door,
        data.date
      );

      if (weeklyReservationsCount >= 2) {
        throw new Error('Esta vivienda ya ha alcanzado el límite de 2 reservas esta semana');
      }

      const reservationsRef = collection(db, 'reservations');
      const reservationData = {
        ...data,
        createdAt: Timestamp.now()
      };

      await addDoc(reservationsRef, reservationData);
      await loadReservations();
    } catch (error: any) {
      console.error('Error creando reserva:', error);
      toast.error(error.message || 'Error al crear la reserva');
      throw error;
    }
  };

  const cancelReservation = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reservations', id));
      toast.success('Reserva cancelada con éxito');
      await loadReservations();
    } catch (error) {
      console.error('Error cancelando reserva:', error);
      toast.error('Error al cancelar la reserva');
    }
  };

  return (
    <ReservationContext.Provider
      value={{
        reservations,
        createReservation,
        cancelReservation,
        getWeeklyApartmentReservationsCount
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
}

export function useReservations() {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error('useReservations debe usarse dentro de un ReservationProvider');
  }
  return context;
}