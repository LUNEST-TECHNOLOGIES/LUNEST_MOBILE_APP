/**
 * Utility for mapping amenity names/slugs to Lucide Icons.
 * Maintains consistency across PropertyCards, DetailScreens, and Search.
 */
import React from 'react';
import { 
  Wifi, 
  Snowflake, 
  UtensilsCrossed, 
  WashingMachine, 
  Tv, 
  Waves, 
  Dumbbell, 
  ShieldCheck, 
  Camera, 
  Car, 
  Monitor, 
  Armchair, 
  Zap, 
  BatteryCharging, 
  Sun, 
  Droplets, 
  Bath, 
  Flame, 
  Lock, 
  PhoneForwarded, 
  ShieldAlert, 
  Laptop, 
  PawPrint, 
  CigaretteOff, 
  Calendar, 
  Clock, 
  Truck, 
  Ruler, 
  Users, 
  UserCheck,
  Coffee,
  Refrigerator,
  Microwave,
  Fan,
  Warehouse,
  School,
  Building2,
  Table,
  TreePine,
  ArrowUpCircle,
  Drumstick,
  VolumeX,
  Printer,
  ShoppingBag,
  LayoutGrid,
  Gamepad2,
  Bed
} from 'lucide-react-native';

const AMENITY_ICONS = {
  // Comfort & Living Essentials
  walk_in_closet: Armchair,
  balcony: Warehouse,
  ac: Snowflake,
  "air conditioning": Snowflake,
  heating: Fan,
  washer: WashingMachine,
  "washing machine": WashingMachine,
  laundry: WashingMachine,
  kitchen: UtensilsCrossed,
  furnished: Armchair,
  "fully furnished": Armchair,
  refrigerator: Refrigerator,
  fridge: Refrigerator,
  microwave: Microwave,
  oven: Table,
  dishwasher: UtensilsCrossed,
  "coffee maker": Coffee,
  dining_area: Table,
  bedroom: Bed,
  bathroom: Bath,

  // Security & Access
  security_24_7: ShieldCheck,
  security: ShieldCheck,
  cctv: Camera,
  "cctv surveillance": Camera,
  gated: ShieldCheck,
  electronic_lock: Lock,
  "electronic door lock": Lock,
  intercom: PhoneForwarded,
  fire_extinguisher: ShieldAlert,
  "first aid": ShieldAlert,
  smoke_alarm: ShieldAlert,

  // Power & Utilities
  inverter: BatteryCharging,
  generator: Zap,
  solar: Sun,
  "solar power": Sun,
  borehole: Droplets,
  "borehole water": Droplets,
  water_heater: Bath,
  gas_supply: Flame,
  electricity: Zap,
  "power supply": Zap,

  // Tech & Connectivity
  wifi: Wifi,
  internet: Wifi,
  smart_tv: Tv,
  tv: Tv,
  cable: Tv,
  workspace: Laptop,
  laptop: Laptop,
  "dedicated workspace": Laptop,
  fiber_optics: Wifi,
  smart_home: Building2,
  printer: Printer,
  "soundproof room": VolumeX,
  playstation: Gamepad2,
  "playstation 4": Gamepad2,
  "playstation 5": Gamepad2,
  ps4: Gamepad2,
  ps5: Gamepad2,
  "gaming console": Gamepad2,
  gamepad2: Gamepad2,

  // Lifestyle & Luxury
  pool: Waves,
  swimming: Waves,
  gym: Dumbbell,
  fitness: Dumbbell,
  garden: TreePine,
  lawn: TreePine,
  rooftop: ArrowUpCircle,
  parking: Car,
  garage: Car,
  bbq: Drumstick,
  sauna: Bath,
  playground: Users,

  // Commercial / Special
  loading_bay: Truck,
  high_ceilings: Ruler,
  meeting_rooms: Users,
  receptionist: UserCheck,
  elevator: ArrowUpCircle,
  shop: ShoppingBag,
  office: Building2,
  warehouse: Warehouse,
  school: School,
  guests: Users,
  guest: Users,
};

/**
 * Normalizes a string to a format that matches AMENITY_ICONS keys.
 */
const normalizeName = (name) => {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/^custom_/, "")
    .replace(/_/g, " ")
    .trim();
};

/**
 * Returns a Lucide Icon component for a given amenity string.
 * @param {string} name - The amenity name from the backend.
 * @returns {React.ComponentType} - The Lucide icon component (defaults to LayoutGrid).
 */
export const getAmenityIcon = (name) => {
  const cleanName = normalizeName(name);
  
  // Check for direct match
  if (AMENITY_ICONS[cleanName]) return AMENITY_ICONS[cleanName];
  
  // Check for partial matches
  const foundKey = Object.keys(AMENITY_ICONS).find(key => cleanName.includes(key));
  if (foundKey) return AMENITY_ICONS[foundKey];
  
  // Default fallback icon
  return LayoutGrid;
};

export default AMENITY_ICONS;
