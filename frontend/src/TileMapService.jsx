import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, LayersControl,ScaleControl } from 'react-leaflet';
import VectorTileLayer from './CustomVectorTileLayer';

const { BaseLayer } = LayersControl;

// Component to update map bounds based on TileJSON bounds
function MapUpdater({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && Array.isArray(bounds) && bounds.length === 4) {
      const mapBounds = [
        [bounds[1], bounds[0]], // [minLat, minLon]
        [bounds[3], bounds[2]], // [maxLat, maxLon]
      ];
      map.fitBounds(mapBounds);
      console.log('Map bounds set to:', mapBounds);
    } else {
      console.warn('Invalid bounds:', bounds);
    }
  }, [bounds, map]);
  return null;
}

// Main component for rendering vector tiles
export function VectorTileTms() {
  const [tileJson, setTileJson] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const file = "merged_boundary.mbtiles"

  // Construct TileJSON URL using the file prop
  const tileJsonUrl = `http://127.0.0.1:8000/tileserver/${file}/vector-tiles`;

  // Fetch TileJSON data
  const fetchTileJson = async () => {
    if (!tileJsonUrl) return;
    setLoading(true);
    console.log('Fetching TileJSON from:', tileJsonUrl);
    try {
      const res = await fetch(tileJsonUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure this aligns with backend CORS settings
      });
      console.log('Response Status:', res.status);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const tileJsonData = await res.json();
      console.log('Parsed TileJSON Data:', tileJsonData);
      setTileJson([tileJsonData]); // Wrap in array for consistency
    } catch (error) {
      console.error('TileJSON Fetch Error:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch TileJSON on component mount
  useEffect(() => {
    fetchTileJson();
  }, []); // Empty dependency array to run once

  // Generate vector tile layers
  const getTileLayer = () => {
    if (!tileJson || !tileJson.length) return null;
    console.log('TileJSON:', tileJson);
    const vectorLayers = [];
    const isVector =
      tileJson[0].tiles[0].endsWith('.pbf') ||
      tileJson[0].tiles[0].endsWith('.mvt') ||
      file.endsWith('.mbtiles');
    console.log('Is Vector:', isVector);

    if (isVector) {
      vectorLayers.push(
        <VectorTileLayer
          key="vector-tile" // Static key since we're not looping
          url={tileJson[0].tiles[0]}
          attribution={tileJson[0].attribution || ''}
          minZoom={tileJson[0].minzoom}
          maxZoom={tileJson[0].maxzoom}
        />
      );
    }
    return vectorLayers;
  };

  // Render loading, error, or map
  return (
    <div className="fixed inset-0 w-screen h-screen">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-50">
          <div className="text-lg">Loading map...</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-50">
          <div className="text-red-600">Error: {error}</div>
        </div>
      )}
      {!loading && !error && tileJson.length ? (
        <MapContainer
          center={tileJson[0].center.slice(0, 2)}
          zoom={tileJson[0].minzoom}
          style={{ height: '100%', width: '100%' }}
          className="w-full h-full"
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                zIndex={1}
              />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay checked name="Vector Tiles">
              {getTileLayer()}
            </LayersControl.Overlay>
          </LayersControl>
          <MapUpdater bounds={tileJson[0].bounds} />
        </MapContainer>
      ) : null}
    </div>
  );
}





export function RasterTileTms(){
  // Default map settings
  const mapCenter = [6.134511889744518, -2.187651559183602]; // Default location, replace with your area's coordinates
  const defaultZoom = 17;

  return (
    <div className="fixed inset-0 w-screen h-screen">
      {/* <h1 className="text-blue">helo</h1> */}
      <MapContainer
        center={mapCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        className="w-full h-full"
      >
        <ScaleControl position="bottomleft" />
        <LayersControl position="topright">
          <BaseLayer name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </BaseLayer>
          <BaseLayer checked name="May Drone Capture">
            <TileLayer
              url={`http://127.0.0.1:8000/tileserver/raster-tiles/{z}/{x}/{y}.png`}
              tms='1'
              minZoom='3'
              maxZoom='19'
            />
          </BaseLayer>
        </LayersControl>
      </MapContainer>
    </div>
  );
};

export default RasterTileTms;