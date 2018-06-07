define([
        '../../Core/Cartesian3',
        '../../Core/Cartographic',
        '../../Core/CesiumTerrainProvider',
        '../../Core/Color',
        '../../Core/ColorGeometryInstanceAttribute',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/GeometryInstance',
        '../../Core/Ion',
        '../../Core/IonResource',
        '../../Core/Matrix4',
        '../../Core/Rectangle',
        '../../Core/RectangleGeometry',
        '../../Core/Resource',
        '../../Core/RuntimeError',
        '../../Core/sampleTerrainMostDetailed',
        '../../Core/ScreenSpaceEventHandler',
        '../../Core/ScreenSpaceEventType',
        '../../Scene/DebugModelMatrixPrimitive',
        '../../Scene/GroundPrimitive',
        '../../Scene/PerformanceDisplay',
        '../../Scene/PerInstanceColorAppearance',
        '../../Scene/PrimitiveCollection',
        '../../Scene/TileCoordinatesImageryProvider',
        '../../ThirdParty/knockout',
        '../createCommand'
    ], function(
        Cartesian3,
        Cartographic,
        CesiumTerrainProvider,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        GeometryInstance,
        Ion,
        IonResource,
        Matrix4,
        Rectangle,
        RectangleGeometry,
        Resource,
        RuntimeError,
        sampleTerrainMostDetailed,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        DebugModelMatrixPrimitive,
        GroundPrimitive,
        PerformanceDisplay,
        PerInstanceColorAppearance,
        PrimitiveCollection,
        TileCoordinatesImageryProvider,
        knockout,
        createCommand) {
    'use strict';

    function frustumStatisticsToString(statistics) {
        var str;
        if (defined(statistics)) {
            str = 'Command Statistics';
            var com = statistics.commandsInFrustums;
            for (var n in com) {
                if (com.hasOwnProperty(n)) {
                    var num = parseInt(n, 10);
                    var s;
                    if (num === 7) {
                        s = '1, 2 and 3';
                    } else {
                        var f = [];
                        for (var i = 2; i >= 0; i--) {
                            var p = Math.pow(2, i);
                            if (num >= p) {
                                f.push(i + 1);
                                num -= p;
                            }
                        }
                        s = f.reverse().join(' and ');
                    }
                    str += '<br>&nbsp;&nbsp;&nbsp;&nbsp;' + com[n] + ' in frustum ' + s;
                }
            }
            str += '<br>Total: ' + statistics.totalCommands;
        }

        return str;
    }

    function boundDepthFrustum(lower, upper, proposed) {
        var bounded = Math.min(proposed, upper);
        bounded = Math.max(bounded, lower);
        return bounded;
    }

    /**
     * The view model for {@link CesiumInspector}.
     * @alias CesiumInspectorViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     * @param {PerformanceContainer} performanceContainer The instance to use for performance container.
     */
    function CesiumInspectorViewModel(scene, performanceContainer) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required');
        }

        if (!defined(performanceContainer)) {
            throw new DeveloperError('performanceContainer is required');
        }
        //>>includeEnd('debug');

        var that = this;
        var canvas = scene.canvas;
        var eventHandler = new ScreenSpaceEventHandler(canvas);
        this._eventHandler = eventHandler;
        this._scene = scene;
        this._canvas = canvas;
        this._primitive = undefined;
        this._tile = undefined;
        this._modelMatrixPrimitive = undefined;
        this._performanceDisplay = undefined;
        this._performanceContainer = performanceContainer;
        this._originalTerrainProvider = undefined;
        this._terrainExtentPromise = undefined;
        this._terrainPrimitivePromise = undefined;
        this._terrainPrimitive = undefined;

        this._LODColorRamp = undefined;
        this._htLODPrimitives = new PrimitiveCollection({show: false});
        this._scene.primitives.add(this._htLODPrimitives);

        var globe = this._scene.globe;
        globe.depthTestAgainstTerrain = true;

        /**
         * Gets or sets the show frustums state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.frustums = false;

        /**
         * Gets or sets the show frustum planes state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.frustumPlanes = false;

        /**
         * Gets or sets the show performance display state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.performance = false;

        /**
         * Gets or sets the shader cache text.  This property is observable.
         * @type {String}
         * @default ''
         */
        this.shaderCacheText = '';

        /**
         * Gets or sets the show primitive bounding sphere state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.primitiveBoundingSphere = false;

        /**
         * Gets or sets the show primitive reference frame state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.primitiveReferenceFrame = false;

        /**
         * Gets or sets the filter primitive state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.filterPrimitive = false;

        /**
         * Gets or sets the show tile bounding sphere state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.tileBoundingSphere = false;

        /**
         * Gets or sets the filter tile state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.filterTile = false;

        /**
         * Gets or sets ion terrain asset id state.  This property is observable.
         * @type {String}
         * @default ''
         */
        this.ionTerrainAssetStr = '';
        this._ionTerrainAssetId = undefined;

        /**
         * Gets or sets shading in terrain asset state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.highlightTerrain = false;

        /**
         * Gets or sets shading in terrain LOD state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.highlightLOD = false;

        /**
         * Gets or sets the show wireframe state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.wireframe = false;

        /**
         * Gets or sets the show globe depth state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.globeDepth = false;

        /**
         * Gets or sets the show pick depth state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.pickDepth = false;

        /**
         * Gets or sets the index of the depth frustum to display.  This property is observable.
         * @type {Number}
         * @default 1
         */
        this.depthFrustum = 1;
        this._numberOfFrustums = 1;

        /**
         * Gets or sets the suspend updates state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.suspendUpdates = false;

        /**
         * Gets or sets the show tile coordinates state.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.tileCoordinates = false;

        /**
         * Gets or sets the frustum statistic text.  This property is observable.
         * @type {String}
         * @default ''
         */
        this.frustumStatisticText = false;

        /**
         * Gets or sets the selected tile information text.  This property is observable.
         * @type {String}
         * @default ''
         */
        this.tileText = '';

        /**
         * Gets if a primitive has been selected.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.hasPickedPrimitive = false;

        /**
         * Gets if a tile has been selected.  This property is observable
         * @type {Boolean}
         * @default false
         */
        this.hasPickedTile = false;

        /**
         * Gets if the picking primitive command is active.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.pickPrimitiveActive = false;

        /**
         * Gets if the picking tile command is active.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.pickTileActive = false;

        /**
         * Gets or sets ion camera position latitude.  This property is observable.
         * @type {String}
         * @default ''
         */
        this.positionLatText = '';
        this._positionLat = undefined;

        /**
         * Gets or sets ion camera position longitude.  This property is observable.
         * @type {String}
         * @default ''
         */
        this.positionLonText = '';
        this._positionLon = undefined;

        /**
         * Gets or sets ion camera position height.  This property is observable.
         * @type {String}
         * @default ''
         */
        this.positionHeightText = '';
        this._positionHeight = undefined;

        /**
         * Gets or sets if the cesium inspector drop down is visible.  This property is observable.
         * @type {Boolean}
         * @default true
         */
        this.dropDownVisible = true;

        /**
         * Gets or sets if the general section is visible.  This property is observable.
         * @type {Boolean}
         * @default true
         */
        this.generalVisible = true;

        /**
         * Gets or sets if the primitive section is visible.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.primitivesVisible = false;

        /**
         * Gets or sets if the terrain section is visible.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.terrainVisible = false;

        /**
         * Gets or sets if the position section is visible.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.positionVisible = false;

        /**
         * Gets or sets the index of the depth frustum text.  This property is observable.
         * @type {String}
         * @default ''
         */
        this.depthFrustumText = '';

        /**
         * Gets the text on the general section expand button.  This property is computed.
         * @type {String}
         * @default '-'
         */
        this.generalSwitchText = knockout.pureComputed(function() {
            return that.generalVisible ? '-' : '+';
        });

        /**
         * Gets the text on the primitives section expand button.  This property is computed.
         * @type {String}
         * @default '+'
         */
        this.primitivesSwitchText = knockout.pureComputed(function() {
            return that.primitivesVisible ? '-' : '+';
        });

        /**
         * Gets the text on the terrain section expand button.  This property is computed.
         * @type {String}
         * @default '+'
         */
        this.terrainSwitchText = knockout.pureComputed(function() {
            return that.terrainVisible ? '-' : '+';
        });

        /**
         * Gets the text on the position section expand button.  This property is computed.
         * @type {String}
         * @default '+'
         */
        this.positionSwitchText = knockout.pureComputed(function() {
            return that.positionVisible ? '-' : '+';
        });

        knockout.track(this, [
            'frustums',
            'frustumPlanes',
            'performance',
            'shaderCacheText',
            'primitiveBoundingSphere',
            'primitiveReferenceFrame',
            'filterPrimitive',
            'tileBoundingSphere',
            'filterTile',
            'ionTerrainAssetStr',
            'highlightTerrain',
            'highlightLOD',
            'wireframe',
            'globeDepth',
            'pickDepth',
            'depthFrustum',
            'suspendUpdates',
            'tileCoordinates',
            'frustumStatisticText',
            'tileText',
            'hasPickedPrimitive',
            'hasPickedTile',
            'pickPrimitiveActive',
            'pickTileActive',
            'positionLatText',
            'positionLonText',
            'positionHeightText',
            'dropDownVisible',
            'generalVisible',
            'primitivesVisible',
            'terrainVisible',
            'positionVisible',
            'depthFrustumText'
        ]);

        this._toggleDropDown = createCommand(function() {
            that.dropDownVisible = !that.dropDownVisible;
        });

        this._toggleGeneral = createCommand(function() {
            that.generalVisible = !that.generalVisible;
        });

        this._togglePrimitives = createCommand(function() {
            that.primitivesVisible = !that.primitivesVisible;
        });

        this._toggleTerrain = createCommand(function() {
            that.terrainVisible = !that.terrainVisible;
        });

        this._togglePosition = createCommand(function() {
            that.positionVisible = !that.positionVisible;
            var camera = that.scene.camera;
            if (that.positionVisible) {
                camera.percentageChanged = 0;
                camera.moveEnd.addEventListener(_updatePosition);
                _updatePosition();
            } else {
                camera.percentageChanged = 0.5; // back to default
                camera.moveEnd.removeEventListener(_updatePosition);
            }
        })

        this._frustumsSubscription = knockout.getObservable(this, 'frustums').subscribe(function(val) {
            that._scene.debugShowFrustums = val;
            that._scene.requestRender();
        });

        this._frustumPlanesSubscription = knockout.getObservable(this, 'frustumPlanes').subscribe(function(val) {
            that._scene.debugShowFrustumPlanes = val;
            that._scene.requestRender();
        });

        this._performanceSubscription = knockout.getObservable(this, 'performance').subscribe(function(val) {
            if (val) {
                that._performanceDisplay = new PerformanceDisplay({
                    container : that._performanceContainer
                });
            } else {
                that._performanceContainer.innerHTML = '';
            }
        });

        this._showPrimitiveBoundingSphere = createCommand(function() {
            that._primitive.debugShowBoundingVolume = that.primitiveBoundingSphere;
            that._scene.requestRender();
            return true;
        });

        this._primitiveBoundingSphereSubscription = knockout.getObservable(this, 'primitiveBoundingSphere').subscribe(function() {
            that._showPrimitiveBoundingSphere();
        });

        this._showPrimitiveReferenceFrame = createCommand(function() {
            if (that.primitiveReferenceFrame) {
                var modelMatrix = that._primitive.modelMatrix;
                that._modelMatrixPrimitive = new DebugModelMatrixPrimitive({
                    modelMatrix : modelMatrix
                });
                that._scene.primitives.add(that._modelMatrixPrimitive);
            } else if (defined(that._modelMatrixPrimitive)) {
                that._scene.primitives.remove(that._modelMatrixPrimitive);
                that._modelMatrixPrimitive = undefined;
            }
            that._scene.requestRender();
            return true;
        });

        this._primitiveReferenceFrameSubscription = knockout.getObservable(this, 'primitiveReferenceFrame').subscribe(function() {
            that._showPrimitiveReferenceFrame();
        });

        this._doFilterPrimitive = createCommand(function() {
            if (that.filterPrimitive) {
                that._scene.debugCommandFilter = function(command) {
                    if (defined(that._modelMatrixPrimitive) && command.owner === that._modelMatrixPrimitive._primitive) {
                        return true;
                    } else if (defined(that._primitive)) {
                        return command.owner === that._primitive || command.owner === that._primitive._billboardCollection || command.owner.primitive === that._primitive;
                    }
                    return false;
                };
            } else {
                that._scene.debugCommandFilter = undefined;
            }
            return true;
        });

        this._filterPrimitiveSubscription = knockout.getObservable(this, 'filterPrimitive').subscribe(function() {
            that._doFilterPrimitive();
            that._scene.requestRender();
        });

        this._wireframeSubscription = knockout.getObservable(this, 'wireframe').subscribe(function(val) {
            globe._surface.tileProvider._debug.wireframe = val;
            that._scene.requestRender();
        });

        this._globeDepthSubscription = knockout.getObservable(this, 'globeDepth').subscribe(function(val) {
            that._scene.debugShowGlobeDepth = val;
            that._scene.requestRender();
        });

        this._pickDepthSubscription = knockout.getObservable(this, 'pickDepth').subscribe(function(val) {
            that._scene.debugShowPickDepth = val;
            that._scene.requestRender();
        });

        this._depthFrustumSubscription = knockout.getObservable(this, 'depthFrustum').subscribe(function(val) {
            that._scene.debugShowDepthFrustum = val;
            that._scene.requestRender();
        });

        this._incrementDepthFrustum = createCommand(function() {
            var next = that.depthFrustum + 1;
            that.depthFrustum = boundDepthFrustum(1, that._numberOfFrustums, next);
            that._scene.requestRender();
            return true;
        });

        this._decrementDepthFrustum = createCommand(function() {
            var next = that.depthFrustum - 1;
            that.depthFrustum = boundDepthFrustum(1, that._numberOfFrustums, next);
            that._scene.requestRender();
            return true;
        });

        this._suspendUpdatesSubscription = knockout.getObservable(this, 'suspendUpdates').subscribe(function(val) {
            globe._surface._debug.suspendLodUpdate = val;
            if (!val) {
                that.filterTile = false;
            }
        });

        var tileBoundariesLayer;
        this._showTileCoordinates = createCommand(function() {
            if (that.tileCoordinates && !defined(tileBoundariesLayer)) {
                tileBoundariesLayer = scene.imageryLayers.addImageryProvider(new TileCoordinatesImageryProvider({
                    tilingScheme : scene.terrainProvider.tilingScheme
                }));
            } else if (!that.tileCoordinates && defined(tileBoundariesLayer)) {
                scene.imageryLayers.remove(tileBoundariesLayer);
                tileBoundariesLayer = undefined;
            }
            return true;
        });

        this._tileCoordinatesSubscription = knockout.getObservable(this, 'tileCoordinates').subscribe(function() {
            that._showTileCoordinates();
            that._scene.requestRender();
        });

        this._tileBoundingSphereSubscription = knockout.getObservable(this, 'tileBoundingSphere').subscribe(function() {
            that._showTileBoundingSphere();
            that._scene.requestRender();
        });

        this._showTileBoundingSphere = createCommand(function() {
            if (that.tileBoundingSphere) {
                globe._surface.tileProvider._debug.boundingSphereTile = that._tile;
            } else {
                globe._surface.tileProvider._debug.boundingSphereTile = undefined;
            }
            that._scene.requestRender();
            return true;
        });

        this._doFilterTile = createCommand(function() {
            if (!that.filterTile) {
                that.suspendUpdates = false;
            } else {
                that.suspendUpdates = true;

                globe._surface._tilesToRender = [];

                if (defined(that._tile) && that._tile.renderable) {
                    globe._surface._tilesToRender.push(that._tile);
                }
            }
            return true;
        });

        this._filterTileSubscription = knockout.getObservable(this, 'filterTile').subscribe(function() {
            that.doFilterTile();
            that._scene.requestRender();
        });

        function pickPrimitive(e) {
            var newPick = that._scene.pick({
                x : e.position.x,
                y : e.position.y
            });
            if (defined(newPick)) {
                that.primitive = defined(newPick.collection) ? newPick.collection : newPick.primitive;
            }

            that._scene.requestRender();
            that.pickPrimitiveActive = false;
        }

        this._pickPrimitive = createCommand(function() {
            that.pickPrimitiveActive = !that.pickPrimitiveActive;
        });

        this._pickPrimitiveActiveSubscription = knockout.getObservable(this, 'pickPrimitiveActive').subscribe(function(val) {
            if (val) {
                eventHandler.setInputAction(pickPrimitive, ScreenSpaceEventType.LEFT_CLICK);
            } else {
                eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            }
        });

        function selectTile(e) {
            var selectedTile;
            var ellipsoid = globe.ellipsoid;
            var cartesian = that._scene.camera.pickEllipsoid({
                x : e.position.x,
                y : e.position.y
            }, ellipsoid);

            if (defined(cartesian)) {
                var cartographic = ellipsoid.cartesianToCartographic(cartesian);
                var tilesRendered = globe._surface.tileProvider._tilesToRenderByTextureCount;
                for (var textureCount = 0; !selectedTile && textureCount < tilesRendered.length; ++textureCount) {
                    var tilesRenderedByTextureCount = tilesRendered[textureCount];
                    if (!defined(tilesRenderedByTextureCount)) {
                        continue;
                    }

                    for (var tileIndex = 0; !selectedTile && tileIndex < tilesRenderedByTextureCount.length; ++tileIndex) {
                        var tile = tilesRenderedByTextureCount[tileIndex];
                        if (Rectangle.contains(tile.rectangle, cartographic)) {
                            selectedTile = tile;
                        }
                    }
                }
            }

            that.tile = selectedTile;

            that.pickTileActive = false;
        }

        this._pickTile = createCommand(function() {
            that.pickTileActive = !that.pickTileActive;
        });

        this._pickTileActiveSubscription = knockout.getObservable(this, 'pickTileActive').subscribe(function(val) {
            if (val) {
                eventHandler.setInputAction(selectTile, ScreenSpaceEventType.LEFT_CLICK);
            } else {
                eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            }
        });

        this._removePostRenderEvent = scene.postRender.addEventListener(function() {
            that._update();
        });

        this._sanitizeIonAssetIdSubscription = knockout.getObservable(this, 'ionTerrainAssetStr').subscribe(function(val) {
            var id = parseInt(val, 10);
            if (isNaN(id)) {
                that.ionTerrainAssetStr = '';
                that._ionTerrainAssetId = undefined;
                _updateTerrainProvider();
            } else if (id !== that._ionTerrainAssetId) {
                that._ionTerrainAssetId = id;
                _updateTerrainProvider();
            } else {
                that.ionTerrainAssetStr = id.toString();
            }
        });

        this._sanitizePositionLatitudeSubscription = knockout.getObservable(this, 'positionLatText').subscribe(function(val) {
            var lat = parseFloat(val, 10);
            if (isNaN(lat) && val !== '-') {
                that.positionLatText = '';
                return;
            } else if (lat === that._positionLat) {
                that.positionLatText = lat.toString();
            }
            that._positionLat = lat;
        });

        this._sanitizePositionLongitudeSubscription = knockout.getObservable(this, 'positionLonText').subscribe(function(val) {
            var lon = parseFloat(val, 10);
            if (isNaN(lon) && val !== '-') {
                that.positionLonText = '';
                return;
            } else if (lon === that._positionLon) {
                that.positionLonText = lon.toString();
            }
            that._positionLon = lon;
        });

        this._sanitizePositionHeightSubscription = knockout.getObservable(this, 'positionHeightText').subscribe(function(val) {
            var height = parseFloat(val, 10);
            if (isNaN(height) && val !== '-') {
                that.positionHeightText = '';
                return;
            } else if (height === that._positionHeight) {
                that.positionHeightText = height.toString();
            }
            that._positionHeight = height;
        });

        function _resetTerrainProvider() {
            if(defined(that._originalTerrainProvider)) {
                that._scene.terrainProvider = that._originalTerrainProvider;
                that._originalTerrainProvider = undefined;
            }
        }

        function _updateTerrainProvider() {
            // Reset LOD to normal setting to avoid rendering crash.
            that.suspendUpdates = false;
            that.highlightTerrain = false;
            that.highlightLOD = false;

            if(!defined(that._ionTerrainAssetId)) {
                _resetTerrainProvider();
                return;
            }

            that._terrainMetadataPromise = Resource.fetchJson(
                Ion.defaultServer.url + 'assets/' + that._ionTerrainAssetId + '?access_token=' + Ion.defaultAccessToken
            )
            .then(function (metadata) {
                if (metadata.type !== 'TERRAIN') {
                    throw new RuntimeError('Asset ' + metadata.id + ' is not terrain');
                }
                return metadata;
            }).otherwise(function (err) {
                _resetTerrainProvider();
                throw err;
            });

            that._terrainMetadataPromise.then(function (metadata) {
                if (!defined(that._originalTerrainProvider)) {
                    // This is the first time we're using an ion asset, save the current terrain provider for later.
                    that._originalTerrainProvider = that._scene.terrainProvider;
                }

                that._scene.terrainProvider = new CesiumTerrainProvider({
                    url: IonResource.fromAssetId(metadata.id)
                });
            });

            that._terrainExtentPromise = that._terrainMetadataPromise.then(function (metadata) {
                return Resource.fetchJson(
                    // We need the extents for camera zoom and highlighting terrain area.
                    Ion.defaultServer.url + 'assets/' + metadata.id + '/extent?access_token=' + Ion.defaultAccessToken
                );
            });

            that._terrainPrimitivePromise = that._terrainExtentPromise.then(function(rectangle) {
                if (defined(that._terrainPrimitive)) {
                    that._scene.primitives.remove(that._terrainPrimitive);
                }

                that._terrainPrimitive = new GroundPrimitive({
                    geometryInstances: new GeometryInstance({
                        geometry: new RectangleGeometry({
                            rectangle: rectangle
                        }),
                        attributes: {
                            color: new ColorGeometryInstanceAttribute(0, 1.0, 1.0, 0.35)
                        }
                    }),
                    appearance : new PerInstanceColorAppearance()
                });

                that._terrainPrimitive.show = false;
                return that._terrainPrimitive;
            });
        }

        function _flyToTerrainRectangle(scene, rectangle, duration) {
            // This code is based on AnalyticalGraphicsInc/agi-cesium-cloud/public/Core/flyToAsset.js#L146
            var camera = scene.camera;
            var globe = scene.globe;

            var cartographics = [
                Rectangle.center(rectangle),
                Rectangle.southeast(rectangle),
                Rectangle.southwest(rectangle),
                Rectangle.northeast(rectangle),
                Rectangle.northwest(rectangle)
            ];

            return sampleTerrainMostDetailed(globe.terrainProvider, cartographics)
                .then(function(positionsOnTerrain) {
                    var maxHeight = -Number.MAX_VALUE;
                    positionsOnTerrain.forEach(function(p) {
                        maxHeight = Math.max(p.height, maxHeight);
                    });

                    var finalPosition = globe.ellipsoid.cartesianToCartographic(camera.getRectangleCameraCoordinates(rectangle));
                    finalPosition.height += maxHeight;

                    camera.flyTo({
                        destination: globe.ellipsoid.cartographicToCartesian(finalPosition),
                        endTransform: Matrix4.IDENTITY,
                        duration: duration
                    });
                });
        }

        this._zoomToIonTerrain = createCommand(function() {
            that._terrainExtentPromise.then(function(extent) {
                _flyToTerrainRectangle(that._scene, extent, 1);
            });
        });

        this._goToPosition = createCommand(function() {
            var camera = scene.camera;
            camera.flyTo({
                destination: Cartesian3.fromDegrees(that._positionLon, that._positionLat, that._positionHeight),
                orientation: {  direction: camera.direction,
                                up: camera.up,
                             },
                endTransform: Matrix4.IDENTITY,
                duration: 1
            });
        })

        this._goToGoogleEarth = createCommand(function() {
            window.open('https://earth.google.com/web/@' + that._positionLat + ',' +
                              that._positionLon + ',0a,' + that._positionHeight + 'd,35y', '_blank');
        });

        function _updatePosition() {
            var cameraCartographic = that.scene.camera.positionCartographic;
            that.positionHeightText = cameraCartographic.height;
            that.positionLatText = cameraCartographic.latitude * 180 / Math.PI;
            that.positionLonText = cameraCartographic.longitude * 180 / Math.PI;
        }

        this._highlightTerrainSubscription = knockout.getObservable(this, 'highlightTerrain').subscribe(function(enable) {
            that._terrainPrimitivePromise.then(function(primitive) {
                if (!that._scene.primitives.contains(primitive)) {
                    that._scene.primitives.add(primitive);
                }
                primitive.show = enable;
                that._scene.requestRender();
            });
        });

        this._highlightLODSubscription = knockout.getObservable(this, 'highlightLOD').subscribe(function(enable) {
            if(enable) {
                _addLODPrimitives();
                that._scene.camera.moveEnd.addEventListener(_addLODPrimitives);
                that._htLODPrimitives.show = true;
            } else {
                that._scene.camera.moveEnd.removeEventListener(_addLODPrimitives);
                that._htLODPrimitives.show = false;
                that._htLODPrimitives.removeAll();
            }
            that._scene.requestRender();
        });

        function _getColor(rectangle) {
            var tilingAvailability = that._scene.terrainProvider.availability;
            var maximumLevel = tilingAvailability.computeBestAvailableLevelOverRectangle(rectangle);
            if(!defined(that._LODColorRamp)) {
                // Sample from a small image to figure out color of tile
                var ramp = document.createElement('canvas');
                ramp.width = 100;
                ramp.height = 1;
                var ctx = ramp.getContext('2d');

                var grd = ctx.createLinearGradient(0, 0, 100, 0);
                grd.addColorStop(0.0,  '#000000'); //black
                grd.addColorStop(0.30, '#2747E0'); //blue
                grd.addColorStop(0.45, '#D33B7D'); //pink
                grd.addColorStop(0.50, '#D33038'); //red
                grd.addColorStop(0.56, '#FF9742'); //orange
                grd.addColorStop(0.75, '#ffd700'); //yellow
                grd.addColorStop(1.0,  '#ffffff'); //white

                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, 100, 1);

                that._LODColorRamp = ctx;
            }

            var POTENTIAL_MAXIMUM = 24.0;
            var color = that._LODColorRamp.getImageData(100.0 * maximumLevel / POTENTIAL_MAXIMUM, 0, 1, 1).data;
            return new Color(color[0] / 255.0, color[1] / 255.0, color[2] / 255.0, 0.75);
        }

        function _addLODPrimitives() {
            that._htLODPrimitives.removeAll();
            that._scene.globe._surface.forEachRenderedTile(function(tile) {
                var extent = tile._rectangle;
                var color = _getColor(extent);
                var prim = new GroundPrimitive({
                    geometryInstances: new GeometryInstance({
                        geometry: new RectangleGeometry({
                            rectangle: extent
                        }),
                        attributes: {
                            color: new ColorGeometryInstanceAttribute.fromColor(color)
                        }
                    }),
                    appearance : new PerInstanceColorAppearance()
                });
                that._htLODPrimitives.add(prim);
            });
        }
    }

    defineProperties(CesiumInspectorViewModel.prototype, {
        /**
         * Gets the scene to control.
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },

        /**
         * Gets the container of the PerformanceDisplay
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Element}
         */
        performanceContainer : {
            get : function() {
                return this._performanceContainer;
            }
        },

        /**
         * Gets the command to toggle the visibility of the drop down.
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        toggleDropDown : {
            get : function() {
                return this._toggleDropDown;
            }
        },

        /**
         * Gets the command to toggle the visibility of a BoundingSphere for a primitive
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showPrimitiveBoundingSphere : {
            get : function() {
                return this._showPrimitiveBoundingSphere;
            }
        },

        /**
         * Gets the command to toggle the visibility of a {@link DebugModelMatrixPrimitive} for the model matrix of a primitive
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showPrimitiveReferenceFrame : {
            get : function() {
                return this._showPrimitiveReferenceFrame;
            }
        },

        /**
         * Gets the command to toggle a filter that renders only a selected primitive
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        doFilterPrimitive : {
            get : function() {
                return this._doFilterPrimitive;
            }
        },

        /**
         * Gets the command to increment the depth frustum index to be shown
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        incrementDepthFrustum : {
            get : function() {
                return this._incrementDepthFrustum;
            }
        },

        /**
         * Gets the command to decrement the depth frustum index to be shown
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        decrementDepthFrustum : {
            get : function() {
                return this._decrementDepthFrustum;
            }
        },

        /**
         * Gets the command to toggle the visibility of tile coordinates
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showTileCoordinates : {
            get : function() {
                return this._showTileCoordinates;
            }
        },

        /**
         * Gets the command to toggle the visibility of a BoundingSphere for a selected tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        showTileBoundingSphere : {
            get : function() {
                return this._showTileBoundingSphere;
            }
        },

        /**
         * Gets the command to toggle a filter that renders only a selected tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        doFilterTile : {
            get : function() {
                return this._doFilterTile;
            }
        },

        /**
         * Gets the command to expand and collapse the general section
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        toggleGeneral : {
            get : function() {
                return this._toggleGeneral;
            }
        },

        /**
         * Gets the command to expand and collapse the primitives section
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        togglePrimitives : {
            get : function() {
                return this._togglePrimitives;
            }
        },

        /**
         * Gets the command to expand and collapse the terrain section
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        toggleTerrain : {
            get : function() {
                return this._toggleTerrain;
            }
        },

        /**
         * Gets the command to expand and collapse the position section
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        togglePosition : {
            get : function() {
                return this._togglePosition;
            }
        },

        /**
         * Gets the command to pick a primitive
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        pickPrimitive : {
            get : function() {
                return this._pickPrimitive;
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        pickTile : {
            get : function() {
                return this._pickTile;
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        selectParent : {
            get : function() {
                var that = this;
                return createCommand(function() {
                    that.tile = that.tile.parent;
                });
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        selectNW : {
            get : function() {
                var that = this;
                return createCommand(function() {
                    that.tile = that.tile.northwestChild;
                });
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        selectNE : {
            get : function() {
                var that = this;
                return createCommand(function() {
                    that.tile = that.tile.northeastChild;
                });
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        selectSW : {
            get : function() {
                var that = this;
                return createCommand(function() {
                    that.tile = that.tile.southwestChild;
                });
            }
        },

        /**
         * Gets the command to pick a tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        selectSE : {
            get : function() {
                var that = this;
                return createCommand(function() {
                    that.tile = that.tile.southeastChild;
                });
            }
        },

        /**
         * Gets or sets the current selected primitive
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        primitive : {
            get : function() {
                return this._primitive;
            },
            set : function(newPrimitive) {
                var oldPrimitive = this._primitive;
                if (newPrimitive !== oldPrimitive) {
                    this.hasPickedPrimitive = true;
                    if (defined(oldPrimitive)) {
                        oldPrimitive.debugShowBoundingVolume = false;
                    }
                    this._scene.debugCommandFilter = undefined;
                    if (defined(this._modelMatrixPrimitive)) {
                        this._scene.primitives.remove(this._modelMatrixPrimitive);
                        this._modelMatrixPrimitive = undefined;
                    }
                    this._primitive = newPrimitive;
                    newPrimitive.show = false;
                    setTimeout(function() {
                        newPrimitive.show = true;
                    }, 50);
                    this.showPrimitiveBoundingSphere();
                    this.showPrimitiveReferenceFrame();
                    this.doFilterPrimitive();
                }
            }
        },

        /**
         * Gets or sets the current selected tile
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        tile : {
            get : function() {
                return this._tile;
            },
            set : function(newTile) {
                if (defined(newTile)) {
                    this.hasPickedTile = true;
                    var oldTile = this._tile;
                    if (newTile !== oldTile) {
                        this.tileText = 'L: ' + newTile.level + ' X: ' + newTile.x + ' Y: ' + newTile.y;
                        this.tileText += '<br>SW corner: ' + newTile.rectangle.west + ', ' + newTile.rectangle.south;
                        this.tileText += '<br>NE corner: ' + newTile.rectangle.east + ', ' + newTile.rectangle.north;
                        var data = newTile.data;
                        if (defined(data)) {
                            this.tileText += '<br>Min: ' + data.minimumHeight + ' Max: ' + data.maximumHeight;
                        } else {
                            this.tileText += '<br>(Tile is not loaded)';
                        }
                    }
                    this._tile = newTile;
                    this.showTileBoundingSphere();
                    this.doFilterTile();
                } else {
                    this.hasPickedTile = false;
                    this._tile = undefined;
                }
            }
        },

        /**
         * Gets the command to highlight terrain loaded from Ion
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        zoomToIonTerrain : {
            get : function() {
                return this._zoomToIonTerrain;
            }
        },

        /**
         * Gets the command to fly the camera to a desired position
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        goToPosition : {
            get : function() {
                return this._goToPosition;
            }
        },

         /**
         * Gets the command to load the position's latitude, longitude and height on Google Earth
         * @memberof CesiumInspectorViewModel.prototype
         *
         * @type {Command}
         */
        goToGoogleEarth : {
            get : function() {
                return this._goToGoogleEarth;
            }
        }
    });

    /**
     * Updates the view model
     * @private
     */
    CesiumInspectorViewModel.prototype._update = function() {
        if (this.frustums) {
            this.frustumStatisticText = frustumStatisticsToString(this._scene.debugFrustumStatistics);
        }

        // Determine the number of frustums being used.
        var numberOfFrustums = this._scene.numberOfFrustums;
        this._numberOfFrustums = numberOfFrustums;
        // Bound the frustum to be displayed.
        this.depthFrustum = boundDepthFrustum(1, numberOfFrustums, this.depthFrustum);
        // Update the displayed text.
        this.depthFrustumText = this.depthFrustum + ' of ' + numberOfFrustums;

        if (this.performance) {
            this._performanceDisplay.update();
        }
        if (this.primitiveReferenceFrame) {
            this._modelMatrixPrimitive.modelMatrix = this._primitive.modelMatrix;
        }

        this.shaderCacheText = 'Cached shaders: ' + this._scene.context.shaderCache.numberOfShaders;
    };

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    CesiumInspectorViewModel.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    CesiumInspectorViewModel.prototype.destroy = function() {
        this._eventHandler.destroy();
        this._removePostRenderEvent();
        this._frustumsSubscription.dispose();
        this._frustumPlanesSubscription.dispose();
        this._performanceSubscription.dispose();
        this._primitiveBoundingSphereSubscription.dispose();
        this._primitiveReferenceFrameSubscription.dispose();
        this._filterPrimitiveSubscription.dispose();
        this._wireframeSubscription.dispose();
        this._globeDepthSubscription.dispose();
        this._pickDepthSubscription.dispose();
        this._depthFrustumSubscription.dispose();
        this._suspendUpdatesSubscription.dispose();
        this._tileCoordinatesSubscription.dispose();
        this._tileBoundingSphereSubscription.dispose();
        this._filterTileSubscription.dispose();
        this._pickPrimitiveActiveSubscription.dispose();
        this._pickTileActiveSubscription.dispose();
        this._sanitizeIonAssetIdSubscription.dispose();
        this._sanitizePositionLatitudeSubscription.dispose();
        this._sanitizePositionLongitudeSubscription.dispose();
        this._sanitizePositionHeightSubscription.dispose();
        this._highlightTerrainSubscription.dispose();
        this._highlightLODSubscription.dispose();
        return destroyObject(this);
    };

    return CesiumInspectorViewModel;
});
