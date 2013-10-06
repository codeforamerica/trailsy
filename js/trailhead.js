console.log("start");
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

  // API_HOST: The API server. Here we assign a default server, then 
  // test to check whether we're using the Heroky dev app or the Heroku production app
  // and reassign API_HOST if necessary
  var API_HOST = "http://127.0.0.1:3000";
  // var API_HOST = "http://trailsyserver-dev.herokuapp.com";
  if (window.location.hostname.split(".")[0] == "trailsy-dev") {
    API_HOST = "http://trailsyserver-dev.herokuapp.com";
  } else if (window.location.hostname.split(".")[0] == "trailsy") {
    API_HOST = "http://trailsyserver-prod.herokuapp.com";
  }

  //  Near-Global Variables
  var METERSTOMILESFACTOR = 0.00062137;
  var MAX_ZOOM = 14;
  var MIN_ZOOM = 12;
  var SECONDARY_TRAIL_ZOOM = 13;
  var SHORT_MAX_DISTANCE = 2.0;
  var MEDIUM_MAX_DISTANCE = 5.0;
  var LONG_MAX_DISTANCE = 10.0;
  var SHOW_ALL_TRAILS = 1;
  var USE_LOCAL = 1; // Set this to a true value to preload/use a local trail segment cache

  var map = {};
  var trailData = {}; // all of the trails metadata (from traildata table), with trail ID as key
  // { *id*: { geometry: point(0,0), unused for now  
  //                  properties: { id: *uniqueID*,
  //                                length: *length of trail in meters*,
  //                                name: *name of trail*,
  //                                source: *whose data this info came from*,
  //                              }
  //                }
  // }

  var trailheads = []; // all trailheads (from trailsegments)
  // TODO: fix this--it's out of date!
  // [ {  marker: *Leaflet marker*,
  //      trails: *[array of matched trail IDs],
  //      popupContent: *HTML of Leaflet popup*,
  //      properties: { id: *uniqueID*,
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
  var currentTrailheadLayerGroup;
  var currentFilters = {
    lengthFilter: [],
    activityFilter: [],
    searchFilter: []
  };
  var orderedTrails = [];
  var currentDetailTrail = null;
  var currentDetailTrailhead = null;
  var userMarker = null;
  var allSegmentLayer = null;
  var closeTimeout = null;
  var currentHighlightedLayer = null;
  var currentWeightedTrail = null;
  var currentTrailPopup = null;

  // Trailhead Variables
  // Not sure if these should be global, but hey whatev
  var trailheadIcon = L.Icon.extend({
    options: {
      iconSize: [25, 20],
      iconAnchor: [11, 20],
      popupAnchor: [0, -22]
    }
  });

  var trailheadIcon1 = new trailheadIcon({
    iconUrl: 'img/icon_trailhead_1.png'
  }),
    trailheadIcon2 = new trailheadIcon({
      iconUrl: 'img/icon_trailhead_2.png'
    });

  // comment these/uncomment the next set to switch between tables
  var TRAILHEADS_TABLE = "summit_trailheads";
  var TRAILSEGMENTS_TABLE = "summit_trailsegments";
  var TRAILDATA_TABLE = "summit_traildata";

  // var TRAILHEADS_TABLE = "summit_trailheads_test";
  // var TRAILSEGMENTS_TABLE = "summit_trail_segments_test";
  // var TRAILDATA_TABLE = "summit_traildata_test";

  // =====================================================================//
  // UI events to react to

  $("#redoSearch").click(reorderTrailsWithNewLocation);
  $(document).on('click', '.trailhead-trailname', trailnameClick); // Open the detail panel!
  $(document).on('click', '.closeDetail', closeDetailPanel); // Close the detail panel!
  $(document).on('click', '.detailPanelControls', changeDetailPanel); // Shuffle Through Trails Shown in Detail Panel
  $(document).on('change', '.filter', filterChangeHandler);
  $(document).on('mouseover', '.leaflet-popup', function() {
    // console.log("popup mouseover");
    currentHighlightedLayer.fireEvent('mouseover');
  });
  $(document).on('mouseout', '.leaflet-popup', function() {
    // console.log("popup mouseout");
    if (currentHighlightedLayer) {
      currentHighlightedLayer.fireEvent('mouseout');
    }
  });
  $(".search-key").keyup(function(e) {
    // if (e.which == 13) {
    //   console.log($('.search-key').val());
    processSearch(e);
    // }
  });

  $(".search-submit").click(processSearch);

  //  Detail Panel Navigation UI event
  $(".detailPanel").hover(toggleDetailPanelControls, toggleDetailPanelControls);

  //  Shouldn't the UI event of a Map Callout click opening the detail panel go here?



  // =====================================================================//
  // Kick things off

  initialSetup();

  // -----------------------------------

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

  // =====================================================================//
  //  Filter function + helper functions, triggered by UI events declared above.

  function applyFilterChange(currentFilters, trailData) {
    var filteredTrailData = $.extend(true, {}, trailData);
    $.each(trailData, function(trail_id, trail) {
      if (currentFilters.activityFilter) {
        for (var i = 0; i < currentFilters.activityFilter.length; i++) {
          var activity = currentFilters.activityFilter[i];
          if (trail.properties[activity] && trail.properties[activity].toLowerCase().charAt(0) !== "y") {
            delete filteredTrailData[trail_id];
          }
        }
      }
      if (currentFilters.lengthFilter) {
        var distInclude = false;
        if (currentFilters.lengthFilter.length === 0) {
          distInclude = true;
        }
        for (var j = 0; j < currentFilters.lengthFilter.length; j++) {
          var distance = currentFilters.lengthFilter[j];
          var trailDist = trail.properties["length"];
          if ((distance.toLowerCase() == "short" && trailDist <= SHORT_MAX_DISTANCE) ||
            (distance.toLowerCase() == "medium" && trailDist > SHORT_MAX_DISTANCE && trailDist <= MEDIUM_MAX_DISTANCE) ||
            (distance.toLowerCase() == "long" && trailDist > MEDIUM_MAX_DISTANCE && trailDist <= LONG_MAX_DISTANCE) ||
            (distance.toLowerCase() == "verylong" && trailDist > LONG_MAX_DISTANCE)) {
            distInclude = true;
            break;
          }
        }
        if (!distInclude) {
          delete filteredTrailData[trail_id];
        }
      }
      if (currentFilters.searchFilter) {
        var index = trail.properties.name.toLowerCase().indexOf(currentFilters.searchFilter.toLowerCase());
        if (index == -1) {
          delete filteredTrailData[trail_id];
        }
      }
    });
    addTrailDataToTrailheads(filteredTrailData);
  }

  function filterChangeHandler(e) {
    var $currentTarget = $(e.currentTarget);
    var filterType = $currentTarget.attr("data-filter");
    var currentUIFilterState = $currentTarget.val();
    console.log(currentUIFilterState);
    updateFilterObject(filterType, currentUIFilterState);
  }

  function processSearch(e) {
    var $currentTarget = $(e.currentTarget);
    var filterType = "searchFilter";
    var currentUIFilterState = ($currentTarget.val());
    console.log($currentTarget);
    console.log(currentUIFilterState);
    if (($currentTarget).hasClass('search-key')) {
      console.log("search key");
      updateFilterObject(filterType, currentUIFilterState);
    }
    if (($currentTarget).hasClass('search-submit')) {
      if ($currentTarget.val() !== "") {
        console.log("search submit");
        updateFilterObject(filterType, currentUIFilterState);
      }
    }
    // if the event target has a class search-key
    // see if it is keycode 13
    //  if true, call updatefilterobject
    //  with filtertype=searchFilter
    //  contents/value of searchbox which we get via jquery
    //  if the event target has a class search-button
    //  check to see if the value does not equal empty string
    //  if it does not equal empty string, call updatefilterobject with filtertype=search filter & contents of box.
  }

  function updateFilterObject(filterType, currentUIFilterState) {
    console.log(currentUIFilterState);
    var matched = 0;
    if (filterType == "activityFilter") {
      var filterlength = currentFilters.activityFilter.length;
      for (i = 0; i < currentFilters.activityFilter.length; i++) {
        var activity = currentFilters.activityFilter[i];
        if (activity === currentUIFilterState) {
          currentFilters.activityFilter.splice(i, 1);
          matched = 1;
          break;
        }
      }
      if (matched === 0) {
        currentFilters.activityFilter.push(currentUIFilterState);
      }
    }

    if (filterType == "lengthFilter") {
      console.log("length");
      console.log(currentFilters.lengthFilter.length);
      var filterlength = currentFilters.lengthFilter.length;
      for (j = 0; j < filterlength; j++) {
        console.log("j");
        console.log(j);
        var lengthRange = currentFilters.lengthFilter[j];
        if (lengthRange == currentUIFilterState) {
          console.log("match");
          currentFilters.lengthFilter.splice(j, 1);
          matched = 1;
          break;
        }
      }
      if (matched === 0) {
        currentFilters.lengthFilter.push(currentUIFilterState);
      }
    }

    if (filterType == "searchFilter") {
      console.log("searchFilter");
      currentFilters.searchFilter = currentUIFilterState;
    }
    // currentFilters[filterType] = currentUIFilterState;
    console.log(currentFilters);
    applyFilterChange(currentFilters, trailData);
  }

  // =====================================================================//
  // these two set currentLocation, then mapping ensues

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
      zoomControl: false
    }).addControl(L.control.zoom({
      position: 'topright'
    })).setView([currentLocation.lat, currentLocation.lng], 11);

    // Switch between MapBox and other providers by commenting/uncommenting these
    L.tileLayer.provider('MapBox.' + MAPBOX_MAP_ID).addTo(map);
    // L.tileLayer.provider('Thunderforest.Landscape').addTo(map);
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
          // console.log(allSegmentLayer);
          map.addLayer(allSegmentLayer);
        }
        if (map.getZoom() < SECONDARY_TRAIL_ZOOM && map.hasLayer(allSegmentLayer)) {
          if (currentTrailPopup) {
            map.removeLayer(currentTrailPopup);
          }
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

  // =====================================================================//
  // Getting trailhead data

  function getOrderedTrailheads(location, callback) {
    console.log("getOrderedTrailheads");
    var callData = {
      loc: location.lat + "," + location.lng,
      type: "GET",
      path: "/trailheads.json?loc=" + location.lat + "," + location.lng
    };
    makeAPICall(callData, function(response) {
      populateTrailheadArray(response);
      if (typeof callback == "function") {
        callback();
      }
    });
  }

  // get all trailhead info, in order of distance from "location"

  function getOrderedTrailheadsOld(location, callback) {
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
  // and a place to put the trails for that trailhead.

  function populateTrailheadArray(trailheadsGeoJSON) {
    console.log("populateTrailheadArray");
    console.log(trailheadsGeoJSON);
    trailheads = [];
    for (var i = 0; i < trailheadsGeoJSON.features.length; i++) {
      var currentFeature = trailheadsGeoJSON.features[i];
      var currentFeatureLatLng = new L.LatLng(currentFeature.geometry.coordinates[1], currentFeature.geometry.coordinates[0]);
      var newMarker = L.marker(currentFeatureLatLng, ({
        icon: trailheadIcon1
      }));

      // adding closure to call trailheadMarkerClick with trailheadID on marker click
      newMarker.on("click", function(trailheadID) {
        return function() {
          trailheadMarkerClick(trailheadID);
        };
      }(currentFeature.properties.id));

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

  // get the trailData from the API

  function getTrailData(callback) {
    console.log("getTrailData");
    var callData = {
      type: "GET",
      path: "/trails.json"
    };
    makeAPICall(callData, function(response) {
      populateTrailData(response);
      if (typeof callback == "function") {
        callback();
      }
    });
  }

  // get the trailData from the DB

  function getTrailDataOld(callback) {
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
      trailData[trailDataGeoJSON.features[i].properties.id] = trailDataGeoJSON.features[i];
    }
  }

  function getTrailSegments(callback) {
    console.log("getTrailSegments");
    var callData = {
      type: "GET",
      path: "/trailsegments.json"
    };
    makeAPICall(callData, function(response) {
      trailSegments = response;
      allSegmentLayer = makeAllSegmentLayer(response);
      if (typeof callback == "function") {
        callback();
      }
    });
  }

  function makeAllSegmentLayer(response) {
    // make visible layers
    allVisibleSegmentsArray = [];
    allInvisibleSegmentsArray = [];
    allSegmentLayer = new L.FeatureGroup();
    var visibleAllTrailLayer = L.geoJson(response, {
      style: function() {
        return {
          color: '#B79E8A',
          weight: 3,
          opacity: 1,
          clickable: false,
          // dashArray: "5,5"
        };
      },
      onEachFeature: function(feature, layer) {
        allVisibleSegmentsArray.push(layer);
      }
    });

    // make invisible layers
    var invisibleAllTrailLayer = L.geoJson(response, {
      style: function() {
        return {
          opacity: 0,
          weight: 20,
          clickable: true,
          color: '#FFFFFF'
        };
      },
      onEachFeature: function(feature, layer) {
        console.log("invisible");
        allInvisibleSegmentsArray.push(layer);
        var popupHTML = "<div class='trail-popup'>";
        var popupTrails = [];
        for (i = 1; i <= 6; i++) {
          var trailField = "trail" + i;
          if (feature.properties[trailField]) {
            popupTrails.push(feature.properties[trailField]);
          }
        }
        popupHTML = popupHTML + popupTrails.join("<br>");
        popupHTML = popupHTML + "</div>";
        popup = new L.Popup({}, layer).setContent(popupHTML);
        feature.properties.popup = popup;
        feature.properties.popupHTML = popupHTML;
      }
    });

    for (i = 0; i < allInvisibleSegmentsArray.length; i++) {
      var currentInvisSegment = allInvisibleSegmentsArray[i];
      var newTrailFeatureGroup = new L.FeatureGroup([allInvisibleSegmentsArray[i], allVisibleSegmentsArray[i]]);

      var popup = new L.Popup().setContent(currentInvisSegment.feature.properties.popupHTML);
      // newTrailFeatureGroup.addLayer(popup);
      // newTrailFeatureGroup.bindPopup(popup);

      newTrailFeatureGroup.addEventListener("mouseover", function(newTrailFeatureGroup, currentInvisSegment) {
        return function(e) {
          // console.log("new mouseover");
          if (closeTimeout) {
            clearTimeout(closeTimeout);
            closeTimeout = null;
          }

          e.target.setStyle({
            weight: 6
          });
          if (e.target != currentWeightedTrail && currentWeightedTrail) {
            currentWeightedTrail.setStyle({
              weight: 3
            });
          }
          if (newTrailFeatureGroup != currentHighlightedLayer) {
            var popup = currentInvisSegment.feature.properties.popup;
            popup.setLatLng(e.latlng);
            // newTrailFeatureGroup.addLayer(popup);
            popup.openOn(map);
            currentTrailPopup = popup;
            currentHighlightedLayer = newTrailFeatureGroup;
            currentWeightedTrail = e.target;
            // newTrailFeatureGroup.bringToFront();
          }
        };
      }(newTrailFeatureGroup, currentInvisSegment));

      newTrailFeatureGroup.addEventListener("mouseout", function(newTrailFeatureGroup, currentInvisSegment) {
        return function(e) {
          // console.log("new mouseout");
          var popup = currentInvisSegment.feature.properties.popup;
          // newTrailFeatureGroup.removeLayer(popup);
          if (closeTimeout) {
            clearTimeout(closeTimeout);
          }


          closeTimeout = setTimeout(function(e) {
            return function() {
              e.target.setStyle({
                weight: 3
              });
            };
          }(e), 2000);
        };
      }(newTrailFeatureGroup, currentInvisSegment));
      // allInvisibleSegmentsArray[i].feature.properties.visibleLayer = allVisibleSegmentsArray[i];
      allSegmentLayer.addLayer(newTrailFeatureGroup);
    }
    return allSegmentLayer;
  }

  // given trailData,
  // populate trailheads[x].trails with all of the trails in trailData
  // that match each trailhead's named trails from the trailhead table.
  // Also add links to the trails within each trailhead popup 

  function addTrailDataToTrailheads(myTrailData) {
    console.log("addTrailDataToTrailheads");
    console.log(trailData);
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
          trailID: trailData[trailhead.trails[trailsIndex]].properties.id
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

  //  This is really only used in the desktop version 

  function makeTrailheadPopups(trailheads) {
    for (var trailheadIndex = 0; trailheadIndex < trailheads.length; trailheadIndex++) {
      var trailhead = trailheads[trailheadIndex];
      var $popupContentMainDiv = $("<div>").addClass("trailhead-popup");
      var $popupTrailheadDiv = $("<div>").addClass("trailhead-box").html($("<div class='popupTrailheadNames'>" + trailhead.properties.name + "</div>")).appendTo($popupContentMainDiv);
      $popupTrailheadDiv.append($("<img>").addClass("calloutTrailheadIcon").attr({
        src: "img/icon_trailhead_1.png"
      }));
      for (var trailsIndex = 0; trailsIndex < trailhead.trails.length; trailsIndex++) {
        var trail = trailData[trailhead.trails[trailsIndex]];
        var $popupTrailDiv = $("<div>").addClass("trailhead-trailname trail" + (trailsIndex + 1))
          .attr("data-trailname", trail.properties.name)
          .attr("data-trailid", trail.properties.id)
          .attr("data-trailheadname", trailhead.properties.name)
          .attr("data-trailheadid", trailhead.properties.id)
          .attr("data-index", trailsIndex);
        console.log(trail.properties.status);
        var status = "";
        if (trail.properties.status == 1) {
          $popupTrailDiv.append($("<img>").addClass("status").attr({
            src: "img/icon_alert_yellow.png",
            title: "alert"
          }));
        }
        if (trail.properties.status == 2) {
          $popupTrailDiv.append($("<img>").addClass("status").attr({
            src: "img/icon_alert_yellow.png",
            title: "alert"
          }));
        }
        $popupTrailDiv.append("<div class='popupTrailNames'>" + trail.properties.name + "</div>");
        $popupTrailDiv.append("<b>")
        // .append(trail.properties.name)
        .appendTo($popupTrailheadDiv);
      }
      trailhead.popupContent = $popupContentMainDiv.outerHTML();
      // trailhead.marker.bindPopup(trailhead.popupContent);
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
        // console.log(["trailhead not displayed: ", trailheads[i].properties.name]);
      }
    }
    if (currentTrailheadLayerGroup) {
      console.log("remove");
      map.removeLayer(currentTrailheadLayerGroup);
    }
    currentTrailheadLayerGroup = L.layerGroup(currentTrailheadMarkerArray);

    map.addLayer(currentTrailheadLayerGroup);
  }

  // given trailheads, now populated with matching trail names,
  // fill out the left trail(head) pane,
  // noting if a particular trailhead has no trails associated with it

  function makeTrailDivs(trailheads) {
    console.log("makeTrailDivs");
    orderedTrails = [];
    $("#trailList").html("");
    $.each(trailheads, function(index, trailhead) {
      var trailheadName = trailhead.properties.name;
      var trailheadID = trailhead.properties.id;
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
        var trailLength = trailData[trailID].properties.length;
        //  Add park name var when it makes it into the database
        $trailDiv = $("<div>").addClass('trail-box')
          .attr("data-source", "list")
          .attr("data-trailid", trailID)
          .attr("data-trailname", trailName)
          .attr("data-trail-length", trailLength)
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

        $trailInfo = $("<div>").addClass("trailInfo").appendTo($trailDiv);
        $trailheadInfo = $("<div>").addClass("trailheadInfo").appendTo($trailDiv);

        // Making a new div for Detail Panel
        $("<div class='trailSource' id='" + trailheadSource + "'>" + trailheadSource + "</div>").appendTo($trailDiv);

        $("<div class='trail' >" + trailName + "</div>").appendTo($trailInfo);
        $("<div class='trailLength' >" + trailLength + " miles long" + "</div>").appendTo($trailInfo);
        $("<div class='parkName' >" + " Park Name" + "</div>").appendTo($trailInfo);
        //  Here we generate icons for each activity filter that is true..?

        $("<img class='trailheadIcon' src='img/icon_trailhead_1.png'/>").appendTo($trailheadInfo);
        $("<div class='trailheadName' >" + trailheadName + " Trailhead" + "</div>").appendTo($trailheadInfo);
        $("<div class='trailheadDistance' >" + trailheadDistance + " miles away" + "</div>").appendTo($trailheadInfo);

        var trailInfoObject = {
          trailID: trailID,
          trailheadID: trailheadID,
          index: i
        };
        orderedTrails.push(trailInfoObject);
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
    console.log(orderedTrails);
  }

  function metersToMiles(i) {
    return (i * METERSTOMILESFACTOR).toFixed(1);
  }

  function showTrailDetails(trail, trailhead) {
    console.log("showTrailDetails");
    if ($('.detailPanel').is(':hidden')) {
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
    $('.detailPanel').show();
    $('.accordion').hide();
    map.invalidateSize();
  }

  function closeDetailPanel() {
    console.log("closeDetailPanel");
    $('.detailPanel').hide();
    $('.accordion').show();
    map.invalidateSize();
  }

  function toggleDetailPanelControls() {
    console.log("toggleDetailPanelControls");
    $('.detailPanelControls').toggle();
  }

  function changeDetailPanel(e) {
    console.log("changeDetailPanel");
    var trailheadID = currentDetailTrailhead.properties.id;
    var trailID = String(currentDetailTrail.properties.id);
    console.log(trailID);
    var trailhead;
    var orderedTrailIndex;
    for (var i = 0; i < orderedTrails.length; i++) {
      if (orderedTrails[i]["trailID"] == trailID && orderedTrails[i]["trailheadID"] == trailheadID) {
        orderedTrailIndex = i;
      }
    }
    console.log(["orderedTrailIndex", orderedTrailIndex]);
    if ($(e.target).hasClass("controlRight")) {
      orderedTrailIndex = orderedTrailIndex + 1;
      console.log(["++orderedTrailIndex", orderedTrailIndex]);
    }
    if ($(e.target).hasClass("controlLeft")) {
      orderedTrailIndex = orderedTrailIndex - 1;
      console.log(["--orderedTrailIndex", orderedTrailIndex]);
    }
    var orderedTrail = orderedTrails[orderedTrailIndex];
    console.log(orderedTrail);
    var trailheadID = orderedTrail["trailheadID"];
    console.log(["trailheadID", trailheadID]);
    var trailIndex = orderedTrail["index"];
    console.log(["trailIndex", trailIndex]);
    for (j = 0; j < trailheads.length; j++) {
      if (trailheads[j].properties.id == trailheadID) {
        trailhead = trailheads[j];
      }
    }
    highlightTrailhead(trailheadID, trailIndex);
    showTrailDetails(trailData[trailhead.trails[trailIndex]], trailhead);



    // if "right" control clicked, then
    // then increment the index of the active "trail", defined above as "CurrentDetailTrail" trail in array
    // This increment is only through the current "trailhead", defined above as CurrentDetailTrailhead.
    // If the increment reaches the end of the array for the current trailhead, move to the next trailhead in the 
    // larger array...which is..."trailheads"?
    // if the increment reaches the end of the larger array, then 

    //  we should create a helper function that calculates / shows the number of trails that have in the current big object
    //  and shows which position in that object we current are showing information for
  }

  function decorateDetailPanel(trail, trailhead) {
    //  Taking cues from the construction of the List Items / Trail Divs above
    // var $detailPanelBody;
    // $detailPanelBody = $("<div>").addClass("detailPanelBody");
    // $("<div class='detailTopRow' id='left'>" + + "</div>").appendTo($detailPanelBody);
    // $("<div class='detailTopRow' id='right'>" + + "</div>").appendTo($detailPanelBody);
    // $("<div class='detailT")

    $('.detailPanel .detailPanelBanner .trailName').html(trail.properties.name);
    $('.detailPanel .detailTrailheadName').html(trailhead.properties.name);
    if (trail.properties.medium_photo_url) {
      console.log("fffffound!");
      $('.detailPanel .detailPanelPicture').attr("src", trail.properties.medium_photo_url);
    }
    $('.detailPanel .detailSource').html(trailhead.properties.source);
    $('.detailPanel .detailTrailheadDistance').html(metersToMiles(trailhead.properties.distance) + " miles away");
    $('.detailPanel .detailLength').html(trail.properties.length + " miles");
    // $('.detailPanel .detailDogs').html(trail.properties.dogs);
    // $('.detailPanel .detailBikes').html(trail.properties.bikes);
    $('.detailPanel .detailDifficulty').html(trail.properties.difficulty);
    // $('.detailPanel .detailAccessible').html(trail.properties.opdmd_access);
    // $('.detailPanel .detailHorses').html(trail.properties.horses);
    $('.detailPanel .detailDescription').html(trail.properties.description);
  }

  // event handler for click of a trail name in a trailhead popup

  //  Going to change the function of this trailnameClick function
  //  But currently, it is not logging trailnameClick.
  //  Current: init populateTrailsforTrailheadName(e)
  //  Future: init showTrailDetails

  function trailnameClick(e) {
    console.log("trailnameClick");
    populateTrailsForTrailheadTrailName(e);
  }

  // given jquery

  function parseTrailElementData($element) {
    console.log($element);
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
    console.log($(e.target).data("trailheadid"));
    var $myTarget;
    if ($(e.target).data("trailheadid")) {
      $myTarget = $(e.target);
    } else {
      $myTarget = $(e.target.parentNode);
    }
    var parsed = parseTrailElementData($myTarget);
    console.log(parsed);
    for (var i = 0; i < trailheads.length; i++) {
      if (trailheads[i].properties.id == parsed.trailheadID) {
        trailhead = trailheads[i];
      }
    }
    // decorateDetailPanel(trailData[parsed.trailID], trailhead);
    highlightTrailhead(parsed.trailheadID, parsed.highlightedTrailIndex);
    var trail = trailData[parsed.trailID];
    showTrailDetails(trail, trailhead);
  }

  // given a trailheadID and a trail index within that trailhead
  // display the trailhead marker and popup,
  // then call highlightTrailheadDivs() and getAllTrailPathsForTrailhead()
  // with the trailhead record

  var currentTrailheadMarker;

  function highlightTrailhead(trailheadID, highlightedTrailIndex) {
    console.log("highlightTrailhead");
    for (var i = 0; i < trailheads.length; i++) {
      if (trailheads[i].properties.id == trailheadID) {
        currentTrailhead = trailheads[i];
        break;
      }
    }
    getAllTrailPathsForTrailhead(currentTrailhead, highlightedTrailIndex);
    var popup = new L.Popup({
      offset: [0, -12]
    })
      .setContent(currentTrailhead.popupContent)
      .setLatLng(currentTrailhead.marker.getLatLng())
      .openOn(map);
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
        "(segments.trail1 = '" + trailName + "' or " +
        "segments.trail2 = '" + trailName + "' or " +
        "segments.trail3 = '" + trailName + "' or " +
        "segments.trail4 = '" + trailName + "' or " +
        "segments.trail5 = '" + trailName + "' or " +
        "segments.trail6 = '" + trailName + "' or " +
        "segments.trail1 = '" + trailName + " Trail' or " +
        "segments.trail2 = '" + trailName + " Trail' or " +
        "segments.trail3 = '" + trailName + " Trail' or " +
        "segments.trail4 = '" + trailName + " Trail' or " +
        "segments.trail5 = '" + trailName + " Trail' or " +
        "segments.trail6 = '" + trailName + " Trail') and " +
        "(source = '" + trailData[trailID].properties.source + "' or " + (trailName == "Ohio & Erie Canal Towpath Trail") + ")";
      var queryTask = function(trail_query, index) {
        return function(callback) {
          // makeSQLQuery(trail_query, function(response) {
          //   responses[index] = response;
          //   callback(null, trailID);
          // });
          var callData = {
            type: "GET",
            path: "/trailsegments.json"
          };
          makeAPICall(callData, function(response) {
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
      var valid = 0;
      for (var segmentIndex = 0; segmentIndex < trailSegments.features.length; segmentIndex++) {
        var segment = $.extend(true, {}, trailSegments.features[segmentIndex]);
        if ((segment.properties.trail1 == trailName ||
            segment.properties.trail1 + " Trail" == trailName ||
            segment.properties.trail2 == trailName ||
            segment.properties.trail2 + " Trail" == trailName ||
            segment.properties.trail3 == trailName ||
            segment.properties.trail3 + " Trail" == trailName ||
            segment.properties.trail4 == trailName ||
            segment.properties.trail4 + " Trail" == trailName ||
            segment.properties.trail5 == trailName ||
            segment.properties.trail5 + " Trail" == trailName ||
            segment.properties.trail6 == trailName ||
            segment.properties.trail6 + " Trail" == trailName) &&
          (segment.properties.source == trailSource || trailName == "Ohio & Erie Canal Towpath Trail")) {
          // 1) {
          trailFeatureCollection.features[0].properties = {
            trailname: trailName
          };
          valid = 1;
          // console.log("match");
          trailFeatureCollection.features[0].geometry.geometries.push(segment.geometry);
        } else {
          // console.log("invalid!");
        }
      }
      if (valid) {
        trailFeatureArray.push(trailFeatureCollection);
      }
    }
    console.log(trailFeatureArray);
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
            color: "#FF0000",
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

      onEachFeature: function(feature, layer) {
        var popupHTML = "<div class='trail-popup'>";
        // if we have a named trail, show its name
        if (feature.properties.trailname) {
          popupHTML = popupHTML + feature.properties.trailname;
        }
        // else we have an unused trail segment--list all of the names associated with it
        else {
          if (feature.properties.trail1) {
            popupHTML = popupHTML + "<br>" + feature.properties.trail1;
          }
          if (feature.properties.trail2) {
            popupHTML = popupHTML + "<br>" + feature.properties.trail2;
          }
          if (feature.properties.trail3) {
            popupHTML = popupHTML + "<br>" + feature.properties.trail3;
          }
          if (feature.properties.trail4) {
            popupHTML = popupHTML + "<br>" + feature.properties.trail4;
          }
          if (feature.properties.trail5) {
            popupHTML = popupHTML + "<br>" + feature.properties.trail5;
          }
          if (feature.properties.trail6) {
            popupHTML = popupHTML + "<br>" + feature.properties.trail6;
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
    console.log(c)
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
        duration: 4.0,
        easeLinearity: 0.05
      },
      zoom: {
        animate: true
      }
    });
  }

  function makeAPICall(callData, doneCallback) {
    console.log('makeAPICall');
    if (!($.isEmptyObject(callData.data))) {
      callData.data = JSON.stringify(callData.data);
    }
    var url = API_HOST + callData.path;
    var request = $.ajax({
      type: callData.type,
      url: url,
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      //beforeSend: function(xhr) {
      //  xhr.setRequestHeader("Accept", "application/json")
      //},
      data: callData.data
    }).fail(function(jqXHR, textStatus, errorThrown) {
      $("#results").text("error: " + JSON.stringify(errorThrown));
    }).done(function(response, textStatus, jqXHR) {
      if (typeof doneCallback === 'function') {
        doneCallback.call(this, response);
      }
      console.log(response);
      // $("#results").text(JSON.stringify(response));
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