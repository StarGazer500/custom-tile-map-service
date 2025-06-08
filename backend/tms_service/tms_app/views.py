import logging
import os
import gzip
from io import BytesIO
from pathlib import Path


from django.conf import settings
from django.http import JsonResponse, HttpResponse, Http404
from django.views import View
import aiosqlite
import aiofiles

logger = logging.getLogger(__name__)
TILES_BASE_DIR = getattr(settings, 'MBTILES_BASE_DIR', os.path.join(settings.MEDIA_ROOT, 'vector_tiles'))


class VectorTileJsonView(View):
    """Class-based async view for TileJSON metadata."""
    
    async def get(self, request, mbtile_file_name):
        mbtiles_path = Path(os.path.join(TILES_BASE_DIR, mbtile_file_name))
        if not mbtiles_path.exists():
            return JsonResponse({"error": "MBTiles not found"}, status=404)
        
        try:
            async with aiosqlite.connect(str(mbtiles_path)) as db:
                # Get metadata
                cursor = await db.execute("SELECT name, value FROM metadata")
                metadata_rows = await cursor.fetchall()
                metadata = dict(metadata_rows)
                
                # Get zoom levels
                cursor = await db.execute("SELECT MIN(zoom_level), MAX(zoom_level) FROM tiles")
                zoom_levels = await cursor.fetchone()
                min_zoom, max_zoom = zoom_levels
                
                tilejson = {
                    "tilejson": "2.2.0",
                    "version": metadata.get("version", "1.0.0"),
                    "tiles": [f"http://127.0.0.1:8000/tileserver/{mbtile_file_name}/vector-tiles/{{z}}/{{x}}/{{y}}.pbf"],
                    "minzoom": min_zoom or 6,
                    "maxzoom": max_zoom or 18,
                    "bounds": [float(x) for x in metadata.get("bounds", "-180,-85.0511,180,85.0511").split(",")],
                    "center": [float(x) for x in metadata.get("center", "0,0,6").split(",")],
                }
                
                return JsonResponse(tilejson)
        except Exception as e:
            logger.error(f"Error generating TileJSON: {str(e)}", exc_info=True)
            return JsonResponse({"error": f"Failed to generate TileJSON: {str(e)}"}, status=500)

class VectorTileView(View):
    """Class-based async view for serving MBTiles."""
    
    async def get(self, request, mbtile_file_name, z, x, y):
        y_tms = (1 << z) - 1 - y  # Convert from TMS to XYZ coordinates
        mbtiles_path = Path(os.path.join(TILES_BASE_DIR, mbtile_file_name))
        
        if not mbtiles_path.exists():
            raise Http404(f"MBTiles file not found for user {mbtile_file_name}")
        
        try:
            async with aiosqlite.connect(str(mbtiles_path)) as db:
                cursor = await db.execute(
                    "SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?",
                    (z, x, y_tms)
                )
                result = await cursor.fetchone()
                
                if not result:
                    logger.warning(f"Tile not found for user {mbtile_file_name} at z={z}, x={x}, y={y}")
                    raise Http404(f"Tile not found at z={z}, x={x}, y={y}")
                
                tile_data = result[0]
                
                # Process the tile data
                if tile_data.startswith(b'\x1f\x8b'):
                    with BytesIO(tile_data) as compressed:
                        tile_data_decompressed = gzip.GzipFile(fileobj=compressed).read()
                else:
                    tile_data_decompressed = tile_data
                
                logger.info(f"Tile found for user {mbtile_file_name} at z={z}, x={x}, y={y}, size={len(tile_data_decompressed)} bytes")
                response = HttpResponse(tile_data_decompressed, content_type='application/x-protobuf')
                response['Cache-Control'] = 'public, max-age=86400'
                
                return response
        except Exception as e:
            logger.error(f"Error serving tile: {str(e)}", exc_info=True)
            raise Http404(f"Error serving tile: {str(e)}")

class RasterTileView(View):
    async def get(self, request, z, x, y):
        """Serve a pre-generated map tile for the specified tileset, zoom, x, and y."""
        # test = Path(settings.TILES_ROOT, tileset)
    #    Path(os.path.join(settings.MEDIA_ROOT, 'tiles', str(user_id), tile_path))
        
        try:
            # Validate zoom level (based on gdal2tiles.py -z 12-19)
            # if not (12 <= z <= 19):
            #     raise Http404(f"Zoom level {z} is out of range (12-19)")
                
            # Construct tile path
            tile_path = Path(os.path.join(settings.MEDIA_ROOT,'raster_tiles', str(z), str(x), f"{y}.png"))
            print("Is dir",tile_path.resolve().is_relative_to(settings.MEDIA_ROOT))
            # Prevent path traversal
            if not tile_path.resolve().is_relative_to(settings.MEDIA_ROOT):
                raise Http404("Invalid tile path")
                
            # Read tile file asynchronously
            try:
                async with aiofiles.open(tile_path, 'rb') as f:
                    content = await f.read()
                
                logger.info(f"Serving tile: {z}/{x}/{y}")
                
                # Use AsyncFileResponse instead of FileResponse
                response = HttpResponse(content, content_type='image/png')
                print("existes",tile_path)
                return response
                
            except FileNotFoundError:
                logger.warning(f"Tile not found: {z}/{x}/{y}")
                raise Http404(f"Tile /{x}/{y} not found")
                
        except Exception as e:
            logger.error(f"Error serving tile {z}/{x}/{y}: {str(e)}")
            raise Http404(f"Error serving tile: {str(e)}")