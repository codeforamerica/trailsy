$(document).ready(startup);

/* The Big Nested Function 
==========================*/

// Print to ensure file is loaded 

function startup() {
  console.log("trailhead.js");

// Map generated in CfA Account

  var MAPBOX_MAP_ID = "codeforamerica.map-4urpxezk";

// Map added

  var map = L.map('trailMap', {
    zoomControl: true,
    inertiaMaxSpeed: 100
  }).setView([41.1, -81.5], 10);
  L.tileLayer.provider('MapBox.' + MAPBOX_MAP_ID).addTo(map);
  // L.tileLayer.provider('Nokia.terrainDay').addTo(map);

// Prepping for API calls (defining data for the call)

  var trails = [];
  // var trailhead_query = "select ST_AsText(the_geom), name, trail1, trail2, trail3 from summit_trailheads";
  var trailhead_query = "select * from summit_trailheads";
  var api_key = "3751baeceb14d394f251b28768ca7e27fc20ad07";
  var endpoint = "http://cfa.cartodb.com/api/v2/sql/";

// The API Call / jQuery doing an AJAX call
// When call is complete, send response to showMap
  makeSQLQuery(trailhead_query, showMap);


  function showMap(response) {
    console.log('showMap');

// Creating Leaflet object/layer from geoJSON response
// Specify what to do with each feature (trailhead), add all to map

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

// Get the list of trails

  function showTrailList() {
    // var trail_list_query = "select t.names " +
    //   "from (select name1 as names from summit_trail_segments " +
    //   "union select name2 from summit_trail_segments " +
    //   "union select name3 from summit_trail_segments) " +
    //   "as t order by 1";
    var trail_list_query = "select the_geom, name,length,source from trail_data order by name";
    // Another AJAX call, for the trails
    makeSQLQuery(trail_list_query, listTrails);
  }

// jQuery loop

  function listTrails(response) {
    console.log(response);
    console.log(response.rows);
    $.each(response.features, function(index, val) {
      console.log(val);
      var trailName = val.properties.name;
      var trailSource = val.properties.source;
      console.log(trailName);

// Making a new div for text / each trail

      $trailDiv = $("<div class='trail-box'>").appendTo("#trailList");
      $("<span class='trail' id='" + trailName + "'>" + trailName + "</span>").appendTo($trailDiv).click(getTrailHead);
      $("<span class='trailSource' id='" + trailSource + "'>" + trailSource + "</span>").appendTo($trailDiv).click(getTrailHead);
      console.log($trailDiv);
    });

  }


  function getTrailHead(e) {
    var trailName = e.target.id;
    console.log(trailName);
    var trailhead_query = "select * from summit_trailheads where " +
    "trail1='" + trailName + "' or " + 
    "trail2='" + trailName + "' or " + 
    "trail3='" + trailName + "' or " +
    "trail1='" + trailName + " Trail' or " + 
    "trail2='" + trailName + " Trail' or " + 
    "trail3='" + trailName + " Trail'";

    makeSQLQuery(trailhead_query, function(response) { 
      console.log(response); 
    });
  }

// On click of trailDiv, do the following. Click event handling.

  function getTrail(e) {
    console.log(e.target.id);
    var trailName = e.target.id;
 
    //SQL injection. Yum.
    var trail_query = "select st_collect(the_geom) the_geom from summit_trail_segments where " + 
    "name1='" + trailName + "' or " + 
    "name2='" + trailName + "' or " + 
    "name3='" + trailName + "' or " +
    "name1='" + trailName + " Trail' or " + 
    "name2='" + trailName + " Trail' or " + 
    "name3='" + trailName + " Trail'";

    makeSQLQuery(trail_query, showTrail);
  }

// We have to know if a trail is already being displayed, so we can take it off

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
    map.fitBounds(currentTrail.getBounds());
  }


  function makeSQLQuery(query, done, error) {
    console.log("makeSQLQuery");
    var callData = {
      q: query,
      api_key: api_key,
      format: "geoJSON"
    };
    var request = $.ajax({
      dataType: "json",
      url: endpoint,
      data: callData
    }).done(function(response, textStatus, errorThrown) {
      done(response);
    }).error(function(response, textStatus, errorThrown) {
      if (typeof(error) === "function") {
        error(response);
      }
      else {
        console.log("ERROR:");
        console.log(query);
        console.log(errorThrown);
      }
    });
  }

}

