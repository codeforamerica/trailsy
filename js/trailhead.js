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

  var METERSTOMILES = 0.00062137;
  var MAX_ZOOM = 13;

  var map = {};
  var trails = []; // all of the trails from trail_data
  var activeTrailheads = []; // the current set of trailheads ordered by distance

  // var trailhead_query = "select ST_AsText(the_geom), name, trail1, trail2, trail3 from summit_trailheads";
  // var trailhead_query = "select * from summit_trailheads";
  // Prepping for API calls (defining data for the call)
  var api_key = "3751baeceb14d394f251b28768ca7e27fc20ad07";
  var endpoint = "http://cfa.cartodb.com/api/v2/sql/";


  var currentTrail = {};  // We have to know if a trail is already being displayed, so we can remove it
  var currentLocation = getLocation(); // not sure if this needs to be scoped here. might be useful later.
  var currentLocationMarker = {};

  $("#redoSearch").click(redoSearch);


  displayInitialMap(currentLocation);
  

  // returns { lat: x, lng: y }

  function getLocation(callback) {
    // for now, just returns Akron
    return AKRON;
  }

  // given location, display a map

  function displayInitialMap(location) {
    map = L.map('trailMap', {
      zoomControl: true,
      zoomAnimationThreshold: 20
    }).setView([location.lat, location.lng], 11);
    // map.on({
    //   moveend: dropCenterMarker
    // });

    // Switch between MapBox and other providers by commenting/uncommenting these
    // L.tileLayer.provider('MapBox.' + MAPBOX_MAP_ID).addTo(map);
    L.tileLayer.provider('Thunderforest.Landscape').addTo(map);

    getNearestTrailheads(location);
  }


  // run the trailhead search again after setting 
  // currentLocation to the center of the currently viewed map

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
    makeSQLQuery(nearest_trailhead_query, makeActiveTrailheadArray);
  }


  // given the getNearestTrailheads response, a geoJSON collection of trailheads by distance,
  // populate activeTrailheads[] with the each trailhead's stored properties, a Leaflet marker, 
  // and a place to put the trails for that trailhead

  function makeActiveTrailheadArray(response) {
    console.log("makeActiveTrailheadArray");
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
      var trailhead = activeTrailheads[j];
      var popupContent = "<div class='trailhead-popup'>" + "<div class='trailhead-name'>" + trailhead.properties.name + "</div>";
      for (var k = 0; k < trails.length; k++) {
        trail = trails[k];
        if (trailhead.properties.trail1 == trail.properties.name) {
          trailhead.trails.push(trail.properties.name);
          popupContent = popupContent + "<div " + "id='map|" + trail.properties.name + "|" + trailhead.properties.name + "' class='trailhead-trailname'>" + trail.properties.name + "</div>";
        }
        if (trailhead.properties.trail2 == trail.properties.name) {
          trailhead.trails.push(trail.properties.name);
          popupContent = popupContent + "<div " + "id='map|" + trail.properties.name + "|" + trailhead.properties.name + "' class='trailhead-trailname'>" + trail.properties.name + "</div>";
        }
        if (trailhead.properties.trail3 == trail.properties.name) {
          trailhead.trails.push(trail.properties.name);
          popupContent = popupContent + "<div " + "id='map|" + trail.properties.name + "|" + trailhead.properties.name + "' class='trailhead-trailname'>" + trail.properties.name + "</div>";
        }
      }
      popupContent = popupContent + "</div>";
      trailhead.marker.bindPopup(popupContent);
    }
    $(".trailhead-trailname").click(getTrailsForTrailhead); 
    listTrails(activeTrailheads);
  }


  // given activeTrailheads, now populated with matching trail names,
  // fill out the left trail(head) pane,
  // noting if a particular trailhead has no trails associated with it

  function listTrails(activeTrailheads) {
    console.log("listTrails");
    $("#trailList").html("");
    $.each(activeTrailheads, function(index, val) {
      var trailheadName = val.properties.name;
      var trailheadID = val.properties.cartodb_id;
      var trailheadTrailNames = val.trails;
      var trailheadSource = val.properties.source;
      console.log(val);
      var trailheadDistance = (val.properties.distance * METERSTOMILES).toFixed(1);
      // console.log(trailheadTrailNames);
      var $trailDiv;

      // Making a new div for text / each trail
      for (var i = 0; i < trailheadTrailNames.length; i++) {
        var trailName = trailheadTrailNames[i];
   
        $trailDiv = $("<div class='trail-box' id='list|" + trailName + "|" + trailheadName + "|" + trailheadID + "'>").appendTo("#trailList").click(getTrailsForTrailhead);
       
       /* Original that creates one element containing 3 attributes, to be split below
        $("<span class='trail' >" + trailName + " (" + trailheadName + " - " + trailheadDistance + " miles) " + "</span>").appendTo($trailDiv);
        */

        $("<span class='trail' >" + trailName + "</span>").appendTo($trailDiv);

        $("<span class='trailheadName' >" + trailheadName + "</span>").appendTo($trailDiv); 

        $("<span class='trailheadDistance' >" + trailheadDistance + "miles" + "</span>").appendTo($trailDiv);
       
        $("<span class='trailSource'>" + trailheadSource + "</span>").appendTo($trailDiv);

       
        // console.log($trailDiv);
      }

      // diagnostic div to show trailheads with no trail matches
      // TODO: find out why these happen!
      if (trailheadTrailNames.length === 0) {
        $trailDiv = $("<div class='trail-box'>").appendTo("#trailList");
        $("<span class='trail' id='list|" + trailheadName + "'>" + trailheadName + " - NO TRAILS</span>").appendTo($trailDiv);
        $("<span class='trailSource'>" + trailheadSource + "</span>").appendTo($trailDiv);
      }
    });
    console.log(activeTrailheads);
    console.log(trails);
  }


  // on a click of a trailhead div,
  // get the trailName that they clicked on
  // and display that trail only for now

  function getTrailsForTrailhead(e) {
    console.log(["getTrailsForTrailhead"]);
    var divID = "";
    // temporary fix until we decide what to do on trailname click
    // this makes trailname click do the same thing as general div click
    if (e.target !== this) {
      divID = this.id;
    }
    else {
      divID = e.target.id;
    }
    var trailName = divID.split("|")[1];
    var trailheadName = divID.split("|")[2];
    var trailheadID = divID.split("|")[3];
    showTrailHead(trailheadID);
    getTrailPath(trailName);
  }


  // show the clicked trailhead as a default marker icon
  var currentTrailheadMarker;

  function showTrailHead(trailheadID) {
    console.log(["showTrailHead", trailheadID]);
    for (var i = 0; i < activeTrailheads.length; i++) {
      if (activeTrailheads[i].properties.cartodb_id == trailheadID) {
        currentTrailhead = activeTrailheads[i];
      }
    }
    if (currentTrailheadMarker) {
      map.removeLayer(currentTrailheadMarker);
    }
    currentTrailheadMarker = new L.Marker([currentTrailhead.marker.getLatLng().lat, currentTrailhead.marker.getLatLng().lng]);
    currentTrailheadMarker.addTo(map);
  }


  // On click of trailDiv, do the following. Click event handling.

  function getTrailPath(trailName) {
    console.log("getTrailPath");

    var trail_query = "select st_collect(the_geom) the_geom from summit_trail_segments where " +
      "name1='" + trailName + "' or " +
      "name2='" + trailName + "' or " +
      "name3='" + trailName + "' or " +
      "name1='" + trailName + " Trail' or " +
      "name2='" + trailName + " Trail' or " +
      "name3='" + trailName + " Trail'";

    makeSQLQuery(trail_query, showTrail);
  }



  // given a geoJSON set of linestring features,
  // draw them all on the map in a single layer we can remove later
  function showTrail(response) {
    if (currentTrail) {
      map.removeLayer(currentTrail);
    }
    console.log("showTrail");

    if (response.features[0].geometry === null) {
      alert("No trail segment data found.");
    }
    currentTrail = L.geoJson(response, {
      style: {
        weight: 2,
        color: "#FF0000"
      }
    }).addTo(map);
    // figure out what zoom is required to display the entire trail
    var curZoom = map.getBoundsZoom(currentTrail.getBounds());
    // zoom out to MAX_ZOOM if that's more than MAX_ZOOM
    var newZoom = curZoom > MAX_ZOOM ? MAX_ZOOM : curZoom;
    // set the view to that zoom, and the center of the trail's bounding box 
    map.setView(currentTrail.getBounds().getCenter(), newZoom, {
      pan: {
        animate: true
      },
      zoom: {
        animate: true
      }
    });
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