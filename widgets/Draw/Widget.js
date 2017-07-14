define([
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/_base/array',
        'dojo/_base/html',
        'jimu/BaseWidget',
        'dojo/on',
        'dojo/aspect',
        'dojo/string',
        'esri/geometry/SpatialReference',
        "esri/layers/GraphicsLayer",
        "esri/Graphic",
        "esri/geometry/Point",
        "esri/geometry/Polyline",
        "esri/geometry/Polygon",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleFillSymbol",
        "dojo/throttle"
    ],
    function (declare, lang, array, html, BaseWidget, on, aspect, string,
              SpatialReference, GraphicsLayer,
              Graphic, Point, Polyline, Polygon,
              SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, throttle) {
        return declare([BaseWidget], {
            //these two properties is defined in the BaseWidget
            baseClass: 'jimu-widget-Draw',
            name: 'Draw',
            drawType: "Point",
            lastPt: null,
            pts: [],

            startup: function () {
                this.inherited(arguments);

                this.drawLayer = new GraphicsLayer();
                this.sceneView.map.add(this.drawLayer);
            },

            onOpen: function () {

            },

            onClose: function () {
                this.removeMapEvent();
                this.sceneView.graphics.removeAll();
                this.drawLayer.removeAll();
            },

            onMinimize: function () {

            },

            onMaximize: function () {

            },

            resize: function () {

            },

            destroy: function () {

            },

            onMouseMove: function (evt) {
                var X = evt.pageX;
                var Y = evt.pageY;

                this.sceneView.hitTest(X, Y).then(lang.hitch(this, function (response) {
                    var position = response.results[0];
                    if (typeof position !== "undefined" && position.mapPoint !== null && position.mapPoint.latitude !== null && position.mapPoint.longitude !== null) {
                        console.log("X:" + position.mapPoint.longitude.toFixed(5) + ",Y:" + position.mapPoint.latitude.toFixed(5));

                        if(this.drawType == "Polyline"&&this.pts.length>0){
                            var pts = lang.clone(this.pts);

                            pts.push([position.mapPoint.longitude,position.mapPoint.latitude]);

                            var polyline =  new Polyline({ paths: pts });

                            var lineSymbol = new SimpleLineSymbol({
                                color: [226, 119, 40],
                                width: 4
                            });

                            this.line = new Graphic({
                                geometry: polyline,
                                symbol: lineSymbol,
                                attributes: {}
                            });
                            this.sceneView.graphics.removeAll();
                            this.sceneView.graphics.add(this.line);
                        }else if(this.drawType == "Polygon"&&this.pts.length>0){
                            var pts = lang.clone(this.pts);
                            if(pts.length<3){
                                pts.push([position.mapPoint.longitude,position.mapPoint.latitude]);
                                var polyline =  new Polyline({ paths: pts });

                                var lineSymbol = new SimpleLineSymbol({
                                    color: [226, 119, 40],
                                    width: 4
                                });

                                this.line = new Graphic({
                                    geometry: polyline,
                                    symbol: lineSymbol,
                                    attributes: {}
                                });
                                this.sceneView.graphics.removeAll();
                                this.sceneView.graphics.add(this.line);
                            }else{
                                pts.push([position.mapPoint.longitude,position.mapPoint.latitude]);
                                var polygon =  new Polygon(pts);

                                var fillSymbol = new SimpleFillSymbol({
                                    color: [227, 139, 79, 0.8],
                                    outline: { // autocasts as new SimpleLineSymbol()
                                        color: [255, 255, 255],
                                        width: 1
                                    }
                                });

                                this.polygonGraphic = new Graphic({
                                    geometry: polygon,
                                    symbol: fillSymbol
                                });
                                this.sceneView.graphics.removeAll();
                                this.sceneView.graphics.add(this.polygonGraphic);
                            }
                        }

                    } else {

                    }

                }));
            },

            onMapDBClick: function (evt) {
                if (this.drawType == "Polyline"){
                    this.drawLayer.add(this.line);
                }else if (this.drawType == "Polygon") {
                    this.drawLayer.add(this.polygonGraphic);
                }
                this.sceneView.graphics.removeAll();
                this.pts.splice(0,this.pts.length);
                this.removeMapEvent();
            },

            onMapClick: function (evt) {
                var pt = evt.mapPoint;

                if (this.drawType == "Point") {
                    var markerSymbol = new SimpleMarkerSymbol({
                        color: [226, 119, 40],
                        outline: new SimpleLineSymbol({
                            color: [255, 255, 255],
                            width: 2
                        })
                    });

                    //Create a graphic and add the geometry and symbol to it
                    var pointGraphic = new Graphic({
                        geometry: pt,
                        symbol: markerSymbol
                    });

                    this.drawLayer.add(pointGraphic);
                    this.removeMapEvent();
                } else if (this.drawType == "Polyline") {
                    this.lastPt = pt;

                    if(this.pts.length==0){
                        this.pts.push([this.lastPt.longitude,this.lastPt.latitude]);
                        this.pts.push([this.lastPt.longitude,this.lastPt.latitude]);
                        var polyline = new Polyline({
                            paths: [
                                [this.lastPt.longitude,this.lastPt.latitude],
                                [this.lastPt.longitude,this.lastPt.latitude]
                            ]
                        });

                        var lineSymbol = new SimpleLineSymbol({
                            color: [226, 119, 40],
                            width: 4
                        });

                        this.line = new Graphic({
                            geometry: polyline,
                            symbol: lineSymbol,
                            attributes: {}
                        });
                        //this.drawLayer.removeAll();
                        //this.drawLayer.add(this.line);
                    }else{
                        this.pts.push([pt.longitude,pt.latitude]);
                        var pts = lang.clone(this.pts);
                        var polyline =  new Polyline({ paths: pts });

                        var lineSymbol = new SimpleLineSymbol({
                            color: [226, 119, 40],
                            width: 4
                        });

                        this.line = new Graphic({
                            geometry: polyline,
                            symbol: lineSymbol,
                            attributes: {}
                        });
                        //this.drawLayer.removeAll();
                        //this.drawLayer.add(this.line);
                    }

                } else if (this.drawType == "Polygon") {
                    this.lastPt = pt;
                    //this.pts.push(this.lastPt);

                    if(this.pts.length==0){
                        this.pts.push([this.lastPt.longitude,this.lastPt.latitude]);
                        this.pts.push([this.lastPt.longitude,this.lastPt.latitude]);
                        var polyline = new Polyline({
                            paths: [
                                [this.lastPt.longitude,this.lastPt.latitude],
                                [this.lastPt.longitude,this.lastPt.latitude]
                            ]
                        });

                        var lineSymbol = new SimpleLineSymbol({
                            color: [226, 119, 40],
                            width: 4
                        });

                        this.line = new Graphic({
                            geometry: polyline,
                            symbol: lineSymbol,
                            attributes: {}
                        });
                        //this.drawLayer.removeAll();
                        //this.drawLayer.add(this.line);
                    }else if(this.pts.length<3){
                        this.pts.push([pt.longitude,pt.latitude]);
                        var polyline =  new Polyline({ paths: this.pts });

                        var lineSymbol = new SimpleLineSymbol({
                            color: [226, 119, 40],
                            width: 4
                        });

                        this.line = new Graphic({
                            geometry: polyline,
                            symbol: lineSymbol,
                            attributes: {}
                        });
                        //this.drawLayer.removeAll();
                        //this.drawLayer.add(this.line);
                    }else{
                        this.pts.push([pt.longitude,pt.latitude]);
                        var pts = lang.clone(this.pts);
                        var polygon =  new Polygon(pts);

                        var fillSymbol = new SimpleFillSymbol({
                            color: [227, 139, 79, 0.8],
                            outline: { // autocasts as new SimpleLineSymbol()
                                color: [255, 255, 255],
                                width: 1
                            }
                        });

                        this.polygonGraphic = new Graphic({
                            geometry: polygon,
                            symbol: fillSymbol
                        });
                        //this.drawLayer.removeAll();
                        //this.drawLayer.add(this.polygonGraphic);
                    }
                }

            },

            removeMapEvent: function () {
                if (this.handleClick) {
                    this.handleClick.remove();
                    this.handleClick = null;
                }
                if (this.handleMove) {
                    this.handleMove.remove();
                    this.handleMove = null;
                }
                if (this.handleDBClick) {
                    this.handleDBClick.remove();
                    this.handleDBClick = null;
                }
            },

            addMyPoint: function (e) {
                this.pts.splice(0,this.pts.length);
                this.removeMapEvent();
                this.drawType = "Point";
                this.handleClick = on(this.sceneView, "click", lang.hitch(this, this.onMapClick));
                //this.handleMove = on(this.sceneView.container, "mousemove", throttle(lang.hitch(this, this.onMouseMove), 100));
            },

            addMyPolyline: function (e) {
                this.pts.splice(0,this.pts.length);
                this.removeMapEvent();
                this.drawType = "Polyline";
                this.handleClick = on(this.sceneView, "click", lang.hitch(this, this.onMapClick));
                this.handleDBClick = on(this.sceneView, "double-click", lang.hitch(this, this.onMapDBClick));
                this.handleMove = on(this.sceneView.container, "mousemove", throttle(lang.hitch(this, this.onMouseMove), 100));

            },

            addMyPolygon: function (e) {
                this.pts.splice(0,this.pts.length);
                this.removeMapEvent();
                this.drawType = "Polygon";
                this.handleClick = on(this.sceneView, "click", lang.hitch(this, this.onMapClick));
                this.handleDBClick = on(this.sceneView, "double-click", lang.hitch(this, this.onMapDBClick));
                this.handleMove = on(this.sceneView.container, "mousemove", throttle(lang.hitch(this, this.onMouseMove), 100));

            }

        });
    });