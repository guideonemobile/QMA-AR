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
        arel.Debug.log("Welcome to the 'qma71014' Augmented Reality experience.");

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
        scenario.registerObject(image3);
        if (methodExists(image3, image3.onLoaded)) {
            image3.onLoaded();
        }
        scenario.registerObject(image4);
        if (methodExists(image4, image4.onLoaded)) {
            image4.onLoaded();
        }
        scenario.registerObject(image5);
        if (methodExists(image5, image5.onLoaded)) {
            image5.onLoaded();
        }
        scenario.registerObject(image6);
        if (methodExists(image6, image6.onLoaded)) {
            image6.onLoaded();
        }
        scenario.registerObject(image7);
        if (methodExists(image7, image7.onLoaded)) {
            image7.onLoaded();
        }
        scenario.registerObject(model6);
        if (methodExists(model6, model6.onLoaded)) {
            model6.onLoaded();
        }
        scenario.registerObject(model8);
        if (methodExists(model8, model8.onLoaded)) {
            model8.onLoaded();
        }
        scenario.registerObject(model10);
        if (methodExists(model10, model10.onLoaded)) {
            model10.onLoaded();
        }
        scenario.registerObject(model15);
        if (methodExists(model15, model15.onLoaded)) {
            model15.onLoaded();
        }
        scenario.registerObject(model16);
        if (methodExists(model16, model16.onLoaded)) {
            model16.onLoaded();
        }
        scenario.registerObject(model17);
        if (methodExists(model17, model17.onLoaded)) {
            model17.onLoaded();
        }
        scenario.registerObject(model18);
        if (methodExists(model18, model18.onLoaded)) {
            model18.onLoaded();
        }
        scenario.registerObject(model19);
        if (methodExists(model19, model19.onLoaded)) {
            model19.onLoaded();
        }
        scenario.registerObject(model20);
        if (methodExists(model20, model20.onLoaded)) {
            model20.onLoaded();
        }
        scenario.registerObject(model21);
        if (methodExists(model21, model21.onLoaded)) {
            model21.onLoaded();
        }
        scenario.registerObject(model22);
        if (methodExists(model22, model22.onLoaded)) {
            model22.onLoaded();
        }
        scenario.registerObject(image9);
        if (methodExists(image9, image9.onLoaded)) {
            image9.onLoaded();
        }
        scenario.registerObject(image10);
        if (methodExists(image10, image10.onLoaded)) {
            image10.onLoaded();
        }
        scenario.registerObject(image11);
        if (methodExists(image11, image11.onLoaded)) {
            image11.onLoaded();
        }
        scenario.registerObject(image12);
        if (methodExists(image12, image12.onLoaded)) {
            image12.onLoaded();
        }
        scenario.registerObject(image13);
        if (methodExists(image13, image13.onLoaded)) {
            image13.onLoaded();
        }
        scenario.registerObject(image14);
        if (methodExists(image14, image14.onLoaded)) {
            image14.onLoaded();
        }
        scenario.registerObject(image15);
        if (methodExists(image15, image15.onLoaded)) {
            image15.onLoaded();
        }
        scenario.registerObject(image16);
        if (methodExists(image16, image16.onLoaded)) {
            image16.onLoaded();
        }
        scenario.registerObject(image18);
        if (methodExists(image18, image18.onLoaded)) {
            image18.onLoaded();
        }
        scenario.registerObject(image17);
        if (methodExists(image17, image17.onLoaded)) {
            image17.onLoaded();
        }
        scenario.registerObject(image19);
        if (methodExists(image19, image19.onLoaded)) {
            image19.onLoaded();
        }
        scenario.registerObject(model23);
        if (methodExists(model23, model23.onLoaded)) {
            model23.onLoaded();
        }
        scenario.registerObject(model24);
        if (methodExists(model24, model24.onLoaded)) {
            model24.onLoaded();
        }
        scenario.registerObject(model25);
        if (methodExists(model25, model25.onLoaded)) {
            model25.onLoaded();
        }
        scenario.registerObject(model26);
        if (methodExists(model26, model26.onLoaded)) {
            model26.onLoaded();
        }
        scenario.registerObject(model27);
        if (methodExists(model27, model27.onLoaded)) {
            model27.onLoaded();
        }
        scenario.registerObject(model28);
        if (methodExists(model28, model28.onLoaded)) {
            model28.onLoaded();
        }
        scenario.registerObject(model29);
        if (methodExists(model29, model29.onLoaded)) {
            model29.onLoaded();
        }
        scenario.registerObject(model30);
        if (methodExists(model30, model30.onLoaded)) {
            model30.onLoaded();
        }
        scenario.registerObject(model31);
        if (methodExists(model31, model31.onLoaded)) {
            model31.onLoaded();
        }
        scenario.registerObject(model32);
        if (methodExists(model32, model32.onLoaded)) {
            model32.onLoaded();
        }
        scenario.registerObject(model33);
        if (methodExists(model33, model33.onLoaded)) {
            model33.onLoaded();
        }
        scenario.registerObject(model34);
        if (methodExists(model34, model34.onLoaded)) {
            model34.onLoaded();
        }
        scenario.registerObject(model35);
        if (methodExists(model35, model35.onLoaded)) {
            model35.onLoaded();
        }
        scenario.registerObject(model36);
        if (methodExists(model36, model36.onLoaded)) {
            model36.onLoaded();
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
        scenario.registerObject(image27);
        if (methodExists(image27, image27.onLoaded)) {
            image27.onLoaded();
        }
        scenario.registerObject(image28);
        if (methodExists(image28, image28.onLoaded)) {
            image28.onLoaded();
        }
        scenario.registerObject(image29);
        if (methodExists(image29, image29.onLoaded)) {
            image29.onLoaded();
        }
        scenario.registerObject(image30);
        if (methodExists(image30, image30.onLoaded)) {
            image30.onLoaded();
        }
        scenario.registerObject(image31);
        if (methodExists(image31, image31.onLoaded)) {
            image31.onLoaded();
        }
        scenario.registerObject(image32);
        if (methodExists(image32, image32.onLoaded)) {
            image32.onLoaded();
        }
        scenario.registerObject(image33);
        if (methodExists(image33, image33.onLoaded)) {
            image33.onLoaded();
        }
        scenario.registerObject(image34);
        if (methodExists(image34, image34.onLoaded)) {
            image34.onLoaded();
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


    var ml3Dmap1 = {};
    scenario.trackables.push(ml3Dmap1);
    ml3Dmap1.objectName = "ml3Dmap1";
    ml3Dmap1.cosName = "map-20140612131409_1";
    ml3Dmap1.cosID = "1";
    ml3Dmap1.isCurrentlyTracking = false;
    ml3Dmap1.currentTrackingValues = null;
    ml3Dmap1.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        model20.display();
        image10.display();
        model21.display();
        model17.display();
        image13.display();
        image18.display();
        model2.display();
        model10.display();
        model19.display();
        image15.display();
        image11.display();
        image9.display();
        model22.display();
        image12.display();
        model6.display();
        image14.display();
        model16.display();
        model18.display();
        image16.display();
        image19.display();
        image17.display();
        model8.display();
        model15.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap1.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        model16.hide();
        image17.hide();
        image12.hide();
        model18.hide();
        image15.hide();
        model15.hide();
        image16.hide();
        image14.hide();
        model8.hide();
        image18.hide();
        model20.hide();
        image13.hide();
        model21.hide();
        image11.hide();
        image9.hide();
        model6.hide();
        image10.hide();
        model2.hide();
        model19.hide();
        model17.hide();
        image4.hide();
        model22.hide();
        image19.hide();
        model10.hide();
    };


    var ml3Dmap2 = {};
    scenario.trackables.push(ml3Dmap2);
    ml3Dmap2.objectName = "ml3Dmap2";
    ml3Dmap2.cosName = "map-20140612130752_2";
    ml3Dmap2.cosID = "2";
    ml3Dmap2.isCurrentlyTracking = false;
    ml3Dmap2.currentTrackingValues = null;
    ml3Dmap2.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        model23.display();
        image24.display();
        model24.display();
        image22.display();
        model25.display();
        image20.display();
        image23.display();
        image21.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap2.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        image20.hide();
        image24.hide();
        model24.hide();
        image3.hide();
        model23.hide();
        image21.hide();
        image22.hide();
        model25.hide();
        image23.hide();
    };


    var ml3Dmap3 = {};
    scenario.trackables.push(ml3Dmap3);
    ml3Dmap3.objectName = "ml3Dmap3";
    ml3Dmap3.cosName = "map-20140612130359_3";
    ml3Dmap3.cosID = "3";
    ml3Dmap3.isCurrentlyTracking = false;
    ml3Dmap3.currentTrackingValues = null;
    ml3Dmap3.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image28.display();
        model30.display();
        model26.display();
        image25.display();
        image29.display();
        image26.display();
        image30.display();
        model29.display();
        model31.display();
        model28.display();
        model27.display();
        image27.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap3.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        image26.hide();
        image28.hide();
        model29.hide();
        model31.hide();
        model28.hide();
        image29.hide();
        image5.hide();
        model30.hide();
        model27.hide();
        image25.hide();
        model26.hide();
        image30.hide();
        image27.hide();
    };


    var ml3Dmap4 = {};
    scenario.trackables.push(ml3Dmap4);
    ml3Dmap4.objectName = "ml3Dmap4";
    ml3Dmap4.cosName = "map-20140612131409_4";
    ml3Dmap4.cosID = "4";
    ml3Dmap4.isCurrentlyTracking = false;
    ml3Dmap4.currentTrackingValues = null;
    ml3Dmap4.onTracked = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTracked()");
        this.isCurrentlyTracking = true;
        this.currentTrackingValues = trackingValues;
        image6.display();
        model36.display();
        model34.display();
        image31.display();
        model32.display();
        model33.display();
        image34.display();
        model35.display();
        image33.display();
        image32.display();
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('targetTrackStarted=CentralPark', false);
        
        /***** End of custom script *****/
    };

    ml3Dmap4.onTrackingLost = function (trackingValues) {
        arel.Debug.log(this.objectName + ".onTrackingLost()");
        this.isCurrentlyTracking = false;
        this.currentTrackingValues = null;
        model36.hide();
        image31.hide();
        image33.hide();
        model33.hide();
        model34.hide();
        model35.hide();
        image34.hide();
        image7.hide();
        image32.hide();
        image6.hide();
        model32.hide();
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


    // EmpireState
    var image10 = arel.Scene.getObject("image10");
    image10.objectName = "image10";
    image10.type = "Image";
    image10.scene = scene1;
    image10.associatedTrackable = ml3Dmap1;
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


    // Manhattan
    var image11 = arel.Scene.getObject("image11");
    image11.objectName = "image11";
    image11.type = "Image";
    image11.scene = scene1;
    image11.associatedTrackable = ml3Dmap1;
    image11.displayOnLoaded = false;
    scenario.contents.push(image11);

    image11.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image11.isLoaded = function () {
        return arel.Scene.objectExists("image11");
    };

    image11.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image11.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image11.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image11.display = function () {
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

    image11.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image11.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image11);
            }
            arel.GestureHandler.addObject("image11", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image11.onLoaded = function () {
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
    var image12 = arel.Scene.getObject("image12");
    image12.objectName = "image12";
    image12.type = "Image";
    image12.scene = scene1;
    image12.associatedTrackable = ml3Dmap1;
    image12.displayOnLoaded = false;
    scenario.contents.push(image12);

    image12.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image12.isLoaded = function () {
        return arel.Scene.objectExists("image12");
    };

    image12.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image12.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image12.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image12.display = function () {
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

    image12.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image12.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image12);
            }
            arel.GestureHandler.addObject("image12", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image12.onLoaded = function () {
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
    var image13 = arel.Scene.getObject("image13");
    image13.objectName = "image13";
    image13.type = "Image";
    image13.scene = scene1;
    image13.associatedTrackable = ml3Dmap1;
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


    // BrooklynBridge
    var image14 = arel.Scene.getObject("image14");
    image14.objectName = "image14";
    image14.type = "Image";
    image14.scene = scene1;
    image14.associatedTrackable = ml3Dmap1;
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


    // ManhattanBridge
    var image15 = arel.Scene.getObject("image15");
    image15.objectName = "image15";
    image15.type = "Image";
    image15.scene = scene1;
    image15.associatedTrackable = ml3Dmap1;
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


    // EastRiver
    var image16 = arel.Scene.getObject("image16");
    image16.objectName = "image16";
    image16.type = "Image";
    image16.scene = scene1;
    image16.associatedTrackable = ml3Dmap1;
    image16.displayOnLoaded = false;
    scenario.contents.push(image16);

    image16.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image16.isLoaded = function () {
        return arel.Scene.objectExists("image16");
    };

    image16.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image16.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image16.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image16.display = function () {
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

    image16.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image16.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image16);
            }
            arel.GestureHandler.addObject("image16", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image16.onLoaded = function () {
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
    var image17 = arel.Scene.getObject("image17");
    image17.objectName = "image17";
    image17.type = "Image";
    image17.scene = scene1;
    image17.associatedTrackable = ml3Dmap1;
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


    // WilliamsburgBridge
    var image18 = arel.Scene.getObject("image18");
    image18.objectName = "image18";
    image18.type = "Image";
    image18.scene = scene1;
    image18.associatedTrackable = ml3Dmap1;
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


    // Brooklyn
    var image19 = arel.Scene.getObject("image19");
    image19.objectName = "image19";
    image19.type = "Image";
    image19.scene = scene1;
    image19.associatedTrackable = ml3Dmap1;
    image19.displayOnLoaded = false;
    scenario.contents.push(image19);

    image19.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image19.isLoaded = function () {
        return arel.Scene.objectExists("image19");
    };

    image19.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image19.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image19.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image19.display = function () {
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

    image19.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image19.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image19);
            }
            arel.GestureHandler.addObject("image19", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image19.onLoaded = function () {
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


    // Brooklyn
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


    // Queens
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


    // Queens
    var image33 = arel.Scene.getObject("image33");
    image33.objectName = "image33";
    image33.type = "Image";
    image33.scene = scene1;
    image33.associatedTrackable = ml3Dmap4;
    image33.displayOnLoaded = false;
    scenario.contents.push(image33);

    image33.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image33.isLoaded = function () {
        return arel.Scene.objectExists("image33");
    };

    image33.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image33.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image33.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image33.display = function () {
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

    image33.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image33.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image33);
            }
            arel.GestureHandler.addObject("image33", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image33.onLoaded = function () {
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
    var image34 = arel.Scene.getObject("image34");
    image34.objectName = "image34";
    image34.type = "Image";
    image34.scene = scene1;
    image34.associatedTrackable = ml3Dmap4;
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


    // 4-Upper
    var image4 = arel.Scene.getObject("image4");
    image4.objectName = "image4";
    image4.type = "Image";
    image4.scene = scene1;
    image4.associatedTrackable = ml3Dmap1;
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


    // 2-Staten
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


    // 3-Core
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


    // 4-Upper
    var image7 = arel.Scene.getObject("image7");
    image7.objectName = "image7";
    image7.type = "Image";
    image7.scene = scene1;
    image7.associatedTrackable = ml3Dmap4;
    image7.displayOnLoaded = false;
    scenario.contents.push(image7);

    image7.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    image7.isLoaded = function () {
        return arel.Scene.objectExists("image7");
    };

    image7.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    image7.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    image7.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    image7.display = function () {
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

    image7.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    image7.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(image7);
            }
            arel.GestureHandler.addObject("image7", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    image7.onLoaded = function () {
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
    var image9 = arel.Scene.getObject("image9");
    image9.objectName = "image9";
    image9.type = "Image";
    image9.scene = scene1;
    image9.associatedTrackable = ml3Dmap1;
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


    // qma5
    var model10 = arel.Scene.getObject("model10");
    model10.objectName = "model10";
    model10.type = "Model";
    model10.scene = scene1;
    model10.associatedTrackable = ml3Dmap1;
    model10.displayOnLoaded = false;
    scenario.contents.push(model10);

    model10.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model10.isLoaded = function () {
        return arel.Scene.objectExists("model10");
    };

    model10.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model10.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model10.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model10.display = function () {
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

    model10.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model10.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model10);
            }
            arel.GestureHandler.addObject("model10", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model10.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model10.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model10.onLoaded = function () {
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
    var model15 = arel.Scene.getObject("model15");
    model15.objectName = "model15";
    model15.type = "Model";
    model15.scene = scene1;
    model15.associatedTrackable = ml3Dmap1;
    model15.displayOnLoaded = false;
    scenario.contents.push(model15);

    model15.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model15.isLoaded = function () {
        return arel.Scene.objectExists("model15");
    };

    model15.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model15.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model15.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model15.display = function () {
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

    model15.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model15.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model15);
            }
            arel.GestureHandler.addObject("model15", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model15.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model15.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model15.onLoaded = function () {
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
    var model16 = arel.Scene.getObject("model16");
    model16.objectName = "model16";
    model16.type = "Model";
    model16.scene = scene1;
    model16.associatedTrackable = ml3Dmap1;
    model16.displayOnLoaded = false;
    scenario.contents.push(model16);

    model16.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model16.isLoaded = function () {
        return arel.Scene.objectExists("model16");
    };

    model16.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model16.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model16.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model16.display = function () {
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

    model16.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model16.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model16);
            }
            arel.GestureHandler.addObject("model16", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model16.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model16.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model16.onLoaded = function () {
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
    var model17 = arel.Scene.getObject("model17");
    model17.objectName = "model17";
    model17.type = "Model";
    model17.scene = scene1;
    model17.associatedTrackable = ml3Dmap1;
    model17.displayOnLoaded = false;
    scenario.contents.push(model17);

    model17.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model17.isLoaded = function () {
        return arel.Scene.objectExists("model17");
    };

    model17.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model17.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model17.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model17.display = function () {
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

    model17.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model17.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model17);
            }
            arel.GestureHandler.addObject("model17", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model17.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model17.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model17.onLoaded = function () {
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
    var model18 = arel.Scene.getObject("model18");
    model18.objectName = "model18";
    model18.type = "Model";
    model18.scene = scene1;
    model18.associatedTrackable = ml3Dmap1;
    model18.displayOnLoaded = false;
    scenario.contents.push(model18);

    model18.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model18.isLoaded = function () {
        return arel.Scene.objectExists("model18");
    };

    model18.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model18.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model18.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model18.display = function () {
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

    model18.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model18.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model18);
            }
            arel.GestureHandler.addObject("model18", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model18.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model18.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model18.onLoaded = function () {
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
    var model19 = arel.Scene.getObject("model19");
    model19.objectName = "model19";
    model19.type = "Model";
    model19.scene = scene1;
    model19.associatedTrackable = ml3Dmap1;
    model19.displayOnLoaded = false;
    scenario.contents.push(model19);

    model19.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model19.isLoaded = function () {
        return arel.Scene.objectExists("model19");
    };

    model19.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model19.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model19.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model19.display = function () {
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

    model19.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model19.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model19);
            }
            arel.GestureHandler.addObject("model19", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model19.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model19.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model19.onLoaded = function () {
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
    var model2 = arel.Scene.getObject("model2");
    model2.objectName = "model2";
    model2.type = "Model";
    model2.scene = scene1;
    model2.associatedTrackable = ml3Dmap1;
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
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
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


    // qma5
    var model20 = arel.Scene.getObject("model20");
    model20.objectName = "model20";
    model20.type = "Model";
    model20.scene = scene1;
    model20.associatedTrackable = ml3Dmap1;
    model20.displayOnLoaded = false;
    scenario.contents.push(model20);

    model20.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model20.isLoaded = function () {
        return arel.Scene.objectExists("model20");
    };

    model20.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model20.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model20.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model20.display = function () {
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

    model20.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model20.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model20);
            }
            arel.GestureHandler.addObject("model20", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model20.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model20.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model20.onLoaded = function () {
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
    var model21 = arel.Scene.getObject("model21");
    model21.objectName = "model21";
    model21.type = "Model";
    model21.scene = scene1;
    model21.associatedTrackable = ml3Dmap1;
    model21.displayOnLoaded = false;
    scenario.contents.push(model21);

    model21.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model21.isLoaded = function () {
        return arel.Scene.objectExists("model21");
    };

    model21.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model21.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model21.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model21.display = function () {
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

    model21.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model21.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model21);
            }
            arel.GestureHandler.addObject("model21", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model21.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model21.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model21.onLoaded = function () {
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
    var model22 = arel.Scene.getObject("model22");
    model22.objectName = "model22";
    model22.type = "Model";
    model22.scene = scene1;
    model22.associatedTrackable = ml3Dmap1;
    model22.displayOnLoaded = false;
    scenario.contents.push(model22);

    model22.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model22.isLoaded = function () {
        return arel.Scene.objectExists("model22");
    };

    model22.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model22.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model22.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model22.display = function () {
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

    model22.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model22.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model22);
            }
            arel.GestureHandler.addObject("model22", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model22.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model22.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model22.onLoaded = function () {
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
    var model23 = arel.Scene.getObject("model23");
    model23.objectName = "model23";
    model23.type = "Model";
    model23.scene = scene1;
    model23.associatedTrackable = ml3Dmap2;
    model23.displayOnLoaded = false;
    scenario.contents.push(model23);

    model23.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model23.isLoaded = function () {
        return arel.Scene.objectExists("model23");
    };

    model23.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model23.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model23.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model23.display = function () {
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

    model23.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model23.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model23);
            }
            arel.GestureHandler.addObject("model23", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model23.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model23.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model23.onLoaded = function () {
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
    var model24 = arel.Scene.getObject("model24");
    model24.objectName = "model24";
    model24.type = "Model";
    model24.scene = scene1;
    model24.associatedTrackable = ml3Dmap2;
    model24.displayOnLoaded = false;
    scenario.contents.push(model24);

    model24.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model24.isLoaded = function () {
        return arel.Scene.objectExists("model24");
    };

    model24.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model24.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model24.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model24.display = function () {
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

    model24.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model24.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model24);
            }
            arel.GestureHandler.addObject("model24", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model24.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model24.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model24.onLoaded = function () {
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
    var model25 = arel.Scene.getObject("model25");
    model25.objectName = "model25";
    model25.type = "Model";
    model25.scene = scene1;
    model25.associatedTrackable = ml3Dmap2;
    model25.displayOnLoaded = false;
    scenario.contents.push(model25);

    model25.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model25.isLoaded = function () {
        return arel.Scene.objectExists("model25");
    };

    model25.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model25.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model25.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model25.display = function () {
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

    model25.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model25.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model25);
            }
            arel.GestureHandler.addObject("model25", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model25.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model25.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model25.onLoaded = function () {
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
    var model26 = arel.Scene.getObject("model26");
    model26.objectName = "model26";
    model26.type = "Model";
    model26.scene = scene1;
    model26.associatedTrackable = ml3Dmap3;
    model26.displayOnLoaded = false;
    scenario.contents.push(model26);

    model26.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model26.isLoaded = function () {
        return arel.Scene.objectExists("model26");
    };

    model26.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model26.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model26.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model26.display = function () {
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

    model26.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model26.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model26);
            }
            arel.GestureHandler.addObject("model26", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model26.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model26.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model26.onLoaded = function () {
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
    var model27 = arel.Scene.getObject("model27");
    model27.objectName = "model27";
    model27.type = "Model";
    model27.scene = scene1;
    model27.associatedTrackable = ml3Dmap3;
    model27.displayOnLoaded = false;
    scenario.contents.push(model27);

    model27.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model27.isLoaded = function () {
        return arel.Scene.objectExists("model27");
    };

    model27.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model27.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model27.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model27.display = function () {
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

    model27.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model27.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model27);
            }
            arel.GestureHandler.addObject("model27", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model27.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model27.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model27.onLoaded = function () {
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
    var model28 = arel.Scene.getObject("model28");
    model28.objectName = "model28";
    model28.type = "Model";
    model28.scene = scene1;
    model28.associatedTrackable = ml3Dmap3;
    model28.displayOnLoaded = false;
    scenario.contents.push(model28);

    model28.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model28.isLoaded = function () {
        return arel.Scene.objectExists("model28");
    };

    model28.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model28.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model28.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model28.display = function () {
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

    model28.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model28.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model28);
            }
            arel.GestureHandler.addObject("model28", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model28.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model28.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model28.onLoaded = function () {
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
    var model29 = arel.Scene.getObject("model29");
    model29.objectName = "model29";
    model29.type = "Model";
    model29.scene = scene1;
    model29.associatedTrackable = ml3Dmap3;
    model29.displayOnLoaded = false;
    scenario.contents.push(model29);

    model29.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model29.isLoaded = function () {
        return arel.Scene.objectExists("model29");
    };

    model29.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model29.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model29.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model29.display = function () {
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

    model29.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model29.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model29);
            }
            arel.GestureHandler.addObject("model29", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model29.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model29.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model29.onLoaded = function () {
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
    var model30 = arel.Scene.getObject("model30");
    model30.objectName = "model30";
    model30.type = "Model";
    model30.scene = scene1;
    model30.associatedTrackable = ml3Dmap3;
    model30.displayOnLoaded = false;
    scenario.contents.push(model30);

    model30.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model30.isLoaded = function () {
        return arel.Scene.objectExists("model30");
    };

    model30.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model30.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model30.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model30.display = function () {
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

    model30.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model30.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model30);
            }
            arel.GestureHandler.addObject("model30", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model30.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model30.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model30.onLoaded = function () {
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
    var model31 = arel.Scene.getObject("model31");
    model31.objectName = "model31";
    model31.type = "Model";
    model31.scene = scene1;
    model31.associatedTrackable = ml3Dmap3;
    model31.displayOnLoaded = false;
    scenario.contents.push(model31);

    model31.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model31.isLoaded = function () {
        return arel.Scene.objectExists("model31");
    };

    model31.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model31.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model31.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model31.display = function () {
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

    model31.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model31.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model31);
            }
            arel.GestureHandler.addObject("model31", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model31.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model31.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model31.onLoaded = function () {
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
    var model32 = arel.Scene.getObject("model32");
    model32.objectName = "model32";
    model32.type = "Model";
    model32.scene = scene1;
    model32.associatedTrackable = ml3Dmap4;
    model32.displayOnLoaded = false;
    scenario.contents.push(model32);

    model32.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model32.isLoaded = function () {
        return arel.Scene.objectExists("model32");
    };

    model32.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model32.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model32.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model32.display = function () {
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

    model32.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model32.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model32);
            }
            arel.GestureHandler.addObject("model32", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model32.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model32.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model32.onLoaded = function () {
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
    var model33 = arel.Scene.getObject("model33");
    model33.objectName = "model33";
    model33.type = "Model";
    model33.scene = scene1;
    model33.associatedTrackable = ml3Dmap4;
    model33.displayOnLoaded = false;
    scenario.contents.push(model33);

    model33.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model33.isLoaded = function () {
        return arel.Scene.objectExists("model33");
    };

    model33.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model33.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model33.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model33.display = function () {
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

    model33.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model33.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model33);
            }
            arel.GestureHandler.addObject("model33", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model33.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model33.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model33.onLoaded = function () {
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
    var model34 = arel.Scene.getObject("model34");
    model34.objectName = "model34";
    model34.type = "Model";
    model34.scene = scene1;
    model34.associatedTrackable = ml3Dmap4;
    model34.displayOnLoaded = false;
    scenario.contents.push(model34);

    model34.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model34.isLoaded = function () {
        return arel.Scene.objectExists("model34");
    };

    model34.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model34.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model34.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model34.display = function () {
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

    model34.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model34.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model34);
            }
            arel.GestureHandler.addObject("model34", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model34.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model34.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model34.onLoaded = function () {
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
    var model35 = arel.Scene.getObject("model35");
    model35.objectName = "model35";
    model35.type = "Model";
    model35.scene = scene1;
    model35.associatedTrackable = ml3Dmap4;
    model35.displayOnLoaded = false;
    scenario.contents.push(model35);

    model35.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model35.isLoaded = function () {
        return arel.Scene.objectExists("model35");
    };

    model35.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model35.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model35.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model35.display = function () {
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

    model35.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model35.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model35);
            }
            arel.GestureHandler.addObject("model35", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model35.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model35.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
        /***** End of custom script *****/
    };

    model35.onLoaded = function () {
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
    var model36 = arel.Scene.getObject("model36");
    model36.objectName = "model36";
    model36.type = "Model";
    model36.scene = scene1;
    model36.associatedTrackable = ml3Dmap4;
    model36.displayOnLoaded = false;
    scenario.contents.push(model36);

    model36.setScene = function (scene) {
        this.scene = scene;
        scenario.currentScene.display();
    };

    model36.isLoaded = function () {
        return arel.Scene.objectExists("model36");
    };

    model36.bind = function (cosID) {
        arel.Debug.log(this.objectName + ".bind(" + cosID + ")");
        this.setCoordinateSystemID(cosID);
    };

    model36.load = function () {
        arel.Debug.log(this.objectName + ".load()");
        if (!this.isLoaded()) {
            scenario.addObject(this);
        }
    };

    model36.unload = function () {
        arel.Debug.log(this.objectName + ".unload()");
        if (this.isLoaded()) {
            arel.Scene.removeObject(this);
            if (methodExists(this, this.onUnloaded)) {
                this.onUnloaded();
            }
        }
    };

    model36.display = function () {
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

    model36.hide = function () {
        arel.Debug.log(this.objectName + ".hide()");
        this.setVisibility(false);
    };

    model36.attach = function (origin, offset) {
        arel.Debug.log(this.objectName + ".attach(" + origin.objectName + ")");
        if (typeof (origin.getScreenAnchor()) != 'undefined' && typeof (origin.getScreenAnchorFlags()) != 'undefined') {
            this.setScreenAnchor(origin.getScreenAnchor(), origin.getScreenAnchorFlags());
        }
        this.setTranslation(arel.Vector3D.add(origin.getTranslation(), offset));
        if (origin.groupID) {
            if (this.groupID) {
                arel.GestureHandler.removeObject(model36);
            }
            arel.GestureHandler.addObject("model36", origin.groupID);
            this.setPickingEnabled(false);
        }
    };

    model36.play = function (animationName, animationLooped) {
        arel.Debug.log(this.objectName + ".play(" + animationName + ", " + animationLooped + ")");
        this.startAnimation(animationName, animationLooped);
        if (methodExists(this, this.onPlayed)) {
            this.onPlayed(animationName);
        }
    };

    model36.onTouchEnded = function () {
        arel.Debug.log(this.objectName + ".onTouchEnded()");
        /**** Begin of custom script ****/
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-1', false);
        
        /***** End of custom script *****/
    };

    model36.onLoaded = function () {
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
    var model6 = arel.Scene.getObject("model6");
    model6.objectName = "model6";
    model6.type = "Model";
    model6.scene = scene1;
    model6.associatedTrackable = ml3Dmap1;
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


    // qma5
    var model8 = arel.Scene.getObject("model8");
    model8.objectName = "model8";
    model8.type = "Model";
    model8.scene = scene1;
    model8.associatedTrackable = ml3Dmap1;
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
        
        arel.Media.openWebsite('poiTouchEnded=CentralPark-2', false);
        
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


    // Kick-off the AR experience by calling the scenario's onStartup() method as soon as AREL is ready
    scenario.onStartup();
});