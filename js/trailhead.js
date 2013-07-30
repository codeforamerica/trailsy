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
  var MAX_ZOOM = 14;

  var map = {};
  var trailData = {}; // all of the trails metadata (from traildata table), with trail name as key
  // { *trailname*: { geometry: null,  // this field is added for CartoDB's approval
  //                  properties: { cartodb_id: *uniqueID*,
  //                                length: *length of trail in meters*,
  //                                name: *name of trail*,
  //                                source: *whose data this info came from*,
  //                              }
  //                }
  // }
  var activeTrailheads = []; // all trailheads (from trailsegments)
  // [ {  marker: *Leaflet marker*,
  //      trails: *[array of matched trail names],
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
  var currentMultiTrailLayer = {}; // We have to know if a trail layer is already being displayed, so we can remove it
  var currentTrailLayers = [];
  var currentHighlightedTrailLayer = {};
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
  $(document).on('click', '.trailhead-trailname', trailnameClick);
  $("#showAllTrailSegments").click(function() {
    getAllTrailPaths(drawMultiTrailLayer);
  });
  $("#showUnusedTrailSegments").click(function() {
    getAllTrailPaths(filterKnownTrails);
  });


  //  Difficulty Filtering
  //  Length Filtering
  //  Helper functions

  function filterTrailList() {}



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
      }).bindPopup(currentFeature.properties.name);

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
      activeTrailheads.push(trailhead);
    }
    mapNearestTrailheads(activeTrailheads);
  }

  // on trailhead marker click, this is invoked with the id of the trailhead

  function trailheadMarkerClick(id) {
    console.log(id);
    highlightTrailhead(id, 0);
  }


  // given activeTrailheads, add all of the markers to the map in a single Leaflet layer group

  function mapNearestTrailheads(activeTrailheads) {
    console.log("mapNearestTrailheads");
    var currentTrailheadMarkerArray = [];
    for (var i = 0; i < activeTrailheads.length; i++) {
      currentTrailheadMarkerArray.push(activeTrailheads[i].marker);
    }
    var currentTrailheadLayerGroup = L.layerGroup(currentTrailheadMarkerArray);
    map.addLayer(currentTrailheadLayerGroup);
    getTrailInfo();
  }


  // get the trailData from the DB

  function getTrailInfo() {
    console.log("getTrailInfo");
    var trail_list_query = "select * from " + TRAILDATA_TABLE + " order by name";
    // Another AJAX call, for the trails
    makeSQLQuery(trail_list_query, addTrailsToTrailheads);
  }


  // given the GeoJSON of trails from the trail_data table,
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
      var $popupContentMainDiv = $("<div>").addClass("trailhead-popup");

      //  Should we be able to refactor this, since we're repeating a lot in each "if"? 
      var $popupTrailheadDiv = $("<div>").addClass("trailhead-name").html(trailhead.properties.name).appendTo($popupContentMainDiv);
      console.log($popupContentMainDiv.val());
      // var popupContent = "<div class='trailhead-popup'>" + "<div class='trailhead-name'>" + trailhead.properties.name + "</div>";
      var trailheadTrailCount = 0;
      if (trailhead.properties.trail1 in trailData) {
        trailhead.trails.push(trailhead.properties.trail1);
        trailheadTrailCount += 1;
        var $popupTrail1Div = $("<div>").addClass("trailhead-trailname trail" + trailheadTrailCount)
          .attr("data-trailname", trailhead.properties.trail1)
          .attr("data-trailheadname", trailhead.properties.name)
          .attr("data-trailheadid", trailhead.properties.cartodb_id)
          .attr("data-index", trailheadTrailCount - 1)
          .append("<a href='#'>").html(trailhead.properties.trail1)
          .appendTo($popupTrailheadDiv);
      }
      if (trailhead.properties.trail2 in trailData) {
        trailhead.trails.push(trailhead.properties.trail2);
        trailheadTrailCount += 1;
        var $popupTrail2Div = $("<div>").addClass("trailhead-trailname trail" + trailheadTrailCount)
          .attr("data-trailname", trailhead.properties.trail2)
          .attr("data-trailheadname", trailhead.properties.name)
          .attr("data-trailheadid", trailhead.properties.cartodb_id)
          .attr("data-index", trailheadTrailCount - 1)
          .append("<a href='#'>").html(trailhead.properties.trail2)
          .appendTo($popupTrailheadDiv);
      }
      if (trailhead.properties.trail3 in trailData) {
        trailhead.trails.push(trailhead.properties.trail3);
        trailheadTrailCount += 1;
        trailhead.trails.push(trailhead.properties.trail3);
        var $popupTrail3Div = $("<div>").addClass("trailhead-trailname trail" + trailheadTrailCount)
          .attr("data-trailname", trailhead.properties.trail3)
          .attr("data-trailheadname", trailhead.properties.name)
          .attr("data-trailheadid", trailhead.properties.cartodb_id)
          .attr("data-index", trailheadTrailCount - 1)
          .append("<a href='#'>").html(trailhead.properties.trail3)
          .appendTo($popupTrailheadDiv);
      }
      trailhead.popupContent = $popupContentMainDiv.outerHTML();
      trailhead.marker.bindPopup(trailhead.popupContent);
    }
    makeTrailDivs(activeTrailheads);
  }


  // given activeTrailheads, now populated with matching trail names,
  // fill out the left trail(head) pane,
  // noting if a particular trailhead has no trails associated with it

  function makeTrailDivs(activeTrailheads) {
    console.log("makeTrailDivs");
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
          .attr("data-source", "list")
          .attr("data-trailname", trailName)
          .attr("data-trailheadName", trailheadName)
          .attr("data-trailheadid", trailheadID)
          .attr("data-index", i)
          .appendTo("#trailList")
          .click(populateTrailsForTrailheadDiv)
          .click(showTrailDetails);


    // Making a new div for Detail Panel

        function showTrailDetails(e) {
          if (!$('.detailPanelContainer').is(':visible')) {
            decorateDetailPanel(trailName, trailheadName, trailheadSource, trailheadDistance);
            openDetailPanel();
            $(this).addClass('activeTrail');
          } else {
            if ($(this).hasClass('activeTrail')) {
              $(this).removeClass('activeTrail');
              closeDetailPanel();
            } else {
              decorateDetailPanel(trailName, trailheadName, trailheadSource, trailheadDistance);
              $('.activeTrail').removeClass('activeTrail');
              $(this).addClass('activeTrail');
            };
          }
        }

        //  Helper functions for ShowTrailDetails

        function openDetailPanel() {
          $('.detailPanelContainer').show().toggleClass("span0 span4");
          $('.trailMapContainer').toggleClass("span8 span4");
          map.invalidateSize();
        }

        function closeDetailPanel() {
          $('.detailPanelContainer').hide().toggleClass("span0 span4");
          $('.trailMapContainer').toggleClass("span8 span4");
          map.invalidateSize();
        }

        function decorateDetailPanel(trailName, trailheadName, source, trailheadDistance) {
          $('.detail-panel .trailName').html(trailName);
          $('.detail-panel .detailTrailheadName').html(trailheadName);
          $('.detail-panel .detailSource').html(source);
          $('.detail-panel .detailTrailheadDistance').html(trailheadDistance);
        }

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

  // event handler for click of a trail name in a trailhead popup
  // 

  function trailnameClick(e) {
    console.log("trailnameClick");
    console.log(e.target);
    populateTrailsForTrailheadTrailName(e);
    // setCurrentTrail
  }

  // given jquery 

  function parseTrailElementData($element) {
    console.log($element);
    console.log($element.outerHTML());
    //var trailName = $element[0].data("trailname");
    //var trailheadName = $element[0].data("trailheadname");
    var trailheadID = $element.data("trailheadid");
    var highlightedTrailIndex = $element.data("index") || 0;
    results = {
      trailheadID: trailheadID,
      highlightedTrailIndex: highlightedTrailIndex
    };
    console.log(["results", results]);
    return results;
  }

  // event handler for click of trailDiv
  // TODO: (and also supplemental handler for click of trail name?)
  // get the trailName and trailHead that they clicked on
  // highlight the trailhead (showing all of the trails there) and highlight the trail path

  function populateTrailsForTrailheadDiv(e) {
    console.log("populateTrailsForTrailheadDiv");
    var $myTarget;

    // this makes trailname click do the same thing as general div click
    // (almost certainly a better solution exists)
    console.log(["this", this]);
    if (e.target !== this) {
      console.log("this.id");
      $myTarget = $(this);
    } else {
      console.log("e.target.id");
      $myTarget = $(e.target);
    }
    var parsed = parseTrailElementData($myTarget);
    highlightTrailhead(parsed.trailheadID, parsed.highlightedTrailIndex);
  }

  function populateTrailsForTrailheadTrailName(e) {
    var parsed = parseTrailElementData($(e.target));
    highlightTrailhead(parsed.trailheadID, parsed.highlightedTrailIndex);
  }

  // given a trailheadID (TODO: and a trail index within that trailhead?)
  // display the trailhead marker and popup,
  // then call highlightTrailheadDivs() and getAllTrailPathsForTrailhead()
  // with the trailhead record

  var currentTrailheadMarker;

  function highlightTrailhead(trailheadID, highlightedTrailIndex) {
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
    currentTrailheadMarker.addTo(map).bindPopup(currentTrailhead.popupContent);
    highlightTrailheadDivs(currentTrailhead);
    getAllTrailPathsForTrailhead(currentTrailhead, highlightedTrailIndex);
    currentTrailheadMarker.openPopup();
  }

  // given a trailhead (TODO: and a trail index within that trailhead?),
  // find the matching trailDivs, highlight them, and move them onscreen
  // TODO: actually make this work

  function highlightTrailheadDivs(trailhead, highlightedTrailIndex) {
    console.log("highlightTrailheadDivs");
    console.log(currentTrailhead);
    $(".trail-box").removeClass("trail1").removeClass("trail2").removeClass("trail3");
    for (var i = 0; i < currentTrailhead.trails.length; i++) {
      var trailName = currentTrailhead.trails[i];
      console.log(["trailName"], trailName);
      var trailheadName = currentTrailhead.properties.name;
      console.log(["trailheadName", trailheadName]);
      var trailheadID = currentTrailhead.properties.cartodb_id;
      // add class for highlighting
      $('.trail-box[data-trailname="' + trailName + '"][data-trailheadid="' + trailheadID + '"]').addClass("trail" + (i + 1));
      // TODO: make this animate so that the selected trailhead trails are visible in the trailList
      if (i === 0) {
        $('#trailList').animate({
          // scrollTop: scrollTo.offset().top - container.offset().top + container.scrollTop();
          scrollTop: $('.trail-box[data-trailheadid="' + trailheadID + '"][data-index="0"]').offset().top - $("#trailList").offset().top + $("#trailList").scrollTop()
        }, 500);
      }
    }
  }

  // given a trailhead (TODO: and a trail index with that trailhead?),
  // get the paths for any associated trails,
  // then call drawMultiTrailLayer() and setCurrentTrail()

  function getAllTrailPathsForTrailhead(trailhead, highlightedTrailIndex) {
    console.log("getAllTrailPathsForTrailhead");
    var responses = [];
    var queryTaskArray = [];
    // got trailhead.trails, now get the segment collection for all of them
    // get segment collection for each
    // then merge the GeoJSON?
    for (var i = 0; i < trailhead.trails.length; i++) {
      var trailName = trailhead.trails[i];
      var trail_query = "select st_collect(the_geom) the_geom, '" + trailName + "' trailname from " + TRAILSEGMENTS_TABLE + " segments where " +
        "segments.name1 = '" + trailName + "' or " +
        "segments.name2 = '" + trailName + "' or " +
        "segments.name3 = '" + trailName + "' or " +
        "segments.name1 = '" + trailName + " Trail' or " +
        "segments.name2 = '" + trailName + " Trail' or " +
        "segments.name3 = '" + trailName + " Trail'";
      var queryTask = function(trail_query) {
        return function(callback) {
          makeSQLQuery(trail_query, function(response) {
            responses.push(response);
            callback(null, trailName);
          });
        };
      }(trail_query);
      queryTaskArray.push(queryTask);
    }
    async.parallel(queryTaskArray, function(err, results) {
      responses = mergeResponses(responses);
      drawMultiTrailLayer(responses);
      setCurrentTrail(highlightedTrailIndex);
    });
  }

  // merge multiple geoJSON trail features into one geoJSON FeatureCollection

  function mergeResponses(responses) {
    console.log("mergeResponses");
    var combined = responses[0];
    combined.features[0].properties.order = 0;
    for (var i = 1; i < responses.length; i++) {
      combined.features = combined.features.concat(responses[i].features);
      combined.features[i].properties.order = i;
    }
    return combined;
  }

  // get all trail segment paths
  // (for diagnostics)

  function getAllTrailPaths(callback) {
    var trail_query = "select the_geom, name1, name2, name3 from " + TRAILSEGMENTS_TABLE;
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
      console.log(element.properties);
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
  // draw them all on the map in a single layer we can remove later

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
            color: color
          };
        } else if (feature.properties.order === 1) {
          color = getClassBackgroundColor("trail2");
          return {
            weight: 3,
            color: color
          };
        } else if (feature.properties.order === 2) {
          color = getClassBackgroundColor("trail3");
          return {
            weight: 3,
            color: color
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
    zoomToLayer(currentMultiTrailLayer);
  }

  // return the default CSS background-color for the class given

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
  }

  // given a leaflet layer, zoom to fit its bounding box or to MAX_ZOOM,
  // whichever is smaller

  function zoomToLayer(layer) {
    console.log("zoomToLayer");
    console.log(layer);
    // figure out what zoom is required to display the entire trail layer
    var curZoom = map.getBoundsZoom(layer.getBounds());
    // zoom out to MAX_ZOOM if that's more than MAX_ZOOM
    var newZoom = curZoom > MAX_ZOOM ? MAX_ZOOM : curZoom;
    // set the view to that zoom, and the center of the trail's bounding box 
    map.setView(layer.getBounds().getCenter(), newZoom, {
      pan: {
        animate: true
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
