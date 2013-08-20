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

  var METERSTOMILESFACTOR = 0.00062137;
  var MAX_ZOOM = 14;
  var MIN_ZOOM = 12;
  var SECONDARY_TRAIL_ZOOM = 13;
  var SHORT_MAX_DISTANCE = 1.5;
  var MEDIUM_MAX_DISTANCE = 4.0;
  var SHOW_ALL_TRAILS = 1;
  var USE_LOCAL = 1; // Set this to a true value to preload/use a local trail segment cache

  var map = {};
  var trailData = {}; // all of the trails metadata (from traildata table), with trail name as key
  // { *cartodb_id*: { geometry: null,  // this field is added for CartoDB's approval
  //                  properties: { cartodb_id: *uniqueID*,
  //                                length: *length of trail in meters*,
  //                                name: *name of trail*,
  //                                source: *whose data this info came from*,
  //                              }
  //                }
  // }
  var trailheads = []; // all trailheads (from trailsegments)
  // [ {  marker: *Leaflet marker*,
  //      trails: *[array of matched trail IDs],
  //      popupContent: *HTML of Leaflet popup*,
  //      properties: { cartodb_id: *uniqueID*,
  //                    distance: *from current location in meters*,
  //                    name: *name*,
  //                    source: *whose data this info came from*,
  //                    trail1: *trail at this trailhead*,
  //                    trail2: *trail at this trailhead*,
  //                    trail3: *trail at this trailhead*,
  //                    updated_at: *update time*,
  //                    created_at: *creation time*,
  //                    wkt: *original wkt for trailhead point*
  //                  }, 
  //   }[, ...}]
  // ]
  var trailSegments = [];


  var currentMultiTrailLayer = {}; // We have to know if a trail layer is already being displayed, so we can remove it
  var currentTrailLayers = [];
  var currentHighlightedTrailLayer = {};
  var currentLocation = {};
  var currentFilters = {};
  var currentDetailTrail = null;
  var userMarker = null;
  var allSegmentLayer = null;

  // Prepping for API calls (defining data for the call)
  var endpoint = "http://cfa.cartodb.com/api/v2/sql/";

  // comment these/uncomment the next set to switch between tables
  var TRAILHEADS_TABLE = "summit_trailheads";
  var TRAILSEGMENTS_TABLE = "summit_trailsegments";
  var TRAILDATA_TABLE = "summit_traildata";

  // var TRAILHEADS_TABLE = "summit_trailheads_test";
  // var TRAILSEGMENTS_TABLE = "summit_trail_segments_test";
  // var TRAILDATA_TABLE = "summit_traildata_test";


  // UI events to react to

  $("#redoSearch").click(reorderTrailsWithNewLocation);
  $(document).on('click', '.trailhead-trailname', trailnameClick);
  $(document).on('click', '.closeDetail', closeDetailPanel);
  $("#showAllTrailSegments").click(function() {
    getAllTrailPaths(drawMultiTrailLayer);
  });
  $("#showUnusedTrailSegments").click(function() {
    getAllTrailPaths(filterKnownTrails);
  });
  $(document).on('change', '.selectpicker', filterChangeHandler);


  // -----------------------------------
  // Kick things off

  initialSetup();

  // -----------------------------------

  //  Difficulty Filtering
  //  Length Filtering
  //  Helper functions

  function filterTrailList() {
    // defining the function, not calling it
    // click events / activation of checkboxes
    // change currentFilters object
    // apply current Filters to trailData
    // initialSetup performs the mapping
  }


  // The next three functions perform trailhead/trail mapping
  // on a) initial startup, b) requested re-sort of trailheads based on the map, 
  // and c) a change in filter settings
  // They all call addTrailDataToTrailheads() as their final action 
  // --------------------------------------------------------------

  // on startup, get location, display the map,
  // get and display the trailheads, populate trailData, 
  // add trailData to trailheads

  function initialSetup() {
    console.log("initialSetup");
    setCurrentLocation();
    displayInitialMap();
    getOrderedTrailheads(currentLocation, function() {
      getTrailData(function() {
        addTrailDataToTrailheads(trailData);
      });
    });
    if (USE_LOCAL) {
      getTrailSegments(function() {
        //console.log(trailSegments);
      });
    }
  }

  // set currentLocation to the center of the currently viewed map
  // then get the ordered trailheads and add trailData to trailheads

  function reorderTrailsWithNewLocation() {
    setCurrentLocationFromMap();
    getOrderedTrailheads(currentLocation, function() {
      addTrailDataToTrailheads(trailData);
    });
  }

  // This should probably be called after a UI change in the filters,
  // and the accompanying change to the currentFilters

  function applyFilterChange(currentFilters, trailData) {
    // TODO:
    var filteredTrailData = $.extend(true, {}, trailData);
    $.each(trailData, function(trail_id, trail) {
      if (currentFilters.activityFilter) {
        for (var i = 0; i < currentFilters.activityFilter.length; i++) {
          var activity = currentFilters.activityFilter[i];
          if (trail.properties[activity].toLowerCase() !== "true") {
            delete filteredTrailData[trail_id];
          }
        }
      }
      if (currentFilters.difficultyFilter) {
        var include = false;
        for (var j = 0; j < currentFilters.difficultyFilter.length; j++) {
          var difficulty = currentFilters.difficultyFilter[j];
          if (trail.properties.difficulty.toLowerCase() == difficulty.toLowerCase()) {
            include = true;
            break;
          }
        }
        if (!include) {
          delete filteredTrailData[trail_id];
        }
      }
      if (currentFilters.lengthFilter) {
        var distInclude = false;
        for (var k = 0; k < currentFilters.lengthFilter.length; k++) {
          var distance = currentFilters.lengthFilter[k];
          var trailDist = trail.properties["length"];
          if ((distance.toLowerCase() == "short" && trailDist <= SHORT_MAX_DISTANCE) ||
            (distance.toLowerCase() == "medium" && trailDist > SHORT_MAX_DISTANCE && trailDist <= MEDIUM_MAX_DISTANCE) ||
            (distance.toLowerCase() == "long" && trailDist > MEDIUM_MAX_DISTANCE)) {
            distInclude = true;
            break;
          }
        }
        if (!distInclude) {
          delete filteredTrailData[trail_id];
        }
      }
    });

    // loop through trailData
    // apply currentFilters object
    // put trails we want to display into filteredTrailData
    addTrailDataToTrailheads(filteredTrailData);
  }

  function filterChangeHandler(e) {
    var $currentTarget = $(e.currentTarget);
    console.log($currentTarget);
    var filterType = $currentTarget.attr("id");
    //  true if selected, false if not selected ^^
    var currentUIFilterState = $currentTarget.val();
    updateFilterObject(filterType, currentUIFilterState);
  }

  function updateFilterObject(filterType, currentUIFilterState) {
    currentFilters[filterType] = currentUIFilterState;
    console.log(currentFilters);
    applyFilterChange(currentFilters, trailData);
  }

  // these two set currentLocation

  function setCurrentLocationFromMap() {
    currentLocation = map.getCenter();
  }

  function setCurrentLocation() {
    // for now, just returns Akron
    // should use browser geolocation,
    // and only return Akron if we're far from home base

    currentLocation = AKRON;
  }

  // display the map based on currentLocation

  function displayInitialMap() {
    console.log("displayInitialMap");
    console.log(currentLocation);
    map = L.map('trailMap', {
      zoomControl: true
    }).setView([currentLocation.lat, currentLocation.lng], 11);

    // Switch between MapBox and other providers by commenting/uncommenting these
    L.tileLayer.provider('MapBox.' + MAPBOX_MAP_ID).addTo(map);
    // L.tileLayer.provider('Thunderforest.Landscape').addTo(map);
    map.on("popupopen", function() {
      console.log("popupOpen");
    });
    map.on("locationfound", function(location) {
      if (!userMarker)
        userMarker = L.userMarker(location.latlng, {
          smallIcon: true,
          pulsing: true,
          accuracy: 0
        }).addTo(map);
      console.log(location.latlng);
      userMarker.setLatLng(location.latlng);
    });
    map.locate({
      watch: true,
      setView: false,
      enableHighAccuracy: true
    });
    map.on("zoomend", function(e) {
      console.log("zoomend");
      if (SHOW_ALL_TRAILS && allSegmentLayer) {
        if (map.getZoom() >= SECONDARY_TRAIL_ZOOM && !(map.hasLayer(allSegmentLayer))) {
          map.addLayer(allSegmentLayer);
        }
        if (map.getZoom() < SECONDARY_TRAIL_ZOOM && map.hasLayer(allSegmentLayer)) {
          map.removeLayer(allSegmentLayer);
        }
      }
    });
    map.on("locationerror", function(errorEvent) {
      console.log("Location Error:");
      console.log(errorEvent.message);
      console.log(errorEvent.code);
    });
  }

  // get all trailhead info, in order of distance from "location"

  function getOrderedTrailheads(location, callback) {
    console.log("getOrderedTrailheads");
    var nearest_trailhead_query = "select trailheads.*, " +
      "ST_Distance_Sphere(ST_WKTToSQL('POINT(" + location.lng + " " + location.lat + ")'), the_geom) distance " +
      "from " + TRAILHEADS_TABLE + " as trailheads " +
      "ORDER BY distance " + "";

    makeSQLQuery(nearest_trailhead_query, function(response) {
      populateTrailheadArray(response);
      if (typeof callback == "function") {
        callback();
      }
    });
  }


  // given the getOrderedTrailheads response, a geoJSON collection of trailheads ordered by distance,
  // populate trailheads[] with the each trailhead's stored properties, a Leaflet marker, 
  // and a place to put the trails for that trailhead

  function populateTrailheadArray(trailheadsGeoJSON) {
    console.log("populateTrailheadArray");
    console.log(trailheadsGeoJSON);
    trailheads = [];
    for (var i = 0; i < trailheadsGeoJSON.features.length; i++) {
      var currentFeature = trailheadsGeoJSON.features[i];
      currentFeatureLatLng = new L.LatLng(currentFeature.geometry.coordinates[1], currentFeature.geometry.coordinates[0]);
      var newMarker = L.circleMarker(currentFeatureLatLng, {
        title: 'test',
        radius: 4
      });

      // adding closure to call trailheadMarkerClick with trailheadID on marker click
      newMarker.on("click", function(trailheadID) {
        return function() {
          trailheadMarkerClick(trailheadID);
        };
      }(currentFeature.properties.cartodb_id));

      var trailhead = {
        properties: currentFeature.properties,
        marker: newMarker,
        trails: [],
        popupContent: ""
      };
      trailheads.push(trailhead);
    }
  }

  // on trailhead marker click, this is invoked with the id of the trailhead
  // not used for anything but logging at the moment

  function trailheadMarkerClick(id) {
    console.log("trailheadMarkerClick");
    highlightTrailhead(id, 0);
  }

  // get the trailData from the DB

  function getTrailData(callback) {
    console.log("getTrailData");
    var trail_list_query = "select * from " + TRAILDATA_TABLE + " order by name";
    // Another AJAX call, for the trails
    makeSQLQuery(trail_list_query, function(response) {
      populateTrailData(response);
      if (typeof callback == "function") {
        callback();
      }
    });
  }

  function populateTrailData(trailDataGeoJSON) {
    for (var i = 0; i < trailDataGeoJSON.features.length; i++) {
      trailData[trailDataGeoJSON.features[i].properties.cartodb_id] = trailDataGeoJSON.features[i];
    }
  }

  function getTrailSegments(callback) {
    console.log("getTrailSegments");
    var trail_segment_query = "select the_geom, name1, name2, name3, source from " + TRAILSEGMENTS_TABLE;
    makeSQLQuery(trail_segment_query, function(response) {
      trailSegments = response;

      allSegmentLayer = L.geoJson(trailSegments, {
        style: function() {
          return {
            color: '#060',
            weight: 2,
            opacity: 0.5,
            clickable: true,
            dashArray: "5,5"
          };
        },
        onEachFeature: function(feature, layer) {
          var popupHTML = "<div class='trail-popup'>";
          if (feature.properties.name1) {
            popupHTML = popupHTML + feature.properties.name1;
          }
          if (feature.properties.name2) {
            popupHTML = popupHTML + "<br>" + feature.properties.name2;
          }
          if (feature.properties.name3) {
            popupHTML = popupHTML + "<br>" + feature.properties.name3;
          }
          popupHTML = popupHTML + "</div>";
          layer.bindPopup(popupHTML);
        }
      });
      if (typeof callback == "function") {
        callback();
      }
    });
  }

  // given trailData,
  // populate trailheads[x].trails with all of the trails in trailData
  // that match each trailhead's named trails from the trailhead table.
  // Also add links to the trails within each trailhead popup 

  function addTrailDataToTrailheads(myTrailData) {
    console.log("addTrailDataToTrailheads");
    for (var j = 0; j < trailheads.length; j++) {
      var trailhead = trailheads[j];
      trailhead.trails = [];
      // for each original trailhead trail name
      for (var trailNum = 1; trailNum <= 3; trailNum++) {
        var trailWithNum = "trail" + trailNum;
        if (trailhead.properties[trailWithNum] === "") {
          continue;
        }
        var trailheadTrailName = trailhead.properties[trailWithNum];
        // TODO: add a test for the case of duplicate trail names.
        // Right now this
        // loop through all of the trailData objects, looking for trail names that match
        // the trailhead trailname.
        // this works great, except for things like "Ledges Trail," which get added twice,
        // one for the CVNP instance and one for the MPSSC instance.
        // we should test for duplicate names and only use the nearest one.
        // to do that, we'll need to either query the DB for the trail segment info,
        // or check distance against the (yet-to-be) pre-loaded trail segment info
        $.each(myTrailData, function(trailID, trail) {
          if (trailhead.properties[trailWithNum] == trail.properties.name) {
            trailhead.trails.push(trailID);
          }
        });
      }
    }
    fixDuplicateTrailNames(trailheads);
    makeTrailheadPopups(trailheads);
    mapActiveTrailheads(trailheads);
    makeTrailDivs(trailheads);
  }


  // this is so very wrong and terrible and makes me want to never write anything again.
  // alas, it works for now.
  // for each trailhead, if two or more of the matched trails from addTrailDataToTrailheads() have the same name,
  // remove any trails that don't match the trailhead source

  function fixDuplicateTrailNames(trailheads) {
    console.log("fixDuplicateTrailNames");
    for (var trailheadIndex = 0; trailheadIndex < trailheads.length; trailheadIndex++) {
      var trailhead = trailheads[trailheadIndex];
      var trailheadTrailNames = {};
      for (var trailsIndex = 0; trailsIndex < trailhead.trails.length; trailsIndex++) {
        var trailName = trailData[trailhead.trails[trailsIndex]].properties.name;
        trailheadTrailNames[trailName] = trailheadTrailNames[trailName] || [];
        var sourceAndTrailID = {
          source: trailData[trailhead.trails[trailsIndex]].properties.source,
          trailID: trailData[trailhead.trails[trailsIndex]].properties.cartodb_id
        };
        trailheadTrailNames[trailName].push(sourceAndTrailID);
      }
      for (var trailheadTrailName in trailheadTrailNames) {
        if (trailheadTrailNames.hasOwnProperty(trailheadTrailName)) {
          if (trailheadTrailNames[trailheadTrailName].length > 1) {
            // remove the ID from the trailhead trails array if the source doesn't match
            for (var i = 0; i < trailheadTrailNames[trailheadTrailName].length; i++) {
              var mySourceAndTrailID = trailheadTrailNames[trailheadTrailName][i];
              if (mySourceAndTrailID.source != trailhead.properties.source) {
                var idToRemove = mySourceAndTrailID.trailID;
                var removeIndex = $.inArray(idToRemove.toString(), trailhead.trails);
                trailhead.trails.splice(removeIndex, 1);
              }
            }
          }
        }
      }
    }
  }

  // given the trailheads,
  // make the popup menu for each one, including each trail present
  // and add it to the trailhead object

  function makeTrailheadPopups(trailheads) {
    for (var trailheadIndex = 0; trailheadIndex < trailheads.length; trailheadIndex++) {
      var trailhead = trailheads[trailheadIndex];
      var $popupContentMainDiv = $("<div>").addClass("trailhead-popup");
      var $popupTrailheadDiv = $("<div>").addClass("trailhead-name").html(trailhead.properties.name).appendTo($popupContentMainDiv);
      for (var trailsIndex = 0; trailsIndex < trailhead.trails.length; trailsIndex++) {
        var trail = trailData[trailhead.trails[trailsIndex]];
        var $popupTrailDiv = $("<div>").addClass("trailhead-trailname trail" + (trailsIndex + 1))
          .attr("data-trailname", trail.properties.name)
          .attr("data-trailid", trail.properties.cartodb_id)
          .attr("data-trailheadname", trailhead.properties.name)
          .attr("data-trailheadid", trailhead.properties.cartodb_id)
          .attr("data-index", trailsIndex)
          .append("<a href='#'>").html(trail.properties.name)
          .appendTo($popupTrailheadDiv);
      }
      trailhead.popupContent = $popupContentMainDiv.outerHTML();
    }
  }

  // given trailheads, add all of the markers to the map in a single Leaflet layer group
  // except for trailheads with no matched trails

  function mapActiveTrailheads(trailheads) {
    console.log("mapActiveTrailheads");
    var currentTrailheadMarkerArray = [];
    for (var i = 0; i < trailheads.length; i++) {
      if (trailheads[i].trails.length) {
        currentTrailheadMarkerArray.push(trailheads[i].marker);
      } else {
        console.log(["trailhead not displayed: ", trailheads[i].properties.name]);
      }
    }
    var currentTrailheadLayerGroup = L.layerGroup(currentTrailheadMarkerArray);
    map.addLayer(currentTrailheadLayerGroup);
  }

  // given trailheads, now populated with matching trail names,
  // fill out the left trail(head) pane,
  // noting if a particular trailhead has no trails associated with it

  function makeTrailDivs(trailheads) {
    console.log("makeTrailDivs");
    $("#trailList").html("");
    $.each(trailheads, function(index, trailhead) {
      var trailheadName = trailhead.properties.name;
      var trailheadID = trailhead.properties.cartodb_id;
      var trailheadTrailIDs = trailhead.trails;
      if (trailheadTrailIDs.length === 0) {
        return true; // next $.each
      }
      var trailheadSource = trailhead.properties.source;
      var trailheadDistance = metersToMiles(trailhead.properties.distance);
      var $trailDiv;

      // Making a new div for text / each trail 
      for (var i = 0; i < trailheadTrailIDs.length; i++) {

        var trailID = trailheadTrailIDs[i];
        var trail = trailData[trailID];
        var trailName = trailData[trailID].properties.name;
        $trailDiv = $("<div>").addClass('trail-box')
          .attr("data-source", "list")
          .attr("data-trailid", trailID)
          .attr("data-trailname", trailName)
          .attr("data-trailheadName", trailheadName)
          .attr("data-trailheadid", trailheadID)
          .attr("data-index", i)
          .appendTo("#trailList")
          .click(populateTrailsForTrailheadDiv)
          .click(function(trail, trailhead) {
            return function(e) {
              showTrailDetails(trail, trailhead);
            };
          }(trail, trailhead));

        $trailIndicator = $("<div>").addClass("trailIndicatorLight").appendTo($trailDiv);

        // Making a new div for Detail Panel

        $("<div class='trail' >" + trailName + "</div>").appendTo($trailDiv);
        $("<div class='trailheadName' >" + trailheadName + "</div>").appendTo($trailDiv);
        $("<div class='trailheadDistance' >" + trailheadDistance + " miles away" + "</div>").appendTo($trailDiv);
        $("<div class='trailSource' id='" + trailheadSource + "'>" + trailheadSource + "</div>").appendTo($trailDiv);
      }

      // diagnostic div to show trailheads with no trail matches
      // (These shouldn't happen any more because of the trailheadTrailIDs.length check above.)
      if (trailheadTrailIDs.length === 0) {
        $trailDiv = $("<div class='trail-box'>").appendTo("#trailList");
        $("<span class='trail' id='list|" + trailheadName + "'>" + trailheadName + " - NO TRAILS (" +
          [val.properties.trail1, val.properties.trail2, val.properties.trail3].join(", ") + ")</span>").appendTo($trailDiv);
        $("<span class='trailSource'>" + trailheadSource + "</span>").appendTo($trailDiv);
      }
    });
  }

  function metersToMiles(i) {
    return (i * METERSTOMILESFACTOR).toFixed(1);
  }

  function showTrailDetails(trail, trailhead) {
    console.log("showTrailDetails");
    if (!$('.detailPanelColumn').is(':visible')) {
      decorateDetailPanel(trail, trailhead);
      openDetailPanel();
      currentDetailTrail = trail;
      currentDetailTrailhead = trailhead;
    } else {
      if (currentDetailTrail == trail && currentDetailTrailhead == trailhead) {
        currentDetailTrail = null;
        currentDetailTrailhead = null;
        closeDetailPanel();
      } else {
        decorateDetailPanel(trail, trailhead);
        currentDetailTrail = trail;
        currentDetailTrailhead = trailhead;
      }
    }
  }

  //  Helper functions for ShowTrailDetails

  function openDetailPanel() {
    console.log("openDetailPanel");
    $('.detailPanelColumn').show().toggleClass("col-lg-0 col-lg-3");
    $('.trailListColumn').toggleClass("col-lg-4 col-lg-3");
    $('.trailMapContainer').toggleClass("col-lg-8 col-lg-6");
    map.invalidateSize();
  }

  function closeDetailPanel() {
    console.log("closeDetailPanel");
    $('.detailPanelColumn').hide().toggleClass("col-lg-0 col-lg-3");
    $('.trailListColumn').toggleClass("col-lg-4 col-lg-3");
    $('.trailMapContainer').toggleClass("col-lg-8 col-lg-6");
    map.invalidateSize();
  }

  function decorateDetailPanel(trail, trailhead) {
    $('.detail-panel .trailName').html(trail.properties.name);
    $('.detail-panel .detailTrailheadName').html(trailhead.properties.name);
    $('.detail-panel .detailSource').html(trailhead.properties.source);
    $('.detail-panel .detailTrailheadDistance').html(metersToMiles(trailhead.properties.distance));
    $('.detail-panel .detailLength').html(trail.properties.length);
    $('.detail-panel .detailDogs').html(trail.properties.dogs);
    $('.detail-panel .detailBikes').html(trail.properties.bikes);
    $('.detail-panel .detailDifficulty').html(trail.properties.difficulty);
    $('.detail-panel .detailAccessible').html(trail.properties.opdmd_access);
    $('.detail-panel .detailHorses').html(trail.properties.horses);
    $('.detail-panel .detailDescription').html(trail.properties.description);
  }

  // event handler for click of a trail name in a trailhead popup

  function trailnameClick(e) {
    console.log("trailnameClick");
    populateTrailsForTrailheadTrailName(e);
    // setCurrentTrail
  }

  // given jquery

  function parseTrailElementData($element) {
    var trailheadID = $element.data("trailheadid");
    var highlightedTrailIndex = $element.data("index") || 0;
    var trailID = $element.data("trailid");
    results = {
      trailheadID: trailheadID,
      highlightedTrailIndex: highlightedTrailIndex,
      trailID: trailID
    };
    return results;
  }

  // two event handlers for click of trailDiv and trail in trailhead popup:
  // get the trailName and trailHead that they clicked on
  // highlight the trailhead (showing all of the trails there) and highlight the trail path

  function populateTrailsForTrailheadDiv(e) {
    console.log("populateTrailsForTrailheadDiv");
    var $myTarget;

    // this makes trailname click do the same thing as general div click
    // (almost certainly a better solution exists)
    if (e.target !== this) {
      $myTarget = $(this);
    } else {
      $myTarget = $(e.target);
    }
    var parsed = parseTrailElementData($myTarget);
    highlightTrailhead(parsed.trailheadID, parsed.highlightedTrailIndex);
  }

  function populateTrailsForTrailheadTrailName(e) {
    var parsed = parseTrailElementData($(e.target));
    for (var i = 0; i < trailheads.length; i++) {
      if (trailheads[i].properties.cartodb_id == parsed.trailheadID) {
        trailhead = trailheads[i];
      }
    }
    decorateDetailPanel(trailData[parsed.trailID], trailhead);
    highlightTrailhead(parsed.trailheadID, parsed.highlightedTrailIndex);
  }

  // given a trailheadID and a trail index within that trailhead
  // display the trailhead marker and popup,
  // then call highlightTrailheadDivs() and getAllTrailPathsForTrailhead()
  // with the trailhead record

  var currentTrailheadMarker;

  function highlightTrailhead(trailheadID, highlightedTrailIndex) {
    console.log("highlightTrailhead");
    for (var i = 0; i < trailheads.length; i++) {
      if (trailheads[i].properties.cartodb_id == trailheadID) {
        currentTrailhead = trailheads[i];
      }
    }
    if (currentTrailheadMarker) {
      map.removeLayer(currentTrailheadMarker);
    }
    // make a default marker, add it to the map with the trailhead's pre-computed popupContent
    currentTrailheadMarker = new L.Marker([currentTrailhead.marker.getLatLng().lat, currentTrailhead.marker.getLatLng().lng]);
    currentTrailheadMarker.addTo(map).bindPopup(currentTrailhead.popupContent);
    highlightTrailheadDivs(currentTrailhead);
    getAllTrailPathsForTrailhead(currentTrailhead, highlightedTrailIndex);
    currentTrailheadMarker.openPopup();
  }

  // given a trailhead, and a trail index within that trailhead
  // find the matching trailDivs, highlight them, and move them onscreen

  function highlightTrailheadDivs(trailhead, highlightedTrailIndex) {
    console.log("highlightTrailheadDivs");
    // deselect all of the trailDivs
    $(".trail-box").removeClass("trail1").removeClass("trail2").removeClass("trail3");
    $(".trailIndicatorLight").hide();
    for (var i = 0; i < currentTrailhead.trails.length; i++) {
      var trailID = currentTrailhead.trails[i];
      var trailName = trailData[trailID].properties.name;
      var trailheadName = currentTrailhead.properties.name;
      var trailheadID = currentTrailhead.properties.cartodb_id;
      // add class for highlighting
      var $trailbox = $('.trail-box[data-trailid="' + trailID + '"][data-trailheadid="' + trailheadID + '"]');
      var color = getClassBackgroundColor("trail" + (i + 1));
      $trailbox.find($(".trailIndicatorLight")).css("border-color", color).show();
      // if this is the first trail for the trailhead, animate it to the top of the trailList
      // TODO: This should probably not animate until we activate the indicator lights
      if (i === 0) {
        $('#trailList').animate({
          scrollTop: $('.trail-box[data-trailheadid="' + trailheadID + '"][data-index="0"]').offset().top - $("#trailList").offset().top + $("#trailList").scrollTop()
        }, 500);
      }
    }
  }

  function getAllTrailPathsForTrailhead(trailhead, highlightedTrailIndex) {
    console.log("getAllTrailPathsForTrailhead");
    if (trailSegments.type == "FeatureCollection" && USE_LOCAL) {
      getAllTrailPathsForTrailheadLocal(trailhead, highlightedTrailIndex);
    } else {
      getAllTrailPathsForTrailheadRemote(trailhead, highlightedTrailIndex);
    }
  }

  // given a trailhead and a trail index within that trailhead
  // get the paths for any associated trails,
  // then call drawMultiTrailLayer() and setCurrentTrail()

  function getAllTrailPathsForTrailheadRemote(trailhead, highlightedTrailIndex) {
    console.log("getAllTrailPathsForTrailheadRemote");
    var responses = [];
    var queryTaskArray = [];
    // got trailhead.trails, now get the segment collection for all of them
    // get segment collection for each
    for (var i = 0; i < trailhead.trails.length; i++) {
      var trailID = trailhead.trails[i];
      var trailName = trailData[trailID].properties.name;
      var trail_query = "select st_collect(the_geom) the_geom, '" + trailName + "' trailname from " + TRAILSEGMENTS_TABLE + " segments where " +
        "(segments.name1 = '" + trailName + "' or " +
        "segments.name2 = '" + trailName + "' or " +
        "segments.name3 = '" + trailName + "' or " +
        "segments.name1 = '" + trailName + " Trail' or " +
        "segments.name2 = '" + trailName + " Trail' or " +
        "segments.name3 = '" + trailName + " Trail') and " +
        "(source = '" + trailData[trailID].properties.source + "' or " + (trailName == "Ohio & Erie Canal Towpath Trail") + ")";
      var queryTask = function(trail_query, index) {
        return function(callback) {
          makeSQLQuery(trail_query, function(response) {
            responses[index] = response;
            callback(null, trailID);
          });
        };
      }(trail_query, i);
      queryTaskArray.push(queryTask);
    }
    async.parallel(queryTaskArray, function(err, results) {
      responses = mergeResponses(responses);
      drawMultiTrailLayer(responses);
      setCurrentTrail(highlightedTrailIndex);
    });
  }

  // LOCAL EDITION:
  // given a trailhead and a trail index within that trailhead
  // get the paths for any associated trails,
  // then call drawMultiTrailLayer() and setCurrentTrail()
  // (it's a little convoluted because it's trying to return identical GeoJSON to what
  // CartoDB would return)

  function getAllTrailPathsForTrailheadLocal(trailhead, highlightedTrailIndex) {
    console.log("getAllTrailPathsForTrailheadLocal");
    var responses = [];
    var trailFeatureArray = [];
    // got trailhead.trails, now get the segment collection for all of them
    // get segment collection for each
    for (var i = 0; i < trailhead.trails.length; i++) {
      var trailID = trailhead.trails[i];
      var trail = trailData[trailID];
      var trailSource = trail.properties.source;
      var trailName = trail.properties.name;
      var trailFeatureCollection = {
        type: "FeatureCollection",
        features: [{
          geometry: {
            geometries: [],
            type: "GeometryCollection"
          },
          type: "Feature"
        }]
      };
      for (var segmentIndex = 0; segmentIndex < trailSegments.features.length; segmentIndex++) {
        var segment = $.extend(true, {}, trailSegments.features[segmentIndex]);
        if ((segment.properties.name1 == trailName ||
            segment.properties.name1 == trailName + " Trail" ||
            segment.properties.name2 == trailName ||
            segment.properties.name2 == trailName + " Trail" ||
            segment.properties.name3 == trailName ||
            segment.properties.name3 == trailName + " Trail") &&
            (segment.properties.source == trailSource || trailName == "Ohio & Erie Canal Towpath Trail")) {
          trailFeatureCollection.features[0].properties = {
            trailname: trailName
          };
          trailFeatureCollection.features[0].geometry.geometries.push(segment.geometry);
        }
      }
      trailFeatureArray.push(trailFeatureCollection);
    }
    responses = mergeResponses(trailFeatureArray);
    drawMultiTrailLayer(responses);
    setCurrentTrail(highlightedTrailIndex);
  }


  // merge multiple geoJSON trail features into one geoJSON FeatureCollection

  function mergeResponses(responses) {

    console.log("mergeResponses");
    // console.log(responses);

    // var combined = { type: "FeatureCollection", features: [] };
    // for (var i = 0; i < responses.length; i++) {
    //   console.log("xxxx");
    //   console.log(responses[i]);
    //   // responses[i].properties.order = i;
    //   combined.features.push(responses[i]);
    // }


    var combined = $.extend(true, {}, responses[0]);
    combined.features[0].properties.order = 0;
    for (var i = 1; i < responses.length; i++) {
      combined.features = combined.features.concat(responses[i].features);
      combined.features[i].properties.order = i;
    }

    // console.log("----");
    // console.log(combined);
    return combined;
  }

  // get all trail segment paths
  // (for diagnostics)

  function getAllTrailPaths(callback) {
    var trail_query = "select the_geom, name1, name2, name3 from " + TRAILSEGMENTS_TABLE + " where 1=1";
    makeSQLQuery(trail_query, callback);
  }

  // given a GeoJSON collection of segments paths, 
  // filter out the ones in known trails,
  // then call drawMultiTrailLayer to draw 'em
  // (for diagnostics)

  function filterKnownTrails(response) {
    console.log(response);
    var filteredResponse = {
      type: "FeatureCollection",
      features: []
    };
    // spin through response, removing any segments that aren't part of a known trail
    filteredResponse.features = response.features.filter(function(element, index, array) {
      // for (i = 0; i < trailData.length; i++) {
      if (element.properties.name1 in trailData ||
        element.properties.name2 in trailData ||
        element.properties.name3 in trailData) {
        return false;
      }
      // }
      //  should there be an else here?
      return true;
    });
    console.log(filteredResponse);
    drawMultiTrailLayer(filteredResponse);
  }

  // given a geoJSON set of linestring features,
  // draw them all on the map (in a single layer we can remove later)

  function drawMultiTrailLayer(response) {
    console.log("drawMultiTrailLayer");
    if (currentMultiTrailLayer) {
      map.removeLayer(currentMultiTrailLayer);
      currentTrailLayers = [];
    }
    if (response.features[0].geometry === null) {
      alert("No trail segment data found.");
    }
    currentMultiTrailLayer = L.geoJson(response, {
      style: function(feature) {
        var color;
        if (feature.properties.order === 0 || !feature.properties.order) {
          color = getClassBackgroundColor("trail1");
          return {
            weight: 3,
            color: color,
            opacity: 0.75
          };
        } else if (feature.properties.order === 1) {
          color = getClassBackgroundColor("trail2");
          return {
            weight: 3,
            color: color,
            opacity: 0.75
          };
        } else if (feature.properties.order === 2) {
          color = getClassBackgroundColor("trail3");
          return {
            weight: 3,
            color: color,
            opacity: 0.75
          };
        }
      },
      //  Don't recognize this syntax...ask Dan - Alan.
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
        currentTrailLayers.push(layer);
      }
    }).addTo(map).bringToBack();
    //zoomToLayer(currentMultiTrailLayer);
  }


  // return the calculated CSS background-color for the class given
  // This may need to be changed since AJW changed it to "border-color" above

  function getClassBackgroundColor(className) {
    var $t = $("<div class='" + className + "'>").hide().appendTo("body");
    var c = $t.css("background-color");
    $t.remove();
    return c;
  }

  // given the index of a trail within a trailhead,
  // highlight that trail on the map, and call zoomToLayer with it

  function setCurrentTrail(index) {
    console.log("setCurrentTrail");
    if (currentHighlightedTrailLayer && typeof currentHighlightedTrailLayer.setStyle == "Function") {
      currentHighlightedTrailLayer.setStyle({
        weight: 2
      });
    }
    currentHighlightedTrailLayer = currentTrailLayers[index];
    currentHighlightedTrailLayer.setStyle({
      weight: 10
    });
    zoomToLayer(currentHighlightedTrailLayer);
    map.invalidateSize();
  }

  // given a leaflet layer, zoom to fit its bounding box, up to MAX_ZOOM
  // in and MIN_ZOOM out (commented out for now)

  function zoomToLayer(layer) {
    console.log("zoomToLayer");
    // figure out what zoom is required to display the entire trail layer
    var curZoom = map.getBoundsZoom(layer.getBounds());
    // zoom out to MAX_ZOOM if that's more than MAX_ZOOM
    var newZoom = curZoom > MAX_ZOOM ? MAX_ZOOM : curZoom;
    newZoom = newZoom < MIN_ZOOM ? MIN_ZOOM : newZoom;
    // set the view to that zoom, and the center of the trail's bounding box 
    map.setView(layer.getBounds().getCenter(), newZoom, {
      pan: {
        animate: true,
        duration: 3.0,
        easeLinearity: 0.05
      },
      zoom: {
        animate: true
      }
    });
  }

  // given a SQL query, and done/error callbacks,
  // make the query

  function makeSQLQuery(query, done, error) {
    console.log("makeSQLQuery");
    var callData = {
      q: query,
      // api_key: api_key,
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

  // get the outerHTML for a jQuery element

  jQuery.fn.outerHTML = function(s) {
    return s ? this.before(s).remove() : jQuery("<p>").append(this.eq(0).clone()).html();
  };
}