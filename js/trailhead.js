var console = console || {
  "log": function() {}
};
console.log("start");

$(document).ready(startup);

/* The Big Nested Function
==========================*/

// Print to ensure file is loaded

function startup() {
  "use strict";

  console.log("trailhead.js");

  var SMALL;
  if (Modernizr.mq("only screen and (max-width: 529px)")) {
    SMALL = true;
  } else if (Modernizr.mq("only screen and (min-width: 530px)")) {
    SMALL = false;
  }

  var TOUCH = $('html').hasClass('touch');
  // Map generated in CfA Account
  var MAPBOX_MAP_ID = "codeforamerica.map-j35lxf9d";
  var AKRON = {
    lat: 41.1,
    lng: -81.5
  };

  // API_HOST: The API server. Here we assign a default server, then 
  // test to check whether we're using the Heroky dev app or the Heroku production app
  // and reassign API_HOST if necessary
  var API_HOST = window.location.hostname;
  // var API_HOST = "http://127.0.0.1:3000";
  // var API_HOST = "http://trailsyserver-dev.herokuapp.com";
  // var API_HOST = "http://trailsyserver-prod.herokuapp.com";
  // var API_HOST = "http://10.0.1.102:3000";
  // var API_HOST = "http://10.0.2.2:3000" // for virtualbox IE
  if (window.location.hostname.split(".")[0] == "trailsy-dev") {
    API_HOST = "http://trailsyserver-dev.herokuapp.com";
  } else if (window.location.hostname.split(".")[0] == "trailsy" || window.location.hostname == "www.tothetrails.com") {
    API_HOST = "http://trailsyserver-prod.herokuapp.com";
  }

  // make this real
  // if we're on iOS,
  // USE_LOCAL = false
  // else 
  // USE_LOCAL = true



  //  Near-Global Variables
  var METERSTOMILESFACTOR = 0.00062137;
  var MAX_ZOOM = 17;
  var MIN_ZOOM = 14;
  var SECONDARY_TRAIL_ZOOM = 13;
  var SHORT_MAX_DISTANCE = 2.0;
  var MEDIUM_MAX_DISTANCE = 5.0;
  var LONG_MAX_DISTANCE = 10.0;
  var SHOW_ALL_TRAILS = 1;
  var USE_LOCAL = true; // Set this to a true value to preload/use a local trail segment cache
  var USE_ALL_SEGMENT_LAYER = SMALL ? true : true;
  var NORMAL_SEGMENT_COLOR = "#678729";
  var NORMAL_SEGMENT_WEIGHT = 3;
  var HOVER_SEGMENT_COLOR = "#678729";
  var HOVER_SEGMENT_WEIGHT = 6;
  var ACTIVE_TRAIL_COLOR = "#445617";
  var ACTIVE_TRAIL_WEIGHT = 9;
  var NOTRAIL_SEGMENT_COLOR = "#FF0000";
  var NOTRAIL_SEGMENT_WEIGHT = 3;
  var LOCAL_LOCATION_THRESHOLD = 100; // distance in km. less than this, use actual location for map/userLocation 
  var centerOffset = SMALL ? new L.point(0, 0) : new L.Point(450, 0);
  var MARKER_RADIUS = TOUCH ? 15 : 4;
  var ALL_SEGMENT_LAYER_SIMPLIFY = 5;
  var map;
  var mapDivName = SMALL ? "trailMapSmall" : "trailMapLarge";
  var CLOSED = false;

  var trailData = {}; // all of the trails metadata (from traildata table), with trail ID as key
  // for yes/no features, check for first letter "y" or "n".
  // { *id*: { geometry: point(0,0), unused for now  
  //                  properties: { id: *uniqueID* (same as key),
  //                                accessible: *disabled access. yes/no*,
  //                                dogs: *dog access. yes/no*,
  //                                equestrian: *horse access. yes/no*,
  //                                hike: *hiking access. yes/no*,
  //                                mtnbike: *mountain bike access. yes/no*,
  //                                roadbike: *street bike access. yes/no*,
  //                                xcntryski: *cross-country skiing access. yes/no*
  //                                conditions: *text field of qualifications to above access/use fields*,
  //                                description: *text description of trail*,
  //                                length: *length of trail in miles*,
  //                                map_url: *URL of trail map*,
  //                                name: *name of trail*,
  //                                source: *whose data this info came from (abbreviation)*,
  //                                source_fullname: *full name of source org*,                
  //                                source_phone: *phone for source org*,
  //                                source_url: *URL of source org*,
  //                                status: *trail status. 0=open; 1=notice/warning; 2=closed*,
  //                                statustext: *trail status text. only displayed if status != 0
  //                                steward: *org to contact for more information (abbrev)*,
  //                                steward_fullname: *full name of steward org*,
  //                                steward_phone: *phone for steward org*,
  //                                steward_url: *URL of steward org*,
  //                                trlsurface: *not currently used*
  //                              }
  //                }
  // }

  var trailheads = []; // all trailheads (from trailsegments)
  // for yes/no features, check for first letter "y" or "n".
  //
  // [ {  marker: *Leaflet marker*,
  //      trails: *[array of matched trail IDs],
  //      popupContent: *HTML of Leaflet popup*,
  //      properties: { id: *uniqueID*,
  //                    drinkwater: *water available at this trailhead. yes/no*
  //                    distance: *from current location in meters*,
  //                    kiosk: *presence of informational kiosk. yes/no*,
  //                    name: *name*,
  //                    parking: *availability of parking. yes/no*,
  //                    restrooms: *availability of restrooms. yes/no*,
  //                    source: *whose data this info came from (abbreviation)*,
  //                    source_fullname: *full name of source org*,
  //                    source_phone: *phone number of source org*,
  //                    source_url: *URL of source org*,
  //                    steward: *org to contact for more information (abbrev)*,
  //                    steward_fullname: *full name of steward org*,
  //                    steward_phone: *phone number of steward org*,
  //                    steward_url: *URL of steward org*,
  //                    trail1: *trail at this trailhead*,
  //                    trail2: *trail at this trailhead*,
  //                    trail3: *trail at this trailhead*,
  //                    trail4: *trail at this trailhead*,
  //                    trail5: *trail at this trailhead*,
  //                    trail6: *trail at this trailhead*,                    
  //                    updated_at: *update time*,
  //                    created_at: *creation time*
  //                  }, 
  //   }[, ...}]
  // ]
  var trailSegments = [];
  var currentMultiTrailLayer = {}; // We have to know if a trail layer is already being displayed, so we can remove it
  var currentTrailLayers = [];
  var currentHighlightedTrailLayer = {};
  var currentUserLocation = {};
  var anchorLocation = {};
  var currentTrailheadLayerGroup;
  var currentFilters = {
    lengthFilter: [],
    activityFilter: [],
    searchFilter: ""
  };
  var orderedTrails = [];
  var currentDetailTrail = null;
  var currentDetailTrailhead = null;
  var userMarker = null;
  var allSegmentLayer = null;
  var closeTimeout = null;
  var openTimeout = null;
  var currentWeightedSegment = null;
  var currentTrailPopup = null;
  var currentTrailhead = null;
  var orderedTrailIndex;
  var geoWatchId = null;
  var currentTrailheadHover = null;
  var geoSetupDone = false;
  var segmentTrailnameCache = {};

  var allInvisibleSegmentsArray = [];
  var allVisibleSegmentsArray = [];
  // Trailhead Variables
  // Not sure if these should be global, but hey whatev

  var trailheadIconOptions = {
    iconSize: [26 * 0.60, 33 * 0.60],
    iconAnchor: [13 * 0.60, 33 * 0.60],
    popupAnchor: [0, -3]
  };

  var trailheadIcon1Options = $.extend(trailheadIconOptions, {
    iconUrl: 'img/icon_trailhead_active.png'
  });
  var trailheadIcon1 = L.icon(trailheadIcon1Options);
  var trailheadIcon2Options = $.extend(trailheadIconOptions, {
    iconUrl: 'img/icon_trailhead_active.png'
  });
  var trailheadIcon2 = L.icon(trailheadIcon2Options);

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
  $(".clearSelection").click(clearSelectionHandler);
  $(document).on('click', '.trail-popup-line-named', trailPopupLineClick);
  $(".search-key").keyup(function(e) {
    // if (e.which == 13) {
    //   console.log($('.search-key').val());
    processSearch(e);
    // }
  });
  $(".offsetZoomControl").click(offsetZoomIn);

  $(".search-submit").click(processSearch);

  //  Detail Panel Navigation UI events
  $('.hamburgerLine').click(moveSlideDrawer);
  // $(document).on('click', closeSlideDrawerOnly);
  $(document).on('click', '.detailPanelSlider', slideDetailPanel);
  $(".detailPanel").hover(detailPanelHoverIn, detailPanelHoverOut);

  //  Shouldn't the UI event of a Map Callout click opening the detail panel go here?



  // =====================================================================//
  // Kick things off

  var overlayHTMLIE = "<h1>Welcome to To The Trails!</h1>" + 
      "<p>We're sorry, but To The Trails is not compatible with Microsoft Internet Explorer 8 or earlier." + 
      "<p>Please upgrade to the latest version of " +
      "<a href='http://windows.microsoft.com/en-us/internet-explorer/download-ie'>Internet Explorer</a>, " + 
      "<a href='http://google.com/chrome'>Google Chrome</a>, or " +  
      "<a href='http://getfirefox.com'>Mozilla Firefox</a>." +
      "<p>If you are currently running Windows XP, you'll need to upgrade to Chrome or Firefox." +
      "<img src='/img/Overlay-Image-01.png' alt='trees'>";

  var overlayHTML = "<span class='closeOverlay'>x</span>" +
    "<h1>Welcome To The Trails!</h1>" +
    "<p>To The Trails is currently in public beta, so it still a work in progress. We'd love to hear how this site is working for you, so we can make it even better." +
    "<p>Send your feedback to " +
    "<a href='mailto:hello@tothetrails.com?Subject=Feedback' target='_top'>hello@tothetrails.com</a>.";

  var closedOverlayHTML = "<h1>Come visit us Nov 13th!</h1>" +
    "<p>We look forward to seeing you for our public launch." +
    "<img src='/img/Overlay-Image-01.png' alt='trees'>";

  if (window.location.hostname === "www.tothetrails.com" || CLOSED) {
    console.log("closed");
    $(".overlay-panel").html(closedOverlayHTML);
    $(".overlay").show();
  } else {
    if ($("html").hasClass("lt-ie8")) {
      $(".overlay-panel").html(overlayHTMLIE);
    } else {
      $(".overlay-panel").html(overlayHTML);
    }

    $(".overlay-panel").click(function() {
      $(".overlay").hide();
    });
  }

  $(".overlay").show();
  initialSetup();



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
    setupGeolocation(function() {
      if (geoSetupDone) {
        return;
      }
      getOrderedTrailheads(currentUserLocation, function() {
        getTrailData(function() {
          if (USE_LOCAL) {
            getTrailSegments(function() {
              createSegmentTrailnameCache();
              addTrailDataToTrailheads(trailData);
              // if we haven't added the segment layer yet, add it.
              if (map.getZoom() >= SECONDARY_TRAIL_ZOOM && !(map.hasLayer(allSegmentLayer))) {
                map.addLayer(allSegmentLayer);
              }
            });
          }
        });
      });
    });
  }

  // set currentUserLocation to the center of the currently viewed map
  // then get the ordered trailheads and add trailData to trailheads

  function reorderTrailsWithNewLocation() {
    setAnchorLocationFromMap();
    getOrderedTrailheads(anchorLocation, function() {
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
        var nameIndex = trail.properties.name.toLowerCase().indexOf(currentFilters.searchFilter.toLowerCase());
        var descriptionIndex;
        if (trail.properties.description === null) {
          descriptionIndex = -1;
        } else {
          descriptionIndex = trail.properties.description.toLowerCase().indexOf(currentFilters.searchFilter.toLowerCase());
        }
        if (nameIndex == -1 && descriptionIndex == -1) {
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
      for (var i = 0; i < currentFilters.activityFilter.length; i++) {
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
      for (var j = 0; j < filterlength; j++) {
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

  function clearSelectionHandler(e) {
    console.log("clearSelectionHandler");
    $(".visuallyhidden_2 input").attr("checked", false);
    $(".visuallyhidden_3 input").attr("checked", false);
    $(".search-key").val("");
    currentFilters = {
      lengthFilter: [],
      activityFilter: [],
      searchFilter: ""
    };
    applyFilterChange(currentFilters, trailData);
  }

  // ======================================
  // map generation & geolocation updates

  function offsetZoomIn(e) {
    // get map center lat/lng
    // convert to pixels
    // add offset
    // convert to lat/lng
    // setZoomAround to there with currentzoom + 1
    var centerLatLng = map.getCenter();
    var centerPoint = map.latLngToContainerPoint(centerLatLng);
    var offset = centerOffset;
    var offsetCenterPoint = centerPoint.add(offset.divideBy(2));
    var offsetLatLng = map.containerPointToLatLng(offsetCenterPoint);
    if ($(e.target).hasClass("offsetZoomIn")) {
      map.setZoomAround(offsetLatLng, map.getZoom() + 1);
    } else if ($(e.target).hasClass("offsetZoomOut")) {
      map.setZoomAround(offsetLatLng, map.getZoom() - 1);
    }
  }

  function setAnchorLocationFromMap() {
    anchorLocation = map.getCenter();
  }

  function setupGeolocation(callback) {
    console.log("setupGeolocation");
    if (navigator.geolocation) {
      // setup location monitoring
      var options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000
      };
      geoWatchId = navigator.geolocation.watchPosition(
        function(position) {
          if (trailheads.length === 0) {
            handleGeoSuccess(position, callback);
            geoSetupDone = true;
          } else {
            handleGeoSuccess(position);
          }
        },
        function(error) {
          if (trailheads.length === 0) {
            handleGeoError(error, callback);
            geoSetupDone = true;
          } else {
            handleGeoError(error);
          }
        }
      );
    } else {
      // for now, just returns Akron
      // should use browser geolocation,
      // and only return Akron if we're far from home base
      currentUserLocation = AKRON;
      handleGeoError("no geolocation", callback);
    }
  }

  function handleGeoSuccess(position, callback) {
    currentUserLocation = new L.LatLng(position.coords.latitude, position.coords.longitude);
    var distanceToAkron = currentUserLocation.distanceTo(AKRON) / 1000;
    // if no map, set it up
    if (!map) {
      var startingMapLocation;
      var startingMapZoom;
      // if we're close to Akron, start the map and the trailhead distances from 
      // the current location, otherwise just use AKRON for both
      if (distanceToAkron < LOCAL_LOCATION_THRESHOLD) {
        anchorLocation = currentUserLocation;
        startingMapLocation = currentUserLocation;
        startingMapZoom = 13;
      } else {
        anchorLocation = AKRON;
        startingMapLocation = AKRON;
        startingMapZoom = 11;
      }
      map = createMap(startingMapLocation, startingMapZoom);
    }
    // always update the user marker, create if needed
    if (!userMarker) {
      userMarker = L.userMarker(currentUserLocation, {
        smallIcon: true,
        pulsing: true,
        accuracy: 0
      }).addTo(map);
    }
    console.log(currentUserLocation);
    userMarker.setLatLng(currentUserLocation);
    if (typeof callback == "function") {
      callback();
    }
  }

  function handleGeoError(error, callback) {
    console.log("handleGeoError");
    currentUserLocation = AKRON;
    console.log(error);
    if (!map) {
      console.log("making map anyway");
      map = createMap(AKRON, 11);
    }
    if (map && userMarker && error.code === 3) {
      map.removeLayer(userMarker);
      userMarker = null;
    }
    if (typeof callback == "function") {
      callback();
    }
  }

  function createMap(startingMapLocation, startingMapZoom) {
    console.log("createMap");
    console.log(mapDivName);
    var map = L.map(mapDivName, {
      zoomControl: false,
      scrollWheelZoom: false
    });
    L.tileLayer.provider('MapBox.' + MAPBOX_MAP_ID).addTo(map);
    map.setView(startingMapLocation, startingMapZoom);
    map.fitBounds(map.getBounds(), {
      paddingTopLeft: centerOffset
    });
    map.on("zoomend", function(e) {
      // console.log("zoomend");
      if (SHOW_ALL_TRAILS && allSegmentLayer) {
        if (map.getZoom() >= SECONDARY_TRAIL_ZOOM && !(map.hasLayer(allSegmentLayer))) {
          // console.log(allSegmentLayer);
          map.addLayer(allSegmentLayer);
          allSegmentLayer.bringToBack();
        }
        if (map.getZoom() < SECONDARY_TRAIL_ZOOM && map.hasLayer(allSegmentLayer)) {
          if (currentTrailPopup) {
            map.removeLayer(currentTrailPopup);
          }
          map.removeLayer(allSegmentLayer);
        }
      }
    });
    map.on('popupclose', popupCloseHandler);
    return map;
  }



  // =====================================================================//
  // Getting trailhead data

  // get all trailhead info, in order of distance from "location"

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
      // var newMarker = L.marker(currentFeatureLatLng, ({
      //   icon: trailheadIcon1
      // }));
      var newMarker = new L.CircleMarker(currentFeatureLatLng, {
        color: "#00adef",
        fillOpacity: 0.5,
        opacity: 0.8
      }).setRadius(MARKER_RADIUS);
      var trailhead = {
        properties: currentFeature.properties,
        geometry: currentFeature.geometry,
        marker: newMarker,
        trails: [],
        popupContent: ""
      };
      setTrailheadEventHandlers(trailhead);
      trailheads.push(trailhead);
    }
  }

  function setTrailheadEventHandlers(trailhead) {

    trailhead.marker.on("click", function(trailheadID) {
      return function() {
        trailheadMarkerClick(trailheadID);
      };
    }(trailhead.properties.id));

    // placeholders for possible trailhead marker hover behavior
    // trailhead.marker.on("mouseover", function(trailhead) {
    // }(trailhead));

    // trailhead.marker.on("mouseout", function(trailhead) {
    // }(trailhead));
  }

  function trailheadMarkerClick(id) {
    console.log("trailheadMarkerClick");
    highlightTrailhead(id, 0);
    var trailhead = getTrailheadById(id);
    showTrailDetails(trailData[trailhead.trails[0]], trailhead);
  }

  function popupCloseHandler(e) {
    currentTrailPopup = null;
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
    // if (SMALL) {
    //   callData.path = "/trailsegments.json?simplify=" + ALL_SEGMENT_LAYER_SIMPLIFY;
    // }
    makeAPICall(callData, function(response) {
      trailSegments = response;
      if (USE_ALL_SEGMENT_LAYER) {
        allSegmentLayer = makeAllSegmentLayer(response);
      }
      if (typeof callback == "function") {
        callback();
      }
    });
  }

  function createSegmentTrailnameCache() {
    console.log("createSegmentTrailnameCache");
    for (var segmentIndex = 0; segmentIndex < trailSegments.features.length; segmentIndex++) {
      var segment = $.extend(true, {}, trailSegments.features[segmentIndex]);
      for (var i = 0; i < 6; i++) {
        var fieldName = "trail" + i;
        if (segment.properties[fieldName]) {
          segmentTrailnameCache[segment.properties[fieldName]] = true;
        }
      }
    }
  }
  // returns true if trailname is in trailData

  function trailnameInListOfTrails(trailname) {
    // console.log("trailnameInListOfTrails");
    var result = false;
    $.each(trailData, function(key, value) {
      if (trailData[key].properties.name == trailname) {
        result = key;
        return false;
      }
    });
    return result;
  }

  function segmentHasTrailWithMetadata(feature) {
    for (var i = 0; i <= 6; i++) {
      var trailFieldname = "trail" + i;
      if (trailnameInListOfTrails(feature.properties[trailFieldname])) {
        return true;
      }
    }
    return false;
  }


  function makeAllSegmentLayer(response) {
    if (allSegmentLayer !== undefined) {
      return allSegmentLayer;
    }
    console.log("makeAllSegmentLayer");
    // make visible layers
    allVisibleSegmentsArray = [];
    allInvisibleSegmentsArray = [];
    var allSegmentLayer = new L.FeatureGroup();
    // console.log("visibleAllTrailLayer start");
    // make a normal visible layer for the segments, and add each of those layers to the allVisibleSegmentsArray
    var visibleAllTrailLayer = L.geoJson(response, {
      style: function visibleStyle() {
        return {
          color: NORMAL_SEGMENT_COLOR,
          weight: NORMAL_SEGMENT_WEIGHT,
          opacity: 1,
          clickable: false
          // dashArray: "5,5"
        };
      },
      onEachFeature: function visibleOnEachFeature(feature, layer) {
        // console.log("visibleAllTrailLayer onEachFeature");
        allVisibleSegmentsArray.push(layer);
      }
    });
    // make invisible layers

    // make the special invisible layer for mouse/touch events. much wider paths.
    // make popup html for each segment
    var invisibleAllTrailLayer = L.geoJson(response, {
      style: function invisibleStyle() {
        return {
          opacity: 0,
          weight: 20,
          clickable: true,
          smoothFactor: 10
        };
      },
      onEachFeature: function invisibleOnEachFeature(feature, layer) {
        // console.log("invisibleAllTrailLayer onEachFeature");
        allInvisibleSegmentsArray.push(layer);
      }
    });
    // console.log("invisibleAllTrailLayer end");

    var numSegments = allInvisibleSegmentsArray.length;
    for (var i = 0; i < numSegments; i++) {
      // console.log("numSegments loop");
      var invisLayer = allInvisibleSegmentsArray[i];
      // make a FeatureGroup including both visible and invisible components
      // var newTrailFeatureGroup = new L.FeatureGroup([allVisibleSegmentsArray[i]]);

      var newTrailFeatureGroup = new L.FeatureGroup([allInvisibleSegmentsArray[i], allVisibleSegmentsArray[i]]);

      var $popupHTML = $("<div class='trail-popup'>");
      for (var j = 1; j <= 6; j++) {
        var trailField = "trail" + j;
        if (invisLayer.feature.properties[trailField]) {
          var $trailPopupLineDiv;
          if (trailnameInListOfTrails(invisLayer.feature.properties[trailField])) {
            // NOTE: color should be in the css, not here
            $trailPopupLineDiv = $("<div class='trail-popup-line trail-popup-line-named'>")
              .attr("data-steward", invisLayer.feature.properties.steward).attr("data-source", invisLayer.feature.properties.source)
              .attr("data-trailname", invisLayer.feature.properties[trailField])
              .html(invisLayer.feature.properties[trailField]);
          } else {
            if (trailnameInListOfTrails(invisLayer.feature.properties[trailField].indexOf("_")) === -1) {
              $trailPopupLineDiv = $("<div class='trail-popup-line trail-popup-line-unnamed'>").html(invisLayer.feature.properties[trailField])
              $trailPopupLineDiv.append("<b>");
            } else {
              // console.log("skipping trail segment name because it has an underscore in it");
            }
          }
          $popupHTML.append($trailPopupLineDiv);
        }
      }

      invisLayer.feature.properties.popupHTML = $popupHTML.outerHTML();
      var eventType;
      // this should be a test for touch, not small
      if (TOUCH) {
        eventType = "click";
      } else {
        eventType = "mouseover";
      }
      newTrailFeatureGroup.addEventListener(eventType, function featureGroupEventListener(invisLayer) {
        return function newMouseover(e) {
          // console.log("new mouseover");
          if (closeTimeout) {
            clearTimeout(closeTimeout);
            closeTimeout = null;
          }
          if (openTimeout) {
            clearTimeout(openTimeout);
            openTimeout = null;
          }
          openTimeout = setTimeout(function openTimeoutFunction(originalEvent, target) {
            return function() {
              target.setStyle({
                weight: HOVER_SEGMENT_WEIGHT,
                color: HOVER_SEGMENT_COLOR
              });
              // set currentWeightedSegment back to normal
              if (target != currentWeightedSegment) {
                if (currentWeightedSegment) {
                  currentWeightedSegment.setStyle({
                    weight: NORMAL_SEGMENT_WEIGHT,
                    color: NORMAL_SEGMENT_COLOR
                  });
                }
              }
              var popupHTML = invisLayer.feature.properties.popupHTML;
              currentTrailPopup = new L.Popup().setContent(popupHTML).setLatLng(originalEvent.latlng).openOn(map);
              currentWeightedSegment = target;
            };
          }(e, e.target), 250);
        };
      }(invisLayer));

      newTrailFeatureGroup.addEventListener("mouseout", function(e) {
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          closeTimeout = null;
        }
        if (openTimeout) {
          clearTimeout(openTimeout);
          openTimeout = null;
        }
        closeTimeout = setTimeout(function(e) {
          return function() {
            e.target.setStyle({
              weight: 3
            });
            //map.closePopup();
          };
        }(e), 1250);
      });
      allSegmentLayer.addLayer(newTrailFeatureGroup);
    }

    // use this to just show the network
    // allSegmentLayer = visibleAllTrailLayer;
    allVisibleSegmentsArray = null;
    allInvisibleSegmentsArray = null;
    return allSegmentLayer;
  }

  // after clicking on a trail name in a trail popup,
  // find the closest matching trailhead and highlight it

  function trailPopupLineClick(e) {
    console.log("trailPopupLineClick");
    // get all trailheads that have this trailname and source
    var trailname = $(e.target).attr("data-trailname");
    var source = $(e.target).attr("data-source");
    var trailheadMatches = [];
    for (var i = 0; i < trailheads.length; i++) {
      var trailhead = trailheads[i];
      if (trailhead.properties.source == source) {
        if (trailhead.properties.trail1 == trailname ||
          trailhead.properties.trail2 == trailname ||
          trailhead.properties.trail3 == trailname ||
          trailhead.properties.trail4 == trailname ||
          trailhead.properties.trail5 == trailname ||
          trailhead.properties.trail6) {
          trailheadMatches.push(trailhead);
        }
      }
    }
    // find the closest one
    // popups have no getLatLng, so we're cheating here.
    var currentLatLng = currentTrailPopup._latlng;
    var nearestDistance = Infinity;
    var nearestTrailhead = null;
    for (var j = 0; j < trailheadMatches.length; j++) {
      var matchedTrailhead = trailheadMatches[j];
      var trailheadLatLng = matchedTrailhead.marker.getLatLng();
      var distance = currentLatLng.distanceTo(trailheadLatLng);
      if (distance < nearestDistance) {
        nearestTrailhead = matchedTrailhead;
        nearestDistance = distance;
      }
    }
    // find the index of the clicked trail
    var trailIndex = 0;
    var trail = null;
    for (var k = 0; k < nearestTrailhead.trails.length; k++) {
      var trailheadTrailID = nearestTrailhead.trails[k];
      if (trailData[trailheadTrailID].properties.name == trailname) {
        trail = trailData[trailheadTrailID];
        trailIndex = k;
      }
    }
    // highlight it
    highlightTrailhead(nearestTrailhead.properties.id, trailIndex);
    showTrailDetails(trail, nearestTrailhead);
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
            if (checkSegmentsForTrailname(trail.properties.name, trail.properties.source)) {
              trailhead.trails.push(trailID);
            } else {
              console.log("skipping " + trail.properties.name + "/" + trail.properties.source + ": no segment data");
            }
          }
        });
      }
    }
    fixDuplicateTrailNames(trailheads);
    makeTrailheadPopups(trailheads);
    mapActiveTrailheads(trailheads);
    makeTrailDivs(trailheads);
    if (SMALL) {
      highlightTrailhead(orderedTrails[0].trailheadID, 0);
      orderedTrailIndex = 0;
      showTrailDetails(orderedTrails[0].trailhead, orderedTrails[0].trail);
    }
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
        src: "img/icon_trailhead_active.png"
      }));
      for (var trailsIndex = 0; trailsIndex < trailhead.trails.length; trailsIndex++) {
        var trail = trailData[trailhead.trails[trailsIndex]];
        var $popupTrailDiv = $("<div>").addClass("trailhead-trailname trail" + (trailsIndex + 1))
          .attr("data-trailname", trail.properties.name)
          .attr("data-trailid", trail.properties.id)
          .attr("data-trailheadname", trailhead.properties.name)
          .attr("data-trailheadid", trailhead.properties.id)
          .attr("data-index", trailsIndex);
        var status = "";
        if (trail.properties.status == 1) {
          $popupTrailDiv.append($("<img>").addClass("status").attr({
            src: "img/icon_alert_yellow.png",
            title: "alert"
          }));
        }
        if (trail.properties.status == 2) {
          $popupTrailDiv.append($("<img>").addClass("status").attr({
            src: "img/icon_alert_red.png",
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

    currentTrailheadLayerGroup.eachLayer(function(layer) {
      if (typeof layer.bringToBack == "function") {
        layer.bringToBack();
      }
    });
  }

  // given trailheads, now populated with matching trail names,
  // fill out the left trail(head) pane,
  // noting if a particular trailhead has no trails associated with it

  function makeTrailDivs(trailheads) {
    console.log("makeTrailDivs");
    orderedTrails = [];
    var divCount = 1;
    $(".trailList").html("");
    $.each(trailheads, function(index, trailhead) {
      var trailheadName = trailhead.properties.name;
      var trailheadID = trailhead.properties.id;
      var parkName = trailhead.properties.park;
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
        var trailCurrentIndex = divCount++;

        //  Add park name var when it makes it into the database
        $trailDiv = $("<div>").addClass('trail-box')
          .attr("data-source", "list")
          .attr("data-trailid", trailID)
          .attr("data-trailname", trailName)
          .attr("data-trail-length", trailLength)
          .attr("data-trailheadName", trailheadName)
          .attr("data-trailheadid", trailheadID)
          .attr("data-index", i)
          .appendTo(".trailList")
          .click(populateTrailsForTrailheadDiv)
          .click(function(trail, trailhead) {
            return function(e) {
              showTrailDetails(trail, trailhead);
            };
          }(trail, trailhead));

        var $trailInfo = $("<div>").addClass("trailInfo").appendTo($trailDiv);
        var $trailheadInfo = $("<div>").addClass("trailheadInfo").appendTo($trailDiv);

        // Making a new div for Detail Panel
        $("<div class='trailSource' id='" + trailheadSource + "'>" + trailheadSource + "</div>").appendTo($trailDiv);
        $("<div class='trailCurrentIndex' >" + trailCurrentIndex + "</div>").appendTo($trailInfo);
        $("<div class='trail' >" + trailName + "</div>").appendTo($trailInfo);

        var mileString = trailLength == 1 ? "mile" : "miles";
        $("<div class='trailLength' >" + trailLength + " " + mileString + " long" + "</div>").appendTo($trailInfo);

        if (parkName) {
          console.log("has a park name");
          $("<div class='parkName' >" + trailhead.properties.park + "</div>").appendTo($trailInfo);
        }

        //  Here we generate icons for each activity filter that is true..?

        $("<img class='trailheadIcon' src='img/icon_trailhead_active.png'/>").appendTo($trailheadInfo);
        $("<div class='trailheadName' >" + trailheadName + " Trailhead" + "</div>").appendTo($trailheadInfo);
        $("<div class='trailheadDistance' >" + trailheadDistance + " miles away" + "</div>").appendTo($trailheadInfo);

        var trailInfoObject = {
          trailID: trailID,
          trail: trail,
          trailheadID: trailheadID,
          trailhead: trailhead,
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
    $(".trails-count").html(orderedTrails.length + " RESULTS FOUND");
    // console.log(orderedTrails);
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
    if (!SMALL) {
      $('.accordion').hide();
    }
    $('.trailhead-trailname.selected').addClass("detail-open");
    $(".detailPanel .detailPanelPicture")[0].scrollIntoView();
    // map.invalidateSize();
  }

  function closeDetailPanel() {
    console.log("closeDetailPanel");
    $('.detailPanel').hide();
    $('.accordion').show();
    $('.trailhead-trailname.selected').removeClass("detail-open");
    // map.invalidateSize();
  }

  function detailPanelHoverIn(e) {
    enableTrailControls();
  }

  function detailPanelHoverOut(e) {
    $(".controlRight").removeClass("enabled").addClass("disabled");
    $(".controlLeft").removeClass("enabled").addClass("disabled");
  }

  function changeDetailPanel(e) {
    console.log("changeDetailPanel");
    var trailheadID = currentDetailTrailhead.properties.id;
    var trailID = String(currentDetailTrail.properties.id);
    console.log(trailID);
    var trailhead;

    for (var i = 0; i < orderedTrails.length; i++) {
      if (orderedTrails[i].trailID == trailID && orderedTrails[i].trailheadID == trailheadID) {
        orderedTrailIndex = i;
      }
    }
    var trailChanged = false;
    if ($(e.target).hasClass("controlRight")) {
      orderedTrailIndex = orderedTrailIndex + 1;
      trailChanged = true;
    }
    if ($(e.target).hasClass("controlLeft") && orderedTrailIndex > 0) {
      orderedTrailIndex = orderedTrailIndex - 1;
      trailChanged = true;
    }
    if (trailChanged) {
      var orderedTrail = orderedTrails[orderedTrailIndex];
      // console.log(orderedTrail);
      trailheadID = orderedTrail.trailheadID;
      // console.log(["trailheadID", trailheadID]);
      var trailIndex = orderedTrail.index;
      // console.log(["trailIndex", trailIndex]);
      for (var j = 0; j < trailheads.length; j++) {
        if (trailheads[j].properties.id == trailheadID) {
          trailhead = trailheads[j];
        }
      }
      enableTrailControls();
      highlightTrailhead(trailheadID, trailIndex);
      showTrailDetails(trailData[trailhead.trails[trailIndex]], trailhead);
      $(".detailPanel .detailPanelPicture")[0].scrollIntoView();
    }
  }

  function enableTrailControls() {

    if (orderedTrailIndex === 0) {
      $(".controlLeft").removeClass("enabled").addClass("disabled");
    } else {
      $(".controlLeft").removeClass("disabled").addClass("enabled");
    }

    if (orderedTrailIndex == orderedTrails.length - 1) {
      $(".controlRight").removeClass("enabled").addClass("disabled");
    } else {
      $(".controlRight").removeClass("disabled").addClass("enabled");
    }
    return orderedTrailIndex;
  }

  function resetDetailPanel() {
    $('.detailPanel .detailPanelPicture').attr("src", "img/ImagePlaceholder.jpg");
    $('.detailPanel .detailPanelPictureCredits').remove();
    $('.detailPanel .detailConditionsDescription').html("");
    $('.detailPanel .detailTrailSurface').html("");
    $('.detailPanel .detailTrailheadName').html("");
    $('.detailPanel .detailTrailheadPark').html("");
    $('.detailPanel .detailTrailheadAddress').html("");
    $('.detailPanel .detailTrailheadCity').html("");
    $('.detailPanel .detailTrailheadState').html("");
    $('.detailPanel .detailTrailheadZip').html("");
    $('.detailPanel .detailPanelPictureContainer .statusMessage').remove();
    $('.detailPanel .detailTopRow#right #hike').html("");
    $('.detailPanel .detailTopRow#right #cycle').html("");
    $('.detailPanel .detailTopRow#right #handicap').html("");
    $('.detailPanel .detailTopRow#right #horse').html("");
    $('.detailPanel .detailTopRow#right #xcountryski').html("");
    $('.detailPanel .detailBottomRow .detailTrailheadAmenities .detailTrailheadIcons').html("");
    $('.detailPanel .detailDescription').html("");
    $('.detailPanel .detailStewardLogo').attr("src", "/img/logoPlaceholder.jpg");
  }

  function decorateDetailPanel(trail, trailhead) {
    console.log(orderedTrailIndex);

    for (var i = 0; i < orderedTrails.length; i++) {
      if (orderedTrails[i].trailID == trail.properties.id && orderedTrails[i].trailheadID == trailhead.properties.id) {
        orderedTrailIndex = i;
      }
    }
    enableTrailControls();

    resetDetailPanel();
    $('.detailPanel .detailPanelBanner .trailName').html(trail.properties.name + " (" + (orderedTrailIndex + 1) + " of " + orderedTrails.length + " trails)");

    $('.detailPanel .detailPanelBanner .trailIndex').html((orderedTrailIndex + 1) + " of " + orderedTrails.length);
    $('.detailPanel .detailPanelBanner .trailName').html(trail.properties.name);

    if (trail.properties.conditions) {
      $('.detailPanel .detailConditionsDescription').html(trail.properties.conditions);
    }

    if (trail.properties.trlsurface) {
      $('.detailPanel .detailTrailSurface').html(trail.properties.trlsurface);
    }

    $('.detailPanel .detailTrailheadName').html(trailhead.properties.name + " Trailhead");

    if (trailhead.properties.park) {
      $('.detailPanel .detailTrailheadPark').html(trailhead.properties.park);
    }

    if (trailhead.properties.address) {
      $('.detailPanel .detailTrailheadAddress').html(trailhead.properties.address);
    }

    if (trailhead.properties.city) {
      if (trailhead.properties.state) {
        $('.detailPanel .detailTrailheadCity').html(trailhead.properties.city + ", ");
      }
      else {
        $('.detailPanel .detailTrailheadCity').html(trailhead.properties.city);
      }
    }

    if (trailhead.properties.state) {
      $('.detailPanel .detailTrailheadState').html(trailhead.properties.state);
    }

    if (trailhead.properties.zip) {
      $('.detailPanel .detailTrailheadZip').html(trailhead.properties.zip);
    }

    if (trail.properties.medium_photo_url) {
      $('.detailPanel .detailPanelPicture').attr("src", trail.properties.medium_photo_url);
      $('.detailPanel .detailPanelPictureContainer').append("<div class='detailPanelPictureCredits'>" + "Photo courtesy of " + trail.properties.photo_credit + "</div>");
    }

    if (trail.properties.status == 1) {
      $('.detailPanel .detailPanelPictureContainer').append("<div class='statusMessage' id='yellow'>" + "<img src='img/icon_alert_yellow.png'>" + "<span>" + trail.properties.statustext + "</span>" + "</div>");
    }
    if (trail.properties.status == 2) {
      $('.detailPanel .detailPanelPictureContainer').append("<div class='statusMessage' id='red'>" + "<img src='img/icon_alert_red.png'>" + "<span>" + trail.properties.statustext + "</span>" + "</div>");
    }

    if (trail.properties.hike && trail.properties.hike.toLowerCase().indexOf('y') === 0) {
      $('.detailPanel .detailTopRow#right #hike').html("<img class='activity-icons' src='img/icon_hike_green.png'>");
    }

    if (trail.properties.roadbike && trail.properties.roadbike.toLowerCase().indexOf('y') === 0) {
      $('.detailPanel .detailTopRow#right #cycle').html("<img class='activity-icons' src='img/icon_cycle_green.png'>");
    }

    if (trail.properties.accessible && trail.properties.accessible.toLowerCase().indexOf('y') === 0) {
      $('.detailPanel .detailTopRow#right #handicap').html("<img class='activity-icons' src='img/icon_handicap_green.png'>");
    }

    if (trail.properties.equestrian && trail.properties.equestrian.toLowerCase().indexOf('y') === 0) {
      $('.detailPanel .detailTopRow#right #horse').html("<img class='activity-icons' src='img/icon_horse_green.png'>");
    }

    if (trail.properties.xcntryski && trail.properties.xcntryski.toLowerCase().indexOf('y') === 0) {
      $('.detailPanel .detailTopRow#right #xcountryski').html("<img class='activity-icons' src='img/icon_xcountryski_green.png'>");
    }

    if (trailhead.properties.parking && trailhead.properties.parking.toLowerCase().indexOf('y') === 0) {
      $('.detailPanel .detailBottomRow .detailTrailheadAmenities .detailTrailheadIcons').html("<img class='amenity-icons' src='img/icon_parking_green.png'>");
    }

    $('.detailPanel .detailSource').html(trailhead.properties.source);
    $('.detailPanel .detailTrailheadDistance').html(metersToMiles(trailhead.properties.distance) + " miles away");

    if (trail.properties.length) {
      var mileString = trail.properties.length == "1" ? "mile" : "miles";
      $('.detailPanel .detailLength').html(trail.properties.length + " " + mileString);
    } else {
      $('.detailPanel .detailLength').html("--");
    }

    $('.detailPanel .detailDescription').html(trail.properties.description);

    if (trail.properties.map_url) {
      $('.detailPanel .detailPrintMap a').attr("href", trail.properties.map_url).attr("target", "_blank");
      $('.detailPanel .detailPrintMap').show();
    } else {
      $('.detailPanel .detailPrintMap').hide();
    }

    var directionsUrl = "http://maps.google.com?saddr=" + currentUserLocation.lat + "," + currentUserLocation.lng +
      "&daddr=" + trailhead.geometry.coordinates[1] + "," + trailhead.geometry.coordinates[0];
    $('.detailPanel .detailDirections a').attr("href", directionsUrl).attr("target", "_blank");
    // 
    $("#email a").attr("href", "mailto:?subject=Heading to the " + trail.properties.name + "&body=Check out more trails at tothetrails.com!").attr("target", "_blank");
    $("#twitter a").attr("href", "http://twitter.com/home?status=Headed%20to%20" + trail.properties.name + ".%20Find%20it%20on%20tothetrails.com!").attr("target", "_blank");
    $("#facebook a").attr("href", 
     "http://www.facebook.com/sharer/sharer.php?s=100&p[url]=tothetrails.com&p[images][0]=&p[title]=To%20The%20Trails!&p[summary]=Heading to " +
     trail.properties.name + "!").attr("target", "_blank");
    $('.detailPanel .detailBottomRow .detailTrailheadAmenities .detailTrailheadIcons');

    if (trail.properties.steward_fullname) {
      $('.detailPanel .detailFooter').show();
      if (trail.properties.steward_logo_url && trail.properties.steward_logo_url.indexOf("missing.png") == -1) {
        $('.detailPanel .detailStewardLogo').attr("src", trail.properties.steward_logo_url).show();   
      }
      $('.detailPanel .detailFooter .detailSource').html(trail.properties.steward_fullname).attr("href", trail.properties.steward_url).attr("target", "_blank");
      $('.detailPanel .detailFooter .detailSourcePhone').html(trail.properties.steward_phone);
    } else {
      $('.detailPanel .detailFooter').hide();
    }

  }


  function slideDetailPanel(e) {
    console.log("slideDetailPanel");
    if ($(e.target).parent().hasClass("expanded")) {
      $('.detailPanel').addClass('contracted');
      $('.detailPanel').removeClass('expanded');
      $('.trailListColumn').css({
        overflow: 'hidden'
      });
    } else {
      $('.detailPanel').addClass('expanded');
      $('.detailPanel').removeClass('contracted');
      $('.trailListColumn').css({
        overflow: 'scroll'
      });
    }
  }

  //  Mobile-only function changing the position of the detailPanel

  function moveSlideDrawer(e) {
    console.log("moveSlideDrawer")
    if ($(".slideDrawer").hasClass("closedDrawer")) {
      console.log("openSlideDrawer");
      $('.slideDrawer').removeClass('closedDrawer');
      $('.slideDrawer').addClass("openDrawer");
    } else {
      console.log("closeSlideDrawer");
      $('.slideDrawer').removeClass('openDrawer');
      $('.slideDrawer').addClass('closedDrawer');
    }
  }

  // function closeSlideDrawerOnly(e) {
  //   console.log("closeSlideDrawerOnly")
  //   var container = $(".slideDrawer");

  //   if (!container.is(e.target)
  //     && container.has(e.target).length == 0
  //     && container.hasClass('openDrawer') {
  //     container.addClass('closedDrawer');
  //     container.removeClass('openDrawer');
  //   }
  // }


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
    var results = {
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
    var trailhead = getTrailheadById(parsed.trailheadID);
    // for (var i = 0; i < trailheads.length; i++) {
    //   if (trailheads[i].properties.id == parsed.trailheadID) {
    //     trailhead = trailheads[i];
    //   }
    // }
    // decorateDetailPanel(trailData[parsed.trailID], trailhead);
    highlightTrailhead(parsed.trailheadID, parsed.highlightedTrailIndex);
    var trail = trailData[parsed.trailID];
    showTrailDetails(trail, trailhead);
  }

  function getTrailheadById(trailheadID) {
    var trailhead;
    for (var i = 0; i < trailheads.length; i++) {
      if (trailheads[i].properties.id == trailheadID) {
        trailhead = trailheads[i];
        break;
      }
    }
    return trailhead;
  }

  function highlightTrailInPopup(trailhead, highlightedTrailIndex) {
    // add selected class to selected trail in trailhead popup, and remove it from others,
    // unless highlightedTrailIndex == -1, then just remove it everywhere
    var $trailheadPopupContent = $(trailhead.popupContent);

    $trailheadPopupContent.find(".trailhead-trailname").removeClass("selected").addClass("not-selected");
    if (highlightedTrailIndex != -1) {
      var trailID = trailhead.trails[highlightedTrailIndex];
      var selector = '[data-trailid="' + trailID + '"]';
      var $trailnameItem = $trailheadPopupContent.find(selector);
      $trailnameItem.addClass("selected").removeClass("not-selected");
    }
    trailhead.popupContent = $trailheadPopupContent.outerHTML();

    if ($('.detailPanel').is(":visible")) {
      // console.log("detail is open");
      // console.log($('.trailhead-trailname.selected'));
      $('.trailhead-trailname.selected').addClass("detail-open");
    }
  }

  // given a trailheadID and a trail index within that trailhead
  // display the trailhead marker and popup,
  // then call highlightTrailheadDivs() and getAllTrailPathsForTrailhead()
  // with the trailhead record

  var currentTrailheadMarker;

  function highlightTrailhead(trailheadID, highlightedTrailIndex) {
    console.log("highlightTrailhead");
    highlightedTrailIndex = highlightedTrailIndex || 0;
    var trailhead = null;
    trailhead = getTrailheadById(trailheadID);
    // for (var i = 0; i < trailheads.length; i++) {
    //   if (trailheads[i].properties.id == trailheadID) {
    //     trailhead = trailheads[i];
    //     break;
    //   }
    // }

    if ($('.detailPanel').is(":visible")) {
      $('.trailhead-trailname.selected').removeClass("detail-open");
    }

    if (currentTrailhead) {
      map.removeLayer(currentTrailhead.marker);
      currentTrailhead.marker = new L.CircleMarker(currentTrailhead.marker.getLatLng(), {
        color: "#00adef",
        fillOpacity: 0.5,
        opacity: 0.8,
        zIndexOffset: 100
      }).setRadius(MARKER_RADIUS).addTo(map);
      setTrailheadEventHandlers(currentTrailhead);
    }
    if ($('.detailPanel').is(":visible")) {
      $('.trailhead-trailname.selected').addClass("detail-open");
    }
    currentTrailhead = trailhead;

    map.removeLayer(currentTrailhead.marker);
    currentTrailhead.marker = new L.Marker(currentTrailhead.marker.getLatLng(), {
      icon: trailheadIcon1
    }).addTo(map);
    setTrailheadEventHandlers(currentTrailhead);

    getAllTrailPathsForTrailhead(trailhead, highlightedTrailIndex);
    highlightTrailInPopup(trailhead, highlightedTrailIndex);
    var popup = new L.Popup({
      offset: [0, -12],
      autoPanPadding: [100, 100]
    })
      .setContent(trailhead.popupContent)
      .setLatLng(trailhead.marker.getLatLng())
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
      console.log(valid);
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
    if (combined.features) {
      combined.features[0].properties.order = 0;
      for (var i = 1; i < responses.length; i++) {
        combined.features = combined.features.concat(responses[i].features);
        combined.features[i].properties.order = i;
      }
    } else {
      console.log("ERROR: missing segment data for trail.");
    }
    // console.log("----");
    // console.log(combined);
    return combined;
  }

  function checkSegmentsForTrailname(trailName, trailSource) {
    var segmentsExist = false;
    segmentsExist = trailName in segmentTrailnameCache || 'trailname + " Trail"' in segmentTrailnameCache;
    return segmentsExist;
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
          // color = getClassBackgroundColor("trailActive");
          return {
            weight: NORMAL_SEGMENT_WEIGHT,
            color: NORMAL_SEGMENT_COLOR,
            opacity: 1,
            clickable: false
          };
        } else if (feature.properties.order === 1) {
          // color = getClassBackgroundColor("trailActive");
          return {
            weight: NORMAL_SEGMENT_WEIGHT,
            color: NORMAL_SEGMENT_COLOR,
            opacity: 1,
            clickable: false
          };
        } else if (feature.properties.order === 2) {
          // color = getClassBackgroundColor("trailActive");
          return {
            weight: NORMAL_SEGMENT_WEIGHT,
            color: NORMAL_SEGMENT_COLOR,
            opacity: 1,
            clickable: false
          };
        }
      },

      onEachFeature: function(feature, layer) {
        currentTrailLayers.push(layer);
      }
    }).addTo(map).bringToFront();
    //.bringToFront();
    zoomToLayer(currentMultiTrailLayer);
  }


  // return the calculated CSS background-color for the class given
  // This may need to be changed since AJW changed it to "border-color" above

  function getClassBackgroundColor(className) {
    var $t = $("<div class='" + className + "'>").hide().appendTo("body");
    var c = $t.css("background-color");
    console.log(c);
    $t.remove();
    return c;
  }

  // given the index of a trail within a trailhead,
  // highlight that trail on the map, and call zoomToLayer with it

  function setCurrentTrail(index) {
    console.log("setCurrentTrail");
    if (currentHighlightedTrailLayer && typeof currentHighlightedTrailLayer.setStyle == "Function") {
      currentHighlightedTrailLayer.setStyle({
        weight: NORMAL_SEGMENT_WEIGHT,
        color: NORMAL_SEGMENT_COLOR
      });
    }
    if (currentTrailLayers[index]) {
      currentHighlightedTrailLayer = currentTrailLayers[index];
      currentHighlightedTrailLayer.setStyle({
        weight: ACTIVE_TRAIL_WEIGHT,
        color: ACTIVE_TRAIL_COLOR
      });
    } else {
      console.log("ERROR: trail layer missing");
      console.log(currentTrailLayers);
      console.log(index);
    }
  }

  // given a leaflet layer, zoom to fit its bounding box, up to MAX_ZOOM
  // in and MIN_ZOOM out (commented out for now)

  function zoomToLayer(layer) {
    console.log("zoomToLayer");
    // figure out what zoom is required to display the entire trail layer
    var layerBoundsZoom = map.getBoundsZoom(layer.getBounds());
    // console.log(layer.getLayers().length);

    // var layerBoundsZoom = map.getZoom();
    // console.log(["layerBoundsZoom:", layerBoundsZoom]);

    // if the entire trail layer will fit in a reasonable zoom full-screen, 
    // use fitBounds to place the entire layer onscreen
    if (layerBoundsZoom <= MAX_ZOOM && layerBoundsZoom >= MIN_ZOOM) {
      map.fitBounds(layer.getBounds(), {
        paddingTopLeft: centerOffset
      });
    }

    // otherwise, center on trailhead, with offset, and use MAX_ZOOM or MIN_ZOOM
    // with setView
    else {
      var newZoom = layerBoundsZoom > MAX_ZOOM ? MAX_ZOOM : layerBoundsZoom;
      newZoom = newZoom < MIN_ZOOM ? MIN_ZOOM : newZoom;
      map.setView(currentTrailhead.marker.getLatLng(), newZoom);
    }

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
      console.log("error! " + errorThrown + " " + textStatus);
      console.log(jqXHR.status);
      $("#results").text("error: " + JSON.stringify(errorThrown));
    }).done(function(response, textStatus, jqXHR) {
      if (typeof doneCallback === 'function') {
        // console.log("calling doneCallback");
        doneCallback.call(this, response);
      }
    });
  }

  // get the outerHTML for a jQuery element

  jQuery.fn.outerHTML = function(s) {
    return s ? this.before(s).remove() : jQuery("<p>").append(this.eq(0).clone()).html();
  };

  function logger(message) {
    if (typeof console !== "undefined") {
      console.log(message)
    }
  }
}