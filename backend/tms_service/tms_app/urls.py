from django.urls import path
from .views import *

urlpatterns = [
   path('<str:mbtile_file_name>/vector-tiles', VectorTileJsonView.as_view(), name='mbtiles_tilejson'),
    path('<str:mbtile_file_name>/vector-tiles/<int:z>/<int:x>/<int:y>.pbf', VectorTileView.as_view(), name='mbtiles_tile'),
    path('raster-tiles/<int:z>/<int:x>/<int:y>.png', RasterTileView.as_view(), name='serve_tile'),
]