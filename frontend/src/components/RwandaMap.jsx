import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const RwandaMap = ({ organizations = [], onOrganizationClick }) => {
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('rwanda-map').setView([-1.9403, 29.8739], 8);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    markersRef.current.forEach(marker => mapRef.current.removeLayer(marker));
    markersRef.current = [];

    const compliantIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const nonCompliantIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const pendingIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow-lg"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    organizations.forEach(org => {
      if (org.latitude && org.longitude) {
        let icon;
        switch (org.status) {
          case 'APPROVED':
          case 'COMPLIANT':
            icon = compliantIcon;
            break;
          case 'REJECTED':
          case 'NON_COMPLIANT':
            icon = nonCompliantIcon;
            break;
          default:
            icon = pendingIcon;
        }

        const marker = L.marker([org.latitude, org.longitude], { icon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div class="p-2">
              <h3 class="font-semibold text-sm">${org.name}</h3>
              <p class="text-xs text-gray-500">${org.type}</p>
              <p class="text-xs mt-1"><span class="font-medium">Status:</span> ${org.status}</p>
              ${org.address ? `<p class="text-xs text-gray-400 mt-1">${org.address}</p>` : ''}
            </div>
          `);

        if (onOrganizationClick) {
          marker.on('click', () => onOrganizationClick(org));
        }

        markersRef.current.push(marker);
      }
    });
  }, [organizations, onOrganizationClick]);

  return (
    <div id="rwanda-map" className="w-full h-full rounded-xl" style={{ minHeight: '400px' }} />
  );
};

export default RwandaMap;