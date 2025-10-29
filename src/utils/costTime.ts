import { haversineDistance } from "./distance";

const BASE_FEE = 2.5;
const PER_KM = 0.5;
const AVERAGE_SPEED_KMH = 30;

export const computeCostAndEta = (
  basket: { lat: number; lon: number },
  restaurant: { lat: number; lon: number }
) => {
  const distanceKm = haversineDistance(basket.lat, basket.lon, restaurant.lat, restaurant.lon);

  const cost = Number((BASE_FEE + PER_KM * distanceKm).toFixed(2));
  const etaMinutes = Math.max(1, Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60));

  return {
    cost,
    etaMinutes,
    distanceKm
  };
};
