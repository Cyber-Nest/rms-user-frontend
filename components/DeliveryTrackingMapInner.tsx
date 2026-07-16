"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Pusher from "pusher-js";
import { LocateFixed, Navigation, MapPin, Phone } from "lucide-react";

// --- Map Interaction Tracker ---
interface MapEventTrackerProps {
  onInteraction: () => void;
}

function MapEventTracker({ onInteraction }: MapEventTrackerProps) {
  useMapEvents({
    dragstart: onInteraction,
    zoomstart: onInteraction,
  });
  return null;
}

// --- Geolocation Helpers ---
const toRad = (value: number) => (value * Math.PI) / 180;
const toDeg = (value: number) => (value * 180) / Math.PI;

const getDistanceMeters = (pos1: { lat: number; lng: number }, pos2: { lat: number; lng: number }) => {
  const R = 6371000;
  const dLat = toRad(pos2.lat - pos1.lat);
  const dLng = toRad(pos2.lng - pos1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pos1.lat)) * Math.cos(toRad(pos2.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getBearing = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
  const dLng = toRad(to.lng - from.lng);
  const fromLatRad = toRad(from.lat);
  const toLatRad = toRad(to.lat);
  const y = Math.sin(dLng) * Math.cos(toLatRad);
  const x = Math.cos(fromLatRad) * Math.sin(toLatRad) - Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

// --- Custom Icons ---
function createDriverIcon(color: string, bearing: number) {
  const size = 38;
  const glowSize = size + 16;
  const html = `
    <div style="width: ${glowSize}px; height: ${glowSize}px; position: relative; transform: rotate(${bearing}deg); transition: transform 0.4s ease-out;">
      <div style="
        position: absolute; inset: 0;
        border-radius: 50%;
        border: 2px solid ${color};
        opacity: 0.5;
        animation: driverPulse 2s ease-out infinite;
      "></div>
      <div style="
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: white;
        border: 2.5px solid ${color};
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        display: flex; align-items: center; justify-content: center;
      ">
        <div style="
          width: 80%; height: 80%;
          border-radius: 50%;
          background: ${color};
          display: flex; align-items: center; justify-content: center;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 55%; height: 55%;">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" fill="white" />
            <circle cx="17" cy="17" r="2" fill="white" />
          </svg>
        </div>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    iconSize: [glowSize, glowSize],
    iconAnchor: [glowSize / 2, glowSize / 2],
    className: "",
  });
}

function createPinIcon(color: string, label: string) {
  const html = `
    <div style="width: 32px; height: 42px; position: relative;">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 40 50">
        <path d="M20 0C9 0 0 9 0 20c0 14 20 30 20 30s20-16 20-30C40 9 31 0 20 0z" fill="${color}" stroke="white" stroke-width="2.5"/>
        <text x="20" y="24" fill="white" font-size="11" font-weight="900" text-anchor="middle" font-family="sans-serif">${label}</text>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    className: "",
  });
}

// --- Map Bounds & Follow Controller ---
interface BoundsControllerProps {
  driverPos: [number, number] | null;
  customerCoords: { lat: number; lng: number };
  restaurantCoords: { lat: number; lng: number };
  autoFollow: boolean;
}

function BoundsController({ driverPos, customerCoords, restaurantCoords, autoFollow }: BoundsControllerProps) {
  const map = useMap();
  const initRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    if (!initRef.current) {
      // First fit bounds to restaurant and customer
      const bounds = L.latLngBounds([
        [restaurantCoords.lat, restaurantCoords.lng],
        [customerCoords.lat, customerCoords.lng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40] });
      initRef.current = true;
    } else if (autoFollow && driverPos) {
      // Auto follow driver
      map.panTo(driverPos, { animate: true, duration: 1 });
    }
  }, [map, driverPos, autoFollow, customerCoords, restaurantCoords]);

  return null;
}

// Sub-component to fix Leaflet map grey area bug when container resizes
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Invalidate size after animation finishes
    const timerId = setTimeout(() => {
      map.invalidateSize();
    }, 400);
    return () => clearTimeout(timerId);
  }, [map]);
  return null;
}

// --- Main Map Component ---
interface DeliveryTrackingMapInnerProps {
  orderId: string;
  driverInfo: any;
  customerCoords: { lat: number; lng: number };
  restaurantCoords: { lat: number; lng: number };
  onDeliveryComplete: () => void;
}

export default function DeliveryTrackingMapInner({
  orderId,
  driverInfo,
  customerCoords,
  restaurantCoords,
  onDeliveryComplete,
}: DeliveryTrackingMapInnerProps) {
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [bearing, setBearing] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [freshness, setFreshness] = useState<"live" | "updating" | "offline">("updating");

  const prevPosRef = useRef<[number, number] | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Pusher setup for real-time tracking
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "fc1a170b04cd047c782b";
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    const pusher = new Pusher(key, {
      cluster,
      forceTLS: true,
      authEndpoint: `${apiUrl}/delivery/auth`,
    });

    const channel = pusher.subscribe(`private-order-${orderId}`);

    // Request immediate location ping upon connection
    let retryInterval: NodeJS.Timeout;
    
    channel.bind("pusher:subscription_succeeded", () => {
      channel.trigger("client-request-location", { request: true });
      
      // Retry every 3 seconds if we still don't have driverPos
      retryInterval = setInterval(() => {
        if (!prevPosRef.current) {
          channel.trigger("client-request-location", { request: true });
        } else {
          clearInterval(retryInterval);
        }
      }, 3000);
    });

    // Listen for driver location streamed directly
    channel.bind("driver-location-update", (data: any) => {
      const targetLat = data.lat;
      const targetLng = data.lng;
      
      setLastUpdate(Date.now());
      setBearing(data.bearing || 0);

      // Cancel any active interpolation animation to prevent concurrent frame fighting (jitter)
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Interpolate transition
      const fromLat = prevPosRef.current ? prevPosRef.current[0] : targetLat;
      const fromLng = prevPosRef.current ? prevPosRef.current[1] : targetLng;
      
      const startTime = performance.now();
      const duration = 2000;

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

        const lat = fromLat + (targetLat - fromLat) * eased;
        const lng = fromLng + (targetLng - fromLng) * eased;

        setDriverPos([lat, lng]);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          prevPosRef.current = [targetLat, targetLng];
          animationFrameRef.current = null;
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    });

    // Listen for server status triggers
    channel.bind("delivery-status-update", (data: any) => {
      if (data.status === "delivered") {
        onDeliveryComplete();
      }
    });

    return () => {
      if (retryInterval) clearInterval(retryInterval);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      channel.unbind_all();
      pusher.unsubscribe(`private-order-${orderId}`);
      pusher.disconnect();
    };
  }, [orderId, onDeliveryComplete]);

  // Track location freshness (green/yellow/red status)
  useEffect(() => {
    if (!lastUpdate) return;

    const interval = setInterval(() => {
      const diff = Date.now() - lastUpdate;
      if (diff < 30000) {
        setFreshness("live");
      } else if (diff < 120000) {
        setFreshness("updating");
      } else {
        setFreshness("offline");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  const mapCenter: [number, number] = [
    (restaurantCoords.lat + customerCoords.lat) / 2,
    (restaurantCoords.lng + customerCoords.lng) / 2,
  ];

  const driverIcon = createDriverIcon(driverInfo?.color || "#3B82F6", bearing);
  const restaurantIcon = createPinIcon("#8a1538", "Store");
  const customerIcon = createPinIcon("#16A34A", "You");

  return (
    <div className="absolute inset-0 w-full h-full bg-neutral-100">
      <MapContainer
        center={mapCenter}
        zoom={13}
        zoomControl={false}
        className="w-full h-full z-10"
      >
        <MapResizer />
        <MapEventTracker onInteraction={() => setAutoFollow(false)} />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <BoundsController
          driverPos={driverPos}
          customerCoords={customerCoords}
          restaurantCoords={restaurantCoords}
          autoFollow={autoFollow}
        />

        {/* Restaurant Pin */}
        <Marker position={[restaurantCoords.lat, restaurantCoords.lng]} icon={restaurantIcon} />

        {/* Customer Address Pin */}
        <Marker position={[customerCoords.lat, customerCoords.lng]} icon={customerIcon} />

        {/* Driver Live Marker */}
        {driverPos && <Marker position={driverPos} icon={driverIcon} />}
      </MapContainer>

      {/* Map Control overlay (top right) */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5">
        {!autoFollow && driverPos && (
          <button
            onClick={() => setAutoFollow(true)}
            className="p-2 rounded-xl bg-white shadow-md text-neutral-700 hover:text-black transition-colors cursor-pointer border border-neutral-100 flex items-center gap-1.5 text-xs font-bold"
          >
            <LocateFixed size={14} />
            <span>Follow</span>
          </button>
        )}
      </div>

      {/* Driver info overlay (bottom left) */}
      <div className="absolute bottom-3 left-3 z-30 bg-white/95 backdrop-blur-md border border-neutral-200/50 p-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[200px]">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-extrabold shrink-0"
          style={{ backgroundColor: driverInfo?.color || "#3B82F6" }}
        >
          <Navigation size={14} className="rotate-45" />
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-neutral-800 leading-tight">
            {driverInfo?.name || "Driver Assigned"}
          </h4>
          <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">
            {driverInfo?.vehicleNumber ? `Vehicle #${driverInfo.vehicleNumber}` : "En Route"}
          </span>
        </div>

        {driverInfo?.phone && (
          <a
            href={`tel:${driverInfo.phone}`}
            className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition-colors shadow-sm ml-1"
            title="Call Driver"
          >
            <Phone size={14} />
          </a>
        )}

        {/* Freshness Status Indicator */}
        <div className="ml-auto flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                freshness === "live"
                  ? "bg-emerald-400"
                  : freshness === "updating"
                  ? "bg-amber-400"
                  : "bg-red-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                freshness === "live"
                  ? "bg-emerald-500"
                  : freshness === "updating"
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
            ></span>
          </span>
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
            {freshness === "live" ? "Live" : freshness === "updating" ? "Buffering" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  );
}
