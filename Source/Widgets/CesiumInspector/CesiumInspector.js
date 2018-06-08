define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout',
        '../getElement',
        './CesiumInspectorViewModel'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        knockout,
        getElement,
        CesiumInspectorViewModel) {
    'use strict';

    /**
     * Inspector widget to aid in debugging
     *
     * @alias CesiumInspector
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Scene} scene The Scene instance to use.
     *
     * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Cesium%20Inspector.html|Cesium Sandcastle Cesium Inspector Demo}
     */
    function CesiumInspector(container, scene) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }

        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        /**
         * Function to create a toggle-able plus element
         * @param {String} clickAttr the name of the on-click listener
         * @param {String} textAttr the name of the function that will return the associating text
         */
        function createPlus(clickAttr, textAttr) {
            var plus = document.createElement('span');
            plus.className = 'cesium-cesiumInspector-toggleSwitch';
            plus.setAttribute('data-bind', 'click: ' + clickAttr + ', text: ' + textAttr);
            return plus;
        }

        container = getElement(container);

        var performanceContainer = document.createElement('div');

        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        this._viewModel = viewModel;
        this._container = container;

        var element = document.createElement('div');
        this._element = element;
        var text = document.createElement('div');
        text.textContent = 'Cesium Inspector';
        text.className = 'cesium-cesiumInspector-button';
        text.setAttribute('data-bind', 'click: toggleDropDown');
        element.appendChild(text);
        element.className = 'cesium-cesiumInspector';
        element.setAttribute('data-bind', 'css: { "cesium-cesiumInspector-visible" : dropDownVisible, "cesium-cesiumInspector-hidden" : !dropDownVisible }');
        container.appendChild(this._element);

        var panel = document.createElement('div');
        this._panel = panel;
        panel.className = 'cesium-cesiumInspector-dropDown';
        element.appendChild(panel);

        // General
        var general = document.createElement('div');
        general.className = 'cesium-cesiumInspector-sectionHeader';

        // var plus = document.createElement('span');
        // plus.className = 'cesium-cesiumInspector-toggleSwitch';
        // plus.setAttribute('data-bind', 'click: toggleGeneral, text: generalSwitchText');
        general.appendChild(createPlus('toggleGeneral', 'generalSwitchText'));
        general.appendChild(document.createTextNode('General'));
        panel.appendChild(general);

        var generalSection = document.createElement('div');
        generalSection.className = 'cesium-cesiumInspector-section';
        generalSection.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : generalVisible, "cesium-cesiumInspector-hide" : !generalVisible}');
        panel.appendChild(generalSection);

        var debugShowFrustums = document.createElement('div');
        generalSection.appendChild(debugShowFrustums);
        var frustumStatistics = document.createElement('div');
        frustumStatistics.className = 'cesium-cesiumInspector-frustumStatistics';
        frustumStatistics.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : frustums, "cesium-cesiumInspector-hide" :  !frustums}, html: frustumStatisticText');
        var frustumsCheckbox = document.createElement('input');
        frustumsCheckbox.type = 'checkbox';
        frustumsCheckbox.setAttribute('data-bind', 'checked: frustums');
        debugShowFrustums.appendChild(frustumsCheckbox);
        debugShowFrustums.appendChild(document.createTextNode('Show Frustums'));
        debugShowFrustums.appendChild(frustumStatistics);

        var debugShowFrustumPlanes = document.createElement('div');
        generalSection.appendChild(debugShowFrustumPlanes);
        var frustumPlanesCheckbox = document.createElement('input');
        frustumPlanesCheckbox.type = 'checkbox';
        frustumPlanesCheckbox.setAttribute('data-bind', 'checked: frustumPlanes');
        debugShowFrustumPlanes.appendChild(frustumPlanesCheckbox);
        debugShowFrustumPlanes.appendChild(document.createTextNode('Show Frustum Planes'));

        var performanceDisplay = document.createElement('div');
        generalSection.appendChild(performanceDisplay);
        var pdCheckbox = document.createElement('input');
        pdCheckbox.type = 'checkbox';
        pdCheckbox.setAttribute('data-bind', 'checked: performance');
        performanceDisplay.appendChild(pdCheckbox);
        performanceDisplay.appendChild(document.createTextNode('Performance Display'));

        performanceContainer.className = 'cesium-cesiumInspector-performanceDisplay';
        generalSection.appendChild(performanceContainer);

        var shaderCacheDisplay = document.createElement('div');
        shaderCacheDisplay.className = 'cesium-cesiumInspector-shaderCache';
        shaderCacheDisplay.setAttribute('data-bind', 'html: shaderCacheText');
        generalSection.appendChild(shaderCacheDisplay);

        var globeDepth = document.createElement('div');
        generalSection.appendChild(globeDepth);
        var gCheckbox = document.createElement('input');
        gCheckbox.type = 'checkbox';
        gCheckbox.setAttribute('data-bind', 'checked: globeDepth');
        globeDepth.appendChild(gCheckbox);
        globeDepth.appendChild(document.createTextNode('Show globe depth'));

        var globeDepthFrustum = document.createElement('div');
        globeDepth.appendChild(globeDepthFrustum);

        var pickDepth = document.createElement('div');
        generalSection.appendChild(pickDepth);
        var pCheckbox = document.createElement('input');
        pCheckbox.type = 'checkbox';
        pCheckbox.setAttribute('data-bind', 'checked: pickDepth');
        pickDepth.appendChild(pCheckbox);
        pickDepth.appendChild(document.createTextNode('Show pick depth'));

        var depthFrustum = document.createElement('div');
        generalSection.appendChild(depthFrustum);

        // Use a span with HTML binding so that we can indent with non-breaking spaces.
        var gLabel = document.createElement('span');
        gLabel.setAttribute('data-bind', 'html: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Frustum:"');
        depthFrustum.appendChild(gLabel);

        var gText = document.createElement('span');
        gText.setAttribute('data-bind', 'text: depthFrustumText');
        depthFrustum.appendChild(gText);

        var gMinusButton = document.createElement('input');
        gMinusButton.type = 'button';
        gMinusButton.value = '-';
        gMinusButton.className = 'cesium-cesiumInspector-pickButton';
        gMinusButton.setAttribute('data-bind', 'click: decrementDepthFrustum');
        depthFrustum.appendChild(gMinusButton);

        var gPlusButton = document.createElement('input');
        gPlusButton.type = 'button';
        gPlusButton.value = '+';
        gPlusButton.className = 'cesium-cesiumInspector-pickButton';
        gPlusButton.setAttribute('data-bind', 'click: incrementDepthFrustum');
        depthFrustum.appendChild(gPlusButton);

        // Primitives
        var prim = document.createElement('div');
        prim.className = 'cesium-cesiumInspector-sectionHeader';
        // plus = document.createElement('span');
        // plus.className = 'cesium-cesiumInspector-toggleSwitch';
        // plus.setAttribute('data-bind', 'click: togglePrimitives, text: primitivesSwitchText');
        prim.appendChild(createPlus('togglePrimitives','primitivesSwitchText'));
        prim.appendChild(document.createTextNode('Primitives'));
        panel.appendChild(prim);

        var primitivesSection = document.createElement('div');
        primitivesSection.className = 'cesium-cesiumInspector-section';
        primitivesSection.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : primitivesVisible, "cesium-cesiumInspector-hide" : !primitivesVisible}');
        panel.appendChild(primitivesSection);
        var pickPrimRequired = document.createElement('div');
        pickPrimRequired.className = 'cesium-cesiumInspector-subSection';
        primitivesSection.appendChild(pickPrimRequired);

        var pickPrimitiveButton = document.createElement('input');
        pickPrimitiveButton.type = 'button';
        pickPrimitiveButton.value = 'Pick a primitive';
        pickPrimitiveButton.className = 'cesium-cesiumInspector-pickButton';
        pickPrimitiveButton.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-pickButtonHighlight" : pickPrimitiveActive}, click: pickPrimitive');
        var buttonWrap = document.createElement('div');
        buttonWrap.className = 'cesium-cesiumInspector-center';
        buttonWrap.appendChild(pickPrimitiveButton);
        pickPrimRequired.appendChild(buttonWrap);

        var debugSphere = document.createElement('div');
        pickPrimRequired.appendChild(debugSphere);
        var bsCheckbox = document.createElement('input');
        bsCheckbox.type = 'checkbox';
        bsCheckbox.setAttribute('data-bind', 'checked: primitiveBoundingSphere, enable: hasPickedPrimitive');
        debugSphere.appendChild(bsCheckbox);
        debugSphere.appendChild(document.createTextNode('Show bounding sphere'));

        var refFrame = document.createElement('div');
        pickPrimRequired.appendChild(refFrame);
        var rfCheckbox = document.createElement('input');
        rfCheckbox.type = 'checkbox';
        rfCheckbox.setAttribute('data-bind', 'checked: primitiveReferenceFrame, enable: hasPickedPrimitive');
        refFrame.appendChild(rfCheckbox);
        refFrame.appendChild(document.createTextNode('Show reference frame'));

        var primitiveOnly = document.createElement('div');
        this._primitiveOnly = primitiveOnly;
        pickPrimRequired.appendChild(primitiveOnly);
        var primitiveOnlyCheckbox = document.createElement('input');
        primitiveOnlyCheckbox.type = 'checkbox';
        primitiveOnlyCheckbox.setAttribute('data-bind', 'checked: filterPrimitive, enable: hasPickedPrimitive');
        primitiveOnly.appendChild(primitiveOnlyCheckbox);
        primitiveOnly.appendChild(document.createTextNode('Show only selected'));

        // Terrain
        var terrain = document.createElement('div');
        terrain.className = 'cesium-cesiumInspector-sectionHeader';
        // plus = document.createElement('span');
        // plus.className = 'cesium-cesiumInspector-toggleSwitch';
        // plus.setAttribute('data-bind', 'click: toggleTerrain, text: terrainSwitchText');
        terrain.appendChild(createPlus('toggleTerrain', 'terrainSwitchText'));
        terrain.appendChild(document.createTextNode('Terrain'));
        panel.appendChild(terrain);

        var terrainSection = document.createElement('div');
        terrainSection.className = 'cesium-cesiumInspector-section';
        terrainSection.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : terrainVisible, "cesium-cesiumInspector-hide" :  !terrainVisible}');
        panel.appendChild(terrainSection);
        var pickTileRequired = document.createElement('div');
        pickTileRequired.className = 'cesium-cesiumInspector-subSection';
        terrainSection.appendChild(pickTileRequired);
        var pickTileButton = document.createElement('input');
        pickTileButton.type = 'button';
        pickTileButton.value = 'Pick a tile';
        pickTileButton.className = 'cesium-cesiumInspector-pickButton';
        pickTileButton.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-pickButtonHighlight" : pickTileActive}, click: pickTile');
        buttonWrap = document.createElement('div');
        buttonWrap.appendChild(pickTileButton);
        buttonWrap.className = 'cesium-cesiumInspector-center';
        pickTileRequired.appendChild(buttonWrap);
        var tileInfo = document.createElement('div');
        pickTileRequired.appendChild(tileInfo);
        var parentTile = document.createElement('input');
        parentTile.type = 'button';
        parentTile.value = 'Parent';
        parentTile.className = 'cesium-cesiumInspector-pickButton';
        parentTile.setAttribute('data-bind', 'click: selectParent');
        var nwTile = document.createElement('input');
        nwTile.type = 'button';
        nwTile.value = 'NW';
        nwTile.className = 'cesium-cesiumInspector-pickButton';
        nwTile.setAttribute('data-bind', 'click: selectNW');
        var neTile = document.createElement('input');
        neTile.type = 'button';
        neTile.value = 'NE';
        neTile.className = 'cesium-cesiumInspector-pickButton';
        neTile.setAttribute('data-bind', 'click: selectNE');
        var swTile = document.createElement('input');
        swTile.type = 'button';
        swTile.value = 'SW';
        swTile.className = 'cesium-cesiumInspector-pickButton';
        swTile.setAttribute('data-bind', 'click: selectSW');
        var seTile = document.createElement('input');
        seTile.type = 'button';
        seTile.value = 'SE';
        seTile.className = 'cesium-cesiumInspector-pickButton';
        seTile.setAttribute('data-bind', 'click: selectSE');

        var tileText = document.createElement('div');
        tileText.className = 'cesium-cesiumInspector-tileText';
        tileInfo.className = 'cesium-cesiumInspector-frustumStatistics';
        tileInfo.appendChild(tileText);
        tileInfo.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : hasPickedTile, "cesium-cesiumInspector-hide" :  !hasPickedTile}');
        tileText.setAttribute('data-bind', 'html: tileText');

        var relativeText = document.createElement('div');
        relativeText.className = 'cesium-cesiumInspector-relativeText';
        relativeText.textContent = 'Select relative:';
        tileInfo.appendChild(relativeText);

        var table = document.createElement('table');
        var tr1 = document.createElement('tr');
        var tr2 = document.createElement('tr');
        var td1 = document.createElement('td');
        td1.appendChild(parentTile);
        var td2 = document.createElement('td');
        td2.appendChild(nwTile);
        var td3 = document.createElement('td');
        td3.appendChild(neTile);
        tr1.appendChild(td1);
        tr1.appendChild(td2);
        tr1.appendChild(td3);
        var td4 = document.createElement('td');
        var td5 = document.createElement('td');
        td5.appendChild(swTile);
        var td6 = document.createElement('td');
        td6.appendChild(seTile);
        tr2.appendChild(td4);
        tr2.appendChild(td5);
        tr2.appendChild(td6);
        table.appendChild(tr1);
        table.appendChild(tr2);

        tileInfo.appendChild(table);

        var tileBoundingSphere = document.createElement('div');
        pickTileRequired.appendChild(tileBoundingSphere);
        var tbsCheck = document.createElement('input');
        tbsCheck.type = 'checkbox';
        tbsCheck.setAttribute('data-bind', 'checked: tileBoundingSphere, enable: hasPickedTile');
        tileBoundingSphere.appendChild(tbsCheck);
        tileBoundingSphere.appendChild(document.createTextNode('Show bounding volume'));

        var renderTile = document.createElement('div');
        pickTileRequired.appendChild(renderTile);
        var rCheck = document.createElement('input');
        rCheck.type = 'checkbox';
        rCheck.setAttribute('data-bind', 'checked: filterTile, enable: hasPickedTile');
        renderTile.appendChild(rCheck);
        renderTile.appendChild(document.createTextNode('Show only selected'));

        var ionTerrainSection = document.createElement('div');
        terrainSection.appendChild(ionTerrainSection);
        ionTerrainSection.className = 'cesium-cesiumInspector-subSection';

        var ionTerrainInputTable = document.createElement('table');
        ionTerrainSection.appendChild(ionTerrainInputTable);
        var itTr = document.createElement('tr');
        ionTerrainInputTable.appendChild(itTr);

        // Text field for asset id
        var assetIdTd = document.createElement('td');
        itTr.appendChild(assetIdTd);
        var assetIdText = document.createElement('input');
        assetIdTd.appendChild(assetIdText);
        assetIdText.type = 'text';
        assetIdText.placeholder = 'Asset ID';
        assetIdText.className = 'cesium-cesiumInspector-assetIdText';
        assetIdText.setAttribute('data-bind', 'textInput: ionTerrainAssetStr');

         // Button to fly the camera to terrain asset
        var zoomToTd = document.createElement('td');
        itTr.appendChild(zoomToTd);
        var zoomToBtn = document.createElement('input');
        zoomToTd.appendChild(zoomToBtn);
        zoomToBtn.type = 'button';
        zoomToBtn.value = 'Zoom';
        zoomToBtn.className = 'cesium-cesiumInspector-pickButton';
        zoomToBtn.setAttribute('data-bind', 'click: zoomToIonTerrain, enable: ionTerrainAssetStr');

        // Button to highlight terrain asset
        var highlightTerrainTd = document.createElement('td');
        itTr.appendChild(highlightTerrainTd);
        var highlightTerrainBtn = document.createElement('input');
        highlightTerrainTd.appendChild(highlightTerrainBtn);
        highlightTerrainTd.appendChild(document.createTextNode('Highlight'));
        highlightTerrainBtn.type = 'checkbox';
        highlightTerrainBtn.className = 'cesium-cesiumInspector-pickButton';
        highlightTerrainBtn.setAttribute('data-bind', 'checked: highlightTerrain, enable: ionTerrainAssetStr');

        var wireframe = document.createElement('div');
        terrainSection.appendChild(wireframe);
        var wCheckbox = document.createElement('input');
        wCheckbox.type = 'checkbox';
        wCheckbox.setAttribute('data-bind', 'checked: wireframe');
        wireframe.appendChild(wCheckbox);
        wireframe.appendChild(document.createTextNode('Wireframe'));

        var highlightLOD = document.createElement('div');
        terrainSection.appendChild(highlightLOD);
        var lodCheckbox = document.createElement('input');
        lodCheckbox.type = 'checkbox';
        lodCheckbox.setAttribute('data-bind', 'checked: highlightLOD');
        highlightLOD.appendChild(lodCheckbox);
        highlightLOD.appendChild(document.createTextNode('Highlight LOD levels'));

        var suspendUpdates = document.createElement('div');
        terrainSection.appendChild(suspendUpdates);
        var upCheckbox = document.createElement('input');
        upCheckbox.type = 'checkbox';
        upCheckbox.setAttribute('data-bind', 'checked: suspendUpdates');
        suspendUpdates.appendChild(upCheckbox);
        suspendUpdates.appendChild(document.createTextNode('Suspend LOD update'));

        var tileCoords = document.createElement('div');
        terrainSection.appendChild(tileCoords);
        var coordCheck = document.createElement('input');
        coordCheck.type = 'checkbox';
        coordCheck.setAttribute('data-bind', 'checked: tileCoordinates');
        tileCoords.appendChild(coordCheck);
        tileCoords.appendChild(document.createTextNode('Show tile coordinates'));

        // Position
        var position = document.createElement('div');
        position.className = 'cesium-cesiumInspector-sectionHeader';
        position.appendChild(createPlus('togglePosition', 'positionSwitchText'));
        position.appendChild(document.createTextNode('Position'));
        panel.appendChild(position);

        var positionSection = document.createElement('div');
        positionSection.className = 'cesium-cesiumInspector-subSection';
        positionSection.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : positionVisible, "cesium-cesiumInspector-hide" :  !positionVisible}');
        panel.appendChild(positionSection);

        var ionPositionTable = document.createElement('table');
        positionSection.appendChild(ionPositionTable);
        ionPositionTable.className = 'cesium-cesiumInspector-ionPositionTable';

        // Text field for camera position longitude
        var cameraLongitudeTr = document.createElement('tr');
        ionPositionTable.appendChild(cameraLongitudeTr);
        var cameraLongitudeTd = document.createElement('td');
        var cameraLongitudeText = document.createElement('input');
        cameraLongitudeTd.appendChild(cameraLongitudeText);
        cameraLongitudeTr.appendChild(document.createTextNode("Lon: "));
        cameraLongitudeTr.appendChild(cameraLongitudeTd);
        cameraLongitudeText.type = 'text';
        cameraLongitudeText.placeholder = 'Longitude';
        cameraLongitudeText.className = 'cesium-cesiumInspector-positionText';
        cameraLongitudeText.setAttribute('data-bind',
            'textInput: longitudeText, style: {color: isNaN(longitudeText) ? \'red\' : \'black\'}');

        // Text field for camera position latitude
        var cameraLatitudeTr = document.createElement('tr');
        ionPositionTable.appendChild(cameraLatitudeTr);
        var cameraLatitudeTd = document.createElement('td');
        var cameraLatitudeText = document.createElement('input');
        cameraLatitudeTd.appendChild(cameraLatitudeText);
        cameraLatitudeTr.appendChild(document.createTextNode("Lat: "));
        cameraLatitudeTr.appendChild(cameraLatitudeTd);
        cameraLatitudeText.type = 'text';
        cameraLatitudeText.placeholder = 'Latitude';
        cameraLatitudeText.className = 'cesium-cesiumInspector-positionText';
        cameraLatitudeText.setAttribute('data-bind',
            'textInput: latitudeText, style: {color: isNaN(latitudeText) ? \'red\' : \'black\'}');

        // Text field for camera position height
        var cameraHeightTr = document.createElement('tr');
        ionPositionTable.appendChild(cameraHeightTr);
        var cameraHeightTd = document.createElement('td');
        var cameraHeightText = document.createElement('input');
        cameraHeightTd.appendChild(cameraHeightText);
        cameraHeightTr.appendChild(document.createTextNode("Hgt: "));
        cameraHeightTr.appendChild(cameraHeightTd);
        cameraHeightText.type = 'text';
        cameraHeightText.placeholder = 'Height';
        cameraHeightText.className = 'cesium-cesiumInspector-positionText';
        cameraHeightText.setAttribute('data-bind',
            'textInput: heightText, style: {color: isNaN(heightText) ? \'red\' : \'black\'}');

         // Text field for camera heading
         var cameraHeadingTr = document.createElement('tr');
         ionPositionTable.appendChild(cameraHeadingTr);
         var cameraHeadingTd = document.createElement('td');
         var cameraHeadingText = document.createElement('input');
         cameraHeadingTd.appendChild(cameraHeadingText);
         cameraHeadingTr.appendChild(document.createTextNode("H: "));
         cameraHeadingTr.appendChild(cameraHeadingTd);
         cameraHeadingText.type = 'text';
         cameraHeadingText.placeholder = 'Heading';
         cameraHeadingText.className = 'cesium-cesiumInspector-positionText';
         cameraHeadingText.setAttribute('data-bind',
             'textInput: headingText, style: {color: isNaN(headingText) ? \'red\' : \'black\'}');

         // Text field for camera pitch
         var cameraPitchTr = document.createElement('tr');
         ionPositionTable.appendChild(cameraPitchTr);
         var cameraPitchTd = document.createElement('td');
         var cameraPitchText = document.createElement('input');
         cameraPitchTd.appendChild(cameraPitchText);
         cameraPitchTr.appendChild(document.createTextNode("P: "));
         cameraPitchTr.appendChild(cameraPitchTd);
         cameraPitchText.type = 'text';
         cameraPitchText.placeholder = 'Pitch';
         cameraPitchText.className = 'cesium-cesiumInspector-positionText';
         cameraPitchText.setAttribute('data-bind',
             'textInput: pitchText, style: {color: isNaN(pitchText) ? \'red\' : \'black\'}');

         // Text field for camera roll
         var cameraRollTr = document.createElement('tr');
         ionPositionTable.appendChild(cameraRollTr);
         var cameraRollTd = document.createElement('td');
         var cameraRollText = document.createElement('input');
         cameraRollTd.appendChild(cameraRollText);
         cameraRollTr.appendChild(document.createTextNode("R: "));
         cameraRollTr.appendChild(cameraRollTd);
         cameraRollText.type = 'text';
         cameraRollText.placeholder = 'Roll';
         cameraRollText.className = 'cesium-cesiumInspector-positionText';
         cameraRollText.setAttribute('data-bind',
             'textInput: rollText, style: {color: isNaN(rollText) ? \'red\' : \'black\'}');

        // Table of go-to-position button and google earth button
        var positionButtonsTable = document.createElement('table');
        var positionButtonsTr = document.createElement('tr');
        positionSection.appendChild(positionButtonsTable);
        positionButtonsTable.appendChild(positionButtonsTr);
        var cameraGoToPosTd = document.createElement('td');
        var goGoogleEarthTd = document.createElement('td');
        positionButtonsTr.appendChild(cameraGoToPosTd);
        positionButtonsTr.appendChild(goGoogleEarthTd);

        // Button to fly the camera to a certain position
        var cameraGoToPosBtn = document.createElement('input');
        cameraGoToPosTd.appendChild(cameraGoToPosBtn);
        cameraGoToPosBtn.type = 'button';
        cameraGoToPosBtn.value = 'Go Here!';
        cameraGoToPosBtn.className = 'cesium-cesiumInspector-pickButton';
        cameraGoToPosBtn.setAttribute('data-bind',
            'click: goToPosition, enable: !isNaN(heightText) && ' +
            '!isNaN(latitudeText) && !isNaN(longitudeText) && ' +
            '!isNaN(headingText) && !isNaN(pitchText) && !isNaN(rollText)');

        // Button to open this location in Google Earth
        var goGoogleEarthBtn = document.createElement('input');
        goGoogleEarthTd.appendChild(goGoogleEarthBtn);
        goGoogleEarthBtn.type = 'button';
        goGoogleEarthBtn.value = 'Google Earth This';
        goGoogleEarthBtn.className = 'cesium-cesiumInspector-pickButton';
        goGoogleEarthBtn.setAttribute('data-bind',
            'click: goToGoogleEarth, enable: !isNaN(heightText) && ' +
            '!isNaN(latitudeText) && !isNaN(longitudeText) && ' +
            '!isNaN(headingText) && !isNaN(pitchText) && !isNaN(rollText)');

        knockout.applyBindings(viewModel, this._element);
    }

    defineProperties(CesiumInspector.prototype, {
        /**
         * Gets the parent container.
         * @memberof CesiumInspector.prototype
         *
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            }
        },

        /**
         * Gets the view model.
         * @memberof CesiumInspector.prototype
         *
         * @type {CesiumInspectorViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    CesiumInspector.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    CesiumInspector.prototype.destroy = function() {
        knockout.cleanNode(this._element);
        this._container.removeChild(this._element);
        this.viewModel.destroy();

        return destroyObject(this);
    };

    return CesiumInspector;
});
