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
        arel.Debug.log("Welcome to the 'qma73114' Augmented Reality experience.");

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
        scenario.registerObject(image3);
        if (methodExists(image3, image3.onLoaded)) {
            image3.onLoaded();
        }
        scenario.registerObject(image5);
        if (methodExists(image5, image5.onLoaded)) {
            image5.onLoaded();
        }
        scenario.registerObject(image20);
        if (methodExists(image20, image20.onLoaded)) {
            image20.onLoaded();
        }
        scenario.registerObject(image21);
        if (methodExists(image21, image21.onLoaded)) {
            image21.onLoaded();
        }
        scenario.registerObject(image22);
        if (methodExists(image22, image22.onLoaded)) {
            image22.onLoaded();
        }
        scenario.registerObject(image23);
        if (methodExists(image23, image23.onLoaded)) {
            image23.onLoaded();
        }
        scenario.registerObject(image24);
        if (methodExists(image24, image24.onLoaded)) {
            image24.onLoaded();
        }
        scenario.registerObject(image25);
        if (methodExists(image25, image25.onLoaded)) {
            image25.onLoaded();
        }
        scenario.registerObject(image26);
        if (methodExists(image26, image26.onLoaded)) {
            image26.onLoaded();
        }
        scenario.registerObject(image28);
        if (methodExists(image28, image28.onLoaded)) {
            image28.onLoaded();
        }
        scenario.registerObject(image29);
        if (methodExists(image29, image29.onLoaded)) {
            image29.onLoaded();
        }
        scenario.registerObject(image36);
        if (methodExists(image36, image36.onLoaded)) {
            image36.onLoaded();
        }
        scenario.registerObject(model37);
        if (methodExists(model37, model37.onLoaded)) {
            model37.onLoaded();
        }
        scenario.registerObject(model38);
        if (methodExists(model38, model38.onLoaded)) {
            model38.onLoaded();
        }
        scenario.registerObject(model39);
        if (methodExists(model39, model39.onLoaded)) {
            model39.onLoaded();
        }
        scenario.registerObject(model40);
        if (methodExists(model40, model40.onLoaded)) {
            model40.onLoaded();
        }
        scenario.registerObject(image38);
        if (methodExists(image38, image38.onLoaded)) {
            image38.onLoaded();
        }
        scenario.registerObject(image39);
        if (methodExists(image39, image39.onLoaded)) {
            image39.onLoaded();
        }
        scenario.registerObject(image40);
        if (methodExists(image40, image40.onLoaded)) {
            image40.onLoaded();
        }
        scenario.registerObject(image41);
        if (methodExists(image41, image41.onLoaded)) {
            image41.onLoaded();
        }
        scenario.registerObject(image42);
        if (methodExists(image42, image42.onLoaded)) {
            image42.onLoaded();
        }
        scenario.registerObject(image43);
        if (methodExists(image43, image43.onLoaded)) {
            image43.onLoaded();
        }
        scenario.registerObject(image44);
        if (methodExists(image44, image44.onLoaded)) {
            image44.onLoaded();
        }
        scenario.registerObject(image45);
        if (methodExists(image45, image45.onLoaded)) {
            image45.onLoaded();
        }
        scenario.registerObject(image46);
        if (methodExists(image46, image46.onLoaded)) {
            image46.onLoaded();
        }
        scenario.registerObject(image48);
        if (methodExists(image48, image48.onLoaded)) {
            image48.onLoaded();
        }
        scenario.registerObject(image50);
        if (methodExists(image50, image50.onLoaded)) {
            image50.onLoaded();
        }
        scenario.registerObject(image52);
        if (methodExists(image52, image52.onLoaded)) {
            image52.onLoaded();
        }
        scenario.registerObject(image53);
        if (methodExists(image53, image53.onLoaded)) {
            image53.onLoaded();
        }
        scenario.registerObject(image27);
        if (methodExists(image27, image27.onLoaded)) {
            image27.onLoaded();
        }
        scenario.registerObject(image30);
        if (methodExists(image30, image30.onLoaded)) {
            image30.onLoaded();
        }
        scenario.registerObject(model42);
        if (methodExists(model42, model42.onLoaded)) {
            model42.onLoaded();
        }
        scenario.registerObject(image55);
        if (methodExists(image55, image55.onLoaded)) {
            image55.onLoaded();
        }
        scenario.registerObject(model43);
        if (methodExists(model43, model43.onLoaded)) {
            model43.onLoaded();
        }
        scenario.registerObject(model44);
        if (methodExists(model44, model44.onLoaded)) {
            model44.onLoaded();
        }
        scenario.registerObject(image57);
        if (methodExists(image57, image57.onLoaded)) {
            image57.onLoaded();
        }
        scenario.registerObject(image56);
        if (methodExists(image56, image56.onLoaded)) {
            image56.onLoaded();
        }
        scenario.registerObject(model45);
        if (methodExists(model45, model45.onLoaded)) {
            model45.onLoaded();
        }
        scenario.registerObject(model46);
        if (methodExists(model46, model46.onLoaded)) {
            model46.onLoaded();
        }
        scenario.registerObject(image58);
        if (methodExists(image58, image58.onLoaded)) {
            image58.onLoaded();
        }
        scenario.registerObject(image59);
        if (methodExists(image59, image59.onLoaded)) {
            image59.onLoaded();
        }
        scenario.registerObject(image60);
        if (methodExists(image60, image60.onLoaded)) {
            image60.onLoaded();
        }
        scenario.registerObject(image61);
        if (methodExists(image61, image61.onLoaded)) {
            image61.onLoaded();
        }
        scenario.registerObject(model47);
        if (methodExists(model47, model47.onLoaded)) {
            model47.onLoaded();
        }
        scenario.registerObject(image62);
        if (methodExists(image62, image62.onLoaded)) {
            image62.onLoaded();
        }
        scenario.registerObject(image63);
        if (methodExists(image63, image63.onLoaded)) {
            image63.onLoaded();
        }
        scenario.registerObject(image64);
        if (methodExists(image64, image64.onLoaded)) {
            image64.onLoaded();
        }
        scenario.registerObject(image47);
        if (methodExists(image47, image47.onLoaded)) {
            image47.onLoaded();
        }
        scenario.registerObject(model48);
        if (methodExists(model48, model48.onLoaded)) {
            model48.onLoaded();
        }
        scenario.registerObject(model49);
        if (methodExists(model49, model49.onLoaded)) {
            model49.onLoaded();
        }
        scenario.registerObject(model51);
        if (methodExists(model51, model51.onLoaded)) {
            model51.onLoaded();
        }
        scenario.registerObject(model52);
        if (methodExists(model52, model52.onLoaded)) {
            model52.onLoaded();
        }
        scenario.registerObject(model53);
        if (methodExists(model53, model53.onLoaded)) {
            model53.onLoaded();
        }
        scenario.registerObject(model54);
        if (methodExists(model54, model54.onLoaded)) {
            model54.onLoaded();
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


    var ml3Dmap15 = {};
    scenario.trackables.push(ml3Dmap15);
    ml3Dmap15.objectName = "ml3Dmap15";
    ml3Dmap15.cosName = "NJ_LMan_Man_3";
    ml3Dmap15.cosID = "3";
    ml3Dmap15.isCurrentlyTracking = false;
    ml3Dmap15.currentTrackingValues = null;
    ml3Dmap15.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        model38.display();
        image39.display();
        image50.display();
        image38.display();
        model39.display();
        image48.display();
        image40.display();
        image53.display();
        image43.display();
        image42.display();
        model37.display();
        image45.display();
        image46.display();
        model40.display();
        image44.display();
        image47.display();
        image41.display();
        image52.display();
        model48.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap15.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        model39.hide();
        image50.hide();
        image41.hide();
        image48.hide();
        image40.hide();
        image47.hide();
        model37.hide();
        model48.hide();
        image36.hide();
        image42.hide();
        image46.hide();
        image45.hide();
        image43.hide();
        model38.hide();
        model40.hide();
        image39.hide();
        image53.hide();
        image52.hide();
        image44.hide();
        image38.hide();
    };


    var ml3Dmap16 = {};
    scenario.trackables.push(ml3Dmap16);
    ml3Dmap16.objectName = "ml3Dmap16";
    ml3Dmap16.cosName = "flowerTarget_4";
    ml3Dmap16.cosID = "4";
    ml3Dmap16.isCurrentlyTracking = false;
    ml3Dmap16.currentTrackingValues = null;
    ml3Dmap16.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        model52.display();
        model54.display();
        model53.display();
        model49.display();
        model51.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap16.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        model54.hide();
        model49.hide();
        model53.hide();
        model52.hide();
        model51.hide();
    };


    var ml3Dmap2 = {};
    scenario.trackables.push(ml3Dmap2);
    ml3Dmap2.objectName = "ml3Dmap2";
    ml3Dmap2.cosName = "map-20140612130752_1";
    ml3Dmap2.cosID = "1";
    ml3Dmap2.isCurrentlyTracking = false;
    ml3Dmap2.currentTrackingValues = null;
    ml3Dmap2.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image23.display();
        model47.display();
        image60.display();
        image64.display();
        image59.display();
        image20.display();
        image62.display();
        image61.display();
        model46.display();
        model45.display();
        image63.display();
        image24.display();
        image22.display();
        image21.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap2.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        model45.hide();
        model47.hide();
        image24.hide();
        image21.hide();
        image20.hide();
        model46.hide();
        image59.hide();
        image23.hide();
        image60.hide();
        image63.hide();
        image22.hide();
        image61.hide();
        image62.hide();
        image3.hide();
        image64.hide();
    };


    var ml3Dmap3 = {};
    scenario.trackables.push(ml3Dmap3);
    ml3Dmap3.objectName = "ml3Dmap3";
    ml3Dmap3.cosName = "map-20140612130359_2";
    ml3Dmap3.cosID = "2";
    ml3Dmap3.isCurrentlyTracking = false;
    ml3Dmap3.currentTrackingValues = null;
    ml3Dmap3.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image26.display();
        model43.display();
        image25.display();
        image58.display();
        model42.display();
        image56.display();
        image27.display();
        image30.display();
        image57.display();
        image29.display();
        model44.display();
        image55.display();
        image28.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap3.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        image58.hide();
        image56.hide();
        image29.hide();
        image30.hide();
        model42.hide();
        image28.hide();
        image5.hide();
        image27.hide();
        model43.hide();
        image25.hide();
        image26.hide();
        image55.hide();
        model44.hide();
        image57.hide();
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


    // Verrazano
    if (!arel.Scene.objectExists("image20")) {
        arel.Debug.log("ERROR: retrieving the object image20, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image20 = arel.Scene.getObject("image20");
    image20.objectName = "image20";
    image20.type = "Image";
    image20.scene = scene1;
    image20.associatedTrackable = ml3Dmap2;
    image20.displayOnLoaded = false;
    scenario.contents.push(image20);

    image20.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image20.isLoaded = function () {
        return arel.Scene.objectExists("image20");
    };

    image20.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image20.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image20.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image20.display = function () {
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

    image20.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image20.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image20);
            }
            arel.GestureHandler.addObject("image20", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image20.onLoaded = function () {
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


    // GeorgeTerminal
    if (!arel.Scene.objectExists("image21")) {
        arel.Debug.log("ERROR: retrieving the object image21, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image21 = arel.Scene.getObject("image21");
    image21.objectName = "image21";
    image21.type = "Image";
    image21.scene = scene1;
    image21.associatedTrackable = ml3Dmap2;
    image21.displayOnLoaded = false;
    scenario.contents.push(image21);

    image21.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image21.isLoaded = function () {
        return arel.Scene.objectExists("image21");
    };

    image21.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image21.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image21.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image21.display = function () {
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

    image21.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image21.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image21);
            }
            arel.GestureHandler.addObject("image21", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image21.onLoaded = function () {
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


    // ConeyIsland
    if (!arel.Scene.objectExists("image22")) {
        arel.Debug.log("ERROR: retrieving the object image22, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image22 = arel.Scene.getObject("image22");
    image22.objectName = "image22";
    image22.type = "Image";
    image22.scene = scene1;
    image22.associatedTrackable = ml3Dmap2;
    image22.displayOnLoaded = false;
    scenario.contents.push(image22);

    image22.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image22.isLoaded = function () {
        return arel.Scene.objectExists("image22");
    };

    image22.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image22.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image22.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image22.display = function () {
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

    image22.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image22.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image22);
            }
            arel.GestureHandler.addObject("image22", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image22.onLoaded = function () {
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


    // Brooklyn
    if (!arel.Scene.objectExists("image23")) {
        arel.Debug.log("ERROR: retrieving the object image23, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image23 = arel.Scene.getObject("image23");
    image23.objectName = "image23";
    image23.type = "Image";
    image23.scene = scene1;
    image23.associatedTrackable = ml3Dmap2;
    image23.displayOnLoaded = false;
    scenario.contents.push(image23);

    image23.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image23.isLoaded = function () {
        return arel.Scene.objectExists("image23");
    };

    image23.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image23.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image23.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image23.display = function () {
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

    image23.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image23.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image23);
            }
            arel.GestureHandler.addObject("image23", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image23.onLoaded = function () {
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


    // StatenIsland
    if (!arel.Scene.objectExists("image24")) {
        arel.Debug.log("ERROR: retrieving the object image24, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image24 = arel.Scene.getObject("image24");
    image24.objectName = "image24";
    image24.type = "Image";
    image24.scene = scene1;
    image24.associatedTrackable = ml3Dmap2;
    image24.displayOnLoaded = false;
    scenario.contents.push(image24);

    image24.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image24.isLoaded = function () {
        return arel.Scene.objectExists("image24");
    };

    image24.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image24.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image24.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image24.display = function () {
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

    image24.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image24.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image24);
            }
            arel.GestureHandler.addObject("image24", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image24.onLoaded = function () {
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


    // Brooklyn
    if (!arel.Scene.objectExists("image25")) {
        arel.Debug.log("ERROR: retrieving the object image25, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image25 = arel.Scene.getObject("image25");
    image25.objectName = "image25";
    image25.type = "Image";
    image25.scene = scene1;
    image25.associatedTrackable = ml3Dmap3;
    image25.displayOnLoaded = false;
    scenario.contents.push(image25);

    image25.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image25.isLoaded = function () {
        return arel.Scene.objectExists("image25");
    };

    image25.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image25.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image25.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image25.display = function () {
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

    image25.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image25.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image25);
            }
            arel.GestureHandler.addObject("image25", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image25.onLoaded = function () {
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


    // StatenIsland
    if (!arel.Scene.objectExists("image26")) {
        arel.Debug.log("ERROR: retrieving the object image26, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image26 = arel.Scene.getObject("image26");
    image26.objectName = "image26";
    image26.type = "Image";
    image26.scene = scene1;
    image26.associatedTrackable = ml3Dmap3;
    image26.displayOnLoaded = false;
    scenario.contents.push(image26);

    image26.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image26.isLoaded = function () {
        return arel.Scene.objectExists("image26");
    };

    image26.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image26.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image26.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image26.display = function () {
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

    image26.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image26.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image26);
            }
            arel.GestureHandler.addObject("image26", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image26.onLoaded = function () {
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


    // Verrazano
    if (!arel.Scene.objectExists("image27")) {
        arel.Debug.log("ERROR: retrieving the object image27, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image27 = arel.Scene.getObject("image27");
    image27.objectName = "image27";
    image27.type = "Image";
    image27.scene = scene1;
    image27.associatedTrackable = ml3Dmap3;
    image27.displayOnLoaded = false;
    scenario.contents.push(image27);

    image27.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image27.isLoaded = function () {
        return arel.Scene.objectExists("image27");
    };

    image27.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image27.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image27.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image27.display = function () {
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

    image27.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image27.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image27);
            }
            arel.GestureHandler.addObject("image27", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image27.onLoaded = function () {
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


    // LowerNYBay
    if (!arel.Scene.objectExists("image28")) {
        arel.Debug.log("ERROR: retrieving the object image28, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image28 = arel.Scene.getObject("image28");
    image28.objectName = "image28";
    image28.type = "Image";
    image28.scene = scene1;
    image28.associatedTrackable = ml3Dmap3;
    image28.displayOnLoaded = false;
    scenario.contents.push(image28);

    image28.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image28.isLoaded = function () {
        return arel.Scene.objectExists("image28");
    };

    image28.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image28.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image28.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image28.display = function () {
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

    image28.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image28.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image28);
            }
            arel.GestureHandler.addObject("image28", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image28.onLoaded = function () {
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


    // GeorgeTerminal
    if (!arel.Scene.objectExists("image29")) {
        arel.Debug.log("ERROR: retrieving the object image29, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image29 = arel.Scene.getObject("image29");
    image29.objectName = "image29";
    image29.type = "Image";
    image29.scene = scene1;
    image29.associatedTrackable = ml3Dmap3;
    image29.displayOnLoaded = false;
    scenario.contents.push(image29);

    image29.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image29.isLoaded = function () {
        return arel.Scene.objectExists("image29");
    };

    image29.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image29.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image29.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image29.display = function () {
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

    image29.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image29.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image29);
            }
            arel.GestureHandler.addObject("image29", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image29.onLoaded = function () {
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


    // 1-GeneralB
    if (!arel.Scene.objectExists("image3")) {
        arel.Debug.log("ERROR: retrieving the object image3, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image3 = arel.Scene.getObject("image3");
    image3.objectName = "image3";
    image3.type = "Image";
    image3.scene = scene1;
    image3.associatedTrackable = ml3Dmap2;
    image3.displayOnLoaded = false;
    scenario.contents.push(image3);

    image3.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image3.isLoaded = function () {
        return arel.Scene.objectExists("image3");
    };

    image3.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image3.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image3.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image3.display = function () {
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

    image3.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image3.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image3);
            }
            arel.GestureHandler.addObject("image3", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image3.onLoaded = function () {
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


    // ConeyIsland
    if (!arel.Scene.objectExists("image30")) {
        arel.Debug.log("ERROR: retrieving the object image30, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image30 = arel.Scene.getObject("image30");
    image30.objectName = "image30";
    image30.type = "Image";
    image30.scene = scene1;
    image30.associatedTrackable = ml3Dmap3;
    image30.displayOnLoaded = false;
    scenario.contents.push(image30);

    image30.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image30.isLoaded = function () {
        return arel.Scene.objectExists("image30");
    };

    image30.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image30.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image30.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image30.display = function () {
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

    image30.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image30.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image30);
            }
            arel.GestureHandler.addObject("image30", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image30.onLoaded = function () {
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


    // LowerManhattan
    if (!arel.Scene.objectExists("image36")) {
        arel.Debug.log("ERROR: retrieving the object image36, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image36 = arel.Scene.getObject("image36");
    image36.objectName = "image36";
    image36.type = "Image";
    image36.scene = scene1;
    image36.associatedTrackable = ml3Dmap15;
    image36.displayOnLoaded = false;
    scenario.contents.push(image36);

    image36.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image36.isLoaded = function () {
        return arel.Scene.objectExists("image36");
    };

    image36.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image36.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image36.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image36.display = function () {
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

    image36.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image36.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image36);
            }
            arel.GestureHandler.addObject("image36", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image36.onLoaded = function () {
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


    // Manhattan
    if (!arel.Scene.objectExists("image38")) {
        arel.Debug.log("ERROR: retrieving the object image38, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image38 = arel.Scene.getObject("image38");
    image38.objectName = "image38";
    image38.type = "Image";
    image38.scene = scene1;
    image38.associatedTrackable = ml3Dmap15;
    image38.displayOnLoaded = false;
    scenario.contents.push(image38);

    image38.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image38.isLoaded = function () {
        return arel.Scene.objectExists("image38");
    };

    image38.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image38.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image38.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image38.display = function () {
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

    image38.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image38.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image38);
            }
            arel.GestureHandler.addObject("image38", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image38.onLoaded = function () {
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


    // EastRiver
    if (!arel.Scene.objectExists("image39")) {
        arel.Debug.log("ERROR: retrieving the object image39, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image39 = arel.Scene.getObject("image39");
    image39.objectName = "image39";
    image39.type = "Image";
    image39.scene = scene1;
    image39.associatedTrackable = ml3Dmap15;
    image39.displayOnLoaded = false;
    scenario.contents.push(image39);

    image39.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image39.isLoaded = function () {
        return arel.Scene.objectExists("image39");
    };

    image39.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image39.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image39.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image39.display = function () {
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

    image39.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image39.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image39);
            }
            arel.GestureHandler.addObject("image39", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image39.onLoaded = function () {
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


    // HudsonRiver
    if (!arel.Scene.objectExists("image40")) {
        arel.Debug.log("ERROR: retrieving the object image40, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image40 = arel.Scene.getObject("image40");
    image40.objectName = "image40";
    image40.type = "Image";
    image40.scene = scene1;
    image40.associatedTrackable = ml3Dmap15;
    image40.displayOnLoaded = false;
    scenario.contents.push(image40);

    image40.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image40.isLoaded = function () {
        return arel.Scene.objectExists("image40");
    };

    image40.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image40.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image40.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image40.display = function () {
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

    image40.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image40.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image40);
            }
            arel.GestureHandler.addObject("image40", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image40.onLoaded = function () {
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


    // BrooklynBridge
    if (!arel.Scene.objectExists("image41")) {
        arel.Debug.log("ERROR: retrieving the object image41, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image41 = arel.Scene.getObject("image41");
    image41.objectName = "image41";
    image41.type = "Image";
    image41.scene = scene1;
    image41.associatedTrackable = ml3Dmap15;
    image41.displayOnLoaded = false;
    scenario.contents.push(image41);

    image41.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image41.isLoaded = function () {
        return arel.Scene.objectExists("image41");
    };

    image41.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image41.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image41.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image41.display = function () {
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

    image41.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image41.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image41);
            }
            arel.GestureHandler.addObject("image41", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image41.onLoaded = function () {
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


    // Financial
    if (!arel.Scene.objectExists("image42")) {
        arel.Debug.log("ERROR: retrieving the object image42, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image42 = arel.Scene.getObject("image42");
    image42.objectName = "image42";
    image42.type = "Image";
    image42.scene = scene1;
    image42.associatedTrackable = ml3Dmap15;
    image42.displayOnLoaded = false;
    scenario.contents.push(image42);

    image42.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image42.isLoaded = function () {
        return arel.Scene.objectExists("image42");
    };

    image42.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image42.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image42.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image42.display = function () {
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

    image42.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image42.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image42);
            }
            arel.GestureHandler.addObject("image42", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image42.onLoaded = function () {
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


    // Chinatown
    if (!arel.Scene.objectExists("image43")) {
        arel.Debug.log("ERROR: retrieving the object image43, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image43 = arel.Scene.getObject("image43");
    image43.objectName = "image43";
    image43.type = "Image";
    image43.scene = scene1;
    image43.associatedTrackable = ml3Dmap15;
    image43.displayOnLoaded = false;
    scenario.contents.push(image43);

    image43.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image43.isLoaded = function () {
        return arel.Scene.objectExists("image43");
    };

    image43.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image43.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image43.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image43.display = function () {
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

    image43.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image43.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image43);
            }
            arel.GestureHandler.addObject("image43", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image43.onLoaded = function () {
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


    // LES
    if (!arel.Scene.objectExists("image44")) {
        arel.Debug.log("ERROR: retrieving the object image44, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image44 = arel.Scene.getObject("image44");
    image44.objectName = "image44";
    image44.type = "Image";
    image44.scene = scene1;
    image44.associatedTrackable = ml3Dmap15;
    image44.displayOnLoaded = false;
    scenario.contents.push(image44);

    image44.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image44.isLoaded = function () {
        return arel.Scene.objectExists("image44");
    };

    image44.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image44.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image44.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image44.display = function () {
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

    image44.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image44.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image44);
            }
            arel.GestureHandler.addObject("image44", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image44.onLoaded = function () {
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


    // Williamsburg
    if (!arel.Scene.objectExists("image45")) {
        arel.Debug.log("ERROR: retrieving the object image45, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image45 = arel.Scene.getObject("image45");
    image45.objectName = "image45";
    image45.type = "Image";
    image45.scene = scene1;
    image45.associatedTrackable = ml3Dmap15;
    image45.displayOnLoaded = false;
    scenario.contents.push(image45);

    image45.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image45.isLoaded = function () {
        return arel.Scene.objectExists("image45");
    };

    image45.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image45.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image45.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image45.display = function () {
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

    image45.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image45.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image45);
            }
            arel.GestureHandler.addObject("image45", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image45.onLoaded = function () {
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


    // BrooklynHeights
    if (!arel.Scene.objectExists("image46")) {
        arel.Debug.log("ERROR: retrieving the object image46, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image46 = arel.Scene.getObject("image46");
    image46.objectName = "image46";
    image46.type = "Image";
    image46.scene = scene1;
    image46.associatedTrackable = ml3Dmap15;
    image46.displayOnLoaded = false;
    scenario.contents.push(image46);

    image46.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image46.isLoaded = function () {
        return arel.Scene.objectExists("image46");
    };

    image46.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image46.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image46.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image46.display = function () {
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

    image46.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image46.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image46);
            }
            arel.GestureHandler.addObject("image46", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image46.onLoaded = function () {
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


    // EmpireState
    if (!arel.Scene.objectExists("image47")) {
        arel.Debug.log("ERROR: retrieving the object image47, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image47 = arel.Scene.getObject("image47");
    image47.objectName = "image47";
    image47.type = "Image";
    image47.scene = scene1;
    image47.associatedTrackable = ml3Dmap15;
    image47.displayOnLoaded = false;
    scenario.contents.push(image47);

    image47.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image47.isLoaded = function () {
        return arel.Scene.objectExists("image47");
    };

    image47.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image47.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image47.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image47.display = function () {
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

    image47.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image47.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image47);
            }
            arel.GestureHandler.addObject("image47", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image47.onLoaded = function () {
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


    // UpperNYBay
    if (!arel.Scene.objectExists("image48")) {
        arel.Debug.log("ERROR: retrieving the object image48, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image48 = arel.Scene.getObject("image48");
    image48.objectName = "image48";
    image48.type = "Image";
    image48.scene = scene1;
    image48.associatedTrackable = ml3Dmap15;
    image48.displayOnLoaded = false;
    scenario.contents.push(image48);

    image48.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image48.isLoaded = function () {
        return arel.Scene.objectExists("image48");
    };

    image48.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image48.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image48.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image48.display = function () {
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

    image48.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image48.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image48);
            }
            arel.GestureHandler.addObject("image48", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image48.onLoaded = function () {
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


    // 2-Staten
    if (!arel.Scene.objectExists("image5")) {
        arel.Debug.log("ERROR: retrieving the object image5, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image5 = arel.Scene.getObject("image5");
    image5.objectName = "image5";
    image5.type = "Image";
    image5.scene = scene1;
    image5.associatedTrackable = ml3Dmap3;
    image5.displayOnLoaded = false;
    scenario.contents.push(image5);

    image5.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image5.isLoaded = function () {
        return arel.Scene.objectExists("image5");
    };

    image5.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image5.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image5.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image5.display = function () {
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

    image5.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image5.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image5);
            }
            arel.GestureHandler.addObject("image5", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image5.onLoaded = function () {
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


    // StatueLiberty
    if (!arel.Scene.objectExists("image50")) {
        arel.Debug.log("ERROR: retrieving the object image50, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image50 = arel.Scene.getObject("image50");
    image50.objectName = "image50";
    image50.type = "Image";
    image50.scene = scene1;
    image50.associatedTrackable = ml3Dmap15;
    image50.displayOnLoaded = false;
    scenario.contents.push(image50);

    image50.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image50.isLoaded = function () {
        return arel.Scene.objectExists("image50");
    };

    image50.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image50.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image50.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image50.display = function () {
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

    image50.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image50.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image50);
            }
            arel.GestureHandler.addObject("image50", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image50.onLoaded = function () {
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


    // Brooklyn
    if (!arel.Scene.objectExists("image52")) {
        arel.Debug.log("ERROR: retrieving the object image52, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image52 = arel.Scene.getObject("image52");
    image52.objectName = "image52";
    image52.type = "Image";
    image52.scene = scene1;
    image52.associatedTrackable = ml3Dmap15;
    image52.displayOnLoaded = false;
    scenario.contents.push(image52);

    image52.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image52.isLoaded = function () {
        return arel.Scene.objectExists("image52");
    };

    image52.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image52.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image52.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image52.display = function () {
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

    image52.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image52.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image52);
            }
            arel.GestureHandler.addObject("image52", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image52.onLoaded = function () {
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


    // Queens
    if (!arel.Scene.objectExists("image53")) {
        arel.Debug.log("ERROR: retrieving the object image53, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image53 = arel.Scene.getObject("image53");
    image53.objectName = "image53";
    image53.type = "Image";
    image53.scene = scene1;
    image53.associatedTrackable = ml3Dmap15;
    image53.displayOnLoaded = false;
    scenario.contents.push(image53);

    image53.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image53.isLoaded = function () {
        return arel.Scene.objectExists("image53");
    };

    image53.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image53.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image53.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image53.display = function () {
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

    image53.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image53.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image53);
            }
            arel.GestureHandler.addObject("image53", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image53.onLoaded = function () {
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


    // BayRidge
    if (!arel.Scene.objectExists("image55")) {
        arel.Debug.log("ERROR: retrieving the object image55, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image55 = arel.Scene.getObject("image55");
    image55.objectName = "image55";
    image55.type = "Image";
    image55.scene = scene1;
    image55.associatedTrackable = ml3Dmap3;
    image55.displayOnLoaded = false;
    scenario.contents.push(image55);

    image55.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image55.isLoaded = function () {
        return arel.Scene.objectExists("image55");
    };

    image55.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image55.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image55.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image55.display = function () {
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

    image55.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image55.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image55);
            }
            arel.GestureHandler.addObject("image55", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image55.onLoaded = function () {
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


    // TodtHill
    if (!arel.Scene.objectExists("image56")) {
        arel.Debug.log("ERROR: retrieving the object image56, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image56 = arel.Scene.getObject("image56");
    image56.objectName = "image56";
    image56.type = "Image";
    image56.scene = scene1;
    image56.associatedTrackable = ml3Dmap3;
    image56.displayOnLoaded = false;
    scenario.contents.push(image56);

    image56.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image56.isLoaded = function () {
        return arel.Scene.objectExists("image56");
    };

    image56.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image56.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image56.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image56.display = function () {
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

    image56.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image56.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image56);
            }
            arel.GestureHandler.addObject("image56", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image56.onLoaded = function () {
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


    // UpperNYBay
    if (!arel.Scene.objectExists("image57")) {
        arel.Debug.log("ERROR: retrieving the object image57, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image57 = arel.Scene.getObject("image57");
    image57.objectName = "image57";
    image57.type = "Image";
    image57.scene = scene1;
    image57.associatedTrackable = ml3Dmap3;
    image57.displayOnLoaded = false;
    scenario.contents.push(image57);

    image57.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image57.isLoaded = function () {
        return arel.Scene.objectExists("image57");
    };

    image57.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image57.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image57.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image57.display = function () {
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

    image57.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image57.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image57);
            }
            arel.GestureHandler.addObject("image57", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image57.onLoaded = function () {
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


    // SnugHarbor
    if (!arel.Scene.objectExists("image58")) {
        arel.Debug.log("ERROR: retrieving the object image58, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image58 = arel.Scene.getObject("image58");
    image58.objectName = "image58";
    image58.type = "Image";
    image58.scene = scene1;
    image58.associatedTrackable = ml3Dmap3;
    image58.displayOnLoaded = false;
    scenario.contents.push(image58);

    image58.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image58.isLoaded = function () {
        return arel.Scene.objectExists("image58");
    };

    image58.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image58.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image58.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image58.display = function () {
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

    image58.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image58.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image58);
            }
            arel.GestureHandler.addObject("image58", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image58.onLoaded = function () {
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


    // SnugHarbor
    if (!arel.Scene.objectExists("image59")) {
        arel.Debug.log("ERROR: retrieving the object image59, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image59 = arel.Scene.getObject("image59");
    image59.objectName = "image59";
    image59.type = "Image";
    image59.scene = scene1;
    image59.associatedTrackable = ml3Dmap2;
    image59.displayOnLoaded = false;
    scenario.contents.push(image59);

    image59.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image59.isLoaded = function () {
        return arel.Scene.objectExists("image59");
    };

    image59.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image59.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image59.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image59.display = function () {
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

    image59.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image59.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image59);
            }
            arel.GestureHandler.addObject("image59", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image59.onLoaded = function () {
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


    // TodtHill
    if (!arel.Scene.objectExists("image60")) {
        arel.Debug.log("ERROR: retrieving the object image60, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image60 = arel.Scene.getObject("image60");
    image60.objectName = "image60";
    image60.type = "Image";
    image60.scene = scene1;
    image60.associatedTrackable = ml3Dmap2;
    image60.displayOnLoaded = false;
    scenario.contents.push(image60);

    image60.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image60.isLoaded = function () {
        return arel.Scene.objectExists("image60");
    };

    image60.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image60.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image60.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image60.display = function () {
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

    image60.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image60.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image60);
            }
            arel.GestureHandler.addObject("image60", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image60.onLoaded = function () {
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


    // BayRidge
    if (!arel.Scene.objectExists("image61")) {
        arel.Debug.log("ERROR: retrieving the object image61, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image61 = arel.Scene.getObject("image61");
    image61.objectName = "image61";
    image61.type = "Image";
    image61.scene = scene1;
    image61.associatedTrackable = ml3Dmap2;
    image61.displayOnLoaded = false;
    scenario.contents.push(image61);

    image61.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image61.isLoaded = function () {
        return arel.Scene.objectExists("image61");
    };

    image61.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image61.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image61.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image61.display = function () {
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

    image61.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image61.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image61);
            }
            arel.GestureHandler.addObject("image61", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image61.onLoaded = function () {
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


    // LowerNYBay
    if (!arel.Scene.objectExists("image62")) {
        arel.Debug.log("ERROR: retrieving the object image62, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image62 = arel.Scene.getObject("image62");
    image62.objectName = "image62";
    image62.type = "Image";
    image62.scene = scene1;
    image62.associatedTrackable = ml3Dmap2;
    image62.displayOnLoaded = false;
    scenario.contents.push(image62);

    image62.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image62.isLoaded = function () {
        return arel.Scene.objectExists("image62");
    };

    image62.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image62.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image62.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image62.display = function () {
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

    image62.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image62.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image62);
            }
            arel.GestureHandler.addObject("image62", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image62.onLoaded = function () {
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


    // UpperNYBay
    if (!arel.Scene.objectExists("image63")) {
        arel.Debug.log("ERROR: retrieving the object image63, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image63 = arel.Scene.getObject("image63");
    image63.objectName = "image63";
    image63.type = "Image";
    image63.scene = scene1;
    image63.associatedTrackable = ml3Dmap2;
    image63.displayOnLoaded = false;
    scenario.contents.push(image63);

    image63.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image63.isLoaded = function () {
        return arel.Scene.objectExists("image63");
    };

    image63.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image63.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image63.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image63.display = function () {
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

    image63.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image63.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image63);
            }
            arel.GestureHandler.addObject("image63", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image63.onLoaded = function () {
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


    // StatueLiberty
    if (!arel.Scene.objectExists("image64")) {
        arel.Debug.log("ERROR: retrieving the object image64, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var image64 = arel.Scene.getObject("image64");
    image64.objectName = "image64";
    image64.type = "Image";
    image64.scene = scene1;
    image64.associatedTrackable = ml3Dmap2;
    image64.displayOnLoaded = false;
    scenario.contents.push(image64);

    image64.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image64.isLoaded = function () {
        return arel.Scene.objectExists("image64");
    };

    image64.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image64.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image64.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image64.display = function () {
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

    image64.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image64.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image64);
            }
            arel.GestureHandler.addObject("image64", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image64.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model37")) {
        arel.Debug.log("ERROR: retrieving the object model37, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model37 = arel.Scene.getObject("model37");
    model37.objectName = "model37";
    model37.type = "Model";
    model37.scene = scene1;
    model37.associatedTrackable = ml3Dmap15;
    model37.displayOnLoaded = false;
    scenario.contents.push(model37);

    model37.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model37.isLoaded = function () {
        return arel.Scene.objectExists("model37");
    };

    model37.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model37.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model37.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model37.display = function () {
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

    model37.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model37.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model37);
            }
            arel.GestureHandler.addObject("model37", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model37.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model37.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-5', false);
        
        /***** End of custom script *****/
    };

    model37.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model38")) {
        arel.Debug.log("ERROR: retrieving the object model38, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model38 = arel.Scene.getObject("model38");
    model38.objectName = "model38";
    model38.type = "Model";
    model38.scene = scene1;
    model38.associatedTrackable = ml3Dmap15;
    model38.displayOnLoaded = false;
    scenario.contents.push(model38);

    model38.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model38.isLoaded = function () {
        return arel.Scene.objectExists("model38");
    };

    model38.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model38.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model38.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model38.display = function () {
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

    model38.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model38.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model38);
            }
            arel.GestureHandler.addObject("model38", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model38.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model38.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-4', false);
        
        /***** End of custom script *****/
    };

    model38.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model39")) {
        arel.Debug.log("ERROR: retrieving the object model39, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model39 = arel.Scene.getObject("model39");
    model39.objectName = "model39";
    model39.type = "Model";
    model39.scene = scene1;
    model39.associatedTrackable = ml3Dmap15;
    model39.displayOnLoaded = false;
    scenario.contents.push(model39);

    model39.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model39.isLoaded = function () {
        return arel.Scene.objectExists("model39");
    };

    model39.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model39.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model39.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model39.display = function () {
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

    model39.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model39.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model39);
            }
            arel.GestureHandler.addObject("model39", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model39.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model39.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-3', false);
        
        /***** End of custom script *****/
    };

    model39.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model40")) {
        arel.Debug.log("ERROR: retrieving the object model40, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model40 = arel.Scene.getObject("model40");
    model40.objectName = "model40";
    model40.type = "Model";
    model40.scene = scene1;
    model40.associatedTrackable = ml3Dmap15;
    model40.displayOnLoaded = false;
    scenario.contents.push(model40);

    model40.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model40.isLoaded = function () {
        return arel.Scene.objectExists("model40");
    };

    model40.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model40.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model40.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model40.display = function () {
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

    model40.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model40.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model40);
            }
            arel.GestureHandler.addObject("model40", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model40.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model40.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model40.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model42")) {
        arel.Debug.log("ERROR: retrieving the object model42, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model42 = arel.Scene.getObject("model42");
    model42.objectName = "model42";
    model42.type = "Model";
    model42.scene = scene1;
    model42.associatedTrackable = ml3Dmap3;
    model42.displayOnLoaded = false;
    scenario.contents.push(model42);

    model42.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model42.isLoaded = function () {
        return arel.Scene.objectExists("model42");
    };

    model42.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model42.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model42.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model42.display = function () {
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

    model42.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model42.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model42);
            }
            arel.GestureHandler.addObject("model42", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model42.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model42.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-3', false);
        
        /***** End of custom script *****/
    };

    model42.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model43")) {
        arel.Debug.log("ERROR: retrieving the object model43, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model43 = arel.Scene.getObject("model43");
    model43.objectName = "model43";
    model43.type = "Model";
    model43.scene = scene1;
    model43.associatedTrackable = ml3Dmap3;
    model43.displayOnLoaded = false;
    scenario.contents.push(model43);

    model43.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model43.isLoaded = function () {
        return arel.Scene.objectExists("model43");
    };

    model43.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model43.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model43.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model43.display = function () {
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

    model43.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model43.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model43);
            }
            arel.GestureHandler.addObject("model43", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model43.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model43.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model43.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model44")) {
        arel.Debug.log("ERROR: retrieving the object model44, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model44 = arel.Scene.getObject("model44");
    model44.objectName = "model44";
    model44.type = "Model";
    model44.scene = scene1;
    model44.associatedTrackable = ml3Dmap3;
    model44.displayOnLoaded = false;
    scenario.contents.push(model44);

    model44.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model44.isLoaded = function () {
        return arel.Scene.objectExists("model44");
    };

    model44.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model44.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model44.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model44.display = function () {
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

    model44.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model44.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model44);
            }
            arel.GestureHandler.addObject("model44", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model44.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model44.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-5', false);
        
        /***** End of custom script *****/
    };

    model44.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model45")) {
        arel.Debug.log("ERROR: retrieving the object model45, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model45 = arel.Scene.getObject("model45");
    model45.objectName = "model45";
    model45.type = "Model";
    model45.scene = scene1;
    model45.associatedTrackable = ml3Dmap2;
    model45.displayOnLoaded = false;
    scenario.contents.push(model45);

    model45.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model45.isLoaded = function () {
        return arel.Scene.objectExists("model45");
    };

    model45.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model45.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model45.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model45.display = function () {
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

    model45.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model45.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model45);
            }
            arel.GestureHandler.addObject("model45", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model45.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model45.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model45.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model46")) {
        arel.Debug.log("ERROR: retrieving the object model46, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model46 = arel.Scene.getObject("model46");
    model46.objectName = "model46";
    model46.type = "Model";
    model46.scene = scene1;
    model46.associatedTrackable = ml3Dmap2;
    model46.displayOnLoaded = false;
    scenario.contents.push(model46);

    model46.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model46.isLoaded = function () {
        return arel.Scene.objectExists("model46");
    };

    model46.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model46.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model46.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model46.display = function () {
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

    model46.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model46.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model46);
            }
            arel.GestureHandler.addObject("model46", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model46.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model46.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-5', false);
        
        /***** End of custom script *****/
    };

    model46.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model47")) {
        arel.Debug.log("ERROR: retrieving the object model47, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model47 = arel.Scene.getObject("model47");
    model47.objectName = "model47";
    model47.type = "Model";
    model47.scene = scene1;
    model47.associatedTrackable = ml3Dmap2;
    model47.displayOnLoaded = false;
    scenario.contents.push(model47);

    model47.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model47.isLoaded = function () {
        return arel.Scene.objectExists("model47");
    };

    model47.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model47.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model47.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model47.display = function () {
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

    model47.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model47.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model47);
            }
            arel.GestureHandler.addObject("model47", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model47.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model47.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-3', false);
        
        /***** End of custom script *****/
    };

    model47.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model48")) {
        arel.Debug.log("ERROR: retrieving the object model48, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model48 = arel.Scene.getObject("model48");
    model48.objectName = "model48";
    model48.type = "Model";
    model48.scene = scene1;
    model48.associatedTrackable = ml3Dmap15;
    model48.displayOnLoaded = false;
    scenario.contents.push(model48);

    model48.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model48.isLoaded = function () {
        return arel.Scene.objectExists("model48");
    };

    model48.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model48.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model48.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model48.display = function () {
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

    model48.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model48.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model48);
            }
            arel.GestureHandler.addObject("model48", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model48.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model48.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model48.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model49")) {
        arel.Debug.log("ERROR: retrieving the object model49, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model49 = arel.Scene.getObject("model49");
    model49.objectName = "model49";
    model49.type = "Model";
    model49.scene = scene1;
    model49.associatedTrackable = ml3Dmap16;
    model49.displayOnLoaded = false;
    scenario.contents.push(model49);

    model49.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model49.isLoaded = function () {
        return arel.Scene.objectExists("model49");
    };

    model49.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model49.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model49.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model49.display = function () {
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

    model49.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model49.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model49);
            }
            arel.GestureHandler.addObject("model49", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model49.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model49.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model49.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model51")) {
        arel.Debug.log("ERROR: retrieving the object model51, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model51 = arel.Scene.getObject("model51");
    model51.objectName = "model51";
    model51.type = "Model";
    model51.scene = scene1;
    model51.associatedTrackable = ml3Dmap16;
    model51.displayOnLoaded = false;
    scenario.contents.push(model51);

    model51.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model51.isLoaded = function () {
        return arel.Scene.objectExists("model51");
    };

    model51.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model51.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model51.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model51.display = function () {
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

    model51.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model51.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model51);
            }
            arel.GestureHandler.addObject("model51", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model51.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model51.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model51.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model52")) {
        arel.Debug.log("ERROR: retrieving the object model52, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model52 = arel.Scene.getObject("model52");
    model52.objectName = "model52";
    model52.type = "Model";
    model52.scene = scene1;
    model52.associatedTrackable = ml3Dmap16;
    model52.displayOnLoaded = false;
    scenario.contents.push(model52);

    model52.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model52.isLoaded = function () {
        return arel.Scene.objectExists("model52");
    };

    model52.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model52.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model52.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model52.display = function () {
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

    model52.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model52.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model52);
            }
            arel.GestureHandler.addObject("model52", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model52.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model52.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-3', false);
        
        /***** End of custom script *****/
    };

    model52.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model53")) {
        arel.Debug.log("ERROR: retrieving the object model53, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model53 = arel.Scene.getObject("model53");
    model53.objectName = "model53";
    model53.type = "Model";
    model53.scene = scene1;
    model53.associatedTrackable = ml3Dmap16;
    model53.displayOnLoaded = false;
    scenario.contents.push(model53);

    model53.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model53.isLoaded = function () {
        return arel.Scene.objectExists("model53");
    };

    model53.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model53.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model53.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model53.display = function () {
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

    model53.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model53.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model53);
            }
            arel.GestureHandler.addObject("model53", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model53.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model53.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-4', false);
        
        /***** End of custom script *****/
    };

    model53.onLoaded = function () {
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


    // qma5
    if (!arel.Scene.objectExists("model54")) {
        arel.Debug.log("ERROR: retrieving the object model54, it seems that it does not exist. Maybe it would help cleaning the cache or a problem occurred while reloading the channel.");
    }

    var model54 = arel.Scene.getObject("model54");
    model54.objectName = "model54";
    model54.type = "Model";
    model54.scene = scene1;
    model54.associatedTrackable = ml3Dmap16;
    model54.displayOnLoaded = false;
    scenario.contents.push(model54);

    model54.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model54.isLoaded = function () {
        return arel.Scene.objectExists("model54");
    };

    model54.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model54.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model54.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model54.display = function () {
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

    model54.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model54.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model54);
            }
            arel.GestureHandler.addObject("model54", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model54.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model54.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-5', false);
        
        /***** End of custom script *****/
    };

    model54.onLoaded = function () {
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