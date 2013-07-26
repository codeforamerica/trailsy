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

  // given location, display a map, hand off to getTrailheads

  function displayInitialMap(location) {
    map = L.map('trailMap', {
      zoomControl: true
    }).setView([location.lat, location.lng], 11);

    // Switch between MapBox and other providers by commenting/uncommenting these
    // L.tileLayer.provider('MapBox.' + MAPBOX_MAP_ID).addTo(map);
    L.tileLayer.provider('Thunderforest.Landscape').addTo(map);
    map.on("popupopen", function() {
      console.log("popupOpen");
    });
    getTrailheads(location);
  }


  // run the trailhead search again after setting
  // currentLocation to the center of the currently viewed map

  function redoSearch() {
    currentLocation = map.getCenter();
    activeTrailheads = [];
    trailData = {};
    getTrailheads(currentLocation);
  }


  // get all trailhead info, in order of distance from "location"

  function getTrailheads(location) {
    console.log("getTrailheads");
    var nearest_trailhead_query = "select trailheads.*, " +
      "ST_Distance_Sphere(ST_WKTToSQL('POINT(" + location.lng + " " + location.lat + ")'), the_geom) distance " +
      "from " + TRAILHEADS_TABLE + " as trailheads " +
      "ORDER BY distance " + "";

    makeSQLQuery(nearest_trailhead_query, populateTrailheadArray);
  }


  // given the getTrailheads response, a geoJSON collection of trailheads ordered by distance,
  // populate activeTrailheads[] with the each trailhead's stored properties, a Leaflet marker, 
  // and a place to put the trails for that trailhead

  function populateTrailheadArray(response) {
    console.log("populateTrailheadArray");
    console.log(response);
    for (var i = 0; i < response.features.length; i++) {
      var currentFeature = response.features[i];
      currentFeatureLatLng = new L.LatLng(currentFeature.geometry.coordinates[1], currentFeature.geometry.coordinates[0]);
      var newMarker = L.circleMarker(currentFeatureLatLng, {
        title: 'test',
        radius: 4
      }).bindPopup(currentFeature.properties.name).on("click", trailheadMarkerClick);
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

  function trailheadMarkerClick(e) {
    console.log("trailheadMarkerClick");

  }

  // given activeTrailheads (which is a broadly-scoped variable, but we'll ignore that for now),
  // add all of the markers to the map in a single Leaflet layer group

  function showNearestTrailheads(activeTrailheads) {
    console.log("showNearestTrailheads");
    var currentTrailheadMarkerArray = [];
    for (var i = 0; i < activeTrailheads.length; i++) {
      currentTrailheadMarkerArray.push(activeTrailheads[i].marker);
    }

    var currentTrailheadLayerGroup = L.layerGroup(currentTrailheadMarkerArray);

    map.addLayer(currentTrailheadLayerGroup);
    getTrailInfo();
  }


  // get the list of trails

  function getTrailInfo() {
    console.log("getTrailInfo");
    var trail_list_query = "select the_geom, name,length,source, cartodb_id from " + TRAILDATA_TABLE + " order by name";
    // Another AJAX call, for the trails
    makeSQLQuery(trail_list_query, addTrailsToTrailheads);
  }


  // given the list of trails from the trail_data table,
  // populate activeTrailheads[x].trails with all of the trails
  // that match each trailhead's named trails from the trailhead table
  // also, just because we can, add links to the trails within each trailhead popup 

  function addTrailsToTrailheads(response) {
    console.log("showNearestTrailList");
    for (var i = 0; i < response.features.length; i++) {
      trailData[response.features[i].properties.name] = response.features[i];
      // console.log("trailData:");
    }
    console.log(trailData);
    for (var j = 0; j < activeTrailheads.length; j++) {
      var trailhead = activeTrailheads[j];
      // console.log("-------------");
      // console.log(trailhead.properties.name);
      // console.log(trailhead.properties.trail1);
      // console.log(trailhead.properties.trail2);
      // console.log(trailhead.properties.trail3);
      var $popupContentMainDiv = $("<div>").addClass("trailhead-popup");

      var $popupTrailheadDiv = $("<div>").addClass("trailhead-name").html(trailhead.properties.name).appendTo($popupContentMainDiv);
      console.log($popupContentMainDiv.val());
      // var popupContent = "<div class='trailhead-popup'>" + "<div class='trailhead-name'>" + trailhead.properties.name + "</div>";
      1e15ff5d0933543c4c0e39626857cefdc896589b
      if (trailhead.properties.trail1 in trailData) {
        console.log("trail1 match");
        trailhead.trails.push(trailhead.properties.trail1);
        var $popupTrail1Div = $("<div>").addClass("trailhead-trailname trail1")
          .attr("data-trailname", trailhead.properties.trail1)
          .attr("data-trailheadname", trailhead.properties.name)
          .attr("data-trailheadid", trailhead.properties.cartodb_id)
          .append("<a href='#'>").html(trailhead.properties.trail1)
          .appendTo($popupTrailheadDiv);
      }
      if (trailhead.properties.trail2 in trailData) {
        trailhead.trails.push(trailhead.properties.trail2);
        console.log("trail2 match");
        var $popupTrail2Div = $("<div>").addClass("trailhead-trailname trail2")
          .attr("data-trailname", trailhead.properties.trail2)
          .attr("data-trailheadname", trailhead.properties.name)
          .attr("data-trailheadid", trailhead.properties.cartodb_id)
          .append("<a href='#'>").html(trailhead.properties.trail2)
          .appendTo($popupTrailheadDiv);
      }
      if (trailhead.properties.trail3 in trailData) {
        trailhead.trails.push(trailhead.properties.trail3);
        console.log("trail3 match");
        var $popupTrail3Div = $("<div>").addClass("trailhead-trailname trail3")
          .attr("data-trailname", trailhead.properties.trail3)
          .data("data-trailheadname", trailhead.properties.name)
          .data("data-trailheadid", trailhead.properties.cartodb_id)
          .attr("data-trailheadname", trailhead.properties.name)
          .attr("data-trailheadid", trailhead.properties.cartodb_id)
          .append("<a href='#'>").html(trailhead.properties.trail3)
          .appendTo($popupTrailheadDiv);
      }
      // popupContent = popupContent + "</div>";
      trailhead.popupContent = $popupContentMainDiv.outerHTML();
      // trailhead.marker.bindPopup(popupContent);
      trailhead.marker.bindPopup(trailhead.popupContent);
      // trailhead.marker.on("click", getTrailsForTrailhead);
    }
    // console.log(activeTrailheads);
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
      var $trailDiv;

      // Making a new div for text / each trail
      for (var i = 0; i < trailheadTrailNames.length; i++) {
        var trailName = trailheadTrailNames[i];

        $trailDiv = $("<div>").addClass('trail-box')
          .data("source", "list")
          .data("trailname", trailName)
          .data("trailheadName", trailheadName)
          .data("trailheadid", trailheadID)
          .appendTo("#trailList")
          .click(getTrailsForTrailhead);

        // $trailDiv = $("<div class='trail-box' id='list|" + trailName + "|" + trailheadName + "|" + trailheadID + "'>").appendTo("#trailList").click(getTrailsForTrailhead);

        /* Original that creates one element containing 3 attributes, to be split below
        $("<span class='trail' >" + trailName + " (" + trailheadName + " - " + trailheadDistance + " miles) " + "</span>").appendTo($trailDiv);
        */

        $("<div class='trail' >" + trailName + "</div>").appendTo($trailDiv);
        $("<div class='trailheadName' >" + trailheadName + "</div>").appendTo($trailDiv);
        $("<div class='trailheadDistance' >" + trailheadDistance + " miles away" + "</div>").appendTo($trailDiv);
        $("<div class='trailSource' id='" + trailheadSource + "'>" + trailheadSource + "</div>").appendTo($trailDiv);
      }

      // diagnostic div to show trailheads with no trail matches
      // TODO: find out why these happen!
      if (trailheadTrailNames.length === 0) {
        $trailDiv = $("<div class='trail-box'>").appendTo("#trailList");
        $("<span class='trail' id='list|" + trailheadName + "'>" + trailheadName + " - NO TRAILS (" +
          [val.properties.trail1, val.properties.trail2, val.properties.trail3].join(", ") + ")</span>").appendTo($trailDiv);
        $("<span class='trailSource'>" + trailheadSource + "</span>").appendTo($trailDiv);
      }
    });
  }


  // on a click of a trailhead div,
  // get the trailName that they clicked on
  // and display that trail only for now

  function getTrailsForTrailhead(e) {
    console.log("getTrailsForTrailhead");
    var $myTarget;
    // temporary fix until we decide what to do on trailname click
    // this makes trailname click do the same thing as general div click
    if (e.target !== this) {
      console.log("this.id");
      $myTarget = $(this);
    } else {
      console.log("e.target.id");
      $myTarget = $(e.target);
    }
    console.log($myTarget);
    var trailName = $myTarget.data("trailname");
    console.log(trailName);
    var trailheadName = $myTarget.data("trailheadname");
    var trailheadID = $myTarget.data("trailheadid");

    highlightTrailhead(trailheadID);
    getTrailPath(trailName);
  }


  // show the clicked trailhead as a default marker icon
  var currentTrailheadMarker;

  function highlightTrailhead(trailheadID) {
    console.log("highlightTrailhead");
    console.log(trailheadID);
    for (var i = 0; i < activeTrailheads.length; i++) {
      if (activeTrailheads[i].properties.cartodb_id == trailheadID) {
        currentTrailhead = activeTrailheads[i];
      }
    }
    if (currentTrailheadMarker) {
      map.removeLayer(currentTrailheadMarker);
    }
    currentTrailheadMarker = new L.Marker([currentTrailhead.marker.getLatLng().lat, currentTrailhead.marker.getLatLng().lng]);
    currentTrailheadMarker.addTo(map).bindPopup(currentTrailhead.popupContent).openPopup();
    highlightTrailheadDivs(currentTrailhead);
    getTrailPathsForTrailhead(currentTrailhead.properties.name);
  }

  function highlightTrailheadDivs(currentTrailhead) {
    console.log("highlightTrailheadDivs");
    console.log(currentTrailhead);
    $(".trail-box").removeClass("trail1").removeClass("trail2").removeClass("trail3");
    for (var i = 0; i < currentTrailhead.trails.length; i++) {
      var highlightID = "list|" + currentTrailhead.trails[i] + "|" + currentTrailhead.properties.name + "|" + currentTrailhead.properties.cartodb_id;
      console.log(highlightID);
      $(document.getElementById(highlightID)).addClass("trail" + (i + 1));
    }
  }

  // On click of trailName, do the following. Click event handling.

  function getTrailPath(trailName) {
    console.log("getTrailPath");

    var trail_query = "select st_collect(the_geom) the_geom, '" + trailName + "' as trailName from " + TRAILSEGMENTS_TABLE + " where " +
      "name1='" + trailName + "' or " +
      "name2='" + trailName + "' or " +
      "name3='" + trailName + "' or " +
      "name1='" + trailName + " Trail' or " +
      "name2='" + trailName + " Trail' or " +
      "name3='" + trailName + " Trail'";

    makeSQLQuery(trail_query, showTrail);
  }

  function getTrailPathsForTrailhead(trailhead) {
    console.log("getTrailPathsForTrailhead");
    // got trailhead.trails, now get the segment collection for all of them
    // get segment collection for each
    // then merge the GeoJSON?
    var trail_query = "select st_collect(the_geom) the_geom from " + TRAILSEGMENTS_TABLE + " segments," + TRAILHEADS_TABLE + " trailheads where " +
      "trailheads.name = " + trailhead + " and " +
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
    console.log("showTrail");
    console.log(response);
    if (currentTrailLayer) {
      map.removeLayer(currentTrailLayer);
    }
    if (response.features[0].geometry === null) {
      alert("No trail segment data found.");
    }
    currentTrailLayer = L.geoJson(response, {
      style: {
        weight: 2,
        color: "#FF0000"
      },
      onEachFeature: function(feature, layer) {
        var popupHTML = "<div class='trail-popup'>";
        // if we have a named trail, show its name
        if (feature.properties.trailname) {
          popupHTML = popupHTML + feature.properties.trailname;
        }
        // else we have an unused trail segment--list all of the names associated with it 
        else {
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
        popupHTML = popupHTML + "</div>";
        layer.bindPopup(popupHTML);
      }
    }).addTo(map);
    console.log("currentTrailLayer:");
    console.log(currentTrailLayer);
    // figure out what zoom is required to display the entire trail layer
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

  // really? jQuery doesn't have outerhtml()?
  jQuery.fn.outerHTML = function(s) {
    return s ? this.before(s).remove() : jQuery("<p>").append(this.eq(0).clone()).html();
  };
}