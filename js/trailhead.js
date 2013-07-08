$(document).ready(startup);

/* The Big Nested Function 
==========================*/

// Print to ensure file is loaded 

function startup() {
  console.log("trailhead.js");

  // Map generated in CfA Account

  var MAPBOX_MAP_ID = "codeforamerica.map-4urpxezk";
  var AKRON = {
    lat: 41.1,
    lng: -81.5
  };
  // Map added
  var METERSTOMILES = 0.00062137;

  // L.tileLayer.provider('Nokia.terrainDay').addTo(map);

  // Prepping for API calls (defining data for the call)

  var map = {};
  var trails = [];
  var activeTrailheads = [];
  // var trailhead_query = "select ST_AsText(the_geom), name, trail1, trail2, trail3 from summit_trailheads";
  // var trailhead_query = "select * from summit_trailheads";
  var api_key = "3751baeceb14d394f251b28768ca7e27fc20ad07";
  var endpoint = "http://cfa.cartodb.com/api/v2/sql/";



  // The API Call / jQuery doing an AJAX call
  // When call is complete, send response to showMap
  //makeSQLQuery(trailhead_query, showMap);

  var currentLocation = getLocation();

  displayInitialMap(currentLocation);
  $("#redoSearch").click(redoSearch);

  // returns { lat: x, lng: y }

  function getLocation(callback) {
    // for now, just returns Akron
    return AKRON;
  }

  // given location, display a map

  function displayInitialMap(location) {
    map = L.map('trailMap', {
      zoomControl: true,
      inertiaMaxSpeed: 100
    }).setView([location.lat, location.lng], 11);
    L.tileLayer.provider('MapBox.' + MAPBOX_MAP_ID).addTo(map);
    getNearestTrailheads(currentLocation);
  }

  function redoSearch() {
    currentLocation = map.getCenter();
    console.log(["getCenter: ", currentLocation]);
    activeTrailheads = [];
    trails = [];
    getNearestTrailheads(currentLocation);
  }

  // get all trailhead info, in order of distance from "location"

  function getNearestTrailheads(location) {
    console.log("getNearestTrailHeads");
    var nearest_trailhead_query = "select summit_trailheads.*, " +
      "ST_Distance_Sphere(ST_WKTToSQL('POINT(" + location.lng + " " + location.lat + ")'), the_geom) distance " +
      "from summit_trailheads " +
      "ORDER BY distance " +
    // "";
    "LIMIT 100";
    makeSQLQuery(nearest_trailhead_query, makeNearestTrailheadArray);
  }

  // given the getNearestTrailheads response,
  // populate activeTrailheads[] with the each trailhead's stored properties, a Leaflet marker, 
  // and a place to put the trails for that trailhead

  function makeNearestTrailheadArray(response) {
    console.log("makeNearestTrailheadArray");
    console.log(response);
    for (var i = 0; i < response.features.length; i++) {
      var currentFeature = response.features[i];
      currentFeatureLatLng = new L.LatLng(currentFeature.geometry.coordinates[1], currentFeature.geometry.coordinates[0]);
      var newMarker = L.circleMarker(currentFeatureLatLng, {
        title: 'test',
        radius: 4
      }).bindPopup(currentFeature.properties.name);
      var trailhead = {
        properties: currentFeature.properties,
        marker: newMarker,
        trails: []
      };
      activeTrailheads.push(trailhead);
    }
    showNearestTrailheads(activeTrailheads);
  }

  // given activeTrailheads (which is a broader scoped variable, but we'll ignore that for now),
  // add all of the markers to the map in a single Leaflet layer group

  function showNearestTrailheads(activeTrailheads) {
    console.log("showNearestTrailheads");
    var currentTrailheadMarkerArray = [];
    for (var i = 0; i < activeTrailheads.length; i++) {
      currentTrailheadMarkerArray.push(activeTrailheads[i].marker);
    }

    var currentTrailheadLayerGroup = L.layerGroup(currentTrailheadMarkerArray);

    map.addLayer(currentTrailheadLayerGroup);
    getTrailList();
  }

  // get the list of trails

  function getTrailList() {
    console.log("getTrailList");
    var trail_list_query = "select the_geom, name,length,source from trail_data order by name";
    // Another AJAX call, for the trails
    makeSQLQuery(trail_list_query, makeNearestTrailList);
  }

  // given the list of trails from the trail_data table,
  // populate activeTrailheads[x].trails with all of the trails
  // that match each trailhead's named trails from the trailhead table

  function makeNearestTrailList(response) {
    console.log("showNearestTrailList");
    for (var i = 0; i < response.features.length; i++) {
      trails.push(response.features[i]);
    }
    for (var j = 0; j < activeTrailheads.length; j++) {
      trailhead = activeTrailheads[j];
      for (var k = 0; k < trails.length; k++) {
        trail = trails[k];
        if (trailhead.properties.trail1 == trail.properties.name) {
          // console.log("MATCH1");
          // console.log(trailhead);
          // console.log(trail);
          trailhead.trails.push(trail.properties.name);
        }
        if (trailhead.properties.trail2 == trail.properties.name) {
          // console.log("MATCH2");
          // console.log(trailhead);
          // console.log(trail);
          trailhead.trails.push(trail.properties.name);
        }
        if (trailhead.properties.trail3 == trail.properties.name) {
          // console.log("MATCH3");
          // console.log(trailhead);
          // console.log(trail);
          trailhead.trails.push(trail.properties.name);
        }
      }
    }
    listTrails(activeTrailheads);
  }


  // jQuery loop

  // given activeTrailheads, now populated with matching trail names,
  // fill out the left trail(head) pane,
  // noting if a particular trailhead has no trails associated with it

  function listTrails(activeTrailheads) {
    console.log("listTrails");
    $("#trailList").html("");
    $.each(activeTrailheads, function(index, val) {
      var trailheadName = val.properties.name;
      var trailheadTrailNames = val.trails;
      var trailheadSource = val.properties.source;
      console.log(val);
      var trailheadDistance = (val.properties.distance * METERSTOMILES).toFixed(1);
      // console.log(trailheadTrailNames);
      var $trailDiv;

      // Making a new div for text / each trail
      for (var i = 0; i < trailheadTrailNames.length; i++) {
        var trailName = trailheadTrailNames[i];
        $trailDiv = $("<div class='trail-box' id='" + trailName + "|" + trailheadName + "'>").appendTo("#trailList").click(getTrailsForTrailhead);
        $("<span class='trail' >" + trailName + " (" + trailheadName + " - " + trailheadDistance + " miles) " + "</span>").appendTo($trailDiv);
        $("<span class='trailSource' id='" + trailheadSource + "'>" + trailheadSource + "</span>").appendTo($trailDiv);
        // console.log($trailDiv);
      }

      // diagnostic div to show trailheads with no trail matches
      // TODO: find out why these happen!
      if (trailheadTrailNames.length === 0) {
        $trailDiv = $("<div class='trail-box'>").appendTo("#trailList");
        $("<span class='trail' id='" + trailheadName + "'>" + trailheadName + " - NO TRAILS</span>").appendTo($trailDiv);
        $("<span class='trailSource' id='" + trailheadSource + "'>" + trailheadSource + "</span>").appendTo($trailDiv);
      }
    });
  }


  // on a click of a trailhead div,
  // get the trailName that they clicked on
  // and display that trail only for now

  function getTrailsForTrailhead(e) {
    console.log(["getTrailsForTrailhead", e.target.id]);
    // temporary until we get the events sorted out
    if (e.target !== this) {
      return;
    }
    var trailName = e.target.id.split("|")[0];
    var trailheadName = e.target.id.split("|")[1];
    console.log([trailName, trailheadName]);
    showTrailHead(trailheadName);
    getTrailPath(trailName);
  }

  // show the clicked trailhead as a default marker icon
  var currentTrailheadMarker;

  function showTrailHead(trailheadName) {
    console.log(["showTrailHead", trailheadName]);
    for (var i = 0; i < activeTrailheads.length; i++) {
      // console.log([activeTrailheads[i], trailheadName]);
      if (activeTrailheads[i].properties.name === trailheadName) {
        currentTrailhead = activeTrailheads[i];
      }
    }
    console.log(currentTrailhead.marker._latlng.lng);
    if (currentTrailheadMarker) {
      map.removeLayer(currentTrailheadMarker);
    }
    currentTrailheadMarker = new L.Marker([currentTrailhead.marker._latlng.lat, currentTrailhead.marker._latlng.lng]);
    currentTrailheadMarker.addTo(map);
  }

  // function getTrailHeadsForTrail(e) {
  //   var trailName = e.target.id;
  //   console.log(trailName);
  //   var trailhead_query = "select * from summit_trailheads where " +
  //     "trail1='" + trailName + "' or " +
  //     "trail2='" + trailName + "' or " +
  //     "trail3='" + trailName + "' or " +
  //     "trail1='" + trailName + " Trail' or " +
  //     "trail2='" + trailName + " Trail' or " +
  //     "trail3='" + trailName + " Trail' " +
  //     "ORDER BY distance";

  //   makeSQLQuery(trailhead_query, function(response) {
  //     console.log(response);
  //     showTrailHead(response);
  //   });
  // }

  // On click of trailDiv, do the following. Click event handling.

  function getTrailPath(trailName) {
    console.log("getTrailPath");

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

  // function showTrailHead(response) {
  //   if (!response.features.length) {
  //     alert("No trailheads found for that trail.");
  //     return;
  //   }
  //   console.log(response);
  //   trailheadName = response.features[0].properties.name;
  //   console.log(trailheadName);

  //   var currentTrailhead = {};
  //   for (var i = 0; i < trailheads.length; i++) {
  //     if (trailheads[i].name === trailheadName) {
  //       currentTrailhead = trailheads[i];
  //     }
  //   }
  //   map.panTo(currentTrailhead.marker.getLatLng());

  // }
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
    currentTrail = L.geoJson(response, {
      style: {
        weight: 1,
        color: "#FF0000"
      }
    }).addTo(map);
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
      } else {
        console.log("ERROR:");
        console.log(query);
        console.log(errorThrown);
      }
    });
  }

}