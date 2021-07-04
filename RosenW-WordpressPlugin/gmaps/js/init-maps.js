function initMaps () {
  gmaps = [...document.getElementsByClassName("gmaps-map")];
  gmaps.map((gmap) => {
    try {
      // Default values
      const center = { lat: 0, lng: 0 };
      let zoom = 1;

      if (typeof gmap.dataset.zoom === 'string') {
        assert(!isNaN(gmap.dataset.zoom));
        zoom = Number(gmap.dataset.zoom);
      }

      if (typeof gmap.dataset.center === 'string') {
        centerTokens = gmap.dataset.center.split(', ');
        center.lat = Number(centerTokens[0].substr(1));
        center.lng = Number(centerTokens[1].substr(0, centerTokens[1].length - 1));
        assert(!isNaN(center.lat));
        assert(!isNaN(center.lng));
      }

      const map = new google.maps.Map(gmap, {
        zoom, 
        center
      });

      if (typeof gmap.dataset.markers === 'string') {
        for (const pair of gmap.dataset.markers.split(';')) {
          const pairTokens = pair.split(', ');
          const position = {
            lat: Number(pairTokens[0].substr(1)),
            lng: Number(pairTokens[1].substr(0, pairTokens[1].length - 1))
          }

          assert(!isNaN(position.lat));
          assert(!isNaN(position.lng));

          new google.maps.Marker({
            position,
            map
          });
        }
      }
    } catch (err) {
      gmap.innerHTML = 'There was a problem showing the map.' 
    }
  });
}

function isObject (obj) {
  return typeof obj === "object" && obj !== null;
}

function assert (condition) {
  if (!condition) {
    throw new Error();
  }
}
