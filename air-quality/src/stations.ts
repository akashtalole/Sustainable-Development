export interface Station {
  id: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

/**
 * A fixed set of major cities across every inhabited continent, standing in
 * for a real IoT sensor network (which this static site obviously doesn't
 * operate). Air quality is fetched live for these coordinates on every page
 * load — see src/api.ts.
 */
export const STATIONS: Station[] = [
  { id: "london", city: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  { id: "paris", city: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  { id: "madrid", city: "Madrid", country: "Spain", lat: 40.4168, lon: -3.7038 },
  { id: "berlin", city: "Berlin", country: "Germany", lat: 52.52, lon: 13.405 },
  { id: "rome", city: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964 },
  { id: "moscow", city: "Moscow", country: "Russia", lat: 55.7558, lon: 37.6173 },
  { id: "istanbul", city: "Istanbul", country: "Türkiye", lat: 41.0082, lon: 28.9784 },
  { id: "cairo", city: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357 },
  { id: "lagos", city: "Lagos", country: "Nigeria", lat: 6.5244, lon: 3.3792 },
  { id: "nairobi", city: "Nairobi", country: "Kenya", lat: -1.2921, lon: 36.8219 },
  { id: "johannesburg", city: "Johannesburg", country: "South Africa", lat: -26.2041, lon: 28.0473 },
  { id: "dubai", city: "Dubai", country: "United Arab Emirates", lat: 25.2048, lon: 55.2708 },
  { id: "new-delhi", city: "New Delhi", country: "India", lat: 28.6139, lon: 77.209 },
  { id: "mumbai", city: "Mumbai", country: "India", lat: 19.076, lon: 72.8777 },
  { id: "karachi", city: "Karachi", country: "Pakistan", lat: 24.8607, lon: 67.0011 },
  { id: "dhaka", city: "Dhaka", country: "Bangladesh", lat: 23.8103, lon: 90.4125 },
  { id: "bangkok", city: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018 },
  { id: "jakarta", city: "Jakarta", country: "Indonesia", lat: -6.2088, lon: 106.8456 },
  { id: "singapore", city: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198 },
  { id: "manila", city: "Manila", country: "Philippines", lat: 14.5995, lon: 120.9842 },
  { id: "beijing", city: "Beijing", country: "China", lat: 39.9042, lon: 116.4074 },
  { id: "shanghai", city: "Shanghai", country: "China", lat: 31.2304, lon: 121.4737 },
  { id: "seoul", city: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978 },
  { id: "tokyo", city: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
  { id: "sydney", city: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093 },
  { id: "toronto", city: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832 },
  { id: "new-york", city: "New York", country: "United States", lat: 40.7128, lon: -74.006 },
  { id: "chicago", city: "Chicago", country: "United States", lat: 41.8781, lon: -87.6298 },
  { id: "los-angeles", city: "Los Angeles", country: "United States", lat: 34.0522, lon: -118.2437 },
  { id: "mexico-city", city: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332 },
  { id: "lima", city: "Lima", country: "Peru", lat: -12.0464, lon: -77.0428 },
  { id: "santiago", city: "Santiago", country: "Chile", lat: -33.4489, lon: -70.6693 },
  { id: "sao-paulo", city: "São Paulo", country: "Brazil", lat: -23.5505, lon: -46.6333 },
  { id: "buenos-aires", city: "Buenos Aires", country: "Argentina", lat: -34.6037, lon: -58.3816 },
];
