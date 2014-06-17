arel.Debug.activate();

var methodExists = function (object, method) {
    return typeof object !== 'undefined' && typeof method === 'function';
};

arel.sceneReady(function() {

    var scenario = {};
    scenario.objectName = "scenario";
    scenario.contents = []; // Array of all contents in this AR scenario
    scenario.trackables = []; // Array of all trackables in this AR scenario
    scenario.scenes = []; // Array of all scenes in this AR scenario
    scenario.googleAnalytics = null;
    scenario.currentScene = null;
    scenario.currentExperience360 = null;
    scenario.instantTrackingMode = false; // True if instant tracking is currently running
    scenario.currentTrackingConfigPathOrIdentifier = "html/resources/TrackingData.zip";

    scenario.addObject = function (object) {
        arel.Debug.log("scenario.addObject(" + object.objectName + ")");
        this.registerObject(object);
        arel.Scene.addObject(object);
    };

    scenario.registerObject = function (object) {
        arel.Debug.log("scenario.registerObject(" + object.objectName + ")");
        arel.Events.setListener(object, this.objectEventsCallback, scenario);
    };

    scenario.groupID = 0;
    scenario.getNewGroupID = function () {
        this.groupID++;
        return this.groupID;
    };

    scenario.getTrackable = function (identifier) {
        arel.Debug.log("scenario.getTrackable(" + identifier + ")");
        var i;
        var trackable = null;
        if (!identifier || identifier === "") {
            arel.Debug.log("scenario.getTrackable(): Warning - identifier is empty, returning null");
            return trackable;
        }
        var allTrackables = this.trackables;
        for (i = 0; i < allTrackables.length; ++i) {
            trackable = allTrackables[i];
            if (trackable.objectName == identifier) {
                return trackable;
            }
            if (trackable.cosName == identifier) {
                return trackable;
            }
            if (trackable.cosID == identifier) {
                return trackable;
            }
        }
        arel.Debug.log("scenario.getTrackable(" + identifier + "): Error - could not correlate the given identifier to any known trackable.");
        return null;
    };

    scenario.sceneCallback = function (type, result) {
        if (!type) {
            return;
        }
        switch (type) {
        case arel.Events.Scene.ONTRACKING:
            this.onTrackingChanged(result);
            break;
        case arel.Events.Scene.ONVISUALSEARCHRESULT:
            break;
        case arel.Events.Scene.ONREADY:
            break;
        case arel.Events.Scene.ONLOAD:
        case arel.Events.Scene.ONLOCATIONUPDATE:
        default:
            break;
        }
    };

    scenario.objectEventsCallback = function (object, type, params) {
        switch (type) {
        case arel.Events.Object.ONREADY:
            if (methodExists(object, object.onLoaded)) {
                object.onLoaded();
            }
            break;
        case arel.Events.Object.ONTOUCHSTARTED:
            if (this.googleAnalytics) {
                this.googleAnalytics.logUIInteraction(arel.Plugin.Analytics.Action.TOUCHSTARTED, object.getID());
            }
            break;
        case arel.Events.Object.ONTOUCHENDED:
            if (this.googleAnalytics) {
                this.googleAnalytics.logUIInteraction(arel.Plugin.Analytics.Action.TOUCHENDED, object.getID());
            }
            break;
        case arel.Events.Object.ONINVISIBLE:
        case arel.Events.Object.ONVISIBLE:
        case arel.Events.Object.ONANIMATIONENDED:
        case arel.Events.Object.ONMOVIEENDED:
        case arel.Events.Object.ONLOAD:
        case arel.Events.Object.ONROTATED:
        case arel.Events.Object.ONSCALED:
        case arel.Events.Object.ONTRANSLATED:
        default:
            break;
        }
    };

    scenario.onTrackingChanged = function (trackingValuesList) {
        if (trackingValuesList.length === 0) {
            arel.Debug.log("scenario.onTrackingChanged: Error - list of tracking values is empty, this should be impossible.");
            return;
        }
        var i, trackingValues, cosName, cosID, trackable, trackingMethod, gaTrackingMethod;
        for (i = 0; i < trackingValuesList.length; i++) {
            trackingValues = trackingValuesList[i];
            trackable = null;
            cosName = trackingValues.getCoordinateSystemName();
            cosID = trackingValues.getCoordinateSystemID();
            // Try to find the trackable by its COS name first. If that fails, try the COS ID.
            if (cosName && cosName !== "") {
                trackable = this.getTrackable(cosName);
            }
            if (trackable === null && cosID) {
                trackable = this.getTrackable(cosID);
            }
            if (trackable === null) {
                arel.Debug.log("onTrackingChanged: Error - Can't find a trackable matching COS name '" + cosName + "' or COS ID '" + cosID + "'");
                return;
            }
            else {
                // The cosID 1 is strictly reserved for the 360 experience if it is running.
                if (scenario.currentExperience360 && cosID === 1) {
                    return;
                }
            }

            switch (trackingValues.getState()) {
            case arel.Tracking.STATE_NOTTRACKING:
                arel.Debug.log("onTrackingChanged: " + trackable.objectName + " is not tracking");
                if (methodExists(trackable, trackable.onTrackingLost)) {
                    trackable.onTrackingLost(trackingValues);
                }
                break;
            case arel.Tracking.STATE_TRACKING:
                arel.Debug.log("onTrackingChanged: " + trackable.objectName + " is tracking");
                if (methodExists(trackable, trackable.onDetected)) {
                    trackable.onDetected();
                }
                if (methodExists(trackable, trackable.onTracked)) {
                    trackable.onTracked(trackingValues);
                }
                if (this.googleAnalytics) {
                    trackingMethod  = trackingValues.getType();
                    gaTrackingMethod = this.googleAnalytics.trackingTypeToAnalyticsType(trackingMethod);
                    this.googleAnalytics.logTrackingEvent(gaTrackingMethod, arel.Plugin.Analytics.Action.STATE_TRACKING, cosID, cosName);
                }
                break;
            case arel.Tracking.STATE_EXTRAPOLATED:
            case arel.Tracking.STATE_INITIALIZED:
            case arel.Tracking.STATE_REGISTERED:
            default:
                break;
            }
        }
    };


    scenario.startInstantTracking = function () {
        arel.Debug.log("scenario.startInstantTracking()");
        if (this.instantTrackingMode) {
            return;
        }
        this.instantTrackingMode = true;

		   if (scenario.currentExperience360) {
            scenario.currentExperience360.hide();
        }

        // Iterate over all trackables, simulate an onTrackingLost() for all those which are currently tracking.
        var i, trackable;
        for (i = 0; i < this.trackables.length; ++i) {
            trackable = this.trackables[i];
            if (trackable.isCurrentlyTracking && trackable != userDevice) {
                if (methodExists(trackable, trackable.onTrackingLost)) {
                    trackable.onTrackingLost();
                }
            }
        }
        arel.Scene.startInstantTracking(arel.Tracking.INSTANT2D);
        if (methodExists(this, this.onStartInstantTracking)) {
            this.onStartInstantTracking();
        }
    };

    scenario.stopInstantTracking = function () {
        arel.Debug.log("scenario.stopInstantTracking()");
        if (!this.instantTrackingMode) {
            return;
        }
        this.instantTrackingMode = false;
        if (methodExists(instantTracker, instantTracker.onTrackingLost)) {
            instantTracker.onTrackingLost();
        }
        this.setTrackingConfiguration(this.currentTrackingConfigPathOrIdentifier);
        if (methodExists(this, this.onStopInstantTracking)) {
            this.onStopInstantTracking();
        }
    };

    scenario.skipTrackingInitialization = function () {
        arel.Debug.log("scenario.skipTrackingInitialization()");
        arel.Scene.sensorCommand("initialize", "", function(a) {});
        if (methodExists(this, this.onSkipTrackingInitialization)) {
            this.onSkipTrackingInitialization();
        }
    };

    scenario.reloadTrackingConfiguration = function () {
        arel.Debug.log("scenario.reloadTrackingConfiguration()");
        this.setTrackingConfiguration(this.currentTrackingConfigPathOrIdentifier);
        if (methodExists(this, this.onReloadTrackingConfiguration)) {
            this.onReloadTrackingConfiguration();
        }
    };

    scenario.setTrackingConfiguration = function (trackingConfigPathOrIdentifier) {
        // Iterate over all trackables, simulate an onTrackingLost() for all those which are currently tracking.
        var i, trackable;
        for (i = 0; i < this.trackables.length; ++i) {
            trackable = this.trackables[i];
            if (trackable.isCurrentlyTracking && trackable != userDevice) {
                if (methodExists(trackable, trackable.onTrackingLost)) {
                    trackable.onTrackingLost();
                }
            }
        }

        // Set the new tracking configuration.
        arel.Scene.setTrackingConfiguration(trackingConfigPathOrIdentifier);
    };

    scenario.onStartup = function () {
        arel.Debug.log("Welcome to the 'Testing-Offices' Augmented Reality experience.");

        arel.Events.setListener(arel.Scene, scenario.sceneCallback, scenario);

        if (google_analytics_id) {
            arel.Debug.log("Google Analytics is enabled. Your account ID is: " + google_analytics_id);
            arel.Debug.log("The event sampling rate is: arel.Plugin.Analytics.EventSampling.ONCE");
            scenario.googleAnalytics = new arel.Plugin.Analytics(google_analytics_id, arel.Plugin.Analytics.EventSampling.ONCE, "");
        } else {
            arel.Debug.log("Note: No Google Analytics ID is set - Google Analytics will be disabled.");
        }

        if (methodExists(scenario, scenario.onLoaded)) {
            scenario.onLoaded();
        }

        // The following contents have been defined in the index.xml file, therefore we need to register them
        // and call their onLoaded() event manually.
        scenario.registerObject(model2);
        if (methodExists(model2, model2.onLoaded)) {
            model2.onLoaded();
        }
        scenario.registerObject(model3);
        if (methodExists(model3, model3.onLoaded)) {
            model3.onLoaded();
        }
        scenario.registerObject(model4);
        if (methodExists(model4, model4.onLoaded)) {
            model4.onLoaded();
        }
        scenario.registerObject(model5);
        if (methodExists(model5, model5.onLoaded)) {
            model5.onLoaded();
        }
        scenario.registerObject(model6);
        if (methodExists(model6, model6.onLoaded)) {
            model6.onLoaded();
        }
        scenario.registerObject(model7);
        if (methodExists(model7, model7.onLoaded)) {
            model7.onLoaded();
        }
        scenario.registerObject(model8);
        if (methodExists(model8, model8.onLoaded)) {
            model8.onLoaded();
        }
        scenario.registerObject(model9);
        if (methodExists(model9, model9.onLoaded)) {
            model9.onLoaded();
        }


        if (methodExists(userDevice, userDevice.onLoaded)) {
            userDevice.onLoaded();
        }

        // All objects have been defined, so start the AR experience by calling each trackable's .onLoaded() method.
        var i, trackable;
        for (i = 0; i < scenario.trackables.length; ++i) {
            trackable = scenario.trackables[i];
            if (methodExists(trackable, trackable.onLoaded)) {
                trackable.onLoaded();
            }
        }

        // Call the first scene's display() once to make sure that the content of that scene is initially visible.
        scene1.display();
    };


    var scene1 = {};
    scenario.scenes.push(scene1);
    scene1.objectName = "scene1";

    scene1.display = function () {
        arel.Debug.log(this.objectName + ".display()");

        if (scenario.currentScene == this) {
            return;
        }

        // Iterate over all trackables, simulate an onTrackingLost() for all those which are currently tracking.
        var trackingTrackables = [];
        var i, trackable;
        for (i = 0; i < scenario.trackables.length; ++i) {
            trackable = scenario.trackables[i];
            if (trackable.isCurrentlyTracking) {
                // The instant tracker should be excluded from the tracking ones because it will be stopped later on.
                if (trackable !== instantTracker) {
                    trackingTrackables.push(trackable);
                }
                if (methodExists(trackable, trackable.onTrackingLost)) {
                    trackable.onTrackingLost();
                }
            }
        }

        // In case any instant tracking is currently running, stop it before switching to the other scene.
        scenario.stopInstantTracking();

        var previousExperience360 = null;
        if (scenario.currentExperience360) {
            previousExperience360 = scenario.currentExperience360;
            scenario.currentExperience360.hide();
        }

        scenario.currentScene = this;

        // Iterate over all tracking trackables again, this time simulating an onDetected() and onTracked() event
        // for all those which are currently tracking.
        for (i = 0; i < trackingTrackables.length; ++i) {
            trackable = trackingTrackables[i];
            if (methodExists(trackable, trackable.onDetected)) {
                trackable.onDetected();
            }
            if (methodExists(trackable, trackable.onTracked)) {
                trackable.onTracked(trackable.currentTrackingValues);
            }
        }

        if (previousExperience360) {
            // A 360 was displayed in the previous scene, we now need to check whether any 360 in the new scene
            // is triggered by the same trackable. If so, that 360 should be displayed.
            var i, content;
            for (i = 0; i < scenario.contents.length; ++i) {
                content = scenario.contents[i];
                if (content.type == "Experience360" && content.scene == this && 
                    content.associatedTrackable == previousExperience360.associatedTrackable) {
                    content.display();
                    break;
                }
            }
        }

        if (methodExists(this, this.onDisplayed)) {
            this.onDisplayed();
        }
    };


    var instantTracker = {};
    scenario.trackables.push(instantTracker);
    instantTracker.objectName = "instantTracker";
    instantTracker.cosName = "InstantTracker";
    instantTracker.cosID = "1";
    instantTracker.isCurrentlyTracking = false;
    instantTracker.currentTrackingValues = null;
    instantTracker.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
    };

    instantTracker.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
    };


    var ml3Dmap4 = {};
    scenario.trackables.push(ml3Dmap4);
    ml3Dmap4.objectName = "ml3Dmap4";
    ml3Dmap4.cosName = "map-20140516092337_1";
    ml3Dmap4.cosID = "1";
    ml3Dmap4.isCurrentlyTracking = false;
    ml3Dmap4.currentTrackingValues = null;
    ml3Dmap4.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        model2.display();
        model5.display();
        model4.display();
        model3.display();
        /**** Begin of custom script ****/
        
        	arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap4.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        /**** Begin of custom script ****/
        
        	arel.Media.openWebsite('targetTrackEnded=CentralPark', false);
        
        /***** End of custom script *****/
        model5.hide();
        model3.hide();
        model2.hide();
        model4.hide();
    };

    ml3Dmap4.onUnloaded = function () {
        arel.Debug.log(this.objectName + ".onUnloaded()");
        /**** Begin of custom script ****/
        
        ;
        
        /***** End of custom script *****/
    };


    var ml3Dmap8 = {};
    scenario.trackables.push(ml3Dmap8);
    ml3Dmap8.objectName = "ml3Dmap8";
    ml3Dmap8.cosName = "map-20140616105022_2";
    ml3Dmap8.cosID = "2";
    ml3Dmap8.isCurrentlyTracking = false;
    ml3Dmap8.currentTrackingValues = null;
    ml3Dmap8.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        model7.display();
        model8.display();
        model6.display();
        model9.display();
    };

    ml3Dmap8.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        model6.hide();
        model7.hide();
        model9.hide();
        model8.hide();
    };


    var userDevice = {};
    userDevice.isCurrentlyTracking = true; // The pose of the user's device is always tracked...
    scenario.trackables.push(userDevice);
    userDevice.objectName = "userDevice";
    userDevice.cosName = "Device";
    userDevice.cosID = "-1";
    userDevice.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
    };

    userDevice.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
    };


    // qma4
    var model2 = arel.Scene.getObject("model2");
    model2.objectName = "model2";
    model2.type = "Model";
    model2.scene = scene1;
    model2.associatedTrackable = ml3Dmap4;
    model2.displayOnLoaded = false;
    scenario.contents.push(model2);

    model2.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model2.isLoaded = function () {
        return arel.Scene.objectExists("model2");
    };

    model2.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model2.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model2.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model2.display = function () {
        arel.Debug.log(this.objectName + ".display()");
        if (this.scene && this.scene != scenario.currentScene) {
            return;
        }
        
        if (!this.isLoaded()) {
            this.displayOnLoaded = true;
            this.load();
            return;
        }
        
        this.setVisibility(true);
    };

    model2.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model2.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model2);
            }
            arel.GestureHandler.addObject("model2", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model2.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model2.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        	arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model2.onLoaded = function () {
        arel.Debug.log(this.objectName + ".onLoaded()");
        this.hide();
        if (this.displayOnLoaded) { 
            this.displayOnLoaded = false;
            this.display();
        }
        if (this.playOnLoaded) { 
            this.playOnLoaded = false;
            this.play();
        }
    };


    // qma4
    var model3 = arel.Scene.getObject("model3");
    model3.objectName = "model3";
    model3.type = "Model";
    model3.scene = scene1;
    model3.associatedTrackable = ml3Dmap4;
    model3.displayOnLoaded = false;
    scenario.contents.push(model3);

    model3.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model3.isLoaded = function () {
        return arel.Scene.objectExists("model3");
    };

    model3.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model3.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model3.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model3.display = function () {
        arel.Debug.log(this.objectName + ".display()");
        if (this.scene && this.scene != scenario.currentScene) {
            return;
        }
        
        if (!this.isLoaded()) {
            this.displayOnLoaded = true;
            this.load();
            return;
        }
        
        this.setVisibility(true);
    };

    model3.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model3.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model3);
            }
            arel.GestureHandler.addObject("model3", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model3.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model3.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        	arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model3.onLoaded = function () {
        arel.Debug.log(this.objectName + ".onLoaded()");
        this.hide();
        if (this.displayOnLoaded) { 
            this.displayOnLoaded = false;
            this.display();
        }
        if (this.playOnLoaded) { 
            this.playOnLoaded = false;
            this.play();
        }
    };


    // qma4
    var model4 = arel.Scene.getObject("model4");
    model4.objectName = "model4";
    model4.type = "Model";
    model4.scene = scene1;
    model4.associatedTrackable = ml3Dmap4;
    model4.displayOnLoaded = false;
    scenario.contents.push(model4);

    model4.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model4.isLoaded = function () {
        return arel.Scene.objectExists("model4");
    };

    model4.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model4.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model4.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model4.display = function () {
        arel.Debug.log(this.objectName + ".display()");
        if (this.scene && this.scene != scenario.currentScene) {
            return;
        }
        
        if (!this.isLoaded()) {
            this.displayOnLoaded = true;
            this.load();
            return;
        }
        
        this.setVisibility(true);
    };

    model4.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model4.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model4);
            }
            arel.GestureHandler.addObject("model4", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model4.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model4.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        	arel.Media.openWebsite('poiTouchEnded=CentralPark-3', false);
        
        /***** End of custom script *****/
    };

    model4.onLoaded = function () {
        arel.Debug.log(this.objectName + ".onLoaded()");
        this.hide();
        if (this.displayOnLoaded) { 
            this.displayOnLoaded = false;
            this.display();
        }
        if (this.playOnLoaded) { 
            this.playOnLoaded = false;
            this.play();
        }
    };


    // qma4
    var model5 = arel.Scene.getObject("model5");
    model5.objectName = "model5";
    model5.type = "Model";
    model5.scene = scene1;
    model5.associatedTrackable = ml3Dmap4;
    model5.displayOnLoaded = false;
    scenario.contents.push(model5);

    model5.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model5.isLoaded = function () {
        return arel.Scene.objectExists("model5");
    };

    model5.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model5.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model5.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model5.display = function () {
        arel.Debug.log(this.objectName + ".display()");
        if (this.scene && this.scene != scenario.currentScene) {
            return;
        }
        
        if (!this.isLoaded()) {
            this.displayOnLoaded = true;
            this.load();
            return;
        }
        
        this.setVisibility(true);
    };

    model5.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model5.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model5);
            }
            arel.GestureHandler.addObject("model5", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model5.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model5.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        	arel.Media.openWebsite('poiTouchEnded=CentralPark-4', false);
        
        /***** End of custom script *****/
    };

    model5.onLoaded = function () {
        arel.Debug.log(this.objectName + ".onLoaded()");
        this.hide();
        if (this.displayOnLoaded) { 
            this.displayOnLoaded = false;
            this.display();
        }
        if (this.playOnLoaded) { 
            this.playOnLoaded = false;
            this.play();
        }
    };


    // qma4
    var model6 = arel.Scene.getObject("model6");
    model6.objectName = "model6";
    model6.type = "Model";
    model6.scene = scene1;
    model6.associatedTrackable = ml3Dmap8;
    model6.displayOnLoaded = false;
    scenario.contents.push(model6);

    model6.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model6.isLoaded = function () {
        return arel.Scene.objectExists("model6");
    };

    model6.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model6.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model6.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model6.display = function () {
        arel.Debug.log(this.objectName + ".display()");
        if (this.scene && this.scene != scenario.currentScene) {
            return;
        }
        
        if (!this.isLoaded()) {
            this.displayOnLoaded = true;
            this.load();
            return;
        }
        
        this.setVisibility(true);
    };

    model6.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model6.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model6);
            }
            arel.GestureHandler.addObject("model6", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model6.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model6.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        	arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model6.onLoaded = function () {
        arel.Debug.log(this.objectName + ".onLoaded()");
        this.hide();
        if (this.displayOnLoaded) { 
            this.displayOnLoaded = false;
            this.display();
        }
        if (this.playOnLoaded) { 
            this.playOnLoaded = false;
            this.play();
        }
    };


    // qma4
    var model7 = arel.Scene.getObject("model7");
    model7.objectName = "model7";
    model7.type = "Model";
    model7.scene = scene1;
    model7.associatedTrackable = ml3Dmap8;
    model7.displayOnLoaded = false;
    scenario.contents.push(model7);

    model7.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model7.isLoaded = function () {
        return arel.Scene.objectExists("model7");
    };

    model7.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model7.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model7.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model7.display = function () {
        arel.Debug.log(this.objectName + ".display()");
        if (this.scene && this.scene != scenario.currentScene) {
            return;
        }
        
        if (!this.isLoaded()) {
            this.displayOnLoaded = true;
            this.load();
            return;
        }
        
        this.setVisibility(true);
    };

    model7.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model7.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model7);
            }
            arel.GestureHandler.addObject("model7", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model7.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model7.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        	arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model7.onLoaded = function () {
        arel.Debug.log(this.objectName + ".onLoaded()");
        this.hide();
        if (this.displayOnLoaded) { 
            this.displayOnLoaded = false;
            this.display();
        }
        if (this.playOnLoaded) { 
            this.playOnLoaded = false;
            this.play();
        }
    };


    // qma4
    var model8 = arel.Scene.getObject("model8");
    model8.objectName = "model8";
    model8.type = "Model";
    model8.scene = scene1;
    model8.associatedTrackable = ml3Dmap8;
    model8.displayOnLoaded = false;
    scenario.contents.push(model8);

    model8.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model8.isLoaded = function () {
        return arel.Scene.objectExists("model8");
    };

    model8.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model8.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model8.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model8.display = function () {
        arel.Debug.log(this.objectName + ".display()");
        if (this.scene && this.scene != scenario.currentScene) {
            return;
        }
        
        if (!this.isLoaded()) {
            this.displayOnLoaded = true;
            this.load();
            return;
        }
        
        this.setVisibility(true);
    };

    model8.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model8.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model8);
            }
            arel.GestureHandler.addObject("model8", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model8.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model8.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        	arel.Media.openWebsite('poiTouchEnded=CentralPark-3', false);
        
        /***** End of custom script *****/
    };

    model8.onLoaded = function () {
        arel.Debug.log(this.objectName + ".onLoaded()");
        this.hide();
        if (this.displayOnLoaded) { 
            this.displayOnLoaded = false;
            this.display();
        }
        if (this.playOnLoaded) { 
            this.playOnLoaded = false;
            this.play();
        }
    };


    // qma4
    var model9 = arel.Scene.getObject("model9");
    model9.objectName = "model9";
    model9.type = "Model";
    model9.scene = scene1;
    model9.associatedTrackable = ml3Dmap8;
    model9.displayOnLoaded = false;
    scenario.contents.push(model9);

    model9.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model9.isLoaded = function () {
        return arel.Scene.objectExists("model9");
    };

    model9.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model9.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model9.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model9.display = function () {
        arel.Debug.log(this.objectName + ".display()");
        if (this.scene && this.scene != scenario.currentScene) {
            return;
        }
        
        if (!this.isLoaded()) {
            this.displayOnLoaded = true;
            this.load();
            return;
        }
        
        this.setVisibility(true);
    };

    model9.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model9.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model9);
            }
            arel.GestureHandler.addObject("model9", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model9.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model9.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        	arel.Media.openWebsite('poiTouchEnded=CentralPark-4', false);
        
        /***** End of custom script *****/
    };

    model9.onLoaded = function () {
        arel.Debug.log(this.objectName + ".onLoaded()");
        this.hide();
        if (this.displayOnLoaded) { 
            this.displayOnLoaded = false;
            this.display();
        }
        if (this.playOnLoaded) { 
            this.playOnLoaded = false;
            this.play();
        }
    };


    // Kick-off the AR experience by calling the scenario's onStartup() method as soon as AREL is ready
    scenario.onStartup();
});