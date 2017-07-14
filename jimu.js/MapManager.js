///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/html',
  'dojo/topic',
  'dojo/on',
  // 'dojo/aspect',
  'dojo/keys',
  // 'dojo/Deferred',
  // 'esri/dijit/InfoWindow',
  // "esri/dijit/PopupMobile",
  // 'esri/InfoTemplate',
  'esri/geometry/Extent',
  'esri/geometry/Point',
  './utils',

  './dijit/LoadingShelter',
  // 'jimu/LayerInfos/LayerInfos',
  // './MapUrlParamsHandler',
  './AppStateManager',
  './WebSceneLoader',
  'esri/Viewpoint',
    'esri/Map',
    "esri/geometry/SpatialReference",
    "esri/layers/WebTileLayer",
    "esri/config",
    "esri/layers/support/TileInfo",
    "esri/views/SceneView"
], function(declare, lang, array, html, topic, on,/* aspect,*/ keys,/* Deferred, InfoWindow,
  PopupMobile, InfoTemplate,*/ Extent, Point, jimuUtils, LoadingShelter, /*LayerInfos,
  MapUrlParamsHandler,*/ AppStateManager, WebSceneLoader, Viewpoint,
            Map,SpatialReference,WebTileLayer,esriConfig,TileInfo, SceneView) {

  var instance = null,
    clazz = declare(null, {
      appConfig: null,
      mapDivId: '',
      map: null,
      previousInfoWindow: null,
      mobileInfoWindow: null,
      isMobileInfoWindow: false,

      layerInfosObj: null,

      constructor: function( /*Object*/ options, mapDivId) {
        this.appConfig = options.appConfig;
        this.urlParams = options.urlParams;
        this.mapDivId = mapDivId;
        this.id = mapDivId;
        this.appStateManager = AppStateManager.getInstance(this.urlParams);
        topic.subscribe("appConfigChanged", lang.hitch(this, this.onAppConfigChanged));
        topic.subscribe("changeMapPosition", lang.hitch(this, this.onChangeMapPosition));
        // topic.subscribe("syncExtent", lang.hitch(this, this.onSyncExtent));
        topic.subscribe("syncViewpoint", lang.hitch(this, this.onSyncViewpoint));

        on(window, 'resize', lang.hitch(this, this.onWindowResize));
        on(window, 'beforeunload', lang.hitch(this, this.onBeforeUnload));
      },

      showMap: function() {
        // console.timeEnd('before map');
        this._showMap(this.appConfig);
      },

      _showMap: function(appConfig) {
        // console.timeEnd('before map');
        console.time('Load Map');
        this.loading = new LoadingShelter();
        this.loading.placeAt(this.mapDivId);
        this.loading.startup();
        //for now, we can't create both 2d and 3d map
        if (appConfig.map['3D']) {
          if (appConfig.map.itemId) {
            this._show3DWebScene(appConfig);
          } else {
              this._show3DLayersMap(appConfig);//Portal修改
            //console.log('No webscene found. Please set map.itemId in config.json.');
          }
        } else {
          if (appConfig.map.itemId) {
            this._show2DWebMap(appConfig);
          } else {
              this._show2DLayersMap(appConfig);//Portal修改
            //console.log('No webmap found. Please set map.itemId in config.json.');
          }
        }
      },

      onBeforeUnload: function() {
        this.appStateManager.saveWabAppState(this.map, this.layerInfosObj);
      },

      onWindowResize: function() {
        if (this.map && this.map.resize) {
          this.map.resize();
          this.resetInfoWindow(false);
        }
      },

      getMapInfoWindow: function(){
        return {
          mobile: this._mapMobileInfoWindow,
          bigScreen: this._mapInfoWindow
        };
      },

      resetInfoWindow: function(isNewMap) {
        if(isNewMap){
          this._mapInfoWindow = this.map.infoWindow;
          if(this._mapMobileInfoWindow){
            this._mapMobileInfoWindow.destroy();
          }
          // this._mapMobileInfoWindow =
          // new PopupMobile(null, html.create("div", null, null, this.map.root));
          this.isMobileInfoWindow = false;
        }
        if (window.appInfo.isRunInMobile && !this.isMobileInfoWindow) {
          // this.map.infoWindow.hide();
          // this.map.setInfoWindow(this._mapMobileInfoWindow);
          this.isMobileInfoWindow = true;
        } else if (!window.appInfo.isRunInMobile && this.isMobileInfoWindow) {
          // this.map.infoWindow.hide();
          // this.map.setInfoWindow(this._mapInfoWindow);
          this.isMobileInfoWindow = false;
        }
      },

      onChangeMapPosition: function(position) {
        var pos = lang.clone(this.mapPosition);
        lang.mixin(pos, position);
        this.setMapPosition(pos);
      },

      setMapPosition: function(position){
        this.mapPosition = position;

        var posStyle = jimuUtils.getPositionStyle(position);
        html.setStyle(this.mapDivId, posStyle);
        if (this.map && this.map.resize) {
          this.map.resize();
        }
      },

      getMapPosition: function(){
        return this.mapPosition;
      },

      // onSyncExtent: function(map){
      //   //we should sync viewpoint here
      //   if(this.map){
      //     var extJson = map.extent;
      //     var ext = new Extent(extJson);
      //     this.map.setExtent(ext);
      //   }
      // },

      onSyncViewpoint: function(viewpoint){
        if(this.sceneView){
          this.sceneView.viewpoint = viewpoint.clone();
        }
      },

      _visitConfigMapLayers: function(appConfig, cb) {
        array.forEach(appConfig.map.basemaps, function(layerConfig, i) {
          layerConfig.isOperationalLayer = false;
          cb(layerConfig, i);
        }, this);

        array.forEach(appConfig.map.operationallayers, function(layerConfig, i) {
          layerConfig.isOperationalLayer = true;
          cb(layerConfig, i);
        }, this);
      },

      _destroySceneView: function(){
        if(this.sceneView){
          // If we destroy map, we will can't switch web scene.
          // var map = this.sceneView.map;
          // if(map){
          //   map.destroy();
          // }
          try{
            this.sceneView.destroy();
          }catch(e){
            console.error(e);
          }
        }
        this.sceneView = null;
        window._sceneView = null;
      },

      _show3DWebScene: function(appConfig) {
        var portalUrl = appConfig.map.portalUrl;
        var itemId = appConfig.map.itemId;
        this._destroySceneView();
        var def = WebSceneLoader.createMap(this.mapDivId, portalUrl, itemId);

        def.then(lang.hitch(this, function(sceneView){
          // this._publishMapEvent(map);
          this._publishSceneViewEvent(sceneView);
          if(appConfig.map.mapOptions){
            var initialState = appConfig.map.mapOptions.initialState;
            if(initialState && initialState.viewpoint){
              try{
                var vp = Viewpoint.fromJSON(initialState.viewpoint);
                if(vp){
                  this.sceneView.map.initialViewProperties.viewpoint = vp;
                  this.sceneView.viewpoint = vp.clone();
                }
              }catch(e){
                console.error(e);
              }
            }
          }
        }), lang.hitch(this, function(){
          if (this.loading) {
            this.loading.destroy();
          }
          topic.publish('mapCreatedFailed');
        }));
      },

      // _publishMapEvent: function(map) {
      //   //add this property for debug purpose
      //   window._viewerMap = map;
      //   if (this.loading) {
      //     this.loading.destroy();
      //   }

      //   MapUrlParamsHandler.postProcessUrlParams(this.urlParams, map);

      //   console.timeEnd('Load Map');
      //   if (this.map) {
      //     this.map = map;
      //     this.resetInfoWindow(true);
      //     console.log('map changed.');
      //     topic.publish('mapChanged', this.map);
      //   } else {
      //     this.map = map;
      //     this.resetInfoWindow(true);
      //     topic.publish('mapLoaded', this.map);
      //   }
      // },

      _publishSceneViewEvent: function(sceneView){
        window._sceneView = sceneView;

        console.timeEnd('Load Map');

        if(this.loading){
          this.loading.destroy();
        }

        if(this.sceneView){
          this.sceneView = sceneView;
          //this.resetInfoWindow(true);
          console.log("sceneView changed");
          topic.publish('sceneViewChanged', this.sceneView);
        }else{
          this.sceneView = sceneView;
          //this.resetInfoWindow(true);
          console.log("sceneView loaded");
          topic.publish('sceneViewLoaded', this.sceneView);
        }
      },

      _show2DWebMap: function(appConfig) {
        //should use appConfig instead of this.appConfig, because appConfig is new.
        // if (appConfig.portalUrl) {
        //   var url = portalUrlUtils.getStandardPortalUrl(appConfig.portalUrl);
        //   agolUtils.arcgisUrl = url + "/sharing/content/items/";
        // }
        if(!appConfig.map.mapOptions){
          appConfig.map.mapOptions = {};
        }
        var mapOptions = this._processMapOptions(appConfig.map.mapOptions) || {};
        mapOptions.isZoomSlider = false;

        var webMapPortalUrl = appConfig.map.portalUrl;
        var webMapItemId = appConfig.map.itemId;
        var webMapOptions = {
          mapOptions: mapOptions,
          bingMapsKey: appConfig.bingMapsKey,
          usePopupManager: true
        };

        var mapDeferred = jimuUtils.createWebMap(webMapPortalUrl, webMapItemId,
          this.mapDivId, webMapOptions);

        mapDeferred.then(lang.hitch(this, function(response) {
          var map = response.map;

          //hide the default zoom slider
          map.hideZoomSlider();

          // set default size of infoWindow.
          map.infoWindow.resize(270, 316);
          //var extent;
          map.itemId = appConfig.map.itemId;
          map.itemInfo = response.itemInfo;
          map.webMapResponse = response;
          // enable snapping
          var options = {
            snapKey: keys.copyKey
          };
          map.enableSnapping(options);

          html.setStyle(map.root, 'zIndex', 0);

          map._initialExtent = map.extent;

          //URL parameters that affect map extent
          var urlKeys = ['extent', 'center', 'marker', 'find', 'query', 'scale', 'level'];
          var useAppState = true;
          array.forEach(urlKeys, function(k){
            if(k in this.urlParams){
              useAppState = false;
            }
          }, this);

          // if(useAppState){
          //   this._applyAppState(map).then(lang.hitch(this, function() {
          //     this._publishMapEvent(map);
          //   }));
          // }else{
          //   this._publishMapEvent(map);
          // }

          this._publishMapEvent(map);
        }), lang.hitch(this, function() {
          if (this.loading) {
            this.loading.destroy();
          }
          topic.publish('mapCreatedFailed');
        }));
      },

      // _applyAppState: function(map) {
      //   var def = new Deferred();

      //   this.appStateManager.getWabAppState()
      //   .then(lang.hitch(this, function(stateData) {
      //     var layerOptions = stateData.layers;
      //     LayerInfos.getInstance(map, map.itemInfo, {
      //       layerOptions: layerOptions || null
      //     }).then(lang.hitch(this, function(layerInfosObj) {
      //       this.layerInfosObj = layerInfosObj;
      //       if (stateData.extent) {
      //         return map.setExtent(stateData.extent);
      //       }
      //     })).always(function() {
      //       def.resolve();
      //     });
      //   }));

      //   return def;
      // },

      _processMapOptions: function(mapOptions) {
        if (!mapOptions) {
          return;
        }

        if(!mapOptions.lods){
          delete mapOptions.lods;
        }
        if(mapOptions.lods && mapOptions.lods.length === 0){
          delete mapOptions.lods;
        }

        var ret = lang.clone(mapOptions);
        if (ret.extent) {
          ret.extent = new Extent(ret.extent);
        }
        if (ret.center && !lang.isArrayLike(ret.center)) {
          ret.center = new Point(ret.center);
        }
        // if (ret.infoWindow) {
        //   ret.infoWindow = new InfoWindow(ret.infoWindow, html.create('div', {}, this.mapDivId));
        // }

        return ret;
      },

      onAppConfigChanged: function(appConfig, reason, changedJson) {
        // jshint unused:false
        this.appConfig = appConfig;
        if(reason === 'mapChange'){
          this._recreateMap(appConfig);
        }
        else if(reason === 'mapOptionsChange'){
          if(changedJson.initialState){
            var vp = changedJson.initialState.viewpoint;
            if(vp){
              //update initial viewpoint
              this.sceneView.map.initialViewProperties.viewpoint = Viewpoint.fromJSON(vp);
              //update current viewpoint
              this.sceneView.animateTo(Viewpoint.fromJSON(vp));
            }
          }
        }
      },

      _recreateMap: function(appConfig){
        if(this.sceneView){
          // topic.publish('beforeMapDestory', this.map);
          //this.map.destroy();
          topic.publish('beforeSceneViewDestory', this.sceneView);
          this._destroySceneView();
        }
        this._showMap(appConfig);
      },

      disableWebMapPopup: function() {
        // this.map.setInfoWindowOnClick(false);
      },

      enableWebMapPopup: function() {
        // this.map.setInfoWindowOnClick(true);
      },

        //Portal修改----------------------------------------------------------------------------------------------------
        _show3DLayersMap: function(appConfig) {
            this._destroySceneView();
            var map = new Map({
                basemap: "streets",//satellite
                ground: "world-elevation"
            });
            var operationalLayers=this.appConfig.map.operationallayers;
            var baseMapLayers=this.appConfig.map.basemaps;
            var itemInfo={
                item:{thumbnail:null},
                itemData :{
                    baseMap:{
                        title: "地图服务",
                        baseMapLayers:baseMapLayers
                    },
                    operationalLayers:operationalLayers
                }
            };
            map.itemInfo=itemInfo;
            map.id = this.mapDivId;
            var sceneView = new SceneView({
                container: this.mapDivId,
                map: map,
                viewpoint: {
                    center: [116, 39],
                    scale: 2000,
                    heading: 35,
                    tilt: 60
                }
                //,
                //camera: new Camera({
                //  position: new Point({
                //    x: -0.17746710975334712,
                //    y: 51.44543992422466,
                //    z: 1266.7049653716385
                //  }),
                //  heading: 0.34445102566290225,
                //  tilt: 82.95536300536367
                //})
            });
            // this._publishMapEvent(map);
            this._publishSceneViewEvent(sceneView);
            if(appConfig.map.mapOptions){
                var initialState = appConfig.map.mapOptions.initialState;
                if(initialState && initialState.viewpoint){
                    try{
                        var vp = Viewpoint.fromJSON(initialState.viewpoint);
                        if(vp){
                            //this.sceneView.map.initialViewProperties.viewpoint = vp;
                            this.sceneView.mapViewpoint = vp;
                            this.sceneView.viewpoint = vp.clone();
                        }
                    }catch(e){
                        console.error(e);
                    }
                }
            }

            this._visitConfigMapLayers(appConfig, lang.hitch(this, function(layerConfig) {
                this.createLayer(map, '3D', layerConfig);
            }));
        },
        _show2DLayersMap: function(appConfig) {
            /*require(['esri/Map'], lang.hitch(this, function(Map) {
             var map = new Map();
             map.id = this.mapDivId;
             //创建二维场景
             new MapView({
             container: this.mapDivId,
             map: map,
             viewpoint: {
             zoom: 3,
             center: [0, 45]
             }
             });

             this._visitConfigMapLayers(appConfig, lang.hitch(this, function(layerConfig) {
             this.createLayer(map, '2D', layerConfig);
             }));
             this._publishMapEvent(map);

             }));*/
        },
        createLayer: function(map, maptype, layerConfig) {
            var layMap = {
                '2D_tiled': 'esri/layers/ArcGISTiledLayer',
                '2D_dynamic': 'esri/layers/ArcGISDynamicLayer',
                '2D_image': 'esri/layers/ArcGISImageLayer',
                '2D_feature': 'esri/layers/FeatureLayer',
                '2D_rss': 'esri/layers/GeoRSSLayer',
                '2D_kml': 'esri/layers/KMLLayer',
                '2D_webTiled': 'esri/layers/WebTiledLayer',
                '2D_wms': 'esri/layers/WMSLayer',
                '2D_wmts': 'esri/layers/WMTSLayer',
                '2D_googlemap': 'GoogleLayer',
                '2D_googleimage': 'GoogleLayer',
                '2D_googletrain': 'GoogleLayer',
                '2D_tianditumap': 'TianDiTuLayer',
                '2D_tiandituimage': 'TianDiTuLayer',
                '2D_tianditutrain': 'TianDiTuLayer',
                '3D_tiled': 'esri/layers/TileLayer',
                '3D_dynamic': 'esri/layers/MapImageLayer',
                '3D_image': 'esri/layers/ImageryLayer',
                '3D_feature': 'esri/layers/FeatureLayer',
                '3D_elevation': 'esri/layers/ElevationLayer',
                '3D_3dmodle': 'esri/layers/SceneLayer'
            };

            var layer;
            if (layerConfig.type == "googlemap" || layerConfig.type == "googleimage" || layerConfig.type == "googletrain") {
                esriConfig.request.corsEnabledServers.push("mt1.google.cn", "mt2.google.cn", "mt3.google.cn","mt4.google.cn","a4.petrochina");
                var tileInfo=new TileInfo({
                    "dpi": "90.71428571427429",
                    "format": "png",
                    "spatialReference":new SpatialReference(102100),
                    "origin": {
                        "x": -20037508.342787,
                        "y": 20037508.342787
                    },
                    // Scales in DPI 96
                    "lods": [{
                        "level": 0, "scale": 591657527.591555, "resolution": 156543.033928
                    }, {
                        "level": 1, "scale": 295828763.795777, "resolution": 78271.5169639999
                    }, {
                        "level": 2, "scale": 147914381.897889, "resolution": 39135.7584820001
                    }, {
                        "level": 3, "scale": 73957190.948944, "resolution": 19567.8792409999
                    }, {
                        "level": 4, "scale": 36978595.474472, "resolution": 9783.93962049996
                    }, {
                        "level": 5, "scale": 18489297.737236, "resolution": 4891.96981024998
                    }, {
                        "level": 6, "scale": 9244648.868618, "resolution": 2445.98490512499
                    }, {
                        "level": 7, "scale": 4622324.434309, "resolution": 1222.99245256249
                    }, {
                        "level": 8, "scale": 2311162.217155, "resolution": 611.49622628138
                    }, {
                        "level": 9, "scale": 1155581.108577, "resolution": 305.748113140558
                    }, {
                        "level": 10, "scale": 577790.554289, "resolution": 152.874056570411
                    }, {
                        "level": 11, "scale": 288895.277144, "resolution": 76.4370282850732
                    }, {
                        "level": 12, "scale": 144447.638572, "resolution": 38.2185141425366
                    }, {
                        "level": 13, "scale": 72223.819286, "resolution": 19.1092570712683
                    }, {
                        "level": 14, "scale": 36111.909643, "resolution": 9.55462853563415
                    }, {
                        "level": 15, "scale": 18055.954822, "resolution": 4.77731426794937
                    }, {
                        "level": 16, "scale": 9027.977411, "resolution": 2.38865713397468
                    }, {
                        "level": 17, "scale": 4513.988705, "resolution": 1.19432856685505
                    }, {
                        "level": 18, "scale": 2256.994353, "resolution": 0.597164283559817
                    }, {
                        "level": 19, "scale": 1128.497176, "resolution": 0.298582141647617
                    }]
                });
                if (layerConfig.type == "googlemap")
                {
                    layer = new WebTileLayer({
                        urlTemplate: "http://mt{subDomain}.google.cn/vt/lyrs=m@275000000&hl=zh-CN&gl=CN&src=app&expIds=201527&rlbl=1&x={col}&y={row}&z={level}&s=Gali",
                        subDomains: ["1", "2", "3"],
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label;
                    layer.title = layerConfig.label;
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                }else if (layerConfig.type == "googleimage")
                {
                    layer = new WebTileLayer({
                        urlTemplate: "http://mt{subDomain}.google.cn/vt/lyrs=s&hl=en&gl=en&x={col}&y={row}&z={level}&s=Gali",
                        subDomains: ["1", "2", "3"],
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label;
                    layer.title = layerConfig.label;
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                    layer = new WebTileLayer({
                        urlTemplate: "http://mt{subDomain}.google.cn/vt/imgtp=png32&lyrs=h@275000000&hl=zh-CN&gl=CN&src=app&expIds=201527&rlbl=1&x={col}&y={row}&z={level}&s=Gali",
                        subDomains: ["1", "2", "3"],
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label+"注记";
                    layer.title = layerConfig.label+"注记";
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                }else if (layerConfig.type == "googletrain")
                {
                    layer = new WebTileLayer({
                        urlTemplate: "http://mt{subDomain}.google.cn/vt/lyrs=t@275000000&hl=zh-CN&gl=CN&src=app&expIds=201527&rlbl=1&x={col}&y={row}&z={level}&s=Gali",
                        subDomains: ["1", "2", "3"],
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label;
                    layer.title = layerConfig.label;
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                    layer = new WebTileLayer({
                        urlTemplate: "http://mt{subDomain}.google.cn/vt/imgtp=png32&lyrs=h@275000000&hl=zh-CN&gl=CN&src=app&expIds=201527&rlbl=1&x={col}&y={row}&z={level}&s=Gali",
                        subDomains: ["1", "2", "3"],
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label+"注记";
                    layer.title = layerConfig.label+"注记";
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                }
            }
            else if(layerConfig.type == "tianditumap" || layerConfig.type == "tiandituimage" || layerConfig.type == "tianditutrain")
            {
                esriConfig.request.corsEnabledServers.push("t0.tianditu.cn", "t1.tianditu.cn", "t2.tianditu.cn","t3.tianditu.cn",
                    "t4.tianditu.cn", "t5.tianditu.cn", "t6.tianditu.cn", "t7.tianditu.cn");
                var tileInfo=new TileInfo({
                    "dpi": "90.71428571427429",
                    "format": "png",
                    "spatialReference": new SpatialReference(4326),
                    "origin": {
                        "x": -180,
                        "y": 90
                    },
                    // Scales in DPI 96
                    "lods": [
                        {
                            "level": 0, "scale": 2.95498e+008, "resolution": 0.703125
                        }, {
                            "level": 1, "scale": 1.47749e+008, "resolution": 0.351563
                        }, {
                            "level": 2, "scale": 7.38744e+007, "resolution": 0.175781
                        }, {
                            "level": 3, "scale": 3.69372e+007, "resolution": 0.0878906
                        }, {
                            "level": 4, "scale": 1.84686e+007, "resolution": 0.0439453
                        }, {
                            "level": 5, "scale": 9.2343e+006, "resolution": 0.0219727
                        }, {
                            "level": 6, "scale": 4.61715e+006, "resolution": 0.0109863
                        }, {
                            "level": 7, "scale": 2.30857e+006, "resolution": 0.00549316
                        }, {
                            "level": 8, "scale": 1.15429e+006, "resolution": 0.00274658
                        }, {
                            "level": 9, "scale": 577144, "resolution": 0.00137329
                        }, {
                            "level": 10, "scale": 288572, "resolution": 0.000686646
                        }, {
                            "level": 11, "scale": 144286, "resolution": 0.000343323
                        }, {
                            "level": 12, "scale": 72143, "resolution": 0.000171661
                        }, {
                            "level": 13, "scale": 36071.5, "resolution": 8.58307e-005
                        }, {
                            "level": 14, "scale": 18035.7, "resolution": 4.29153e-005
                        }, {
                            "level": 15, "scale": 9017.87, "resolution": 2.14577e-005
                        }, {
                            "level": 16, "scale": 4508.9, "resolution": 1.07289e-005
                        }, {
                            "level": 17, "scale": 2254.47, "resolution": 5.36445e-006
                        }]
                });
                if (layerConfig.type == "tianditumap")
                {
                    layer = new WebTileLayer({
                        urlTemplate: "http://{subDomain}.tianditu.cn/vec_c/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=c&FORMAT=tiles&TILEMATRIX={level+1}&TILECOL={col}&TILEROW={row}",
                        subDomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6"],
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label;
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                    layer = new WebTileLayer({
                        urlTemplate: "http://{subDomain}.tianditu.cn/cva_c/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=c&FORMAT=tiles&TILEMATRIX={level+1}&TILECOL={col}&TILEROW={row}",
                        subDomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6"],
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label+"注记";
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                } else if (layerConfig.type == "tiandituimage")
                {
                    layer = new WebTileLayer({
                        urlTemplate: "http://{subDomain}.tianditu.cn/img_c/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=c&FORMAT=tiles&TILEMATRIX={level+1}&TILECOL={col}&TILEROW={row}",
                        subDomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6"],
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label;
                    ///layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                    layer = new WebTileLayer({
                        urlTemplate: "http://{subDomain}.tianditu.cn/cia_c/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=c&FORMAT=tiles&TILEMATRIX={level+1}&TILECOL={col}&TILEROW={row}",
                        subDomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6"],
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label+"注记";
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                }else if (layerConfig.type == "tianditutrain")
                {
                    layer = new WebTileLayer({
                        urlTemplate: "http://{subDomain}.tianditu.cn/ter_c/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ter&STYLE=default&TILEMATRIXSET=c&FORMAT=tiles&TILEMATRIX={level+1}&TILECOL={col}&TILEROW={row}",
                        subDomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6"],
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label;
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                    layer = new WebTileLayer({
                        urlTemplate: "http://{subDomain}.tianditu.cn/cta_c/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cta&STYLE=default&TILEMATRIXSET=c&FORMAT=tiles&TILEMATRIX={level+1}&TILECOL={col}&TILEROW={row}",
                        subDomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6"],
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label+"注记";
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                }
            }
            else if (layerConfig.type == "a4map" || layerConfig.type == "a4image" || layerConfig.type == "a4train") {
                esriConfig.request.corsEnabledServers.push("a4.petrochina");
                var tileInfo=new TileInfo({
                    "dpi": "96",
                    "format": "png",
                    "spatialReference":new SpatialReference(102100),
                    "origin": {
                        "x": -20037508.342787,
                        "y": 20037508.342787
                    },
                    // Scales in DPI 96
                    "lods": [
                        {"level":0,"resolution":156543.03392800014,"scale":5.91657527591555E8},
                        {"level":1,"resolution":78271.51696399994,"scale":2.95828763795777E8},
                        {"level":2,"resolution":39135.75848200009,"scale":1.47914381897889E8},
                        {
                            "level": 3,
                            "resolution": 19567.87924099992,
                            "scale": 73957190.948944
                        },
                        {
                            "level": 4,
                            "resolution": 9783.93962049996,
                            "scale": 36978595.474472
                        },
                        {
                            "level": 5,
                            "resolution": 4891.96981024998,
                            "scale": 18489297.737236
                        },
                        {
                            "level": 6,
                            "resolution": 2445.98490512499,
                            "scale": 9244648.868618
                        },
                        {
                            "level": 7,
                            "resolution": 1222.992452562495,
                            "scale": 4622324.434309
                        },
                        {
                            "level": 8,
                            "resolution": 611.4962262813797,
                            "scale": 2311162.217155
                        },
                        {
                            "level": 9,
                            "resolution": 305.74811314055756,
                            "scale": 1155581.108577
                        },
                        {
                            "level": 10,
                            "resolution": 152.87405657041106,
                            "scale": 577790.554289
                        },
                        {
                            "level": 11,
                            "resolution": 76.43702828507324,
                            "scale": 288895.277144
                        },
                        {
                            "level": 12,
                            "resolution": 38.21851414253662,
                            "scale": 144447.638572
                        },
                        {
                            "level": 13,
                            "resolution": 19.10925707126831,
                            "scale": 72223.819286
                        },
                        {
                            "level": 14,
                            "resolution": 9.554628535634155,
                            "scale": 36111.909643
                        },
                        {
                            "level": 15,
                            "resolution": 4.77731426794937,
                            "scale": 18055.954822
                        },
                        {
                            "level": 16,
                            "resolution": 2.388657133974685,
                            "scale": 9027.977411
                        },
                        {
                            "level": 17,
                            "resolution": 1.1943285668550503,
                            "scale": 4513.988705
                        },
                        {
                            "level": 18,
                            "resolution": 0.5971642835598172,
                            "scale": 2256.994353
                        }
                    ]
                });
                if (layerConfig.type == "a4map")
                {
                    layer = new WebTileLayer({
                        urlTemplate: "http://a4.petrochina/A4Service/TileService.ashx?Type=TDTVEC&l={level}&r={row}&c={col}",
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label;
                    layer.title = layerConfig.label;
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                    layer = new WebTileLayer({
                        urlTemplate: "http://a4.petrochina/A4Service/TileService.ashx?Type=TDTCVA&l={level}&r={row}&c={col}",
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label+"注记";
                    layer.title = layerConfig.label+"注记";
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                }else if (layerConfig.type == "a4image")
                {
                    layer = new WebTileLayer({
                        urlTemplate: "http://a4.petrochina/A4Service/TileService.ashx?Type=TDTIMG&l={level}&r={row}&c={col}",
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label;
                    layer.title = layerConfig.label;
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                    layer = new WebTileLayer({
                        urlTemplate: "http://a4.petrochina/A4Service/TileService.ashx?Type=TDTCIA&l={level}&r={row}&c={col}",
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label+"注记";
                    layer.title = layerConfig.label+"注记";
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                }else if (layerConfig.type == "a4train")
                {
                    layer = new WebTileLayer({
                        urlTemplate: "http://a4.petrochina/A4Service/TileService.ashx?Type=TDTTER&l={level}&r={row}&c={col}",
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label;
                    layer.title = layerConfig.label;
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                    layer = new WebTileLayer({
                        urlTemplate: "http://a4.petrochina/A4Service/TileService.ashx?Type=TDTCTA&l={level}&r={row}&c={col}",
                        tileInfo : tileInfo
                    });
                    layer.id = layerConfig.label+"注记";
                    layer.title = layerConfig.label+"注记";
                    //layer.type = layerConfig.type;
                    layer.visible = layerConfig.visible;
                    map.add(layer);
                }
            }
            else {
                require([layMap[maptype + '_' + layerConfig.type]], lang.hitch(this, function(layerClass) {
                    var layer, infoTemplate, options = {},
                        keyProperties = ['label', 'url', 'type', 'icon', 'infoTemplate', 'isOperationalLayer'];
                    for (var p in layerConfig) {
                        if (keyProperties.indexOf(p) < 0) {
                            options[p] = layerConfig[p];
                        }
                    }
                    if (layerConfig.infoTemplate) {
                        infoTemplate = new InfoTemplate(layerConfig.infoTemplate.title,
                            layerConfig.infoTemplate.content);
                        options.infoTemplate = infoTemplate;

                        layer = new layerClass(layerConfig.url, options);

                        if (layerConfig.infoTemplate.width && layerConfig.infoTemplate.height) {
                            aspect.after(layer, 'onClick', lang.hitch(this, function() {
                                map.infoWindow.resize(layerConfig.infoTemplate.width,
                                    layerConfig.infoTemplate.height);
                            }), true);
                        }
                    } else {
                        layer = new layerClass(layerConfig.url, options);
                    }

                    layer.isOperationalLayer = layerConfig.isOperationalLayer;
                    layer.title = layerConfig.label;
                    layer.icon = layerConfig.icon;
                    layer.id = layerConfig.label;
                    //过滤显示
                    if(layerConfig.type=="dynamic"){
                        var subLayers=layerConfig.subLayers;
                        /*if(subLayers){
                            var subLayersArr=subLayers.split(",");
                            var layerDefinitions = [];
                            var unitID=this.urlParams.unitId?this.urlParams.unitId:"";
                            for(var i=subLayersArr.length-1;i>=0;i--){//注意：过滤图层时图层号需从大到小
                                layerDefinitions.push({
                                    id: Number(subLayersArr[i]),
                                    //title:subLayersArr[i],//API不完善，需自己加title，LayerList获取不到且有BUG
                                    definitionExpression: "UNITID like '"+unitID+"%'"});
                            }
                            layer.sublayers=layerDefinitions;
                        }*/
                    }

                    if(layerConfig.type=="elevation"){
                        map.ground.layers.add(layer);
                    }else{
                        map.add(layer);
                    }
                }));
            }
        },
        //--------------------------------------------------------------------------------------------------------------
    });

  clazz.getInstance = function(options, mapDivId) {
    if (instance === null) {
      instance = new clazz(options, mapDivId);
    }
    return instance;
  };

  return clazz;
});