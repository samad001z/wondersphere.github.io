export interface Destination {
  id: string;
  name: string;
  location: string;
  image: string;
  description: string;
  rating: number;
  price: number;
  category: 'Beach' | 'Mountain' | 'City' | 'Cultural' | 'Nature' | 'Luxury' | 'History';
  reviews: number;
  bestTime: string;
  timeline?: { day: number; description: string }[];
}

export interface User {
  uid: string;
  name: string;
  username: string;
  email: string;
  wishlist: string[];
  visitedPlaces: string[];
  createdAt?: Date;
}

export interface Booking {
  id: string;
  userId: string;
  destinationId: string;
  destinationName: string;
  destinationLocation: string;
  destinationImage: string;
  date: string;
  guests: number;
  totalPrice: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  bookedAt: any;
}

export interface Itinerary {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum ViewState {
  HOME = 'HOME',
  EXPLORE = 'EXPLORE',
  DETAILS = 'DETAILS',
  CHATBOT = 'CHATBOT',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  DASHBOARD = 'DASHBOARD'
}