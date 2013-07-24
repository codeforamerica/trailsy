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
  // var trailData = []; // all of the trails metadata (from traildata)
  var trailData = {}; // all of the trails metadata (from traildata table), with trail name as key
  var activeTrailheads = []; // all trailheads (from trailsegments)
  var currentTrailLayer = {}; // We have to know if a trail layer is already being displayed, so we can remove it
  var currentLocation = {};

  // Prepping for API calls (defining data for the call)
  var api_key = "3751baeceb14d394f251b28768ca7e27fc20ad07";
  var endpoint = "http://cfa.cartodb.com/api/v2/sql/";

  // comment these/uncomment the next set to switch between tables
  var TRAILHEADS_TABLE = "summit_trailheads";
  var TRAILSEGMENTS_TABLE = "summit_trailsegments";
  var TRAILDATA_TABLE = "summit_traildata";

  // var TRAILHEADS_TABLE = "summit_trailheads_test";
  // var TRAILSEGMENTS_TABLE = "summit_trail_segments_test";
  // var TRAILDATA_TABLE = "summit_traildata_test";


  // UI events to react to

  $("#redoSearch").click(redoSearch);
  $(document).on('click', '.trailhead-trailname', getTrailsForTrailhead);
  $("#showAllTrailSegments").click(function() {
    getAllTrailPaths(showTrail);
  });
  $("#showUnusedTrailSegments").click(function() {
    getAllTrailPaths(filterKnownTrails);
  });

  // get current location and fire everything up
  currentLocation = getLocation();
  displayInitialMap(currentLocation);


  // returns { lat: x, lng: y }

  function getLocation(callback) {
    // for now, just returns Akron
    return AKRON;
  }

  // given location, display a map, hand off to getNearestTrailheads

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
    map.on("popupopen", function() {
      console.log("popupOpen");
    });
    getNearestTrailheads(location);
  }


  // run the trailhead search again after setting 
  // currentLocation to the center of the currently viewed map

  function redoSearch() {
    currentLocation = map.getCenter();
    activeTrailheads = [];
    trailData = {};
    getNearestTrailheads(currentLocation);
  }


  // get all trailhead info, in order of distance from "location"

  function getNearestTrailheads(location) {
    console.log("getNearestTrailHeads");
    var nearest_trailhead_query = "select trailheads.*, " +
      "ST_Distance_Sphere(ST_WKTToSQL('POINT(" + location.lng + " " + location.lat + ")'), the_geom) distance " +
      "from " + TRAILHEADS_TABLE + " as trailheads " +
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
        trails: [],
        popupContent: ""
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
    var trail_list_query = "select the_geom, name,length,source, cartodb_id from " + TRAILDATA_TABLE + " order by name";
    // Another AJAX call, for the trails
    makeSQLQuery(trail_list_query, makeNearestTrailList);
  }


  // given the list of trails from the trail_data table,
  // populate activeTrailheads[x].trails with all of the trails
  // that match each trailhead's named trails from the trailhead table
  // also, just because we can, add links to the trails within each trailhead popup 

  function makeNearestTrailList(response) {
    console.log("showNearestTrailList");
    for (var i = 0; i < response.features.length; i++) {
      // trailData.push(response.features[i]);
      ////////////////// JUST REPLACED ABOVE WITH BELOW. MORE WORK NEEDED FURTHER DOWN
      trailData[response.features[i].properties.name] = response.features[i];
      console.log("trailData:");
    }
          console.log(trailData);
    for (var j = 0; j < activeTrailheads.length; j++) {
      var trailhead = activeTrailheads[j];
      console.log("-------------");
      console.log(trailhead.properties.name);
      console.log(trailhead.properties.trail1);
      console.log(trailhead.properties.trail2);
      console.log(trailhead.properties.trail3);
      var popupContent = "<div class='trailhead-popup'>" + "<div class='trailhead-name'>" + trailhead.properties.name + "</div>";
      // for (var k = 0; k < trailData.length; k++) {
        // trail = trailData[k];
        if (trailhead.properties.trail1.length && trailhead.properties.trail1 in trailData) {
        // if (trailhead.properties.trail1.length && trail.properties.name.indexOf(trailhead.properties.trail1) === 0) {
          // if (trailhead.properties.trail1 == trail.properties.name) {
          // trailhead.trails.push(trail.properties.name);
          trailhead.trails.push(trailhead.properties.trail1);
          popupContent = popupContent + "<div " + "id='map|" + trailhead.properties.trail1 + "|" + trailhead.properties.name + "|" + trailhead.properties.cartodb_id + "' class='trailhead-trailname trail1' >" + "<a href='#'>" + trailhead.properties.trail1 + "</a></div>";

          // popupContent = popupContent + "<div " + "id='map|" + trail.properties.name + "|" + trailhead.properties.name + "|" + trailhead.properties.cartodb_id + "' class='trailhead-trailname trail1' >" + "<a href='#'>" + trail.properties.name + "</a></div>";
        }
        if (trailhead.properties.trail2.length && trailhead.properties.trail2 in trailData) {

        // if (trailhead.properties.trail2.length && trail.properties.name.indexOf(trailhead.properties.trail2) === 0) {
          // if (trailhead.properties.trail2 == trail.properties.name) {
          // trailhead.trails.push(trail.properties.name);
          trailhead.trails.push(trailhead.properties.trail2);
          popupContent = popupContent + "<div " + "id='map|" + trailhead.properties.trail2 + "|" + trailhead.properties.name + "|" + trailhead.properties.cartodb_id + "' class='trailhead-trailname trail2'>" + "<a href='#'>" + trailhead.properties.trail2 + "</a></div>";

          // popupContent = popupContent + "<div " + "id='map|" + trail.properties.name + "|" + trailhead.properties.name + "|" + trailhead.properties.cartodb_id + "' class='trailhead-trailname trail2'>" + "<a href='#'>" + trail.properties.name + "</a></div>";
        }
        if (trailhead.properties.trail3.length && trailhead.properties.trail3 in trailData) {

        // if (trailhead.properties.trail3.length && trail.properties.name.indexOf(trailhead.properties.trail3) === 0) {
          // if (trailhead.properties.trail3 == trail.properties.name) {
          // trailhead.trails.push(trail.properties.name);
          trailhead.trails.push(trailhead.properties.trail3);
          popupContent = popupContent + "<div " + "id='map|" + trailhead.properties.trail3 + "|" + trailhead.properties.name + "|" + trailhead.properties.cartodb_id + "' class='trailhead-trailname trail3'>" + "<a href='#'>" + trailhead.properties.trail2 + "</a></div>";

          // popupContent = popupContent + "<div " + "id='map|" + trail.properties.name + "|" + trailhead.properties.name + "|" + trailhead.properties.cartodb_id + "' class='trailhead-trailname trail3'>" + "<a href='#'>" + trail.properties.name + "</a></div>";
        }
      // }
      popupContent = popupContent + "</div>";
      trailhead.popupContent = popupContent;
      trailhead.marker.bindPopup(popupContent);
      // trailhead.marker.on("click", getTrailsForTrailhead);
    }
    console.log(activeTrailheads);
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

        $("<div class='trail' >" + trailName + "</div>").appendTo($trailDiv);
        $("<div class='trailheadName' >" + trailheadName + "</div>").appendTo($trailDiv);
        $("<div class='trailheadDistance' >" + trailheadDistance + "miles" + "</div>").appendTo($trailDiv);
        $("<div class='trailSource' id='" + trailheadSource + "'>" + trailheadSource + "</div>").appendTo($trailDiv);

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
    } else {
      divID = e.target.id;
    }
    console.log(["divID", divID]);
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
    currentTrailheadMarker.bindPopup(currentTrailhead.popupContent).openPopup();
    highlightTrailheadDivs(currentTrailhead);

  }

  function highlightTrailheadDivs(currentTrailhead) {
    console.log("highlightTrailheadDivs");
    $(".trail-box").removeClass("trail1").removeClass("trail2").removeClass("trail3");
    console.log(currentTrailhead);
    for (var i = 0; i < currentTrailhead.trails.length; i++) {
      var highlightID = "list|" + currentTrailhead.trails[i] + "|" + currentTrailhead.properties.name + "|" + currentTrailhead.properties.cartodb_id;
      console.log(highlightID);
      $(document.getElementById(highlightID)).addClass("trail" + (i + 1));
      // list|trailheadname|trailname
    }
  }

  // On click of trailDiv, do the following. Click event handling.

  function getTrailPath(trailName) {
    console.log("getTrailPath");

    var trail_query = "select st_collect(the_geom) the_geom, '" + trailName + "' as trailName from " + TRAILSEGMENTS_TABLE + " where " +
      "name1='" + trailName + "' or " +
      "name2='" + trailName + "' or " +
      "name3='" + trailName + "'"; //+ "' or " +
    // "name1='" + trailName + " Trail' or " +
    // "name2='" + trailName + " Trail' or " +
    // "name3='" + trailName + " Trail'";

    makeSQLQuery(trail_query, showTrail);
  }

  function getTrailPathsForTrailhead(trailhead) {
    console.log("getTrailPathsForTrailhead");
    var trail_query = "select st_collect(the_geom) the_geom from " + TRAILSEGMENTS_TABLE + " segments," + TRAILHEADS_TABLE + " trailheads where " +
      "trailheads.name = trailhead and " +
      "trailheads.name = segments.name1 ";
  }

  function getAllTrailPaths(callback) {
    var trail_query = "select the_geom, name1, name2, name3 from " + TRAILSEGMENTS_TABLE;
    makeSQLQuery(trail_query, callback);
  }


  function filterKnownTrails(response) {
    console.log(response);
    var filteredResponse = {
      type: "FeatureCollection",
      features: []
    };
    // spin through response, removing any segments that aren't part of a known trail
    filteredResponse.features = response.features.filter(function(element, index, array) {
      console.log(element.properties);
      // for (i = 0; i < trailData.length; i++) {
        if (element.properties.name1 in trailData ||
          element.properties.name2 in trailData ||
        element.properties.name3 in trailData) {
        // if (element.properties.name1 === trailData[i].properties.name ||
          // element.properties.name2 === trailData[i].properties.name ||
          // element.properties.name3 === trailData[i].properties.name) {
          return false;
        }
      // }
      return true;
    });
    console.log(filteredResponse);
    showTrail(filteredResponse);
  }

  // given a geoJSON set of linestring features,
  // draw them all on the map in a single layer we can remove later

  function showTrail(response) {
    console.log(response);
    if (currentTrailLayer) {
      map.removeLayer(currentTrailLayer);
    }
    console.log("showTrail");

    if (response.features[0].geometry === null) {
      alert("No trail segment data found.");
    }
    currentTrailLayer = L.geoJson(response, {
      style: {
        weight: 2,
        color: "#FF0000"
      },
      onEachFeature: function(feature, layer) {
        var popupHTML = "";
        if (feature.properties.trailname) {
          popupHTML = feature.properties.trailname;
        } else {
          if (feature.properties.name1) {
            popupHTML = popupHTML + "<br>" + feature.properties.name1;
          }
          if (feature.properties.name2) {
            popupHTML = popupHTML + "<br>" + feature.properties.name2;
          }
          if (feature.properties.name3) {
            popupHTML = popupHTML + "<br>" + feature.properties.name3;
          }
        }
        layer.bindPopup(popupHTML);
      }
    }).addTo(map);
    // figure out what zoom is required to display the entire trail
    var curZoom = map.getBoundsZoom(currentTrailLayer.getBounds());
    // zoom out to MAX_ZOOM if that's more than MAX_ZOOM
    var newZoom = curZoom > MAX_ZOOM ? MAX_ZOOM : curZoom;
    // set the view to that zoom, and the center of the trail's bounding box 
    map.setView(currentTrailLayer.getBounds().getCenter(), newZoom, {
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