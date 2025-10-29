export type BasketStatus = "active" | "delivered" | "delayed";

export type Driver = {
  id: string;
  name: string;
  phone: string;
  total_deliveries: number;
  rating: number;
};

export type Basket = {
  id: string;
  lat: number;
  lon: number;
  temperature: number | null;
  driver_id: string | null;
  status: BasketStatus;
  cost: number | null;
  time_estimate: string | null;
  updated_at?: string;
  driver?: Driver | null;
};

export type Order = {
  id: string;
  basket_id: string;
  customer: string;
  status: string;
  updated_at: string;
};

export type DeviceStatus = "active" | "inactive" | "provisioning" | "maintenance" | "decommissioned";

export type Device = {
  id: string;
  device_id: string;
  device_name: string;
  device_type: string;
  firmware_version?: string;
  hardware_model?: string;
  mac_address?: string;
  basket_id?: string | null;
  status: DeviceStatus;
  battery_level?: number | null;
  signal_strength?: number | null;
  last_seen?: string | null;
  location_lat?: number | null;
  location_lon?: number | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
};

export type DeviceTelemetry = {
  id: string;
  device_id: string;
  timestamp: string;
  battery_level?: number | null;
  signal_strength?: number | null;
  temperature?: number | null;
  location_lat?: number | null;
  location_lon?: number | null;
  speed?: number | null;
  altitude?: number | null;
  satellites?: number | null;
  voltage?: number | null;
  current?: number | null;
  rssi?: number | null;
  snr?: number | null;
  raw_data?: Record<string, any>;
};

export type DeviceAlert = {
  id: string;
  device_id: string;
  alert_type: "low_battery" | "offline" | "temperature" | "signal_loss" | "geofence" | "custom";
  severity: "info" | "warning" | "critical";
  message: string;
  is_resolved: boolean;
  resolved_at?: string | null;
  created_at: string;
  metadata?: Record<string, any>;
};
