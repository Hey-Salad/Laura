export type CameraStatus = "online" | "offline" | "busy" | "error";

export type CommandType =
  | "take_photo"
  | "start_video"
  | "stop_video"
  | "get_status"
  | "update_settings"
  | "reboot"
  | "led_on"
  | "led_off"
  | "toggle_led"
  | "play_sound"
  | "save_photo";

export type CommandStatus = "pending" | "sent" | "completed" | "failed" | "timeout";

export interface Camera {
  id: string;
  camera_id: string;
  camera_name: string;
  device_type: string;
  firmware_version?: string;
  assigned_to?: string;
  status: CameraStatus;
  battery_level?: number;
  wifi_signal?: number;
  last_seen?: string;
  location_lat?: number;
  location_lon?: number;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface CameraPhoto {
  id: string;
  camera_id: string;
  photo_url: string;
  thumbnail_url?: string;
  taken_at: string;
  command_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CameraCommand {
  id: string;
  camera_id: string;
  command_type: CommandType;
  command_payload: Record<string, any>;
  status: CommandStatus;
  sent_at?: string;
  completed_at?: string;
  response: Record<string, any>;
  error_message?: string;
  created_at: string;
}

export interface CameraStatusUpdate {
  type: "status";
  camera_id: string;
  timestamp: string;
  data: {
    battery_level?: number;
    wifi_signal?: number;
    status: CameraStatus;
    location?: {
      lat: number;
      lon: number;
    };
    free_heap?: number;
  };
}

export interface CameraCommandMessage {
  type: "command";
  command: CommandType;
  command_id: string;
  timestamp: string;
  payload: Record<string, any>;
}

export interface CameraResponse {
  type: "response";
  command_id: string;
  status: "completed" | "failed";
  timestamp: string;
  data: Record<string, any>;
}

export interface CameraPhotoMessage {
  type: "photo";
  command_id?: string;
  timestamp: string;
  data: {
    photo_url?: string;
    thumbnail_url?: string;
    base64?: string;
    format?: string;
    size_kb?: number;
    metadata?: Record<string, any>;
  };
}
