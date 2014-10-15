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
        arel.Debug.log("Welcome to the 'qmalessassets_10152014' Augmented Reality experience.");

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
        scenario.registerObject(image9);
        if (methodExists(image9, image9.onLoaded)) {
            image9.onLoaded();
        }
        scenario.registerObject(image10);
        if (methodExists(image10, image10.onLoaded)) {
            image10.onLoaded();
        }
        scenario.registerObject(image13);
        if (methodExists(image13, image13.onLoaded)) {
            image13.onLoaded();
        }
        scenario.registerObject(image14);
        if (methodExists(image14, image14.onLoaded)) {
            image14.onLoaded();
        }
        scenario.registerObject(image17);
        if (methodExists(image17, image17.onLoaded)) {
            image17.onLoaded();
        }
        scenario.registerObject(image18);
        if (methodExists(image18, image18.onLoaded)) {
            image18.onLoaded();
        }
        scenario.registerObject(image20);
        if (methodExists(image20, image20.onLoaded)) {
            image20.onLoaded();
        }
        scenario.registerObject(image21);
        if (methodExists(image21, image21.onLoaded)) {
            image21.onLoaded();
        }
        scenario.registerObject(image23);
        if (methodExists(image23, image23.onLoaded)) {
            image23.onLoaded();
        }
        scenario.registerObject(image24);
        if (methodExists(image24, image24.onLoaded)) {
            image24.onLoaded();
        }
        scenario.registerObject(image4);
        if (methodExists(image4, image4.onLoaded)) {
            image4.onLoaded();
        }
        scenario.registerObject(image5);
        if (methodExists(image5, image5.onLoaded)) {
            image5.onLoaded();
        }
        scenario.registerObject(image3);
        if (methodExists(image3, image3.onLoaded)) {
            image3.onLoaded();
        }
        scenario.registerObject(image2);
        if (methodExists(image2, image2.onLoaded)) {
            image2.onLoaded();
        }
        scenario.registerObject(image6);
        if (methodExists(image6, image6.onLoaded)) {
            image6.onLoaded();
        }
        scenario.registerObject(image15);
        if (methodExists(image15, image15.onLoaded)) {
            image15.onLoaded();
        }
        scenario.registerObject(image8);
        if (methodExists(image8, image8.onLoaded)) {
            image8.onLoaded();
        }
        scenario.registerObject(image34);
        if (methodExists(image34, image34.onLoaded)) {
            image34.onLoaded();
        }
        scenario.registerObject(image36);
        if (methodExists(image36, image36.onLoaded)) {
            image36.onLoaded();
        }
        scenario.registerObject(image37);
        if (methodExists(image37, image37.onLoaded)) {
            image37.onLoaded();
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
        scenario.registerObject(image46);
        if (methodExists(image46, image46.onLoaded)) {
            image46.onLoaded();
        }
        scenario.registerObject(image47);
        if (methodExists(image47, image47.onLoaded)) {
            image47.onLoaded();
        }
        scenario.registerObject(image60);
        if (methodExists(image60, image60.onLoaded)) {
            image60.onLoaded();
        }
        scenario.registerObject(image61);
        if (methodExists(image61, image61.onLoaded)) {
            image61.onLoaded();
        }
        scenario.registerObject(image62);
        if (methodExists(image62, image62.onLoaded)) {
            image62.onLoaded();
        }
        scenario.registerObject(image65);
        if (methodExists(image65, image65.onLoaded)) {
            image65.onLoaded();
        }
        scenario.registerObject(image70);
        if (methodExists(image70, image70.onLoaded)) {
            image70.onLoaded();
        }
        scenario.registerObject(image73);
        if (methodExists(image73, image73.onLoaded)) {
            image73.onLoaded();
        }
        scenario.registerObject(image74);
        if (methodExists(image74, image74.onLoaded)) {
            image74.onLoaded();
        }
        scenario.registerObject(image75);
        if (methodExists(image75, image75.onLoaded)) {
            image75.onLoaded();
        }
        scenario.registerObject(image79);
        if (methodExists(image79, image79.onLoaded)) {
            image79.onLoaded();
        }
        scenario.registerObject(image99);
        if (methodExists(image99, image99.onLoaded)) {
            image99.onLoaded();
        }
        scenario.registerObject(image101);
        if (methodExists(image101, image101.onLoaded)) {
            image101.onLoaded();
        }
        scenario.registerObject(image102);
        if (methodExists(image102, image102.onLoaded)) {
            image102.onLoaded();
        }
        scenario.registerObject(image103);
        if (methodExists(image103, image103.onLoaded)) {
            image103.onLoaded();
        }
        scenario.registerObject(image104);
        if (methodExists(image104, image104.onLoaded)) {
            image104.onLoaded();
        }
        scenario.registerObject(image110);
        if (methodExists(image110, image110.onLoaded)) {
            image110.onLoaded();
        }
        scenario.registerObject(image111);
        if (methodExists(image111, image111.onLoaded)) {
            image111.onLoaded();
        }
        scenario.registerObject(image113);
        if (methodExists(image113, image113.onLoaded)) {
            image113.onLoaded();
        }
        scenario.registerObject(image115);
        if (methodExists(image115, image115.onLoaded)) {
            image115.onLoaded();
        }
        scenario.registerObject(image119);
        if (methodExists(image119, image119.onLoaded)) {
            image119.onLoaded();
        }
        scenario.registerObject(image120);
        if (methodExists(image120, image120.onLoaded)) {
            image120.onLoaded();
        }
        scenario.registerObject(image121);
        if (methodExists(image121, image121.onLoaded)) {
            image121.onLoaded();
        }
        scenario.registerObject(image122);
        if (methodExists(image122, image122.onLoaded)) {
            image122.onLoaded();
        }
        scenario.registerObject(image123);
        if (methodExists(image123, image123.onLoaded)) {
            image123.onLoaded();
        }
        scenario.registerObject(image126);
        if (methodExists(image126, image126.onLoaded)) {
            image126.onLoaded();
        }
        scenario.registerObject(image127);
        if (methodExists(image127, image127.onLoaded)) {
            image127.onLoaded();
        }
        scenario.registerObject(image128);
        if (methodExists(image128, image128.onLoaded)) {
            image128.onLoaded();
        }
        scenario.registerObject(image129);
        if (methodExists(image129, image129.onLoaded)) {
            image129.onLoaded();
        }
        scenario.registerObject(image132);
        if (methodExists(image132, image132.onLoaded)) {
            image132.onLoaded();
        }
        scenario.registerObject(image133);
        if (methodExists(image133, image133.onLoaded)) {
            image133.onLoaded();
        }
        scenario.registerObject(image134);
        if (methodExists(image134, image134.onLoaded)) {
            image134.onLoaded();
        }
        scenario.registerObject(image136);
        if (methodExists(image136, image136.onLoaded)) {
            image136.onLoaded();
        }
        scenario.registerObject(image138);
        if (methodExists(image138, image138.onLoaded)) {
            image138.onLoaded();
        }
        scenario.registerObject(image139);
        if (methodExists(image139, image139.onLoaded)) {
            image139.onLoaded();
        }
        scenario.registerObject(image140);
        if (methodExists(image140, image140.onLoaded)) {
            image140.onLoaded();
        }
        scenario.registerObject(image161);
        if (methodExists(image161, image161.onLoaded)) {
            image161.onLoaded();
        }
        scenario.registerObject(image116);
        if (methodExists(image116, image116.onLoaded)) {
            image116.onLoaded();
        }
        scenario.registerObject(image166);
        if (methodExists(image166, image166.onLoaded)) {
            image166.onLoaded();
        }
        scenario.registerObject(image167);
        if (methodExists(image167, image167.onLoaded)) {
            image167.onLoaded();
        }
        scenario.registerObject(image171);
        if (methodExists(image171, image171.onLoaded)) {
            image171.onLoaded();
        }
        scenario.registerObject(image38);
        if (methodExists(image38, image38.onLoaded)) {
            image38.onLoaded();
        }
        scenario.registerObject(image35);
        if (methodExists(image35, image35.onLoaded)) {
            image35.onLoaded();
        }
        scenario.registerObject(image172);
        if (methodExists(image172, image172.onLoaded)) {
            image172.onLoaded();
        }
        scenario.registerObject(image173);
        if (methodExists(image173, image173.onLoaded)) {
            image173.onLoaded();
        }
        scenario.registerObject(image141);
        if (methodExists(image141, image141.onLoaded)) {
            image141.onLoaded();
        }
        scenario.registerObject(image174);
        if (methodExists(image174, image174.onLoaded)) {
            image174.onLoaded();
        }
        scenario.registerObject(image142);
        if (methodExists(image142, image142.onLoaded)) {
            image142.onLoaded();
        }
        scenario.registerObject(image175);
        if (methodExists(image175, image175.onLoaded)) {
            image175.onLoaded();
        }
        scenario.registerObject(image42);
        if (methodExists(image42, image42.onLoaded)) {
            image42.onLoaded();
        }
        scenario.registerObject(image176);
        if (methodExists(image176, image176.onLoaded)) {
            image176.onLoaded();
        }
        scenario.registerObject(image177);
        if (methodExists(image177, image177.onLoaded)) {
            image177.onLoaded();
        }
        scenario.registerObject(image178);
        if (methodExists(image178, image178.onLoaded)) {
            image178.onLoaded();
        }
        scenario.registerObject(image44);
        if (methodExists(image44, image44.onLoaded)) {
            image44.onLoaded();
        }
        scenario.registerObject(image181);
        if (methodExists(image181, image181.onLoaded)) {
            image181.onLoaded();
        }
        scenario.registerObject(image145);
        if (methodExists(image145, image145.onLoaded)) {
            image145.onLoaded();
        }
        scenario.registerObject(image105);
        if (methodExists(image105, image105.onLoaded)) {
            image105.onLoaded();
        }
        scenario.registerObject(image106);
        if (methodExists(image106, image106.onLoaded)) {
            image106.onLoaded();
        }
        scenario.registerObject(image182);
        if (methodExists(image182, image182.onLoaded)) {
            image182.onLoaded();
        }
        scenario.registerObject(image183);
        if (methodExists(image183, image183.onLoaded)) {
            image183.onLoaded();
        }
        scenario.registerObject(image66);
        if (methodExists(image66, image66.onLoaded)) {
            image66.onLoaded();
        }
        scenario.registerObject(image191);
        if (methodExists(image191, image191.onLoaded)) {
            image191.onLoaded();
        }
        scenario.registerObject(image192);
        if (methodExists(image192, image192.onLoaded)) {
            image192.onLoaded();
        }
        scenario.registerObject(image194);
        if (methodExists(image194, image194.onLoaded)) {
            image194.onLoaded();
        }
        scenario.registerObject(image202);
        if (methodExists(image202, image202.onLoaded)) {
            image202.onLoaded();
        }
        scenario.registerObject(image203);
        if (methodExists(image203, image203.onLoaded)) {
            image203.onLoaded();
        }
        scenario.registerObject(image204);
        if (methodExists(image204, image204.onLoaded)) {
            image204.onLoaded();
        }
        scenario.registerObject(image164);
        if (methodExists(image164, image164.onLoaded)) {
            image164.onLoaded();
        }
        scenario.registerObject(image205);
        if (methodExists(image205, image205.onLoaded)) {
            image205.onLoaded();
        }
        scenario.registerObject(image109);
        if (methodExists(image109, image109.onLoaded)) {
            image109.onLoaded();
        }
        scenario.registerObject(image112);
        if (methodExists(image112, image112.onLoaded)) {
            image112.onLoaded();
        }
        scenario.registerObject(image125);
        if (methodExists(image125, image125.onLoaded)) {
            image125.onLoaded();
        }
        scenario.registerObject(image124);
        if (methodExists(image124, image124.onLoaded)) {
            image124.onLoaded();
        }
        scenario.registerObject(image168);
        if (methodExists(image168, image168.onLoaded)) {
            image168.onLoaded();
        }
        scenario.registerObject(image131);
        if (methodExists(image131, image131.onLoaded)) {
            image131.onLoaded();
        }
        scenario.registerObject(image130);
        if (methodExists(image130, image130.onLoaded)) {
            image130.onLoaded();
        }
        scenario.registerObject(image170);
        if (methodExists(image170, image170.onLoaded)) {
            image170.onLoaded();
        }
        scenario.registerObject(image212);
        if (methodExists(image212, image212.onLoaded)) {
            image212.onLoaded();
        }
        scenario.registerObject(image213);
        if (methodExists(image213, image213.onLoaded)) {
            image213.onLoaded();
        }
        scenario.registerObject(image209);
        if (methodExists(image209, image209.onLoaded)) {
            image209.onLoaded();
        }
        scenario.registerObject(image214);
        if (methodExists(image214, image214.onLoaded)) {
            image214.onLoaded();
        }
        scenario.registerObject(image215);
        if (methodExists(image215, image215.onLoaded)) {
            image215.onLoaded();
        }
        scenario.registerObject(image216);
        if (methodExists(image216, image216.onLoaded)) {
            image216.onLoaded();
        }
        scenario.registerObject(image223);
        if (methodExists(image223, image223.onLoaded)) {
            image223.onLoaded();
        }
        scenario.registerObject(image225);
        if (methodExists(image225, image225.onLoaded)) {
            image225.onLoaded();
        }
        scenario.registerObject(image228);
        if (methodExists(image228, image228.onLoaded)) {
            image228.onLoaded();
        }
        scenario.registerObject(image28);
        if (methodExists(image28, image28.onLoaded)) {
            image28.onLoaded();
        }
        scenario.registerObject(image31);
        if (methodExists(image31, image31.onLoaded)) {
            image31.onLoaded();
        }
        scenario.registerObject(image32);
        if (methodExists(image32, image32.onLoaded)) {
            image32.onLoaded();
        }
        scenario.registerObject(image93);
        if (methodExists(image93, image93.onLoaded)) {
            image93.onLoaded();
        }
        scenario.registerObject(image64);
        if (methodExists(image64, image64.onLoaded)) {
            image64.onLoaded();
        }
        scenario.registerObject(image232);
        if (methodExists(image232, image232.onLoaded)) {
            image232.onLoaded();
        }
        scenario.registerObject(model47);
        if (methodExists(model47, model47.onLoaded)) {
            model47.onLoaded();
        }
        scenario.registerObject(model50);
        if (methodExists(model50, model50.onLoaded)) {
            model50.onLoaded();
        }
        scenario.registerObject(model51);
        if (methodExists(model51, model51.onLoaded)) {
            model51.onLoaded();
        }
        scenario.registerObject(model53);
        if (methodExists(model53, model53.onLoaded)) {
            model53.onLoaded();
        }
        scenario.registerObject(image155);
        if (methodExists(image155, image155.onLoaded)) {
            image155.onLoaded();
        }
        scenario.registerObject(model54);
        if (methodExists(model54, model54.onLoaded)) {
            model54.onLoaded();
        }
        scenario.registerObject(model55);
        if (methodExists(model55, model55.onLoaded)) {
            model55.onLoaded();
        }
        scenario.registerObject(model58);
        if (methodExists(model58, model58.onLoaded)) {
            model58.onLoaded();
        }
        scenario.registerObject(model59);
        if (methodExists(model59, model59.onLoaded)) {
            model59.onLoaded();
        }
        scenario.registerObject(model60);
        if (methodExists(model60, model60.onLoaded)) {
            model60.onLoaded();
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


    var ml3Dmap10 = {};
    scenario.trackables.push(ml3Dmap10);
    ml3Dmap10.objectName = "ml3Dmap10";
    ml3Dmap10.cosName = "North overlook 2_5";
    ml3Dmap10.cosID = "5";
    ml3Dmap10.isCurrentlyTracking = false;
    ml3Dmap10.currentTrackingValues = null;
    ml3Dmap10.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image65.display();
        image61.display();
        model54.display();
        image60.display();
        image18.display();
        image64.display();
        image155.display();
        model51.display();
        image70.display();
        image192.display();
        image66.display();
        model55.display();
        image194.display();
        image191.display();
        image17.display();
        image62.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap10.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackEnded=CentralPark', false);
        
        /***** End of custom script *****/
        image66.hide();
        image64.hide();
        image60.hide();
        image191.hide();
        image65.hide();
        image194.hide();
        image62.hide();
        image18.hide();
        image17.hide();
        image70.hide();
        image192.hide();
        model54.hide();
        image61.hide();
        model55.hide();
        model51.hide();
        image155.hide();
    };


    var ml3Dmap12 = {};
    scenario.trackables.push(ml3Dmap12);
    ml3Dmap12.objectName = "ml3Dmap12";
    ml3Dmap12.cosName = "Queens overlook 1b extend S_6";
    ml3Dmap12.cosID = "6";
    ml3Dmap12.isCurrentlyTracking = false;
    ml3Dmap12.currentTrackingValues = null;
    ml3Dmap12.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image20.display();
        image204.display();
        image202.display();
        model50.display();
        image136.display();
        model58.display();
        image73.display();
        image161.display();
        image75.display();
        image232.display();
        image74.display();
        image203.display();
        image164.display();
        image79.display();
        model59.display();
        image134.display();
        model53.display();
        image205.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap12.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackEnded=CentralPark', false);
        
        /***** End of custom script *****/
        model58.hide();
        model50.hide();
        image202.hide();
        image164.hide();
        image75.hide();
        image232.hide();
        image73.hide();
        image20.hide();
        image134.hide();
        model59.hide();
        image136.hide();
        image204.hide();
        image74.hide();
        image161.hide();
        image203.hide();
        model53.hide();
        image79.hide();
        image205.hide();
    };


    var ml3Dmap13 = {};
    scenario.trackables.push(ml3Dmap13);
    ml3Dmap13.objectName = "ml3Dmap13";
    ml3Dmap13.cosName = "staten island W_7";
    ml3Dmap13.cosID = "7";
    ml3Dmap13.isCurrentlyTracking = false;
    ml3Dmap13.currentTrackingValues = null;
    ml3Dmap13.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        model47.display();
        image21.display();
        image116.display();
        image113.display();
        image112.display();
        image111.display();
        image115.display();
        image110.display();
        image109.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap13.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackEnded=CentralPark', false);
        
        /***** End of custom script *****/
        image110.hide();
        image112.hide();
        image116.hide();
        image115.hide();
        model47.hide();
        image113.hide();
        image111.hide();
        image21.hide();
        image109.hide();
    };


    var ml3Dmap14 = {};
    scenario.trackables.push(ml3Dmap14);
    ml3Dmap14.objectName = "ml3Dmap14";
    ml3Dmap14.cosName = "Manhattan lower W_8";
    ml3Dmap14.cosID = "8";
    ml3Dmap14.isCurrentlyTracking = false;
    ml3Dmap14.currentTrackingValues = null;
    ml3Dmap14.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image166.display();
        image126.display();
        image124.display();
        image123.display();
        image122.display();
        image168.display();
        image167.display();
        image127.display();
        image121.display();
        image120.display();
        image128.display();
        image125.display();
        image119.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap14.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackEnded=CentralPark', false);
        
        /***** End of custom script *****/
        image166.hide();
        image120.hide();
        image126.hide();
        image122.hide();
        image127.hide();
        image124.hide();
        image167.hide();
        image119.hide();
        image168.hide();
        image121.hide();
        image125.hide();
        image128.hide();
        image123.hide();
    };


    var ml3Dmap15 = {};
    scenario.trackables.push(ml3Dmap15);
    ml3Dmap15.objectName = "ml3Dmap15";
    ml3Dmap15.cosName = "Manhattan midtown W_9";
    ml3Dmap15.cosID = "9";
    ml3Dmap15.isCurrentlyTracking = false;
    ml3Dmap15.currentTrackingValues = null;
    ml3Dmap15.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image131.display();
        image212.display();
        image215.display();
        image130.display();
        image129.display();
        image170.display();
        image216.display();
        image133.display();
        image171.display();
        image23.display();
        image132.display();
        image213.display();
        image214.display();
        image209.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap15.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackEnded=CentralPark', false);
        
        /***** End of custom script *****/
        image209.hide();
        image170.hide();
        image23.hide();
        image131.hide();
        image216.hide();
        image213.hide();
        image132.hide();
        image133.hide();
        image214.hide();
        image171.hide();
        image129.hide();
        image212.hide();
        image130.hide();
        image215.hide();
    };


    var ml3Dmap4 = {};
    scenario.trackables.push(ml3Dmap4);
    ml3Dmap4.objectName = "ml3Dmap4";
    ml3Dmap4.cosName = "NJ_LMan_Man_1";
    ml3Dmap4.cosID = "1";
    ml3Dmap4.isCurrentlyTracking = false;
    ml3Dmap4.currentTrackingValues = null;
    ml3Dmap4.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image31.display();
        image8.display();
        image2.display();
        image32.display();
        image28.display();
        image93.display();
        image225.display();
        image9.display();
        image138.display();
        image13.display();
        image10.display();
        image14.display();
        image223.display();
        image5.display();
        image228.display();
        image15.display();
        image3.display();
        image6.display();
        image4.display();
        image139.display();
        model60.display();
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
        image139.hide();
        image2.hide();
        model60.hide();
        image8.hide();
        image228.hide();
        image6.hide();
        image15.hide();
        image31.hide();
        image4.hide();
        image5.hide();
        image14.hide();
        image9.hide();
        image10.hide();
        image28.hide();
        image3.hide();
        image32.hide();
        image138.hide();
        image225.hide();
        image93.hide();
        image223.hide();
        image13.hide();
    };


    var ml3Dmap5 = {};
    scenario.trackables.push(ml3Dmap5);
    ml3Dmap5.objectName = "ml3Dmap5";
    ml3Dmap5.cosName = "Brooklyn overlook 1 S_2";
    ml3Dmap5.cosID = "2";
    ml3Dmap5.isCurrentlyTracking = false;
    ml3Dmap5.currentTrackingValues = null;
    ml3Dmap5.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image36.display();
        image38.display();
        image24.display();
        image34.display();
        image37.display();
        image173.display();
        image35.display();
        image172.display();
        image140.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap5.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackEnded=CentralPark', false);
        
        /***** End of custom script *****/
        image172.hide();
        image36.hide();
        image24.hide();
        image173.hide();
        image35.hide();
        image140.hide();
        image38.hide();
        image37.hide();
        image34.hide();
    };


    var ml3Dmap6 = {};
    scenario.trackables.push(ml3Dmap6);
    ml3Dmap6.objectName = "ml3Dmap6";
    ml3Dmap6.cosName = "Manhattan middle W_3";
    ml3Dmap6.cosID = "3";
    ml3Dmap6.isCurrentlyTracking = false;
    ml3Dmap6.currentTrackingValues = null;
    ml3Dmap6.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image39.display();
        image47.display();
        image141.display();
        image174.display();
        image177.display();
        image175.display();
        image142.display();
        image46.display();
        image41.display();
        image181.display();
        image40.display();
        image178.display();
        image42.display();
        image176.display();
        image44.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap6.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackEnded=CentralPark', false);
        
        /***** End of custom script *****/
        image176.hide();
        image141.hide();
        image174.hide();
        image142.hide();
        image40.hide();
        image175.hide();
        image42.hide();
        image177.hide();
        image44.hide();
        image181.hide();
        image178.hide();
        image41.hide();
        image46.hide();
        image39.hide();
        image47.hide();
    };


    var ml3Dmap7 = {};
    scenario.trackables.push(ml3Dmap7);
    ml3Dmap7.objectName = "ml3Dmap7";
    ml3Dmap7.cosName = "Manhattan top W_4";
    ml3Dmap7.cosID = "4";
    ml3Dmap7.isCurrentlyTracking = false;
    ml3Dmap7.currentTrackingValues = null;
    ml3Dmap7.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image101.display();
        image145.display();
        image104.display();
        image183.display();
        image102.display();
        image106.display();
        image103.display();
        image105.display();
        image182.display();
        image99.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap7.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackEnded=CentralPark', false);
        
        /***** End of custom script *****/
        image183.hide();
        image105.hide();
        image101.hide();
        image182.hide();
        image102.hide();
        image103.hide();
        image99.hide();
        image145.hide();
        image104.hide();
        image106.hide();
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


    // Queens
    var image10 = arel.Scene.getObject("image10");
    image10.objectName = "image10";
    image10.type = "Image";
    image10.scene = scene1;
    image10.associatedTrackable = ml3Dmap4;
    image10.displayOnLoaded = false;
    scenario.contents.push(image10);

    image10.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image10.isLoaded = function () {
        return arel.Scene.objectExists("image10");
    };

    image10.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image10.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image10.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image10.display = function () {
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

    image10.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image10.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image10);
            }
            arel.GestureHandler.addObject("image10", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image10.onLoaded = function () {
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


    // HuntsPoint
    var image101 = arel.Scene.getObject("image101");
    image101.objectName = "image101";
    image101.type = "Image";
    image101.scene = scene1;
    image101.associatedTrackable = ml3Dmap7;
    image101.displayOnLoaded = false;
    scenario.contents.push(image101);

    image101.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image101.isLoaded = function () {
        return arel.Scene.objectExists("image101");
    };

    image101.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image101.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image101.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image101.display = function () {
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

    image101.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image101.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image101);
            }
            arel.GestureHandler.addObject("image101", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image101.onLoaded = function () {
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


    // Harlem
    var image102 = arel.Scene.getObject("image102");
    image102.objectName = "image102";
    image102.type = "Image";
    image102.scene = scene1;
    image102.associatedTrackable = ml3Dmap7;
    image102.displayOnLoaded = false;
    scenario.contents.push(image102);

    image102.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image102.isLoaded = function () {
        return arel.Scene.objectExists("image102");
    };

    image102.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image102.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image102.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image102.display = function () {
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

    image102.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image102.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image102);
            }
            arel.GestureHandler.addObject("image102", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image102.onLoaded = function () {
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
    var image103 = arel.Scene.getObject("image103");
    image103.objectName = "image103";
    image103.type = "Image";
    image103.scene = scene1;
    image103.associatedTrackable = ml3Dmap7;
    image103.displayOnLoaded = false;
    scenario.contents.push(image103);

    image103.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image103.isLoaded = function () {
        return arel.Scene.objectExists("image103");
    };

    image103.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image103.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image103.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image103.display = function () {
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

    image103.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image103.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image103);
            }
            arel.GestureHandler.addObject("image103", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image103.onLoaded = function () {
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
    var image104 = arel.Scene.getObject("image104");
    image104.objectName = "image104";
    image104.type = "Image";
    image104.scene = scene1;
    image104.associatedTrackable = ml3Dmap7;
    image104.displayOnLoaded = false;
    scenario.contents.push(image104);

    image104.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image104.isLoaded = function () {
        return arel.Scene.objectExists("image104");
    };

    image104.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image104.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image104.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image104.display = function () {
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

    image104.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image104.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image104);
            }
            arel.GestureHandler.addObject("image104", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image104.onLoaded = function () {
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


    // YankeeStadium
    var image105 = arel.Scene.getObject("image105");
    image105.objectName = "image105";
    image105.type = "Image";
    image105.scene = scene1;
    image105.associatedTrackable = ml3Dmap7;
    image105.displayOnLoaded = false;
    scenario.contents.push(image105);

    image105.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image105.isLoaded = function () {
        return arel.Scene.objectExists("image105");
    };

    image105.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image105.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image105.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image105.display = function () {
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

    image105.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image105.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image105);
            }
            arel.GestureHandler.addObject("image105", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image105.onLoaded = function () {
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


    // BronxZoo
    var image106 = arel.Scene.getObject("image106");
    image106.objectName = "image106";
    image106.type = "Image";
    image106.scene = scene1;
    image106.associatedTrackable = ml3Dmap7;
    image106.displayOnLoaded = false;
    scenario.contents.push(image106);

    image106.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image106.isLoaded = function () {
        return arel.Scene.objectExists("image106");
    };

    image106.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image106.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image106.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image106.display = function () {
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

    image106.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image106.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image106);
            }
            arel.GestureHandler.addObject("image106", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image106.onLoaded = function () {
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
    var image109 = arel.Scene.getObject("image109");
    image109.objectName = "image109";
    image109.type = "Image";
    image109.scene = scene1;
    image109.associatedTrackable = ml3Dmap13;
    image109.displayOnLoaded = false;
    scenario.contents.push(image109);

    image109.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image109.isLoaded = function () {
        return arel.Scene.objectExists("image109");
    };

    image109.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image109.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image109.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image109.display = function () {
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

    image109.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image109.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image109);
            }
            arel.GestureHandler.addObject("image109", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image109.onLoaded = function () {
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
    var image110 = arel.Scene.getObject("image110");
    image110.objectName = "image110";
    image110.type = "Image";
    image110.scene = scene1;
    image110.associatedTrackable = ml3Dmap13;
    image110.displayOnLoaded = false;
    scenario.contents.push(image110);

    image110.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image110.isLoaded = function () {
        return arel.Scene.objectExists("image110");
    };

    image110.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image110.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image110.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image110.display = function () {
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

    image110.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image110.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image110);
            }
            arel.GestureHandler.addObject("image110", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image110.onLoaded = function () {
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
    var image111 = arel.Scene.getObject("image111");
    image111.objectName = "image111";
    image111.type = "Image";
    image111.scene = scene1;
    image111.associatedTrackable = ml3Dmap13;
    image111.displayOnLoaded = false;
    scenario.contents.push(image111);

    image111.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image111.isLoaded = function () {
        return arel.Scene.objectExists("image111");
    };

    image111.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image111.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image111.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image111.display = function () {
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

    image111.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image111.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image111);
            }
            arel.GestureHandler.addObject("image111", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image111.onLoaded = function () {
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


    // StatenIslandFerryTerminal
    var image112 = arel.Scene.getObject("image112");
    image112.objectName = "image112";
    image112.type = "Image";
    image112.scene = scene1;
    image112.associatedTrackable = ml3Dmap13;
    image112.displayOnLoaded = false;
    scenario.contents.push(image112);

    image112.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image112.isLoaded = function () {
        return arel.Scene.objectExists("image112");
    };

    image112.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image112.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image112.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image112.display = function () {
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

    image112.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image112.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image112);
            }
            arel.GestureHandler.addObject("image112", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image112.onLoaded = function () {
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
    var image113 = arel.Scene.getObject("image113");
    image113.objectName = "image113";
    image113.type = "Image";
    image113.scene = scene1;
    image113.associatedTrackable = ml3Dmap13;
    image113.displayOnLoaded = false;
    scenario.contents.push(image113);

    image113.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image113.isLoaded = function () {
        return arel.Scene.objectExists("image113");
    };

    image113.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image113.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image113.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image113.display = function () {
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

    image113.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image113.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image113);
            }
            arel.GestureHandler.addObject("image113", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image113.onLoaded = function () {
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
    var image115 = arel.Scene.getObject("image115");
    image115.objectName = "image115";
    image115.type = "Image";
    image115.scene = scene1;
    image115.associatedTrackable = ml3Dmap13;
    image115.displayOnLoaded = false;
    scenario.contents.push(image115);

    image115.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image115.isLoaded = function () {
        return arel.Scene.objectExists("image115");
    };

    image115.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image115.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image115.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image115.display = function () {
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

    image115.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image115.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image115);
            }
            arel.GestureHandler.addObject("image115", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image115.onLoaded = function () {
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


    // Tompkinsville
    var image116 = arel.Scene.getObject("image116");
    image116.objectName = "image116";
    image116.type = "Image";
    image116.scene = scene1;
    image116.associatedTrackable = ml3Dmap13;
    image116.displayOnLoaded = false;
    scenario.contents.push(image116);

    image116.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image116.isLoaded = function () {
        return arel.Scene.objectExists("image116");
    };

    image116.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image116.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image116.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image116.display = function () {
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

    image116.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image116.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image116);
            }
            arel.GestureHandler.addObject("image116", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image116.onLoaded = function () {
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
    var image119 = arel.Scene.getObject("image119");
    image119.objectName = "image119";
    image119.type = "Image";
    image119.scene = scene1;
    image119.associatedTrackable = ml3Dmap14;
    image119.displayOnLoaded = false;
    scenario.contents.push(image119);

    image119.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image119.isLoaded = function () {
        return arel.Scene.objectExists("image119");
    };

    image119.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image119.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image119.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image119.display = function () {
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

    image119.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image119.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image119);
            }
            arel.GestureHandler.addObject("image119", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image119.onLoaded = function () {
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
    var image120 = arel.Scene.getObject("image120");
    image120.objectName = "image120";
    image120.type = "Image";
    image120.scene = scene1;
    image120.associatedTrackable = ml3Dmap14;
    image120.displayOnLoaded = false;
    scenario.contents.push(image120);

    image120.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image120.isLoaded = function () {
        return arel.Scene.objectExists("image120");
    };

    image120.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image120.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image120.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image120.display = function () {
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

    image120.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image120.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image120);
            }
            arel.GestureHandler.addObject("image120", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image120.onLoaded = function () {
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
    var image121 = arel.Scene.getObject("image121");
    image121.objectName = "image121";
    image121.type = "Image";
    image121.scene = scene1;
    image121.associatedTrackable = ml3Dmap14;
    image121.displayOnLoaded = false;
    scenario.contents.push(image121);

    image121.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image121.isLoaded = function () {
        return arel.Scene.objectExists("image121");
    };

    image121.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image121.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image121.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image121.display = function () {
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

    image121.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image121.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image121);
            }
            arel.GestureHandler.addObject("image121", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image121.onLoaded = function () {
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
    var image122 = arel.Scene.getObject("image122");
    image122.objectName = "image122";
    image122.type = "Image";
    image122.scene = scene1;
    image122.associatedTrackable = ml3Dmap14;
    image122.displayOnLoaded = false;
    scenario.contents.push(image122);

    image122.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image122.isLoaded = function () {
        return arel.Scene.objectExists("image122");
    };

    image122.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image122.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image122.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image122.display = function () {
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

    image122.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image122.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image122);
            }
            arel.GestureHandler.addObject("image122", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image122.onLoaded = function () {
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
    var image123 = arel.Scene.getObject("image123");
    image123.objectName = "image123";
    image123.type = "Image";
    image123.scene = scene1;
    image123.associatedTrackable = ml3Dmap14;
    image123.displayOnLoaded = false;
    scenario.contents.push(image123);

    image123.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image123.isLoaded = function () {
        return arel.Scene.objectExists("image123");
    };

    image123.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image123.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image123.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image123.display = function () {
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

    image123.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image123.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image123);
            }
            arel.GestureHandler.addObject("image123", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image123.onLoaded = function () {
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


    // ManhattanBridge
    var image124 = arel.Scene.getObject("image124");
    image124.objectName = "image124";
    image124.type = "Image";
    image124.scene = scene1;
    image124.associatedTrackable = ml3Dmap14;
    image124.displayOnLoaded = false;
    scenario.contents.push(image124);

    image124.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image124.isLoaded = function () {
        return arel.Scene.objectExists("image124");
    };

    image124.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image124.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image124.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image124.display = function () {
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

    image124.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image124.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image124);
            }
            arel.GestureHandler.addObject("image124", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image124.onLoaded = function () {
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
    var image125 = arel.Scene.getObject("image125");
    image125.objectName = "image125";
    image125.type = "Image";
    image125.scene = scene1;
    image125.associatedTrackable = ml3Dmap14;
    image125.displayOnLoaded = false;
    scenario.contents.push(image125);

    image125.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image125.isLoaded = function () {
        return arel.Scene.objectExists("image125");
    };

    image125.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image125.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image125.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image125.display = function () {
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

    image125.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image125.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image125);
            }
            arel.GestureHandler.addObject("image125", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image125.onLoaded = function () {
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
    var image126 = arel.Scene.getObject("image126");
    image126.objectName = "image126";
    image126.type = "Image";
    image126.scene = scene1;
    image126.associatedTrackable = ml3Dmap14;
    image126.displayOnLoaded = false;
    scenario.contents.push(image126);

    image126.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image126.isLoaded = function () {
        return arel.Scene.objectExists("image126");
    };

    image126.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image126.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image126.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image126.display = function () {
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

    image126.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image126.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image126);
            }
            arel.GestureHandler.addObject("image126", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image126.onLoaded = function () {
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
    var image127 = arel.Scene.getObject("image127");
    image127.objectName = "image127";
    image127.type = "Image";
    image127.scene = scene1;
    image127.associatedTrackable = ml3Dmap14;
    image127.displayOnLoaded = false;
    scenario.contents.push(image127);

    image127.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image127.isLoaded = function () {
        return arel.Scene.objectExists("image127");
    };

    image127.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image127.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image127.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image127.display = function () {
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

    image127.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image127.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image127);
            }
            arel.GestureHandler.addObject("image127", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image127.onLoaded = function () {
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
    var image128 = arel.Scene.getObject("image128");
    image128.objectName = "image128";
    image128.type = "Image";
    image128.scene = scene1;
    image128.associatedTrackable = ml3Dmap14;
    image128.displayOnLoaded = false;
    scenario.contents.push(image128);

    image128.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image128.isLoaded = function () {
        return arel.Scene.objectExists("image128");
    };

    image128.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image128.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image128.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image128.display = function () {
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

    image128.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image128.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image128);
            }
            arel.GestureHandler.addObject("image128", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image128.onLoaded = function () {
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
    var image129 = arel.Scene.getObject("image129");
    image129.objectName = "image129";
    image129.type = "Image";
    image129.scene = scene1;
    image129.associatedTrackable = ml3Dmap15;
    image129.displayOnLoaded = false;
    scenario.contents.push(image129);

    image129.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image129.isLoaded = function () {
        return arel.Scene.objectExists("image129");
    };

    image129.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image129.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image129.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image129.display = function () {
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

    image129.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image129.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image129);
            }
            arel.GestureHandler.addObject("image129", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image129.onLoaded = function () {
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
    var image13 = arel.Scene.getObject("image13");
    image13.objectName = "image13";
    image13.type = "Image";
    image13.scene = scene1;
    image13.associatedTrackable = ml3Dmap4;
    image13.displayOnLoaded = false;
    scenario.contents.push(image13);

    image13.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image13.isLoaded = function () {
        return arel.Scene.objectExists("image13");
    };

    image13.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image13.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image13.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image13.display = function () {
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

    image13.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image13.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image13);
            }
            arel.GestureHandler.addObject("image13", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image13.onLoaded = function () {
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


    // QueensboroBridge
    var image130 = arel.Scene.getObject("image130");
    image130.objectName = "image130";
    image130.type = "Image";
    image130.scene = scene1;
    image130.associatedTrackable = ml3Dmap15;
    image130.displayOnLoaded = false;
    scenario.contents.push(image130);

    image130.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image130.isLoaded = function () {
        return arel.Scene.objectExists("image130");
    };

    image130.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image130.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image130.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image130.display = function () {
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

    image130.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image130.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image130);
            }
            arel.GestureHandler.addObject("image130", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image130.onLoaded = function () {
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
    var image131 = arel.Scene.getObject("image131");
    image131.objectName = "image131";
    image131.type = "Image";
    image131.scene = scene1;
    image131.associatedTrackable = ml3Dmap15;
    image131.displayOnLoaded = false;
    scenario.contents.push(image131);

    image131.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image131.isLoaded = function () {
        return arel.Scene.objectExists("image131");
    };

    image131.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image131.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image131.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image131.display = function () {
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

    image131.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image131.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image131);
            }
            arel.GestureHandler.addObject("image131", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image131.onLoaded = function () {
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
    var image132 = arel.Scene.getObject("image132");
    image132.objectName = "image132";
    image132.type = "Image";
    image132.scene = scene1;
    image132.associatedTrackable = ml3Dmap15;
    image132.displayOnLoaded = false;
    scenario.contents.push(image132);

    image132.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image132.isLoaded = function () {
        return arel.Scene.objectExists("image132");
    };

    image132.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image132.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image132.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image132.display = function () {
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

    image132.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image132.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image132);
            }
            arel.GestureHandler.addObject("image132", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image132.onLoaded = function () {
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


    // CentralPark
    var image133 = arel.Scene.getObject("image133");
    image133.objectName = "image133";
    image133.type = "Image";
    image133.scene = scene1;
    image133.associatedTrackable = ml3Dmap15;
    image133.displayOnLoaded = false;
    scenario.contents.push(image133);

    image133.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image133.isLoaded = function () {
        return arel.Scene.objectExists("image133");
    };

    image133.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image133.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image133.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image133.display = function () {
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

    image133.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image133.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image133);
            }
            arel.GestureHandler.addObject("image133", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image133.onLoaded = function () {
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


    // Corona
    var image134 = arel.Scene.getObject("image134");
    image134.objectName = "image134";
    image134.type = "Image";
    image134.scene = scene1;
    image134.associatedTrackable = ml3Dmap12;
    image134.displayOnLoaded = false;
    scenario.contents.push(image134);

    image134.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image134.isLoaded = function () {
        return arel.Scene.objectExists("image134");
    };

    image134.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image134.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image134.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image134.display = function () {
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

    image134.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image134.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image134);
            }
            arel.GestureHandler.addObject("image134", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image134.onLoaded = function () {
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


    // JacksonHeights
    var image136 = arel.Scene.getObject("image136");
    image136.objectName = "image136";
    image136.type = "Image";
    image136.scene = scene1;
    image136.associatedTrackable = ml3Dmap12;
    image136.displayOnLoaded = false;
    scenario.contents.push(image136);

    image136.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image136.isLoaded = function () {
        return arel.Scene.objectExists("image136");
    };

    image136.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image136.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image136.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image136.display = function () {
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

    image136.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image136.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image136);
            }
            arel.GestureHandler.addObject("image136", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image136.onLoaded = function () {
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


    // EastVillage
    var image138 = arel.Scene.getObject("image138");
    image138.objectName = "image138";
    image138.type = "Image";
    image138.scene = scene1;
    image138.associatedTrackable = ml3Dmap4;
    image138.displayOnLoaded = false;
    scenario.contents.push(image138);

    image138.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image138.isLoaded = function () {
        return arel.Scene.objectExists("image138");
    };

    image138.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image138.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image138.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image138.display = function () {
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

    image138.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image138.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image138);
            }
            arel.GestureHandler.addObject("image138", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image138.onLoaded = function () {
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


    // Greenpoint
    var image139 = arel.Scene.getObject("image139");
    image139.objectName = "image139";
    image139.type = "Image";
    image139.scene = scene1;
    image139.associatedTrackable = ml3Dmap4;
    image139.displayOnLoaded = false;
    scenario.contents.push(image139);

    image139.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image139.isLoaded = function () {
        return arel.Scene.objectExists("image139");
    };

    image139.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image139.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image139.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image139.display = function () {
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

    image139.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image139.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image139);
            }
            arel.GestureHandler.addObject("image139", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image139.onLoaded = function () {
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
    var image14 = arel.Scene.getObject("image14");
    image14.objectName = "image14";
    image14.type = "Image";
    image14.scene = scene1;
    image14.associatedTrackable = ml3Dmap4;
    image14.displayOnLoaded = false;
    scenario.contents.push(image14);

    image14.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image14.isLoaded = function () {
        return arel.Scene.objectExists("image14");
    };

    image14.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image14.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image14.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image14.display = function () {
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

    image14.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image14.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image14);
            }
            arel.GestureHandler.addObject("image14", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image14.onLoaded = function () {
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


    // ParkSlope
    var image140 = arel.Scene.getObject("image140");
    image140.objectName = "image140";
    image140.type = "Image";
    image140.scene = scene1;
    image140.associatedTrackable = ml3Dmap5;
    image140.displayOnLoaded = false;
    scenario.contents.push(image140);

    image140.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image140.isLoaded = function () {
        return arel.Scene.objectExists("image140");
    };

    image140.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image140.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image140.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image140.display = function () {
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

    image140.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image140.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image140);
            }
            arel.GestureHandler.addObject("image140", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image140.onLoaded = function () {
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


    // TheMetropolitanMuseumOfArt
    var image141 = arel.Scene.getObject("image141");
    image141.objectName = "image141";
    image141.type = "Image";
    image141.scene = scene1;
    image141.associatedTrackable = ml3Dmap6;
    image141.displayOnLoaded = false;
    scenario.contents.push(image141);

    image141.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image141.isLoaded = function () {
        return arel.Scene.objectExists("image141");
    };

    image141.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image141.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image141.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image141.display = function () {
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

    image141.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image141.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image141);
            }
            arel.GestureHandler.addObject("image141", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image141.onLoaded = function () {
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


    // RooseveltIsland
    var image142 = arel.Scene.getObject("image142");
    image142.objectName = "image142";
    image142.type = "Image";
    image142.scene = scene1;
    image142.associatedTrackable = ml3Dmap6;
    image142.displayOnLoaded = false;
    scenario.contents.push(image142);

    image142.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image142.isLoaded = function () {
        return arel.Scene.objectExists("image142");
    };

    image142.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image142.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image142.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image142.display = function () {
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

    image142.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image142.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image142);
            }
            arel.GestureHandler.addObject("image142", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image142.onLoaded = function () {
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


    // GeorgeWashingtonBridge
    var image145 = arel.Scene.getObject("image145");
    image145.objectName = "image145";
    image145.type = "Image";
    image145.scene = scene1;
    image145.associatedTrackable = ml3Dmap7;
    image145.displayOnLoaded = false;
    scenario.contents.push(image145);

    image145.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image145.isLoaded = function () {
        return arel.Scene.objectExists("image145");
    };

    image145.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image145.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image145.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image145.display = function () {
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

    image145.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image145.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image145);
            }
            arel.GestureHandler.addObject("image145", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image145.onLoaded = function () {
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
    var image15 = arel.Scene.getObject("image15");
    image15.objectName = "image15";
    image15.type = "Image";
    image15.scene = scene1;
    image15.associatedTrackable = ml3Dmap4;
    image15.displayOnLoaded = false;
    scenario.contents.push(image15);

    image15.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image15.isLoaded = function () {
        return arel.Scene.objectExists("image15");
    };

    image15.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image15.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image15.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image15.display = function () {
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

    image15.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image15.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image15);
            }
            arel.GestureHandler.addObject("image15", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image15.onLoaded = function () {
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


    // WhitestoneBridge
    var image155 = arel.Scene.getObject("image155");
    image155.objectName = "image155";
    image155.type = "Image";
    image155.scene = scene1;
    image155.associatedTrackable = ml3Dmap10;
    image155.displayOnLoaded = false;
    scenario.contents.push(image155);

    image155.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image155.isLoaded = function () {
        return arel.Scene.objectExists("image155");
    };

    image155.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image155.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image155.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image155.display = function () {
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

    image155.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image155.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image155);
            }
            arel.GestureHandler.addObject("image155", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image155.onLoaded = function () {
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


    // EastNewYork
    var image161 = arel.Scene.getObject("image161");
    image161.objectName = "image161";
    image161.type = "Image";
    image161.scene = scene1;
    image161.associatedTrackable = ml3Dmap12;
    image161.displayOnLoaded = false;
    scenario.contents.push(image161);

    image161.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image161.isLoaded = function () {
        return arel.Scene.objectExists("image161");
    };

    image161.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image161.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image161.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image161.display = function () {
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

    image161.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image161.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image161);
            }
            arel.GestureHandler.addObject("image161", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image161.onLoaded = function () {
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


    // QueensMuseum
    var image164 = arel.Scene.getObject("image164");
    image164.objectName = "image164";
    image164.type = "Image";
    image164.scene = scene1;
    image164.associatedTrackable = ml3Dmap12;
    image164.displayOnLoaded = false;
    scenario.contents.push(image164);

    image164.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image164.isLoaded = function () {
        return arel.Scene.objectExists("image164");
    };

    image164.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image164.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image164.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image164.display = function () {
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

    image164.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image164.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image164);
            }
            arel.GestureHandler.addObject("image164", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image164.onLoaded = function () {
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


    // EastVillage
    var image166 = arel.Scene.getObject("image166");
    image166.objectName = "image166";
    image166.type = "Image";
    image166.scene = scene1;
    image166.associatedTrackable = ml3Dmap14;
    image166.displayOnLoaded = false;
    scenario.contents.push(image166);

    image166.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image166.isLoaded = function () {
        return arel.Scene.objectExists("image166");
    };

    image166.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image166.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image166.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image166.display = function () {
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

    image166.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image166.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image166);
            }
            arel.GestureHandler.addObject("image166", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image166.onLoaded = function () {
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


    // WestVillage
    var image167 = arel.Scene.getObject("image167");
    image167.objectName = "image167";
    image167.type = "Image";
    image167.scene = scene1;
    image167.associatedTrackable = ml3Dmap14;
    image167.displayOnLoaded = false;
    scenario.contents.push(image167);

    image167.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image167.isLoaded = function () {
        return arel.Scene.objectExists("image167");
    };

    image167.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image167.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image167.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image167.display = function () {
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

    image167.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image167.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image167);
            }
            arel.GestureHandler.addObject("image167", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image167.onLoaded = function () {
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


    // GovernorsIsland
    var image168 = arel.Scene.getObject("image168");
    image168.objectName = "image168";
    image168.type = "Image";
    image168.scene = scene1;
    image168.associatedTrackable = ml3Dmap14;
    image168.displayOnLoaded = false;
    scenario.contents.push(image168);

    image168.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image168.isLoaded = function () {
        return arel.Scene.objectExists("image168");
    };

    image168.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image168.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image168.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image168.display = function () {
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

    image168.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image168.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image168);
            }
            arel.GestureHandler.addObject("image168", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image168.onLoaded = function () {
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
    var image17 = arel.Scene.getObject("image17");
    image17.objectName = "image17";
    image17.type = "Image";
    image17.scene = scene1;
    image17.associatedTrackable = ml3Dmap10;
    image17.displayOnLoaded = false;
    scenario.contents.push(image17);

    image17.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image17.isLoaded = function () {
        return arel.Scene.objectExists("image17");
    };

    image17.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image17.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image17.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image17.display = function () {
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

    image17.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image17.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image17);
            }
            arel.GestureHandler.addObject("image17", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image17.onLoaded = function () {
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


    // RooseveltIsland
    var image170 = arel.Scene.getObject("image170");
    image170.objectName = "image170";
    image170.type = "Image";
    image170.scene = scene1;
    image170.associatedTrackable = ml3Dmap15;
    image170.displayOnLoaded = false;
    scenario.contents.push(image170);

    image170.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image170.isLoaded = function () {
        return arel.Scene.objectExists("image170");
    };

    image170.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image170.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image170.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image170.display = function () {
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

    image170.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image170.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image170);
            }
            arel.GestureHandler.addObject("image170", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image170.onLoaded = function () {
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


    // EastVillage
    var image171 = arel.Scene.getObject("image171");
    image171.objectName = "image171";
    image171.type = "Image";
    image171.scene = scene1;
    image171.associatedTrackable = ml3Dmap15;
    image171.displayOnLoaded = false;
    scenario.contents.push(image171);

    image171.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image171.isLoaded = function () {
        return arel.Scene.objectExists("image171");
    };

    image171.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image171.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image171.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image171.display = function () {
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

    image171.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image171.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image171);
            }
            arel.GestureHandler.addObject("image171", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image171.onLoaded = function () {
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


    // Bensonhurst
    var image172 = arel.Scene.getObject("image172");
    image172.objectName = "image172";
    image172.type = "Image";
    image172.scene = scene1;
    image172.associatedTrackable = ml3Dmap5;
    image172.displayOnLoaded = false;
    scenario.contents.push(image172);

    image172.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image172.isLoaded = function () {
        return arel.Scene.objectExists("image172");
    };

    image172.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image172.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image172.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image172.display = function () {
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

    image172.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image172.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image172);
            }
            arel.GestureHandler.addObject("image172", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image172.onLoaded = function () {
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


    // GreenwoodCemetary
    var image173 = arel.Scene.getObject("image173");
    image173.objectName = "image173";
    image173.type = "Image";
    image173.scene = scene1;
    image173.associatedTrackable = ml3Dmap5;
    image173.displayOnLoaded = false;
    scenario.contents.push(image173);

    image173.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image173.isLoaded = function () {
        return arel.Scene.objectExists("image173");
    };

    image173.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image173.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image173.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image173.display = function () {
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

    image173.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image173.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image173);
            }
            arel.GestureHandler.addObject("image173", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image173.onLoaded = function () {
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


    // AmericanMuseumNaturalHistory
    var image174 = arel.Scene.getObject("image174");
    image174.objectName = "image174";
    image174.type = "Image";
    image174.scene = scene1;
    image174.associatedTrackable = ml3Dmap6;
    image174.displayOnLoaded = false;
    scenario.contents.push(image174);

    image174.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image174.isLoaded = function () {
        return arel.Scene.objectExists("image174");
    };

    image174.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image174.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image174.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image174.display = function () {
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

    image174.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image174.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image174);
            }
            arel.GestureHandler.addObject("image174", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image174.onLoaded = function () {
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
    var image175 = arel.Scene.getObject("image175");
    image175.objectName = "image175";
    image175.type = "Image";
    image175.scene = scene1;
    image175.associatedTrackable = ml3Dmap6;
    image175.displayOnLoaded = false;
    scenario.contents.push(image175);

    image175.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image175.isLoaded = function () {
        return arel.Scene.objectExists("image175");
    };

    image175.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image175.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image175.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image175.display = function () {
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

    image175.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image175.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image175);
            }
            arel.GestureHandler.addObject("image175", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image175.onLoaded = function () {
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


    // UpperEastSide
    var image176 = arel.Scene.getObject("image176");
    image176.objectName = "image176";
    image176.type = "Image";
    image176.scene = scene1;
    image176.associatedTrackable = ml3Dmap6;
    image176.displayOnLoaded = false;
    scenario.contents.push(image176);

    image176.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image176.isLoaded = function () {
        return arel.Scene.objectExists("image176");
    };

    image176.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image176.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image176.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image176.display = function () {
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

    image176.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image176.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image176);
            }
            arel.GestureHandler.addObject("image176", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image176.onLoaded = function () {
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


    // UpperWestSide
    var image177 = arel.Scene.getObject("image177");
    image177.objectName = "image177";
    image177.type = "Image";
    image177.scene = scene1;
    image177.associatedTrackable = ml3Dmap6;
    image177.displayOnLoaded = false;
    scenario.contents.push(image177);

    image177.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image177.isLoaded = function () {
        return arel.Scene.objectExists("image177");
    };

    image177.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image177.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image177.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image177.display = function () {
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

    image177.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image177.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image177);
            }
            arel.GestureHandler.addObject("image177", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image177.onLoaded = function () {
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


    // Midtown
    var image178 = arel.Scene.getObject("image178");
    image178.objectName = "image178";
    image178.type = "Image";
    image178.scene = scene1;
    image178.associatedTrackable = ml3Dmap6;
    image178.displayOnLoaded = false;
    scenario.contents.push(image178);

    image178.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image178.isLoaded = function () {
        return arel.Scene.objectExists("image178");
    };

    image178.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image178.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image178.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image178.display = function () {
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

    image178.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image178.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image178);
            }
            arel.GestureHandler.addObject("image178", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image178.onLoaded = function () {
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
    var image18 = arel.Scene.getObject("image18");
    image18.objectName = "image18";
    image18.type = "Image";
    image18.scene = scene1;
    image18.associatedTrackable = ml3Dmap10;
    image18.displayOnLoaded = false;
    scenario.contents.push(image18);

    image18.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image18.isLoaded = function () {
        return arel.Scene.objectExists("image18");
    };

    image18.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image18.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image18.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image18.display = function () {
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

    image18.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image18.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image18);
            }
            arel.GestureHandler.addObject("image18", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image18.onLoaded = function () {
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


    // Astoria
    var image181 = arel.Scene.getObject("image181");
    image181.objectName = "image181";
    image181.type = "Image";
    image181.scene = scene1;
    image181.associatedTrackable = ml3Dmap6;
    image181.displayOnLoaded = false;
    scenario.contents.push(image181);

    image181.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image181.isLoaded = function () {
        return arel.Scene.objectExists("image181");
    };

    image181.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image181.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image181.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image181.display = function () {
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

    image181.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image181.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image181);
            }
            arel.GestureHandler.addObject("image181", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image181.onLoaded = function () {
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


    // GrantsTomb
    var image182 = arel.Scene.getObject("image182");
    image182.objectName = "image182";
    image182.type = "Image";
    image182.scene = scene1;
    image182.associatedTrackable = ml3Dmap7;
    image182.displayOnLoaded = false;
    scenario.contents.push(image182);

    image182.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image182.isLoaded = function () {
        return arel.Scene.objectExists("image182");
    };

    image182.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image182.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image182.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image182.display = function () {
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

    image182.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image182.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image182);
            }
            arel.GestureHandler.addObject("image182", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image182.onLoaded = function () {
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


    // LaGuardiaAirport
    var image183 = arel.Scene.getObject("image183");
    image183.objectName = "image183";
    image183.type = "Image";
    image183.scene = scene1;
    image183.associatedTrackable = ml3Dmap7;
    image183.displayOnLoaded = false;
    scenario.contents.push(image183);

    image183.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image183.isLoaded = function () {
        return arel.Scene.objectExists("image183");
    };

    image183.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image183.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image183.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image183.display = function () {
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

    image183.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image183.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image183);
            }
            arel.GestureHandler.addObject("image183", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image183.onLoaded = function () {
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


    // LaGuardiaAirport
    var image191 = arel.Scene.getObject("image191");
    image191.objectName = "image191";
    image191.type = "Image";
    image191.scene = scene1;
    image191.associatedTrackable = ml3Dmap10;
    image191.displayOnLoaded = false;
    scenario.contents.push(image191);

    image191.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image191.isLoaded = function () {
        return arel.Scene.objectExists("image191");
    };

    image191.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image191.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image191.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image191.display = function () {
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

    image191.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image191.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image191);
            }
            arel.GestureHandler.addObject("image191", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image191.onLoaded = function () {
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


    // QueensMuseum
    var image192 = arel.Scene.getObject("image192");
    image192.objectName = "image192";
    image192.type = "Image";
    image192.scene = scene1;
    image192.associatedTrackable = ml3Dmap10;
    image192.displayOnLoaded = false;
    scenario.contents.push(image192);

    image192.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image192.isLoaded = function () {
        return arel.Scene.objectExists("image192");
    };

    image192.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image192.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image192.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image192.display = function () {
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

    image192.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image192.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image192);
            }
            arel.GestureHandler.addObject("image192", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image192.onLoaded = function () {
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


    // Woodside
    var image194 = arel.Scene.getObject("image194");
    image194.objectName = "image194";
    image194.type = "Image";
    image194.scene = scene1;
    image194.associatedTrackable = ml3Dmap10;
    image194.displayOnLoaded = false;
    scenario.contents.push(image194);

    image194.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image194.isLoaded = function () {
        return arel.Scene.objectExists("image194");
    };

    image194.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image194.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image194.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image194.display = function () {
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

    image194.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image194.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image194);
            }
            arel.GestureHandler.addObject("image194", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image194.onLoaded = function () {
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
    var image2 = arel.Scene.getObject("image2");
    image2.objectName = "image2";
    image2.type = "Image";
    image2.scene = scene1;
    image2.associatedTrackable = ml3Dmap4;
    image2.displayOnLoaded = false;
    scenario.contents.push(image2);

    image2.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image2.isLoaded = function () {
        return arel.Scene.objectExists("image2");
    };

    image2.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image2.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image2.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image2.display = function () {
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

    image2.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image2.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image2);
            }
            arel.GestureHandler.addObject("image2", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image2.onLoaded = function () {
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
    var image20 = arel.Scene.getObject("image20");
    image20.objectName = "image20";
    image20.type = "Image";
    image20.scene = scene1;
    image20.associatedTrackable = ml3Dmap12;
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


    // OzonePark
    var image202 = arel.Scene.getObject("image202");
    image202.objectName = "image202";
    image202.type = "Image";
    image202.scene = scene1;
    image202.associatedTrackable = ml3Dmap12;
    image202.displayOnLoaded = false;
    scenario.contents.push(image202);

    image202.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image202.isLoaded = function () {
        return arel.Scene.objectExists("image202");
    };

    image202.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image202.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image202.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image202.display = function () {
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

    image202.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image202.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image202);
            }
            arel.GestureHandler.addObject("image202", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image202.onLoaded = function () {
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
    var image203 = arel.Scene.getObject("image203");
    image203.objectName = "image203";
    image203.type = "Image";
    image203.scene = scene1;
    image203.associatedTrackable = ml3Dmap12;
    image203.displayOnLoaded = false;
    scenario.contents.push(image203);

    image203.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image203.isLoaded = function () {
        return arel.Scene.objectExists("image203");
    };

    image203.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image203.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image203.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image203.display = function () {
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

    image203.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image203.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image203);
            }
            arel.GestureHandler.addObject("image203", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image203.onLoaded = function () {
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


    // JFKAirport
    var image204 = arel.Scene.getObject("image204");
    image204.objectName = "image204";
    image204.type = "Image";
    image204.scene = scene1;
    image204.associatedTrackable = ml3Dmap12;
    image204.displayOnLoaded = false;
    scenario.contents.push(image204);

    image204.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image204.isLoaded = function () {
        return arel.Scene.objectExists("image204");
    };

    image204.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image204.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image204.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image204.display = function () {
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

    image204.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image204.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image204);
            }
            arel.GestureHandler.addObject("image204", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image204.onLoaded = function () {
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


    // Woodside
    var image205 = arel.Scene.getObject("image205");
    image205.objectName = "image205";
    image205.type = "Image";
    image205.scene = scene1;
    image205.associatedTrackable = ml3Dmap12;
    image205.displayOnLoaded = false;
    scenario.contents.push(image205);

    image205.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image205.isLoaded = function () {
        return arel.Scene.objectExists("image205");
    };

    image205.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image205.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image205.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image205.display = function () {
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

    image205.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image205.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image205);
            }
            arel.GestureHandler.addObject("image205", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image205.onLoaded = function () {
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


    // WashingtonSquarePark
    var image209 = arel.Scene.getObject("image209");
    image209.objectName = "image209";
    image209.type = "Image";
    image209.scene = scene1;
    image209.associatedTrackable = ml3Dmap15;
    image209.displayOnLoaded = false;
    scenario.contents.push(image209);

    image209.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image209.isLoaded = function () {
        return arel.Scene.objectExists("image209");
    };

    image209.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image209.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image209.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image209.display = function () {
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

    image209.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image209.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image209);
            }
            arel.GestureHandler.addObject("image209", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image209.onLoaded = function () {
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
    var image21 = arel.Scene.getObject("image21");
    image21.objectName = "image21";
    image21.type = "Image";
    image21.scene = scene1;
    image21.associatedTrackable = ml3Dmap13;
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


    // Midtown
    var image212 = arel.Scene.getObject("image212");
    image212.objectName = "image212";
    image212.type = "Image";
    image212.scene = scene1;
    image212.associatedTrackable = ml3Dmap15;
    image212.displayOnLoaded = false;
    scenario.contents.push(image212);

    image212.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image212.isLoaded = function () {
        return arel.Scene.objectExists("image212");
    };

    image212.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image212.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image212.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image212.display = function () {
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

    image212.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image212.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image212);
            }
            arel.GestureHandler.addObject("image212", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image212.onLoaded = function () {
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


    // WestVillage
    var image213 = arel.Scene.getObject("image213");
    image213.objectName = "image213";
    image213.type = "Image";
    image213.scene = scene1;
    image213.associatedTrackable = ml3Dmap15;
    image213.displayOnLoaded = false;
    scenario.contents.push(image213);

    image213.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image213.isLoaded = function () {
        return arel.Scene.objectExists("image213");
    };

    image213.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image213.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image213.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image213.display = function () {
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

    image213.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image213.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image213);
            }
            arel.GestureHandler.addObject("image213", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image213.onLoaded = function () {
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
    var image214 = arel.Scene.getObject("image214");
    image214.objectName = "image214";
    image214.type = "Image";
    image214.scene = scene1;
    image214.associatedTrackable = ml3Dmap15;
    image214.displayOnLoaded = false;
    scenario.contents.push(image214);

    image214.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image214.isLoaded = function () {
        return arel.Scene.objectExists("image214");
    };

    image214.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image214.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image214.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image214.display = function () {
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

    image214.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image214.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image214);
            }
            arel.GestureHandler.addObject("image214", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image214.onLoaded = function () {
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
    var image215 = arel.Scene.getObject("image215");
    image215.objectName = "image215";
    image215.type = "Image";
    image215.scene = scene1;
    image215.associatedTrackable = ml3Dmap15;
    image215.displayOnLoaded = false;
    scenario.contents.push(image215);

    image215.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image215.isLoaded = function () {
        return arel.Scene.objectExists("image215");
    };

    image215.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image215.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image215.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image215.display = function () {
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

    image215.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image215.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image215);
            }
            arel.GestureHandler.addObject("image215", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image215.onLoaded = function () {
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
    var image216 = arel.Scene.getObject("image216");
    image216.objectName = "image216";
    image216.type = "Image";
    image216.scene = scene1;
    image216.associatedTrackable = ml3Dmap15;
    image216.displayOnLoaded = false;
    scenario.contents.push(image216);

    image216.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image216.isLoaded = function () {
        return arel.Scene.objectExists("image216");
    };

    image216.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image216.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image216.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image216.display = function () {
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

    image216.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image216.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image216);
            }
            arel.GestureHandler.addObject("image216", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image216.onLoaded = function () {
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


    // WestVillage
    var image223 = arel.Scene.getObject("image223");
    image223.objectName = "image223";
    image223.type = "Image";
    image223.scene = scene1;
    image223.associatedTrackable = ml3Dmap4;
    image223.displayOnLoaded = false;
    scenario.contents.push(image223);

    image223.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image223.isLoaded = function () {
        return arel.Scene.objectExists("image223");
    };

    image223.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image223.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image223.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image223.display = function () {
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

    image223.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image223.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image223);
            }
            arel.GestureHandler.addObject("image223", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image223.onLoaded = function () {
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


    // Midtown
    var image225 = arel.Scene.getObject("image225");
    image225.objectName = "image225";
    image225.type = "Image";
    image225.scene = scene1;
    image225.associatedTrackable = ml3Dmap4;
    image225.displayOnLoaded = false;
    scenario.contents.push(image225);

    image225.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image225.isLoaded = function () {
        return arel.Scene.objectExists("image225");
    };

    image225.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image225.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image225.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image225.display = function () {
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

    image225.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image225.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image225);
            }
            arel.GestureHandler.addObject("image225", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image225.onLoaded = function () {
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


    // UpperWestSide
    var image228 = arel.Scene.getObject("image228");
    image228.objectName = "image228";
    image228.type = "Image";
    image228.scene = scene1;
    image228.associatedTrackable = ml3Dmap4;
    image228.displayOnLoaded = false;
    scenario.contents.push(image228);

    image228.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image228.isLoaded = function () {
        return arel.Scene.objectExists("image228");
    };

    image228.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image228.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image228.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image228.display = function () {
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

    image228.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image228.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image228);
            }
            arel.GestureHandler.addObject("image228", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image228.onLoaded = function () {
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
    var image23 = arel.Scene.getObject("image23");
    image23.objectName = "image23";
    image23.type = "Image";
    image23.scene = scene1;
    image23.associatedTrackable = ml3Dmap15;
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


    // Jamaica
    var image232 = arel.Scene.getObject("image232");
    image232.objectName = "image232";
    image232.type = "Image";
    image232.scene = scene1;
    image232.associatedTrackable = ml3Dmap12;
    image232.displayOnLoaded = false;
    scenario.contents.push(image232);

    image232.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image232.isLoaded = function () {
        return arel.Scene.objectExists("image232");
    };

    image232.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image232.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image232.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image232.display = function () {
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

    image232.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image232.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image232);
            }
            arel.GestureHandler.addObject("image232", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image232.onLoaded = function () {
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
    var image24 = arel.Scene.getObject("image24");
    image24.objectName = "image24";
    image24.type = "Image";
    image24.scene = scene1;
    image24.associatedTrackable = ml3Dmap5;
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


    // BrooklynBridge
    var image28 = arel.Scene.getObject("image28");
    image28.objectName = "image28";
    image28.type = "Image";
    image28.scene = scene1;
    image28.associatedTrackable = ml3Dmap4;
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


    // Financial
    var image3 = arel.Scene.getObject("image3");
    image3.objectName = "image3";
    image3.type = "Image";
    image3.scene = scene1;
    image3.associatedTrackable = ml3Dmap4;
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


    // BrooklynBridgePark
    var image31 = arel.Scene.getObject("image31");
    image31.objectName = "image31";
    image31.type = "Image";
    image31.scene = scene1;
    image31.associatedTrackable = ml3Dmap4;
    image31.displayOnLoaded = false;
    scenario.contents.push(image31);

    image31.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image31.isLoaded = function () {
        return arel.Scene.objectExists("image31");
    };

    image31.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image31.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image31.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image31.display = function () {
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

    image31.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image31.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image31);
            }
            arel.GestureHandler.addObject("image31", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image31.onLoaded = function () {
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


    // ManhattanBridge
    var image32 = arel.Scene.getObject("image32");
    image32.objectName = "image32";
    image32.type = "Image";
    image32.scene = scene1;
    image32.associatedTrackable = ml3Dmap4;
    image32.displayOnLoaded = false;
    scenario.contents.push(image32);

    image32.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image32.isLoaded = function () {
        return arel.Scene.objectExists("image32");
    };

    image32.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image32.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image32.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image32.display = function () {
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

    image32.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image32.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image32);
            }
            arel.GestureHandler.addObject("image32", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image32.onLoaded = function () {
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
    var image34 = arel.Scene.getObject("image34");
    image34.objectName = "image34";
    image34.type = "Image";
    image34.scene = scene1;
    image34.associatedTrackable = ml3Dmap5;
    image34.displayOnLoaded = false;
    scenario.contents.push(image34);

    image34.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image34.isLoaded = function () {
        return arel.Scene.objectExists("image34");
    };

    image34.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image34.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image34.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image34.display = function () {
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

    image34.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image34.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image34);
            }
            arel.GestureHandler.addObject("image34", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image34.onLoaded = function () {
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


    // ProspectPark
    var image35 = arel.Scene.getObject("image35");
    image35.objectName = "image35";
    image35.type = "Image";
    image35.scene = scene1;
    image35.associatedTrackable = ml3Dmap5;
    image35.displayOnLoaded = false;
    scenario.contents.push(image35);

    image35.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image35.isLoaded = function () {
        return arel.Scene.objectExists("image35");
    };

    image35.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image35.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image35.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image35.display = function () {
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

    image35.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image35.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image35);
            }
            arel.GestureHandler.addObject("image35", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image35.onLoaded = function () {
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
    var image36 = arel.Scene.getObject("image36");
    image36.objectName = "image36";
    image36.type = "Image";
    image36.scene = scene1;
    image36.associatedTrackable = ml3Dmap5;
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


    // LowerNYBay
    var image37 = arel.Scene.getObject("image37");
    image37.objectName = "image37";
    image37.type = "Image";
    image37.scene = scene1;
    image37.associatedTrackable = ml3Dmap5;
    image37.displayOnLoaded = false;
    scenario.contents.push(image37);

    image37.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image37.isLoaded = function () {
        return arel.Scene.objectExists("image37");
    };

    image37.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image37.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image37.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image37.display = function () {
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

    image37.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image37.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image37);
            }
            arel.GestureHandler.addObject("image37", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image37.onLoaded = function () {
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
    var image38 = arel.Scene.getObject("image38");
    image38.objectName = "image38";
    image38.type = "Image";
    image38.scene = scene1;
    image38.associatedTrackable = ml3Dmap5;
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


    // CentralPark
    var image39 = arel.Scene.getObject("image39");
    image39.objectName = "image39";
    image39.type = "Image";
    image39.scene = scene1;
    image39.associatedTrackable = ml3Dmap6;
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


    // LES
    var image4 = arel.Scene.getObject("image4");
    image4.objectName = "image4";
    image4.type = "Image";
    image4.scene = scene1;
    image4.associatedTrackable = ml3Dmap4;
    image4.displayOnLoaded = false;
    scenario.contents.push(image4);

    image4.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image4.isLoaded = function () {
        return arel.Scene.objectExists("image4");
    };

    image4.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image4.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image4.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image4.display = function () {
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

    image4.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image4.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image4);
            }
            arel.GestureHandler.addObject("image4", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image4.onLoaded = function () {
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
    var image40 = arel.Scene.getObject("image40");
    image40.objectName = "image40";
    image40.type = "Image";
    image40.scene = scene1;
    image40.associatedTrackable = ml3Dmap6;
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


    // HudsonRiver
    var image41 = arel.Scene.getObject("image41");
    image41.objectName = "image41";
    image41.type = "Image";
    image41.scene = scene1;
    image41.associatedTrackable = ml3Dmap6;
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


    // QueensboroBridge
    var image42 = arel.Scene.getObject("image42");
    image42.objectName = "image42";
    image42.type = "Image";
    image42.scene = scene1;
    image42.associatedTrackable = ml3Dmap6;
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


    // EmpireState
    var image44 = arel.Scene.getObject("image44");
    image44.objectName = "image44";
    image44.type = "Image";
    image44.scene = scene1;
    image44.associatedTrackable = ml3Dmap6;
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


    // Queens
    var image46 = arel.Scene.getObject("image46");
    image46.objectName = "image46";
    image46.type = "Image";
    image46.scene = scene1;
    image46.associatedTrackable = ml3Dmap6;
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


    // Manhattan
    var image47 = arel.Scene.getObject("image47");
    image47.objectName = "image47";
    image47.type = "Image";
    image47.scene = scene1;
    image47.associatedTrackable = ml3Dmap6;
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


    // Chinatown
    var image5 = arel.Scene.getObject("image5");
    image5.objectName = "image5";
    image5.type = "Image";
    image5.scene = scene1;
    image5.associatedTrackable = ml3Dmap4;
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


    // Williamsburg
    var image6 = arel.Scene.getObject("image6");
    image6.objectName = "image6";
    image6.type = "Image";
    image6.scene = scene1;
    image6.associatedTrackable = ml3Dmap4;
    image6.displayOnLoaded = false;
    scenario.contents.push(image6);

    image6.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image6.isLoaded = function () {
        return arel.Scene.objectExists("image6");
    };

    image6.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image6.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image6.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image6.display = function () {
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

    image6.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image6.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image6);
            }
            arel.GestureHandler.addObject("image6", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image6.onLoaded = function () {
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


    // JacksonHeights
    var image60 = arel.Scene.getObject("image60");
    image60.objectName = "image60";
    image60.type = "Image";
    image60.scene = scene1;
    image60.associatedTrackable = ml3Dmap10;
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


    // Corona
    var image61 = arel.Scene.getObject("image61");
    image61.objectName = "image61";
    image61.type = "Image";
    image61.scene = scene1;
    image61.associatedTrackable = ml3Dmap10;
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


    // Harlem
    var image62 = arel.Scene.getObject("image62");
    image62.objectName = "image62";
    image62.type = "Image";
    image62.scene = scene1;
    image62.associatedTrackable = ml3Dmap10;
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


    // BronxZoo
    var image64 = arel.Scene.getObject("image64");
    image64.objectName = "image64";
    image64.type = "Image";
    image64.scene = scene1;
    image64.associatedTrackable = ml3Dmap10;
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


    // HuntsPoint
    var image65 = arel.Scene.getObject("image65");
    image65.objectName = "image65";
    image65.type = "Image";
    image65.scene = scene1;
    image65.associatedTrackable = ml3Dmap10;
    image65.displayOnLoaded = false;
    scenario.contents.push(image65);

    image65.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image65.isLoaded = function () {
        return arel.Scene.objectExists("image65");
    };

    image65.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image65.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image65.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image65.display = function () {
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

    image65.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image65.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image65);
            }
            arel.GestureHandler.addObject("image65", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image65.onLoaded = function () {
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


    // YankeeStadium
    var image66 = arel.Scene.getObject("image66");
    image66.objectName = "image66";
    image66.type = "Image";
    image66.scene = scene1;
    image66.associatedTrackable = ml3Dmap10;
    image66.displayOnLoaded = false;
    scenario.contents.push(image66);

    image66.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image66.isLoaded = function () {
        return arel.Scene.objectExists("image66");
    };

    image66.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image66.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image66.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image66.display = function () {
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

    image66.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image66.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image66);
            }
            arel.GestureHandler.addObject("image66", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image66.onLoaded = function () {
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


    // Bronx
    var image70 = arel.Scene.getObject("image70");
    image70.objectName = "image70";
    image70.type = "Image";
    image70.scene = scene1;
    image70.associatedTrackable = ml3Dmap10;
    image70.displayOnLoaded = false;
    scenario.contents.push(image70);

    image70.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image70.isLoaded = function () {
        return arel.Scene.objectExists("image70");
    };

    image70.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image70.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image70.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image70.display = function () {
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

    image70.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image70.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image70);
            }
            arel.GestureHandler.addObject("image70", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image70.onLoaded = function () {
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
    var image73 = arel.Scene.getObject("image73");
    image73.objectName = "image73";
    image73.type = "Image";
    image73.scene = scene1;
    image73.associatedTrackable = ml3Dmap12;
    image73.displayOnLoaded = false;
    scenario.contents.push(image73);

    image73.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image73.isLoaded = function () {
        return arel.Scene.objectExists("image73");
    };

    image73.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image73.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image73.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image73.display = function () {
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

    image73.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image73.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image73);
            }
            arel.GestureHandler.addObject("image73", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image73.onLoaded = function () {
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
    var image74 = arel.Scene.getObject("image74");
    image74.objectName = "image74";
    image74.type = "Image";
    image74.scene = scene1;
    image74.associatedTrackable = ml3Dmap12;
    image74.displayOnLoaded = false;
    scenario.contents.push(image74);

    image74.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image74.isLoaded = function () {
        return arel.Scene.objectExists("image74");
    };

    image74.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image74.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image74.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image74.display = function () {
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

    image74.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image74.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image74);
            }
            arel.GestureHandler.addObject("image74", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image74.onLoaded = function () {
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


    // BedStuy
    var image75 = arel.Scene.getObject("image75");
    image75.objectName = "image75";
    image75.type = "Image";
    image75.scene = scene1;
    image75.associatedTrackable = ml3Dmap12;
    image75.displayOnLoaded = false;
    scenario.contents.push(image75);

    image75.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image75.isLoaded = function () {
        return arel.Scene.objectExists("image75");
    };

    image75.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image75.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image75.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image75.display = function () {
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

    image75.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image75.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image75);
            }
            arel.GestureHandler.addObject("image75", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image75.onLoaded = function () {
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


    // JamaicaBay
    var image79 = arel.Scene.getObject("image79");
    image79.objectName = "image79";
    image79.type = "Image";
    image79.scene = scene1;
    image79.associatedTrackable = ml3Dmap12;
    image79.displayOnLoaded = false;
    scenario.contents.push(image79);

    image79.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image79.isLoaded = function () {
        return arel.Scene.objectExists("image79");
    };

    image79.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image79.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image79.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image79.display = function () {
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

    image79.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image79.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image79);
            }
            arel.GestureHandler.addObject("image79", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image79.onLoaded = function () {
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
    var image8 = arel.Scene.getObject("image8");
    image8.objectName = "image8";
    image8.type = "Image";
    image8.scene = scene1;
    image8.associatedTrackable = ml3Dmap4;
    image8.displayOnLoaded = false;
    scenario.contents.push(image8);

    image8.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image8.isLoaded = function () {
        return arel.Scene.objectExists("image8");
    };

    image8.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image8.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image8.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image8.display = function () {
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

    image8.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image8.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image8);
            }
            arel.GestureHandler.addObject("image8", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image8.onLoaded = function () {
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
    var image9 = arel.Scene.getObject("image9");
    image9.objectName = "image9";
    image9.type = "Image";
    image9.scene = scene1;
    image9.associatedTrackable = ml3Dmap4;
    image9.displayOnLoaded = false;
    scenario.contents.push(image9);

    image9.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image9.isLoaded = function () {
        return arel.Scene.objectExists("image9");
    };

    image9.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image9.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image9.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image9.display = function () {
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

    image9.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image9.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image9);
            }
            arel.GestureHandler.addObject("image9", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image9.onLoaded = function () {
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


    // WilliamsburgBridge
    var image93 = arel.Scene.getObject("image93");
    image93.objectName = "image93";
    image93.type = "Image";
    image93.scene = scene1;
    image93.associatedTrackable = ml3Dmap4;
    image93.displayOnLoaded = false;
    scenario.contents.push(image93);

    image93.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image93.isLoaded = function () {
        return arel.Scene.objectExists("image93");
    };

    image93.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image93.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image93.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image93.display = function () {
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

    image93.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image93.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image93);
            }
            arel.GestureHandler.addObject("image93", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image93.onLoaded = function () {
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


    // Bronx
    var image99 = arel.Scene.getObject("image99");
    image99.objectName = "image99";
    image99.type = "Image";
    image99.scene = scene1;
    image99.associatedTrackable = ml3Dmap7;
    image99.displayOnLoaded = false;
    scenario.contents.push(image99);

    image99.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image99.isLoaded = function () {
        return arel.Scene.objectExists("image99");
    };

    image99.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image99.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image99.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image99.display = function () {
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

    image99.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image99.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image99);
            }
            arel.GestureHandler.addObject("image99", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image99.onLoaded = function () {
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
    var model47 = arel.Scene.getObject("model47");
    model47.objectName = "model47";
    model47.type = "Model";
    model47.scene = scene1;
    model47.associatedTrackable = ml3Dmap13;
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
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
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
    var model50 = arel.Scene.getObject("model50");
    model50.objectName = "model50";
    model50.type = "Model";
    model50.scene = scene1;
    model50.associatedTrackable = ml3Dmap12;
    model50.displayOnLoaded = false;
    scenario.contents.push(model50);

    model50.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model50.isLoaded = function () {
        return arel.Scene.objectExists("model50");
    };

    model50.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model50.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model50.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model50.display = function () {
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

    model50.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model50.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model50);
            }
            arel.GestureHandler.addObject("model50", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model50.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model50.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-3', false);
        
        /***** End of custom script *****/
    };

    model50.onLoaded = function () {
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
    var model51 = arel.Scene.getObject("model51");
    model51.objectName = "model51";
    model51.type = "Model";
    model51.scene = scene1;
    model51.associatedTrackable = ml3Dmap10;
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
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-3', false);
        
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
    var model53 = arel.Scene.getObject("model53");
    model53.objectName = "model53";
    model53.type = "Model";
    model53.scene = scene1;
    model53.associatedTrackable = ml3Dmap12;
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
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
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
    var model54 = arel.Scene.getObject("model54");
    model54.objectName = "model54";
    model54.type = "Model";
    model54.scene = scene1;
    model54.associatedTrackable = ml3Dmap10;
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


    // qma5
    var model55 = arel.Scene.getObject("model55");
    model55.objectName = "model55";
    model55.type = "Model";
    model55.scene = scene1;
    model55.associatedTrackable = ml3Dmap10;
    model55.displayOnLoaded = false;
    scenario.contents.push(model55);

    model55.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model55.isLoaded = function () {
        return arel.Scene.objectExists("model55");
    };

    model55.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model55.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model55.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model55.display = function () {
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

    model55.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model55.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model55);
            }
            arel.GestureHandler.addObject("model55", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model55.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model55.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-4', false);
        
        /***** End of custom script *****/
    };

    model55.onLoaded = function () {
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
    var model58 = arel.Scene.getObject("model58");
    model58.objectName = "model58";
    model58.type = "Model";
    model58.scene = scene1;
    model58.associatedTrackable = ml3Dmap12;
    model58.displayOnLoaded = false;
    scenario.contents.push(model58);

    model58.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model58.isLoaded = function () {
        return arel.Scene.objectExists("model58");
    };

    model58.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model58.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model58.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model58.display = function () {
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

    model58.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model58.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model58);
            }
            arel.GestureHandler.addObject("model58", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model58.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model58.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-5', false);
        
        /***** End of custom script *****/
    };

    model58.onLoaded = function () {
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
    var model59 = arel.Scene.getObject("model59");
    model59.objectName = "model59";
    model59.type = "Model";
    model59.scene = scene1;
    model59.associatedTrackable = ml3Dmap12;
    model59.displayOnLoaded = false;
    scenario.contents.push(model59);

    model59.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model59.isLoaded = function () {
        return arel.Scene.objectExists("model59");
    };

    model59.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model59.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model59.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model59.display = function () {
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

    model59.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model59.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model59);
            }
            arel.GestureHandler.addObject("model59", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model59.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model59.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-4', false);
        
        /***** End of custom script *****/
    };

    model59.onLoaded = function () {
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
    var model60 = arel.Scene.getObject("model60");
    model60.objectName = "model60";
    model60.type = "Model";
    model60.scene = scene1;
    model60.associatedTrackable = ml3Dmap4;
    model60.displayOnLoaded = false;
    scenario.contents.push(model60);

    model60.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model60.isLoaded = function () {
        return arel.Scene.objectExists("model60");
    };

    model60.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model60.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model60.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model60.display = function () {
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

    model60.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model60.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model60);
            }
            arel.GestureHandler.addObject("model60", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model60.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model60.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model60.onLoaded = function () {
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