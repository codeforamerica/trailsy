$(document).ready(startup);

function startup() {
  console.log("trailhead.js");

  var MAPBOX_MAP_ID = "codeforamerica.map-4urpxezk";

  var map = L.map('trailMap', {
    zoomControl: true,
    inertiaMaxSpeed: 100
  }).setView([41.1, -81.5], 10);
  L.tileLayer.provider('MapBox.' + MAPBOX_MAP_ID).addTo(map);
  // L.tileLayer.provider('Nokia.terrainDay').addTo(map);
  var trailheads = [];
  var trails = [];
  // var trailhead_query = "select ST_AsText(the_geom), name, trail1, trail2, trail3 from summit_trailheads";
  var trailhead_query = "select * from summit_trailheads";
  var api_key = "3751baeceb14d394f251b28768ca7e27fc20ad07";
  var endpoint = "http://cfa.cartodb.com/api/v2/sql/";
  var calldata = {
    q: trailhead_query,
    api_key: api_key,
    format: "GeoJSON"
  };

  var request = $.ajax({
    dataType: "json",
    url: endpoint,
    data: calldata
  }).done(function(response, textStatus, errorThrown) {
    showMap(response);
  });

  function showMap(response) {
    console.log('showMap');
    L.geoJson(response, {
      pointToLayer: function(feature, latlng) {
        console.log(feature);
        var newMarker = L.circleMarker(latlng, {
          title: 'test',
          radius: 3,
          riseOnHover: true
        }).bindPopup(feature.properties.name);
        console.log(feature.properties.name);

        return newMarker;
      }
    }).addTo(map);
    showTrailList();
  }

  function showTrailList() {
    // var trail_list_query = "select t.names " +
    //   "from (select name1 as names from summit_trail_segments " +
    //   "union select name2 from summit_trail_segments " +
    //   "union select name3 from summit_trail_segments) " +
    //   "as t order by 1";
    var trail_list_query = "select name,length,source from trail_data order by 1";
    var calldata = {
      q: trail_list_query,
      api_key: api_key,
      format: "json"
    };
    var request = $.ajax({
      dataType: "json",
      url: endpoint,
      data: calldata
    }).done(function(response, textStatus, errorThrown) {
      listTrails(response, textStatus, errorThrown);
    });
  }

  function listTrails(response) {
    $.each(response.rows, function(index, val) {
      var trailName = val.name;
      var trailSource = val.source;
      console.log(trailName);
      $trailDiv = $("<div>").appendTo("#trailList");
      $("<span class='trail' id='" + trailName + "'>" + trailName + " (" + trailSource + ")" + "</span>").appendTo($trailDiv).click(getTrail);
      console.log($trailDiv);
    });

  }

  function getTrail(e) {
    console.log(e.target.id);
    var trailName = e.target.id;
 
    //SQL injection. Yum.
    var trail_query = "select st_collect(the_geom) the_geom from summit_trail_segments where " + 
    "name1='" + trailName + "' or " + 
    "name2='" + trailName + "' or " + 
    "name3='" + trailName + "'";
    var calldata = {
      q: trail_query,
      api_key: api_key,
      format: "geoJSON"
    };
    var requesy = $.ajax({
      dataType: "json",
      url: endpoint,
      data: calldata
    }).done(function(response, textStatus, errorThrown) {
      showTrail(response);
    });
  }

  var currentTrail = "";
  function showTrail(response) {
    if (currentTrail) {
      map.removeLayer(currentTrail);
    }
    console.log("showTrail");
    console.log(response);

    if (response.features[0].geometry === null) {
      alert("No trail segment data found.");
    }
    currentTrail = L.geoJson(response, { style: { weight: 1, color: "#FF0000" }}).addTo(map);
    var zoomLevel = map.getBoundsZoom(currentTrail.getBounds());
    console.log(zoomLevel);
    // map.setZoom(zoomLevel - 2);
    // map.fitBounds(currentTrail.getBounds());
  }
}
