Directory structure is copied from the twentyseventeen theme.
A single post template "single-post-sofia-center.php" querries the database and
injects into the map canvas as data-markers attribute the coordinates for
markers. The js/google-map.js script renders the map and the markers.

The bin/import_markers.php script import markers to the database from a single
file argument. The file's format must be akin to bg_locations.txt :
"{asciiname}, {latitude}, {longtitude}\n"
This script loads the core wordpress functionality in order to access the
database and must be run with root permissions.
