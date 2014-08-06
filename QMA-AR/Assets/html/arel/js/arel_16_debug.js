/**
 * @author metaio GmbH
 * 
 */
/** @private */ var arelTEST = false;	

//(
//	function(window, undefined)
//	{
		/** @class main object arel
		  */
		var arel = 
		{		
			/** @private */
			readyCallback : undefined,
			
			/** @private */
			sceneReadyCallback : undefined,
			
			/** @private */
			readyCalled : false,
			
			/** @private */
			sceneReadyCalled : false,
			
			/** @private */
			isReady : false,
			
			/** @private */
			sceneIsReady : false,
			
			/** @private */
			commandQueue : [],
			
			/** @private */
			commandCachePerObject : {},
			
			/** @private */
			callbackMethodIterator: 0,
			
			/** @private */
			objectIdIterator: 0,
			
			
			/**
			 * Constants to be used throughout AREL
			 * @class Constants
			 */
			Constants :
			{
                /**
                 *  No anchor, i.e. not relative-to-screen (0)
                 *  @type number
                 */
				ANCHOR_NONE :			0<<0,
                /**
                 *  Anchor to the left edge (1)
                 *  @type number
                 */
				ANCHOR_LEFT :			1<<0,

                /**
                 * Anchor to the right edge (2)
                 *  @type number
                 */
                ANCHOR_RIGHT :			1<<1,
                /**
                 * Anchor to the bottom edge (4)
                 *  @type number
                 */
                ANCHOR_BOTTOM :		    1<<2,
                /**
                 * Anchor to the top edge (8)
                 *  @type number
                 */
                ANCHOR_TOP :			1<<3,
                /**
                 * Anchor to the horizontal center (16)
                 *  @type number
                 */
                ANCHOR_CENTER_H :		1<<4,
                /**
                 * Anchor to the vertical center (32)
                 *  @type number
                 */
                ANCHOR_CENTER_V :		1<<5,

                /**
                 * Anchor to the Top-Left (9)
                 *  @type number
                 */
                ANCHOR_TL : 1<<0|1<<3,
                /**
                 * Anchor to the Top-Center (24)
                 *  @type number
                 */
                ANCHOR_TC : 1<<3|1<<4,
                /**
                 * Anchor to the Top-Right (10)
                 *  @type number
                 */
                ANCHOR_TR : 1<<3|1<<1,
                /**
                 * Anchor to the Center-Left
                 *  @type number
                 */
                ANCHOR_CL : 1<<5|1<<0,
                /**
                 * Anchor to the Center (48)
                 *  @type number
                 */
                ANCHOR_CC : 1<<4|1<<5,
                /**
                 * Anchor to the Center-Right
                 *  @type number
                 */
                ANCHOR_CR : 1<<5|1<<1,
                /**
                 * Anchor to the Bottom-Left (5)
                 *  @type number
                 */
                ANCHOR_BL : 1<<2|1<<0,
                /**
                 * Anchor to the Bottom-Center
                 *  @type number
                 */
                ANCHOR_BC : 1<<2|1<<4,
                /**
                 * Anchor to the Bottom-Right (6)
                 *  @type number
                 */
                ANCHOR_BR : 1<<2|1<<1,

                /**
                 * No flag, all geometric transforms are considered
                 *  @type number
                 */
                FLAG_NONE :						0<<0,
                /**
                 * ignore rotation of the geometry
                 *  @type number
                 */
                FLAG_IGNORE_ROTATION :			1<<0,
                /**
                 * ignore animations of the geometry
                 *  @type number
                 */
                FLAG_IGNORE_ANIMATIONS :		1<<1,
                /**
                 *  same as FLAG_MATCH_DISPLAY
                 *  @type number
                 */
                FLAG_IGNORE_SCREEN_RESOLUTION :	1<<2,
                /**
                 * scale model to be same physical size on all displays
                 *  @type number
                 */
                FLAG_MATCH_DISPLAY:             1<<2,
                /**
                 * Autoscale geometries according to the screen resolution and/or display density.
                 *  @type number
                 */
                FLAG_AUTOSCALE:				    1<<3,

                /**
                 * not an object with a movie texture or failed to load/play
                 *  @type number
                 */
                PLAYBACK_STATUS_ERROR :		0,
                /**
                 * currently playing
                 *  @type number
                 */
                PLAYBACK_STATUS_PLAYING :	1,
                /**
                 * playing, but currently paused
                 *  @type number
                 */
                PLAYBACK_STATUS_PAUSED :	2,
                /**
                 * playback stopped
                 *  @type number
                 */
                PLAYBACK_STATUS_STOPPED :	3,

                /**
                 * Dragging gesture (translation)
                 *  @type string
                 */
                GESTURE_DRAG: "GESTURE_DRAG",

                /**
                 * Pinching gesture (scale)
                 *  @type string
                 */
                GESTURE_PINCH: "GESTURE_PINCH",

                /**
                 * Rotating gesture
                 *  @type string
                 */
                GESTURE_ROTATE: "GESTURE_ROTATE",

                /**
                 * Pinch and Rotating gesture
                 *  @type string
                 */
                GESTURE_PINCHROTATE: "GESTURE_ROTATE|GESTURE_PINCH",

                /**
                 * Drag and Rotating gesture
                 *  @type string
                 */
                GESTURE_DRAGROTATE: "GESTURE_DRAG|GESTURE_ROTATE",

                /**
                 * Drag and Pinch gesture
                 *  @type string
                 */
                GESTURE_DRAGPINCH: "GESTURE_DRAG|GESTURE_PINCH",

                /**
                 * all gesture: drag, pinch, rotate
                 *  @type string
                 */
                GESTURE_ALL: "GESTURE_DRAG|GESTURE_PINCH|GESTURE_ROTATE"
			},

			
			/**
			 * Dummy interface for plugins 
			 *
			 * @class Dummy Interface for Plugins
			 */
			Plugin :
			{
				//to be extended by developers
			},

			/**
			 * @class CameraType
			 * This class defines constants used with {arel.Scene.setHandEyeCalibration} and
			 * {arel.Scene.getHandEyeCalibration}.
			 * @requires API Level 16
			 */
			CameraType:
			{
				/**
				 * Camera parameters used for rendering (in case of stereo rendering: parameters
				 * that apply to both eyes)
				 * @requires API Level 16
				 * @constant
				 */
				RENDERING: 6,

				/**
				 * Camera parameters for the left rendering camera on stereo rendering
				 * @requires API Level 16
				 * @constant
				 */
				RENDERING_LEFT: 2,

				/**
				 * Camera parameters for the right rendering camera on stereo rendering
				 * @requires API Level 16
				 * @constant
				 */
				RENDERING_RIGHT: 4
			},
            /** @private */
			Config :
			{
				/** @private */
				OBJECT_INTERFACE_CATEGORY : "object",

                /** @private */
                OBJECT_EVENT_CATEGORY : "objectevent",

				/** @private */
				OBJECT_POI : "poi",
				/** @private */
				OBJECT_MODEL3D : "3d",
				/** @private */
				OBJECT_IMAGE3D : "image3d",
				/** @private */
				OBJECT_MOVIE3D : "movie3d",
				/** @private */
				OBJECT_LIGHT : "light",

				/** @private */
				OBJECT_STATE_LOADING: "loading",
				
				/** @private */
				OBJECT_STATE_READY: "ready",
				
				/** @private */
				SCENE_CATEGORY : "scene",

                /** @private */
				GESTUREHANDLER_CATEGORY : "gesturehandler",

				/** @private */
				MEDIA_CATEGORY : "media",
				
				/**
				 *  @private
				 */
				COMMAND_DELIMITER : ";"
			},
			/**
			 * Debugging class, which will automatically generate a view on your GUI to see debugging information 
			 *
			 * @class Debugging information
			 */
			Debug :
			{
				/** @private */
				active : false,
				
				/** @private */
				ready : false,
				
				/** @private */
				activeBrowser : false,
				
				/** @private */
				stream: true,
				
				/** @private */
				LOG : "log",
				
				/** @private */
				ERROR : "error",
				
				/**@private */
				LOGSTREAM: "logstream",
				
				/** @private */
				debugContainer : undefined,
				
				/** @private */
				debugContainerID : "arelDebugConsole",
				
				/**
				 * Activate the Debugger
				 */
				activate : function()
				{
					if(!arel.Debug.ready)
					{
						arel.Debug.active = true;
						
						arel.Debug.debugContainer = document.createElement('div');
						arel.Debug.debugContainer.id = arel.Debug.debugContainerID;
						arel.Debug.debugContainer.setAttribute("style", "font-family: Helvetica, Arial, sans-serif; margin: 0; font-size: .7em; position: absolute; top: 5px; left: 0px; z-index: 1000; width: 90%; height: 20%; background-color: white; color: black; overflow: scroll; padding: 5px;");
						
						var container = document.createElement('div');
						var txt = document.createTextNode("AREL Debug console");
						container.setAttribute("style", "font-weight: bold; padding: 0px 0px 10px 0px;  user-select: text; -webkit-user-select: text");
						container.appendChild(txt);
						
						arel.Debug.debugContainer.appendChild(container);						
					
					
						//the element is attached to the body, once arel is ready -> see arel.readyforexecution
						if(arel.isReady)
						{
							arel.Debug.setDebugContainer();
						}
					}
				},
				
				/**
				 * @private
				 */
				setDebugContainer : function()
				{
					if(!arel.Debug.ready)
					{
						document.body.appendChild(arel.Debug.debugContainer);
						arel.Debug.ready = true;
					}								
				},
				
				/**
				 * Deactivate the Debugger
				 */
				deactivate : function()
				{
					arel.Debug.active = false;
					arel.Debug.ready = false;
					
					//remove the element
					var parent = document.getElementById(arel.Debug.debugContainerID).parentNode;
					var debugConsole = document.getElementById(arel.Debug.debugContainerID);
					parent.removeChild(debugConsole);					
				},
				
				/**
				 * Activate the arel log stream. Make sure the debugger is activated. This will return some general information on 
				 * what is happening in the background to double check functionality.
				 */
				activateArelLogStream : function()
				{
					arel.Debug.stream = true;
				},
				
				/**
				 * Deactivate the arel log stream. 
				 */
				deactivateArelLogStream : function()
				{
					arel.Debug.stream = false;
				},
				
				/** @private */
				logStream : function(_msg)
				{
					if(arel.Debug.active && arel.Debug.stream && arel.sceneIsReady)
					{
						arel.Debug.out(_msg, arel.Debug.LOGSTREAM);
					}
				},
				
				/**
				 * Log a given information
				 * @param {String} _toBeLogged Information to be shown in the Debug window
				 */
				log : function(_toBeLogged)
				{
					var string = JSON.stringify(_toBeLogged);
										
					arel.Debug.out(string, arel.Debug.LOG);
				},
				
				/**
				 * Log a given information and mark it as error
				 * @param {String} _toBeLogged Information to be shown in the Debug window
				 */
				error : function(_toBeLogged)
				{
					try
					{
						var string = JSON.stringify(_toBeLogged);
						var addInfo = "";
						
						//does not work on iPhone
						/*if(_error !== undefined)
						{
							addInfo	= " (file: " + _error.fileName.replace(/^.*[\\\/]/, '') + ", line: " + _error.lineNumber + ", message: " + _error.message + ")";
						}*/
						
						arel.Debug.out("Error" + addInfo + ": " + string, arel.Debug.ERROR);
					}
					catch(e)
					{
						arel.Debug.out("Error: " + e, arel.Debug.ERROR);
					}
				},
				/**
				 * @private
				 */
				out : function(_string, type)
				{
					if(arel.Debug.debugContainer !== undefined && document.getElementById(arel.Debug.debugContainerID) !== null)
					{
						var container = document.createElement('div');
					
						if(type === arel.Debug.LOG)
						{
							container.setAttribute("style", "color: #333");
						}
						else if(type === arel.Debug.LOGSTREAM)
						{
							container.setAttribute("style", "font-style: italic");
						}
						else if(type === arel.Debug.ERROR)
						{
							container.setAttribute("style", "color: #f33");
						}
						
						var txt = document.createTextNode(_string);
						container.appendChild(txt);
						document.getElementById(arel.Debug.debugContainerID).insertBefore(container, document.getElementById(arel.Debug.debugContainerID).firstChild);
					}
				}				
			},
			/**
			 * @class Light
			 * This class defines constants used with the dynamic lighting feature
             * @requires API Level 13
			 */
			Light :
			{
				/**
				 * Infinite directional light (only direction used)
                 * @requires API Level 13
				 * @constant
				 */
				LIGHT_TYPE_DIRECTIONAL : "directional",

				/**
				 * Point light that shines in all directions (position and attenuation are used)
                 * @requires API Level 13
				 * @constant
				 */
				LIGHT_TYPE_POINT : "point",

				/**
				 * Spot light defined by a maximum radiated angle and a exponent for the light strength depending
				 * on the angle between normal and light direction (position, direction, attenuation, outer
				 * cone radius used)
                 * @requires API Level 13
				 * @constant
				 */
				LIGHT_TYPE_SPOT : "spot"
            },
			/**
			 * @class Tracking
             * This class defines different constants that are used throughout the code
			 */
			Tracking :
			{
				/**
				 * The coordinateSystem is currently tracking. This can be used to determine a coordinateSystem as detected.
                 * Starting with API-level 13, this event is also forwarded to objects that have an onTrackingEvent method
                 * This event corresponds to the SDK tracking-state FOUND
				 * @constant
				 *  
				 */
				STATE_TRACKING : "tracking",
				
				/**
				 * The coordinateSystem is currently not tracking, however the attached models are still visible due to smoothing.
				 * @constant
				 *  
				 */
				STATE_EXTRAPOLATED : "extrapolated",
				
				/**
				 * The coordinateSystem is currently not tracking. This can be used to determine a coordinateSystem as lost.
                 * Starting with API-level 13, this event is also forwarded to objects that have an onTrackingEvent method
				 * @constant
				 *  
				 */
				STATE_NOTTRACKING : "not_tracking",

                /**
                 * Is fired when a new tracker is loaded (API level 13)
                 * @constant
                 * @requires API level 13
                 */
                STATE_INITIALIZED: "state_initialized",


                /**
                 * Special event state for Edge tracker when snapping has occured. (API level 13)
                 * @constant
                 * @requires API level 13
                 */
                STATE_REGISTERED:   "state_registered",

				
				/**
				 * Tracking type GPS
				 * @constant
				 *  
				 */
				GPS : "GPS",


                /**
                 * Tracking configuration for Orientation
                 * @constant
                 *
                 */
                Orientation : "Orientation",
				
				/**
				 * Tracking type LLA Marker
				 * @constant
				 *  
				 */
				LLA_MARKER : "LLA",
				
				/**
				 * Tracking type Barcode and QR Codes
				 * @constant
				 *  
				 */
				BARCODE_QR : "Code",
				
				/**
				 * Tracking type Markerless 3D Tracking
				 * @constant
				 *  
				 */
				MARKERLESS_3D : "ML3D",
				
				/**
				 * Tracking type Markerless 2D Tracking aka Image Tracking
				 * @constant
				 *  
				 */
				MARKERLESS_2D : "ML2D",
				
				/**
				 * Tracking type ID Marker tracking
				 * @constant
				 *  
				 */
				MARKER : "Marker",
				
				
				/**
				 * Tracking type Markerless 2D instantly. Meaning, when starting this tracking, the current frame will be used as reference image.
				 * @requires API level 8
				 * @constant
				 *  
				 */
				INSTANT2D : "INSTANT_2D",
				
				
				/**
				 * Tracking type Markerless 2D instantly. Meaning, when starting this tracking, the current frame will be rectified based on 
				 * the device's accelerometer and will be used as reference image
				 * @requires API level 8
				 * @constant
				 */
				INSTANT2DG : "INSTANT_2D_GRAVITY",
				
				/**
				 * Tracking type Markerless 2D instantly. Meaning, when starting this tracking, the current frame will be rectified based on 
				 * the device's accelerometer and will be used as reference image. Once the image is lost from view, based on the accelometer, it is tried
				 * to extrapolate the 3D objects position.
				 * 
				 * @requires API level 8
				 * @constant
				 */
				INSTANT2DGE : "INSTANT_2D_GRAVITY_EXTRAPOLATED",

				/**
                 * Same as {arel.Tracking.INSTANT2DG}, but uses 3D tracking (SLAM) to continue
                 * tracking when the original reference image gets out of sight.
                 *
                 * @requires API level 16
                 * @constant
                 */
                INSTANT_2D_GRAVITY_SLAM: "INSTANT_2D_GRAVITY_SLAM",

                /**
                 * Same as {arel.Tracking.INSTANT_2D_GRAVITY_SLAM}, but additionally tries to use
                 * sensors to extrapolate the pose if optical tracking is lost.
                 *
                 * @requires API level 16
                 * @constant
                 */
                INSTANT_2D_GRAVITY_SLAM_EXTRAPOLATED: "INSTANT_2D_GRAVITY_SLAM_EXTRAPOLATED",

				/**
				 * Tracking type Markerless 3D instantly. After a short initialization, the current environment is instantly tracked 3D and the point map is being extended
				 * (aka SLAM).
				 * 
				 * @requires API level 8
				 * @constant
				 */
				INSTANT3D : "INSTANT_3D",

                /**
				 * SLAM tracking (alias for INSTANT3D)
				 * @requires API level 8
				 * @constant
				 */
				SLAM : "INSTANT_3D",

				/**
				 * Face tracking.
				 * @requires API level 16
				 * @constant
				 */
				FACE : "FACE",
				
				/**
				 * Tracking type Other fallback
				 * @constant
				 */
				OTHER : "other"
								
				//if something is added check in arel.Scene.setTrackingConfiguration that this is also not allowed if necessary 
			},
			/** @private */ 
			Error :
			{
				/** @private */ 
				write : function(_msg)
				{
					if(arel.Debug.active)
					{
						arel.Debug.error(_msg);
						return false;
					}
					else if(arelTEST)
					{
						return "ERROR: " + _msg;						
					}			
					else
					{
						arel.Debug.error("ERROR: " + _msg);
						return false;
					}
				}
			},	
			/** @private */
			SceneCache :
			{
				id : undefined,
				appAPILevel : undefined
			},
			
			//by http://forums.digitalpoint.com/showthread.php?t=146094
			/** @private */
			include : function(filename)
			{
			    var head = document.getElementsByTagName('head')[0];
		
			    var script = document.createElement('script');
			    script.src = filename;
			    script.type = 'text/javascript';			    		
			    head.appendChild(script);
			},	
			
			/**
			 * Attach a function call when AREL is ready to go
			 * @param {function} startCallback Method to be called, once all arel JS is loaded
			 * @param {Boolean} activateDebugging Set to true, if the debugging console should be used
			 * @param {Boolean} useInBrowser Set to true if the command is used in the Browser first
			 */
			ready : function(startCallback, activateDebugging, useInBrowser)
			{
				if(useInBrowser)
				{
					arel.Debug.activeBrowser = true;	
				}
				
				if(activateDebugging)
				{
					arel.Debug.activate();	
					arel.Debug.logStream("AREL is ready for execution.");
				}
								
				arel.readyCallback = startCallback;
				
				if(arel.isReady)
				{
					if(typeof(arel.readyCallback) === "function" && arel.readyCalled === false)
					{
						arel.readyCalled = true;	
						arel.readyCallback();
						arel.ClientInterface.arelReady();									
					}
				}				
			},
			
			/**
			 * Attach a function call when the scene is ready
			 * @param {function} startCallback Method to be called, once all objects are loaded and the scene is ready
			 * @param {Boolean} activateDebugging Set to true, if the debugging console should be used
			 * @param {Boolean} useInBrowser Set to true if the command is used in the Browser first
			 */
			sceneReady : function(startCallback, activateDebugging, useInBrowser)
			{
				if(useInBrowser)
				{
					arel.Debug.activeBrowser = true;	
					arel.Debug.logStream("Scene is ready.");
				}
				
				if(activateDebugging)
				{
					arel.Debug.activate();					
				}

				arel.sceneReadyCallback = startCallback;
				
				if(arel.sceneIsReady)
				{
					if(typeof(arel.sceneReadyCallback) === "function" && arel.sceneReadyCalled === false)
					{
						//just in case the arel ready has not been called, call it here
						//this will not be sent to the client anymore, since the client triggers the scene ready
						if(arel.readyCalled === false)
						{
							arel.readyCalled = true;	
							arel.readyCallback();							
						}
						
						arel.sceneReadyCalled = true;	
						arel.sceneReadyCallback({'id' : arel.SceneCache.id});															
					}
				}				
			},
			/** @private */
			sceneIsReadyForExecution : function()
			{
				if(typeof(arel.sceneReadyCallback) === "function" && arel.sceneReadyCalled === false)
				{
					arel.sceneReadyCalled = true;	
					arel.sceneReadyCallback({'id' : arel.SceneCache.id});	
				}
				
				arel.sceneIsReady = true;
			},
			/** @private */
			readyforexecution : function(startCallback)
			{
				//append the debugging containter, if debugging is wished -> just in case it was not attached when the call was made
				if(arel.Debug.active)
				{
					arel.Debug.setDebugContainer();
				}
					
				if(typeof(arel.readyCallback) === "function" && arel.readyCalled === false)
				{
					arel.readyCallback();
					arel.readyCalled = true;														
				}
				
				if(!arel.isReady)
				{
					arel.ClientInterface.arelReady();
				
					//set arel ready
					arel.isReady = true;
				}
			},
			/** @private */
			flush : function()
			{
				var out = "";
				
				if(arel.commandQueue.length > 0)
				{
					out = arel.commandQueue.join(arel.Config.COMMAND_DELIMITER);
					arel.commandQueue = [];					
				}
				
				if(typeof Android !== "undefined") {
					Android.flush(out);
				}
								
				//send it to the client
				return out;
			}	
			
		};
		
		//from http://phrogz.net/js/classes/OOPinJS2.html
		//throws error: javax.script.ScriptException: sun.org.mozilla.javascript.internal.EvaluatorException: Cannot add a property to a sealed object: arelInheritFrom. when testing?!
		/*Function.prototype.arelInheritFrom = function( parentClassOrObject ){ 
			if ( parentClassOrObject.constructor == Function )
			{ 
				//Normal Inheritance 
				this.prototype = new parentClassOrObject;
				this.prototype.constructor = this;
				this.prototype.parent = parentClassOrObject.prototype;
			} 
			else 
			{ 
				//Pure Virtual Inheritance 
				this.prototype = parentClassOrObject;
				this.prototype.constructor = this;
				this.prototype.parent = parentClassOrObject;
			} 
			return this;
		}*/ 
		
		//client communication
/** @author metaio GmbH
 *  @class The Object Cache
 *  @private
 */
arel.ObjectCache = 
{	
	/**
	 * Array to store the Objects.
	 * @private
	 */			
	aObjects:				[],
					
	//expects an array with Objects, as key -> attribute, value -> value OR
	//an array with arel.Objects
	/**
	 * Array to store the Objects. This will remove all currently existing objects first
	 * Expects an Array with - Example:
	 * [Object1, Object2, ...]
	 * POI (e.g. Object1):
	 * 
	 *	{"type": "poi", "id": 1, "title": "This is a POI", "location": {"lat": 49.123324234, "lng": 11.34545657, "alt": 0, "acc": 100}, "iconPath": "http://www.myIcon.com/someIcon.png", 
	 *		"thumbnailPath": "http://www.thumbnails.com/?id=sdf&test=icon", "popup": {
	 *		"bgColor": "#000000", text: "This is the coolest POI you have ever seen, there will never be anything cooler!\nWell \"this\"." , "thumbnail": "http://www.myIcon.com/someIcon.png", 
	 *		"closeButton": true, "distance": true, 
	 * 		"buttons": [
	 *	 		["Login", "url", "http://www.junaio.com/login.php"], ["Cool Image", "image", "http://www.junaio.com/publisherDownload/image.png"]]}}
	 *	
	 * 
	 * Model3D (e.g.Object2):
	 * 
	 *	{"type": "3d", "id": 2, "coordinateSystemID": 1, "transparency": 122, "renderorderposition": 1, "pickable": true, "title": "POI2", "location": {"lat": 49.123324234, "lng": 11.34545657, "alt": 0, "acc": 200}, "iconPath": "http://www.myIcon.com/someIcon.png", 
	 *	"thumbnailPath": "http://www.thumbnails.com/?id=sdf&test=icon", "billboard": false, "translation": {"x": 0, "y": 0, "z": -1500}, "model": "/resources/mainModel.md2_enc", "texture": "/resources/theTexture.png", 
	 *	"rotation": "0,0,90", "scale": "4,3,3", "popup": {
	 *	"bgColor": "#123456", "text": "This is the coolest POI you have ever seen, there will never be anything cooler!\nWell \"this\". ", thumbnail: "http://www.myIcon.com/someIcon.png", 
	 *	buttons: [
	 *		["Login", "url", "http://www.junaio.com/login.php"], ["Cool Image", "image", "http://www.junaio.com/publisherDownload/image.png"]]}}
	 *	
	 * 
	 *  Also see the file (method addObject for all parameters). 
	 *  @param {array} ObjectArray Array of objects
	 * @private
	 */	 
	setObjects:				function(_aObjects)
							{
								//remove the old Objects
								this.removeObjects();
								
								//overriding is not possible, so we check whether the passed element is an array with elements of type Object
								for(var i in _aObjects)
								{
									if (typeof(_aObjects[i]) !== "function")
									{
										this.addObject(_aObjects[i]);
									}
								}																
							},
	/**
	 * Sets a single object (see examples above). Just not in an array ;)
	 * @param {array|jsObject} _object array with object information to store as a arel.Object.Object3d or arel.POI
     * @param ignoreStateChange Should the state change be ignored
	 */
	addObject:				function(_object, ignoreStateChange)
							{
								//overriding is not possible, so we check whether the passed element is an instance Object
								if(_object instanceof arel.Object)
								{
									//set the state of the object still to loading
									_object.setState(arel.Config.OBJECT_STATE_LOADING);
									
									//add it to the cache array
									if(_object.getID() !== undefined)
									{
										this.aObjects[_object.getID()] = _object;
									
										return true;
									}
									else
									{
										return arel.Error.write("Object is missing an ID.");
									}
								}
								else if(typeof(_object) !== "function")
								{
									var object = undefined;
									
									if(_object.hasOwnProperty('type'))
									{
										if(_object.type === arel.Config.OBJECT_POI)
										{
											object = new arel.Object.POI();
										}
										else if(_object.type === arel.Config.OBJECT_MODEL3D)
										{
											object = new arel.Object.Model3D();
										}
										else if(_object.type === arel.Config.OBJECT_MOVIE3D)
										{
											object = arel.Object.Model3D.createFromMovie();
											
										}
										else if(_object.type === arel.Config.OBJECT_IMAGE3D)
										{
											object = arel.Object.Model3D.createFromImage();
										}
										else if(_object.type === arel.Config.OBJECT_LIGHT)
										{
											object = new arel.Object.Light();
										}
										else
										{
											return arel.Error.write("ERROR: Unknown object category");
										}
										
										//parse the object
										object.applyProperties(_object);
										
										if(object.getID() !== undefined)
										{
											//set the state of the object still to loading
											object.setState(arel.Config.OBJECT_STATE_LOADING);
											
											//add it to the cache array
											this.aObjects[object.getID()] = object;
											
											return true;
										}
										else
										{
											return arel.Error.write("Object is missing an ID.");
										}
									}
									else
									{
										return arel.Error.write("An object category must be given.");
									}
								}
															
							},	
	/**
	 * Returns all Objects currently rendered in the scene
	 * @return {Array} array with arel.Object.Object3d and/or arel.POI
	 * @private
	 */			
	getObjects:				function()
							{
								//the elements of the object have to be put in a new object to avoid "passing by coordinateSystem"
								//this way it is a new object, which is independent from the this.aObjects
								var aObjectsPassed = [];
								
								for(var i in this.aObjects)
								{
									if (typeof(this.aObjects[i]) !== "function")
									{
										aObjectsPassed[i] = this.aObjects[i];
									}
								}
								
								return aObjectsPassed;
							},
	/**
	 * Returns a single Object specified by its ID
	 * @param {string} ObjectID Alphanumeric Object ID
	 * @return {arel.Object.Model3D|arel.POI} Object requested
	 * @private
	 */
	getObject:				function(id)
							{
								if(this.aObjects[id] !== undefined && this.aObjects[id] instanceof arel.Object)
								{
									return this.aObjects[id];
								}

								arel.Debug.out("Error: Object " + id + " does not exist.", arel.Debug.LOG);
								return false;
							},
	/**
	 *  Clear all Objects from the cache
	 *  @private
	 */
	removeObjects: 			function()
							{
								this.aObjects = [];
							},
	/**
	 * Remove a single Object specified by its ID
	 * @param {string} ObjectID Alphanumeric Object ID
	 * @private
	 */
	removeObject: 			function(_id)
							{
								delete this.aObjects[_id];
							},
	/**
	 * Check if an Object exists in the Cache
	 * @param {string} ObjectID Alphanumeric Object ID
	 * @return {boolean} True if Object exists, false otherwise
	 * @private
	 */
	objectExists: 			function(_id)
							{
								return this.aObjects[_id] instanceof arel.Object;
							},
	/**
	 * Change the state of an object to ready
	 * @param {string} ObjectID Alphanumeric Object ID
	 * @private
	 */
	setObjectStateToReady: 	function(_id)
							{
								this.aObjects[_id].setState(arel.Config.OBJECT_STATE_READY);
							},
							
	/**
	 * Change the state of an object 
	 * @param {string} ObjectID Alphanumeric Object ID
	 * @param {string} state arel.Config.OBJECT_STATE_READY | arel.Config.OBJECT_STATE_LOADING
	 * @private
	 */
	setObjectState: 		function(_id, _state)
							{
								this.aObjects[_id].setState(_state);
							}
};
/** 
 *	@author metaio GmbH
 * 
 *  @class "Static Class" to provide the interface to the clients via the arel protocol
 *  @see arel.ClientInterface.scene
 *  @see arel.ClientInterface.media
 *  @see arel.ClientInterface.object
 *  @see arel.ClientInterface.navigation
 *  @private	  
 */ 
arel.ClientInterface =
{
	/** 
	 * define the protocol to be used
	 * @private */
	protocol: "arel://",
	
	/** 
	 * defines the api-level of the arel bridge
	 * @private */
	apilevel: "16",
	
	/** 
	 * Scene Interface
	 * @class Does the interface scene stuff
	 * @private */				
	scene:
	{
		/** 
		 * =="scene"
		 * @constant
		 * @private */
		sceneTerm: "scene",
		
		/** 
		 * Add a single Object<br /><br />
		 * 
		 * e.g. <br />arel://scene/addObject/?thumbnailPath=http%3a%2f%2fwasgeht.co.uk%2f%3fhier%3dthumb&location=34%2c56%2c2&title=my%20Second%20POI&popupDistance=false&popupText=Das%20wird%20der%20PopupText.&iconPath=http%3a%2f%2fwww.meinIcon.de%2ficon.png&popupCloseButton=true&popupThumbnail=http%3a%2f%2fwww.junaio.com%2fthumbnail.png&popupButtonName0=name1&popupButtonValue0=value1&popupButtonName1=name2&popupButtonType0=type1&popupButtonType1=type2&popupButtonValue1=value2&category=text&popupBgColor=%23789876&id=poi23";
		 * @see arel.Object.toParameter
		 * @function
		 * @private 
		 */	
		addObject: function(_object)
		{
			//debug stream
			arel.Debug.logStream("Object added to Scene: " + _object.getID());
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/addObject/" + _object.toParameter();
			return arel.ClientInterface.out(request);
		},	

		/**
		 * Get the tracking values of the currently tracked coordinateSystem.
		 *
		 * e.g. arel://scene/getHandEyeCalibration/?callbackid=123456<br/>
		 * e.g. arel://scene/getHandEyeCalibration/?callbackid=123456&cameratype=6
		 *
		 * @param {int} cameraType			Camera type for which to return the hand-eye
		 *									calibration - one of {arel.CameraType.RENDERING},
		 *									{arel.CameraType.RENDERING_LEFT} or
		 *									{arel.CameraType.RENDERING_RIGHT} (defaults to
		 *									RENDERING). "undefined" means value was not given to
		 *									{arel.Scene.getHandEyeCalibration}.
		 * @requires API level 16
		 * @private
		 */
		getHandEyeCalibration: function(cameraType, callbackID)
		{
			arel.Debug.logStream("Requesting hand-eye calibration");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/getHandEyeCalibration/?callbackid=" + callbackID;
			if (cameraType !== undefined)
			{
				request += arel.Util.toParameter({"cameratype": cameraType}, true);
			}
			return arel.ClientInterface.out(request);
		},

		/** 
		 * Clear all Objects<br /><br />
		 * arel://scene/removeObjects/
		 * 
		 * @private 
		 */
		removeObjects : function()
		{
			//debug stream
			arel.Debug.logStream("All objects removed.");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/removeObjects/";
			return arel.ClientInterface.out(request);
		},
		/** 
		 * Remove single Object<br /><br />
		 * e.g.<br />arel://scene/removeObject/?id=poi2
		 * @private 
		 */
		removeObject : function(_id)
		{
			//debug stream
			arel.Debug.logStream("Single object removed: " + _id);
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/removeObject/?id=" + _id;
			return arel.ClientInterface.out(request);
		},

		/**
		 * Sets padding to add between bottom of viewport and bottom row of annotations
		 *
		 * e.g. arel://scene/setAnnotationsBottomPadding/?value=200
		 *
		 * @requires API level 16
		 * @private
		 */
		setAnnotationsBottomPadding: function(value)
		{
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/setAnnotationsBottomPadding/" +
				arel.Util.toParameter({"value": value}, false);
			return arel.ClientInterface.out(request);
		},

		/** 
		 * Add an object to the gesture handler<br /><br />
		 * e.g.<br />arel://scene/gesturehandler/?id=apoi3&action=add&group=1
		 * @private 
		 */
		gestureHandlerAddObject : function (_id, _group)
		{
			//debug stream
			arel.Debug.logStream("Adding object to Gesture handler: " + _id);

			var request = arel.ClientInterface.protocol + this.sceneTerm + "/gesturehandler/?id=" + _id + "&action=add";
			
			if( _group !== undefined )
			{
				request = request + "&group=" + _group;
			}
			
			return arel.ClientInterface.out(request);
		},
		
		
		/** 
		 * Remove an object from the gesture handler<br /><br />
		 * e.g.<br />arel://scene/gesturehandler/?id=apoi3&action=remove
		 * @private 
		 */
		gestureHandlerRemoveObject : function (_id)
		{
			//debug stream
			arel.Debug.logStream("Removing object from Gesture handler: " + _id);

			var request = arel.ClientInterface.protocol + this.sceneTerm + "/gesturehandler/?id=" + _id + "&action=remove";
			return arel.ClientInterface.out(request);
		},
		
		/** 
		 * Remove an object from the gesture handler<br /><br />
		 * e.g.<br />arel://scene/gesturehandler/?action=removeall
		 * @private 
		 */
		gestureHandlerRemoveAllObjects : function ()
		{
			//debug stream
			arel.Debug.logStream("Removinging all objects from Gesture handler." );

			var request = arel.ClientInterface.protocol + this.sceneTerm + "/gesturehandler/?action=removeall";
			return arel.ClientInterface.out(request);
		},
		
		/** 
		 * Returns the currently setup gestures from GestrueHandler <br /><br />
		 * e.g.<br />arel://scene/gesturehandler/?action=get
		 * @private 
		 */
		gestureHandlerGetGestures : function (_callbackID)
		{
			arel.Debug.logStream("Getting setup gestures from Gesture handler");

			var request = arel.ClientInterface.protocol + this.sceneTerm + "/gesturehandler/?action=get&callbackid=" + _callbackID;
			arel.ClientInterface.out(request);
			
		},
		
		/** 
		 * Enable/Disable certain gestures (defined by a bitmask)<br /><br />
		 * e.g.<br />arel://scene/gesturehandler/?id=apoi3&action=add&group=1
		 * @private 
		 */
		gestureHandlerEnableGestures : function (_bitmask)
		{
			//debug stream
			arel.Debug.logStream("Enabling/disabling gestures in Gesture handler");

			var request = arel.ClientInterface.protocol + this.sceneTerm + "/gesturehandler/?action=enable" + "&bitmask=" + _bitmask;
			
			return arel.ClientInterface.out(request);
		},
		/** Get Scene ID<br /><br />
		 * e.g. <br />arel://scene/getID/?callbackid=123156186463513<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with an integer attached<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, 145215);
		 * 
		 * @private */
		getID : function(_callbackID)
		{
			//debug stream
			arel.Debug.logStream("asking for scene ID");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/getID/?callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);			
		},
		
		/** 
		 * switch to Scene<br /><br />
		 * e.g. <br />arel://scene/switchChannel/?id=100258
		 * @private */
		switchChannel : function(_sceneID, _params)
		{
			//debug stream
			arel.Debug.logStream("Switching Channel to " + _sceneID);
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/switchChannel/?id=" + _sceneID + _params;
			return arel.ClientInterface.out(request);
		},

		/** 
		 * Set the global ambient color
		 * @private
		 */
		setAmbientLight : function(_ambientColor)
		{
			arel.Debug.logStream("Changing global ambient light color to " + _ambientColor);

			var params = _ambientColor.toParameterObject("ambientcolor");
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/setAmbientLight/" + arel.Util.toParameter(params, false);
			return arel.ClientInterface.out(request);
		},

		/** 
		 * switch Tracking<br /><br />
		 * e.g. <br />arel://scene/setTrackingConfiguration/?tracking=GPS<br />
		 * arel://scene/setTrackingConfiguration/?tracking=LLA<br />
		 * arel://scene/setTrackingConfiguration/?tracking=BarQR<br />
		 * arel://scene/setTrackingConfiguration/?tracking=http%3a%2f%2fwasgeht.co.uk%2f%3fhier%3dthumb%26test%3deiTest
         * arel://scene/setTrackingConfiguration/?tracking=&readfromfile=false
		 * @private */
		setTrackingConfiguration : function(_tracking, _readFromFile)
		{
			//debug stream
			arel.Debug.logStream("Changing Tracking Configuration to " + _tracking);
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/setTrackingConfiguration/?tracking=" + encodeURIComponent(_tracking);

            if( typeof _readFromFile !== "undefined")
            {
               request = request + '&readfromfile='+_readFromFile;
            }

			return arel.ClientInterface.out(request);
		},


        /**
         * Load an environment map <br/><br/>
         * arel://scene/loadenvironmentmap/?url=http...
         * @param _url the URL
         * @returns {*}
         * @requires API level 13
         * @private
         */
        loadEnvironmentMap : function (_url)
        {
            //debug stream
            arel.Debug.logStream("Loading Environment map" + _url);

            var request = arel.ClientInterface.protocol + this.sceneTerm + "/loadenvironmentmap/?url=" + encodeURIComponent(_url);
            return arel.ClientInterface.out(request);
        },


        /**
         * Set the shader materials <br/><br/>
         * arel://scene/loadshadermaterials/?url=http...
         * @param url URL to the shader materials XML file
         * @requires API level 13 (or 16 for the callback
         * @returns {*}
         * @private
         */
        loadShaderMaterials : function (url, optionalCallbackID)
        {
            //debug stream
            arel.Debug.logStream("Loading shader materials from " + url);

            var request = arel.ClientInterface.protocol + this.sceneTerm + "/loadshadermaterials/?url=" + encodeURIComponent(url);
            if (optionalCallbackID !== undefined)
            {
            	request += "&callbackid=" + optionalCallbackID;
            }
            return arel.ClientInterface.out(request);
        },

		/** Start the Camera<br /><br />
		 * e.g. <br />arel://scene/startCamera?cameraIndex=0&width=320&height=240&downsample=1&enableYUVpipeline=true
		 *
		 * With the new method signature, only two arguments are used and the first must be an
		 * {arel.Camera} object which will be JSON-serialized e.g.
		 * arel://scene/startCamera?camera={"width":320,[...]}
		 *
		 * @private */
		startCamera : function(cameraIndexOrCamera, widthOrCallbackID, height, downsample, enableYUVpipeline)
		{
			//debug stream
			arel.Debug.logStream("Starting camera.");
			
			var request;
			if (cameraIndexOrCamera instanceof arel.Camera)
			{
				request = arel.ClientInterface.protocol + this.sceneTerm +
					"/startCamera?camera=" + encodeURIComponent(cameraIndexOrCamera.toJSON());

				if (widthOrCallbackID !== null)
				{
					request += "&callbackid=" + widthOrCallbackID;
				}
			}
			else
			{
				// Old signature
				request = arel.ClientInterface.protocol + this.sceneTerm +
					"/startCamera?cameraIndex=" + encodeURIComponent(cameraIndexOrCamera.toString()) +
					"&width=" + encodeURIComponent(widthOrCallbackID.toString()) +
					"&height=" + encodeURIComponent(height.toString()) +
					"&downsample=" + encodeURIComponent(downsample.toString()) +
					"&enableYUVpipeline=" + (enableYUVpipeline ? "true" : "false");
			}
			return arel.ClientInterface.out(request);
		},

		/** Stop the Camera<br /><br />
		 * e.g. <br />arel://scene/stopCamera
		 * @private */
		stopCamera : function()
		{
			//debug stream
			arel.Debug.logStream("Stopping camera.");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/stopCamera";
			return arel.ClientInterface.out(request);
		},
		
		/** Start the Camera<br /><br />
		 * e.g. <br />arel://scene/startTorch
		 * @private */
		startTorch : function()
		{
			//debug stream
			arel.Debug.logStream("Starting camera.");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/startTorch";
			return arel.ClientInterface.out(request);
		},
		/** Stop the Camera<br /><br />
		 * e.g. <br />arel://scene/stopTorch
		 * @private */
		stopTorch : function()
		{
			//debug stream
			arel.Debug.logStream("Stopping camera.");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/stopTorch";
			return arel.ClientInterface.out(request);
		},

        /**
         * Freeze the tracking <br /><br />
         * @param _freeze true to freeze, false to unfreeze
         * @return {*}
         * @private
         */
        setFreezeTracking : function ( _freeze )
        {
           arel.Debug.logStream("setFreezeTracking: " + _freeze );

            var request = arel.ClientInterface.protocol + this.sceneTerm + "/setFreezeTracking/?value="+_freeze;
			return arel.ClientInterface.out(request);
        },

		/**
		 * Trigger a server call<br /><br />
		 * arel://scene/triggerServerSearch/<br />
		 * arel://scene/triggerServerSearch/?sendScreenshot=true<br />
		 * arel://scene/triggerServerSearch/?filter_something=wow<br />
		 * @private */
		triggerServerCall : function(params)
		{
			//debug stream
			arel.Debug.logStream("Triggering Server call.");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/triggerServerCall/" + params;
			return arel.ClientInterface.out(request);
		},
				
		/** Get Sensor values of LLA + accuracy<br /><br />
		 * e.g. <br />arel://scene/setLocation/?l=48.1,11.5,100<br /><br />
		 * 
		 * @private */
		setLocation : function(_params)
		{
			//debug stream
			arel.Debug.logStream("Setting LLA location to " + _params);
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/setLocation/" + _params;
			return arel.ClientInterface.out(request);			
		},
		
		/** Get Sensor values of LLA + accuracy<br /><br />
		 * e.g. <br />arel://scene/getLocation/?callbackid=123156186463513<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with an arel.LLA attached<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, new arel.LLA(48.1, 11.5, 0, 15));
		 * 
		 * @private */
		getLocation : function(_callbackID)
		{
			//debug stream
			arel.Debug.logStream("Requesting location.");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/getLocation/?callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);			
		},
		
		/** Get Screensot <br /><br />
		 * e.g. <br />arel://scene/getScreenshot/?callbackid=123156186463513&includeRender=true&bboxX=200&bboxY=500<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with an arel.Image attached<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, new arel.Image(_imagebuffer, _width, _height, _originUpperLeft));<br />
		 * arel.CallbackInterface.callCallbackFunction(123156186463513, new arel.Image("sfnslfn4ewo84rosf[..]", 150, 500, true));
		 * @private */
		getScreenshot : function(_paramString)
		{
			//debug stream
			arel.Debug.logStream("Requesting screenshot.");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/getScreenshot/" + _paramString;
			return arel.ClientInterface.out(request);			
		},

        /** Execute a sensor command <br /><br />
         * e.g. <br \> arel://scene/sensorCommand/?callbackid=lalalulu&command=getNumberOfPossiblePoint&parameter=3<br /><br />
         *
         * This expects to make a call to the CallbackInterface with an string attached<br />
         * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, "result");
         *
         * @private */
        sensorCommand : function (_paramString)
        {
            //debug stream
            arel.Debug.logStream("Executing sensorCommand.");

            var request = arel.ClientInterface.protocol + this.sceneTerm + "/sensorCommand/" + _paramString;
            return arel.ClientInterface.out(request);
        },


		/** Get Compass Rotation<br /><br />
		 * e.g. <br />arel://scene/getCompassRotation/?callbackid=123156186463513<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with an arel.Vector3D attached<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, 120);
		 * 
		 * @private */
		getCompassRotation : function(_callbackID)
		{
			//debug stream
			arel.Debug.logStream("Requesting compass rotation.");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/getCompassRotation/?callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		},
		
		/** Get Tracking Values<br /><br />
		 * e.g. <br />arel://scene/getTrackingValues/?callbackid=123156186463513&rotate=false<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with an arel.TrackingValues attached<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, new arel.TrackingValues(0,0,0,0,0,0,1,100,1));
		 * @private
		 * 
		 */
		getTrackingValues : function(rotate, callbackID)
		{
			//debug stream
			arel.Debug.logStream("Requesting tracking values.");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/getTrackingValues/?callbackid=" + callbackID + "&rotate=" + (rotate ? "true" : "false");
			return arel.ClientInterface.out(request);
		},

		/**
		 * Get information about all hit objects<br /><br />
		 * e.g. <br />arel://scene/getAllObjectsFromViewportCoordinates/?X=[0..1)&Y=[0..1)&usetriangletest=true&maxgeometriestoreturn=5&callbackid=123156186463513<br /><br />
		 *
		 * Callback is triggered with JSON representation of the results, e.g.
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, [{objectID: ..., cosCoordinates: ..., objectCoordinates: ...}]);
		 * @requires API level 16
		 * @private
		 */
		getAllObjectsFromViewportCoordinates : function(coord, useTriangleTest, maxGeometriesToReturn, callbackID)
		{
			var params = arel.Util.toParameter(coord);
			arel.Debug.logStream("Requesting all objects from screen coordinate " + params);
			params += arel.Util.toParameter({usetriangletest: useTriangleTest, maxgeometriestoreturn: maxGeometriesToReturn}, true) + "&callbackid=" + callbackID;
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/getAllObjectsFromViewportCoordinates/" + params;
			return arel.ClientInterface.out(request);
		},

		/** Get the id of the object hit<br /><br />
		 * e.g. <br />arel://scene/getObjectFromViewportCoordinates/?callbackid=123156186463513&X=[0..1)&Y=[0..1) (new)<br />
		 * arel://scene/getObjectFromScreenCoordinates/?callbackid=123156186463513&X=[0..1)&Y=[0..1) (old)<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with a string (poi ID) attached<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, "POI_ID");
		 * @private
		 */
		getObjectFromViewportCoordinates : function(coordString, _callbackID)
		{
			//debug stream
			arel.Debug.logStream("Requesting Object from viewport coordinate " + coordString);
			
			var term = arel.SceneCache.appAPILevel !== undefined && arel.SceneCache.appAPILevel < 16 ? "/getObjectFromScreenCoordinates/" : "/getObjectFromViewportCoordinates/";
			var request = arel.ClientInterface.protocol + this.sceneTerm + term + coordString + "&callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		},
		
		/** Get 3D position of the intersection between the coordinateSystems's xy plane and the ray from the screen coordinate<br /><br />
		 * e.g. <br />arel://scene/get3DPositionFromViewportCoordinates/?callbackid=123156186463513&x=[0..1]&y=[0..1] (new)<br />
		 * arel://scene/get3DPositionFromScreenCoordinates/?callbackid=123156186463513&x=[0..1]&y=[0..1] (old)<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with a arel.Vector3D attached<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, new arel.Vector3D(20, 50, 0));
		 * @private
		 */
		get3DPositionFromViewportCoordinates : function(coordString, _coordinateSystemID, _callbackID)
		{
			//debug stream
			arel.Debug.logStream("Requesting 3D coordinates for coordinate system " + _coordinateSystemID + " at viewport location " + coordString);
			
			var term = arel.SceneCache.appAPILevel !== undefined && arel.SceneCache.appAPILevel < 16 ? "/get3DPositionFromScreenCoordinates/" : "/get3DPositionFromViewportCoordinates/";
			var request = arel.ClientInterface.protocol + this.sceneTerm + term + coordString.toUpperCase() + "&coordinateSystemID=" + _coordinateSystemID + "&callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		},
		
		/** Get 3D position of the intersection between the coordinateSystems's xy plane and the ray from the screen coordinate<br /><br />
		 * e.g. <br />arel://scene/getViewportCoordinatesFrom3DPosition/?callbackid=123156186463513&x=[0..1]&y=[0..1]&z=[0..1] (new)<br />
		 * arel://scene/getScreenCoordinatesFrom3DPosition/?callbackid=123156186463513&x=[0..1]&y=[0..1]&z=[0..1] (old)<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with a arel.Vector2D attached<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, new arel.Vector2D(20, 50));
		 * @private
		 */
		getViewportCoordinatesFrom3DPosition : function(coordString, _coordinateSystemID, _callbackID)
		{
			//debug stream
			arel.Debug.logStream("Requesting 2D coordinates for coordinate system " + _coordinateSystemID + " at 3D position " + coordString);
			
			var term = arel.SceneCache.appAPILevel !== undefined && arel.SceneCache.appAPILevel < 16 ? "/getScreenCoordinatesFrom3DPosition/" : "/getViewportCoordinatesFrom3DPosition/";
			var request = arel.ClientInterface.protocol + this.sceneTerm + term + coordString.toUpperCase() + "&coordinateSystemID=" + _coordinateSystemID + "&callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		},
		
		/**
		 * Start the instant tracking - an experience without pre-defined tracking pattern. Please make sure that between calling this method and considering the frame, a small delay might 
		 * apply due to starting possibly needed sensors. <br />
		 * <br />
		 * arel://scene/startInstantTracking/?value=INSTANT_2D <br />
		 * arel://scene/startInstantTracking/?value=INSTANT_2D_GRAVITY <br />
		 * arel://scene/startInstantTracking/?value=INSTANT_2D_GRAVITY_EXTRAPOLATED <br />
		 * arel://scene/startInstantTracking/?value=INSTANT_3D <br />
		 * arel://scene/startInstantTracking/?value=INSTANT_2D&preview=true <br />
		 * arel://scene/startInstantTracking/?value=INSTANT_2D_GRAVITY&preview=true <br />
		 * 
		 * @requires AREL 2.0 (API level 8)
		 * @private
		 */
		startInstantTracking : function(_params)
		{
			//debug stream
			arel.Debug.logStream("Request instant tracking type: " + _params);
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/startInstantTracking/" + _params;
			return arel.ClientInterface.out(request);
		},

		/** Initiate sharing a screenshot of the current scene<br /><br />
		 * e.g. <br />arel://scene/sharescreenshot/?onlysavetogallery=true
		 * @private
         * @param {string} _onlySaveToGallery Set to true if you only want to save the screenshot to the gallery (not displaying the sharing screen)
         */
		shareScreenshot : function(_onlySaveToGallery)
		{
			//debug stream
			arel.Debug.logStream("Share screenshot.");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/sharescreenshot/?onlysavetogallery=" + _onlySaveToGallery;
			return arel.ClientInterface.out(request);
		},

        /** Initiate a continuous visual search
         * e.g. <br />arel://scene/requestvisualsearch/?database="test123&returnFullTrackingConfig=true&visualsearchserver=http%3A%2F%2Fcvs.junaio.com%2Fvs"
         * @private
         */
        requestVisualSearch : function( _databaseName, _returnFullTrackingConfig, _visualSearchServer )
        {
            arel.Debug.logStream("Requesting visualsearch: " + _databaseName);

            var request = arel.ClientInterface.protocol + this.sceneTerm + "/requestvisualsearch/?database=" + _databaseName + "&returnFullTrackingConfig=" + _returnFullTrackingConfig;

            if( (_visualSearchServer !== undefined ) && _visualSearchServer.substring(0,4) == 'http')
            {
                var request = request + "&visualsearchserver=" + encodeURIComponent(_visualSearchServer);
            }

			return arel.ClientInterface.out(request);
        },

		/**
		 * Set hand-eye calibration
		 *
		 * e.g. arel://scene/setHandEyeCalibration/?q1=0&q2=0&q3=0&q4=1&transX=4&transY=0&transZ=-200.5
		 *
		 * @param {arel.Vector3D} translation	Translation component of the transform
		 * @param {arel.Rotation} rotation		Rotation component of the transform
		 * @param {int} cameraType				Camera type for which to set the hand-eye
		 *										calibration - one of {arel.CameraType.RENDERING},
		 *										{arel.CameraType.RENDERING_LEFT} or
		 *										{arel.CameraType.RENDERING_RIGHT}(defaults to
		 *										RENDERING) -> optional
		 * @requires API level 16
		 * @private
		 */
		setHandEyeCalibration: function(translation, rotation, cameraType)
		{
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/setHandEyeCalibration/" +
				arel.Util.toParameter(translation.toParameterObject("trans"), false) +
				arel.Util.toParameter(rotation.toParameterObject(), true);
			if (cameraType !== undefined)
			{
				request += arel.Util.toParameter({"cameratype": cameraType}, true);
			}
			return arel.ClientInterface.out(request);
		},

        /** Sets whether a sound should be played when picking an object or not <br /><br />
         * e.g. <br />
         * arel://scene/setPickingSoundEnabled/?value=true <br />
         * arel://scene/setPickingSoundEnabled/?value=false <br />
         * @private
         */
        setPickingSoundEnabled : function( _enabled )
        {
            arel.Debug.logStream((_enabled ? "Enabling":"Disabling")+" picking sound");

            var request = arel.ClientInterface.protocol + this.sceneTerm + "/setPickingSoundEnabled/?value="+_enabled;
            return arel.ClientInterface.out(request);
        },
		
		/** 
		 * Enable/Disable see trhough mode<br />
		 * To set the color of the see through parts use setSeeThroughColor (default is black)<br /><br />
         * e.g. <br />
         * arel://scene/setSeeThrough/?enabled=true <br />
         * arel://scene/setSeeThrough/?enabled=false <br />
		 * @private
		 */
		setSeeThrough : function(_enabled)
		{
			arel.Debug.logStream("Setting see through mode to " + _enabled ? "true" : "false");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/setSeeThrough/?enabled=" + _enabled;
			return arel.ClientInterface.out(request);
		},
		
		
		/** 
		 * Set the see through color
		 * @private
		 */
		setSeeThroughColor : function(_seeThroughColor)
		{
			arel.Debug.logStream("Changing see through color to " + _seeThroughColor);

			var params = _seeThroughColor.toParameterObject("seeThroughColor");
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/setSeeThroughColor/" + arel.Util.toParameter(params, false);
			return arel.ClientInterface.out(request);
		},
		
		/** 
		 * Enable/Disable stereo rendering<br /><br />
         * e.g. <br />
         * arel://scene/setStereoRendering/?stereoRendering=true <br />
         * arel://scene/setStereoRendering/?stereoRendering=false <br />
		 * @private
		 */
		setStereoRendering : function (_stereoRendering)
		{
			arel.Debug.logStream("Setting stereo rendering mode to " + _stereoRendering ? "enabled" : "disabled");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/setStereoRendering/?stereoRendering=" + _stereoRendering;
			return arel.ClientInterface.out(request);
		},
		
		/**
		 * Enable or disable the advanced rendering features.
		 * @private
		 */
		setAdvancedRenderingFeatures : function(_enabled)
		{
			arel.Debug.logStream((_enabled ? "Enabling " : "Disabling ") + "advanced rendering features");
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/setAdvancedRenderingFeatures/?enabled=" + _enabled;
			return arel.ClientInterface.out(request);
		},
		
		/**
		 *  This is a convenience method for setAdvancedRenderingFeatures. It enables advanced rendering only if isAdvancedRenderingSupported returns true
		 * @private
		 */
		autoEnableAdvancedRenderingFeatures : function(_callbackID)
		{
			arel.Debug.logStream("Auto enabling advanced rendering features");
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/autoEnableAdvancedRenderingFeatures/?&callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		},
		
		/**
		 *  Method to check if the used device supports advanced rendering.
		 * @private
		 */
		isAdvancedRenderingSupported : function(_callbackID)
		{
			arel.Debug.logStream("Checking if advanced rendering is supported by this device");
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/isAdvancedRenderingSupported/?&callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		},
		
		/**
		 * Sets the parameters for the Depth of Field (DoF) effect
		 * @private
		 */
		setDepthOfFieldParameters : function(_focalLength,  _focalDistance,  _aperture)
		{
			arel.Debug.logStream("Setting depth of field parameters: Focal Legth: " + _focalLength + ", Focal Distance: " + _focalDistance + ", Aperture: " + _aperture);
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/setDepthOfFieldParameters/?focalLength=" + _focalLength + "&focalDistance=" + _focalDistance + "&aperture=" + _aperture;
			return arel.ClientInterface.out(request);
		},
		
		/**
		 *  Sets the intensity of the motion blur applied to the rendering.
		 * @private
		 */
		setMotionBlurIntensity : function(_intensity)
		{
			arel.Debug.logStream("Setting motion blur intensity to: " + _intensity);
			
			var request = arel.ClientInterface.protocol + this.sceneTerm + "/setMotionBlurIntensity/?intensity=" + _intensity;
			return arel.ClientInterface.out(request);
		}
		
	},
	/** 
	 * Interface for Objects
	 * @class Does the interface object stuff
	 * @private */
	object:
	{
		/**
		 * =="object"
		 *
		 * @private */
		objectTerm: "object",
		
		/** 
		 * update the renderer if a change on the object was done<br /><br />
		 * e.g. <br />arel://object/setEnableBillboard/?id=123&value=true<br />
		 *  arel://Object/setScale/?id=xy&scaleX=&scaleY=&scaleZ=<br />
		 *	arel://Object/setRotation/?id=xy&rotX=&rotY=&rotZ=&rotType=<br />
		 *	arel://Object/setTranslation/?id=xy&transX=&transY=&transZ=<br />
		 *  arel://Object/setLocation/?id=xy&lat=&lng=&alt=<br />
		 *  arel://Object/setScreenCoordinates/?id=xy&onScreenX=&onScreenY=<br />
		 *  arel://object/setOccluding/?id=123&value=true<br />
		 *  arel://object/setMovie/?id=123&value=someMovie.3g2<br />
		 *  arel://object/setModel/?id=123&value=someMovie.3g2<br />
		 *  arel://object/setTexture/?id=123&value=someMovie.3g2<br />
		 *  arel://Object/setTitle/?id=xy&value=<br />
		 *  arel://Object/setIcon/?id=xy&value=<br />
		 *  arel://Object/setThumbnail/?id=xy&value=<br />
		 *  arel://Object/setPopUp/?id=xy&popupBgColor=&popupText=&popupCloseButton=&popupDistance=&popupThumbnail=&popupButtonName0=&popupButtonType0=&popupButtonValue0=<br />
		 *  arel://Object/setCoordinateSystemID/?id=xy&value=<br />
		 *  arel://Object/setTransparency/?id=xy&value=<br />
		 *  arel://Object/setRenderOrderPosition/?id=xy&value=<br />
		 *  arel://Object/setScreenAnchor/?id=xy&value=xy&flags=z<br />
		 *  arel://Object/setPickingEnabled/?id=xy&value=<br />
		 *  arel://Object/setMaxDistance/?id=xy&value=<br />
		 *  arel://Object/setMinDistance/?id=xy&value=<br />
		 *  arel://Object/setMinAccuracy/?id=xy&value=<br />
		 *  arel://object/setVisibility/?id=123&radar=true&maplist=true&liveview=true<br />
		 *  arel://object/setAnimationSpeed/?id=123&value=9
		 *  (for multiple buttons, multiple popupbuttonName, value and types will be send)<br />
		 *
		 * @private */		
		edit: function(id, handler, _addparams)
		{
			//debug stream
			arel.Debug.logStream("Edit object " + id + "; set" + handler);
			
			var request = arel.ClientInterface.protocol + this.objectTerm + "/set" + handler + "/?id=" + id + _addparams;
			return arel.ClientInterface.handleObjectRequest(id, request, handler);
		},
		
		/** 
		 * Start an object's animation (only valid for md2 models)<br /><br />
		 * e.g. <br />arel://object/startAnimation/?id=123&animationname=frame&looped=true
		 * @private */
		startAnimation: function(id, _params)
		{
			//debug stream
			arel.Debug.logStream("Start animation of Object " + id);
			
			var request = arel.ClientInterface.protocol + this.objectTerm + "/startAnimation/" + _params;
			return arel.ClientInterface.handleObjectRequest(id, request);
		},
		
		/** 
		 * Stop an object's animation (only valid for md2 models)<br /><br />
		 * e.g. <br />arel://object/stopAnimation/?id=123
		 * @private */
		stopAnimation: function(id, _params)
		{
			//debug stream
			arel.Debug.logStream("stop animation of Object " + id);
			
			var request = arel.ClientInterface.protocol + this.objectTerm + "/stopAnimation/" + _params;
			return arel.ClientInterface.handleObjectRequest(id, request);
		},
		
		/** 
		 * Pause the currently playing animation of the 3D model (only valid for md2 models)<br /><br />
		 * e.g. <br />arel://object/pauseAnimation/?id=123
		 * @private */
		pauseAnimation: function(id, _params)
		{
			//debug stream
			arel.Debug.logStream("Pause animation of Object " + id);
			
			var request = arel.ClientInterface.protocol + this.objectTerm + "/pauseAnimation/" + _params;
			return arel.ClientInterface.handleObjectRequest(id, request);
		},
		
		/** 
		 * Start an object's movie texture (if applicable)<br /><br />
		 * e.g. <br />arel://object/startMovieTexture/?id=123&loop=true
		 * @private */
		startMovieTexture: function(id, _params)
		{
			//debug stream
			arel.Debug.logStream("Start movie texture of Object " + id);
			
			var request = arel.ClientInterface.protocol + this.objectTerm + "/startMovieTexture/" + _params;
			return arel.ClientInterface.handleObjectRequest(id, request);
		},
		
		/** 
		 * Start an object's movie texture (if applicable)<br /><br />
		 * e.g. <br />arel://object/startAnimation/?id=123
		 * @private */
		pauseMovieTexture: function(id, _params)
		{
			//debug stream
			arel.Debug.logStream("Pause movie texture of Object " + id);
			
			var request = arel.ClientInterface.protocol + this.objectTerm + "/pauseMovieTexture/" + _params;
			return arel.ClientInterface.handleObjectRequest(id, request);
		},
		
		/** 
		 * Start an object's movie texture (if applicable)<br /><br />
		 * e.g. <br />arel://object/startAnimation/?id=123
		 * @private */
		stopMovieTexture: function(id, _params)
		{
			//debug stream
			arel.Debug.logStream("Stop movie texture of Object " + id);
			
			var request = arel.ClientInterface.protocol + this.objectTerm + "/stopMovieTexture/" + _params;
			return arel.ClientInterface.handleObjectRequest(id, request);
		},

		/**
		 * Request movie texture status and position of an object with a movie texture (if
		 * applicable)<br /><br />
		 * e.g. <br />arel://object/getMovieTextureStatus/?callbackid=123123&id=456
		 *
		 * The callback is expected to be called with a playback status object as argument,
		 * argument, e.g. arel.CallbackInterface.callCallbackFunction(new
		 *  arel.MovieTextureStatus(arel.Constants.PLAYBACK_STATUS_PLAYING, 5.4f).
		 *
		 * @private
		 */
		getMovieTextureStatus: function(paramString)
		{
			//debug stream
			arel.Debug.logStream("Requesting object's movie texture status");

			var request = arel.ClientInterface.protocol + this.objectTerm + "/getMovieTextureStatus/" + paramString;
			return arel.ClientInterface.out(request);
		},

		/** Check if this Object is currently in the view of the user. Only if the Object is rendered, it can be considered to be in the current field of view.<br /><br />
		 * e.g. <br />aarel://object/isRendered/?callbackid=123123&id=sdfsdf<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with a Boolean attached<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction("123123", true);
		 * 
		 * @private */
		getIsRendered : function(paramString)
		{
			//debug stream
			arel.Debug.logStream("Requesting if object is rendered.");
			
			var request = arel.ClientInterface.protocol + this.objectTerm + "/isRendered/" + paramString;
			return arel.ClientInterface.out(request);			
		}
	},
	
	/** 
	 * Navigation stuff
	 * @class Does the interface navigation stuff
	 * @private */
	navigate:
	{
		/** 
		 * =="navigate"
		 * @private */
		navigateTerm : "navigate",
		
		/** 
		 * Route on Maps<br />
		 * <br />
		 * e.g.<br />	 
		 * arel://navigate/routeOnMap/?id=2_poi<br />
		 * arel://navigate/routeOnMap/?lat=48.1234433&lng=11.1234433<br />
		 * @private */
        routeOnMap : function(_params)
		{
			//debug stream
			arel.Debug.logStream("Route on Map");
			
			var request = arel.ClientInterface.protocol + this.navigateTerm + "/routeOnMap/" + _params;
			return arel.ClientInterface.out(request);
		}
	},
	/**
	 * media stuff
	 * @class Does the interface media stuff
	 * @private
	 */
	media:
	{
		/** 
		 * =="media"
		 * @private */
		mediaTerm : "media",

		/**
		 * Speak out text via text-to-speech
		 *
		 * e.g. arel://media/speak/?text=Metaio%20rocks
		 *
		 * @private
		 */
		speak: function(text)
		{
			arel.Debug.logStream("Speaking text: " + text);

			var request = arel.ClientInterface.protocol + this.mediaTerm + "/speak/?text=" + encodeURIComponent(text);
			return arel.ClientInterface.out(request);
		},

		/** 
		 * Work with website<br /><br />
		 * e.g.<br />
		 * arel://media/website/?action=open&external=false&url=http%3a%2f%2fwww.junaio.com<br />
		  * @private */
		website: function(_params)
		{
			//debug stream
			arel.Debug.logStream("Handling url " + _params);
			
			var request = arel.ClientInterface.protocol + this.mediaTerm + "/website/" + _params;
			return arel.ClientInterface.out(request);
		},
		
		/** 
		 * Work with sound<br /><br />
		 * e.g.<br />
		 * arel://media/sound/?fullscreen=false&action=play&url=http%3a%2f%2fwww.junaio.com%2fsomeMP3.mp3<br />
		 * arel://media/sound/?action=pause&url=http%3a%2f%2fwww.junaio.com%2fsomeMP3.mp3<br />
		 * arel://media/sound/?action=stop&url=http%3a%2f%2fwww.junaio.com%2fsomeMP3.mp3
		 * @private */
		sound: function(_params)
		{
			//debug stream
			arel.Debug.logStream("Handling sound " + _params);
			
			var request = arel.ClientInterface.protocol + this.mediaTerm + "/sound/" + _params;
			return arel.ClientInterface.out(request);
		},
		
		/** 
		 * Work with Images<br /><br />
		 * e.g.<br />
		 * arel://media/image/?action=open&url=http%3a%2f%2fwww.junaio.com%2fsomeImage.jpg<br />
		 * @private */
		image: function(_params)
		{
			//debug stream
			arel.Debug.logStream("Handling image " + _params);
			
			var request = arel.ClientInterface.protocol + this.mediaTerm + "/image/" + _params;
			return arel.ClientInterface.out(request);
		},
		
		/** 
		 * Work with video<br /><br />
		 * e.g.<br />
		 * arel://media/video/?action=open&url=http%3a%2f%2fwww.junaio.com%2fsomeMP4.mp4<br />		 
		 * @private */
		video: function(_params)
		{
			//debug stream
			arel.Debug.logStream("Handling fullscreen video " + _params);
			
			var request = arel.ClientInterface.protocol + this.mediaTerm + "/video/" + _params;
			return arel.ClientInterface.out(request);
		},
		
		/**
		 * Work with vibration <br /><br />
		 * e.g.<br />
		 * arel://media/vibrate
		 * @private 
		 */
		vibrate: function()
		{
			//debug stream
			arel.Debug.logStream("Handling vibration alert");
			
			var request = arel.ClientInterface.protocol + this.mediaTerm + "/vibrate";
			return arel.ClientInterface.out(request);
		},


        /**
         * Play an alert sound <br /><br />
         * e.g.<br />
         * arel://media/playalert
         * @private
         */
        playAlert: function()
        {
            arel.Debug.logStream("Playing alert sound");

            var request = arel.ClientInterface.protocol + this.mediaTerm + "/playalert";
            return arel.ClientInterface.out(request);
        },

        /**
         * Create a calendar event <br /><br />
         * e.g.<br />
         * arel://media/createcalendarevent/?startdate=123123123&enddate=4444444411&subject=Lala&description=lulu&location=room1
         * @private
         */
        createCalendarEvent: function( _startDate, _endDate, _subject, _description, _location)
        {
            arel.Debug.logStream("Creating calendar entry");

            var request = arel.ClientInterface.protocol + this.mediaTerm + "/createcalendarevent/?startdate=" + _startDate + "&enddate=" + _endDate + "&subject=" + _subject + "&description=" + _description + "&location=" + _location;
            return arel.ClientInterface.out(request);
        }
		
	},
	
	/** 
	 * junaio internal stuff
	 * @class junaio internal information
	 * @private */
	junaio:
	{
		/** 
		 * =="junaio"
		 * @constant
		 * @private */
		junaioTerm: "junaio",
		
		/** authenticate the user<br /><br />
		 * e.g. <br />arel://junaio/authenticate/?callbackid=123156186463513<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with an object for user and md5 password to come back<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, { "user": "Stefan", "passwordMD5" : "3434590refg90dug094e9u509dsj" });
		 * @private
		 */
		authenticate : function(_callbackID)
		{
			var request = arel.ClientInterface.protocol + this.junaioTerm + "/authenticate/?callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		},
		
		/** signup command for the user<br /><br />
		 * e.g. <br />arel://junaio/signup/?callbackid=123156186463513<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with an object for user and md5 password to come back<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, { "user": "Stefan", "passwordMD5" : "3434590refg90dug094e9u509dsj" });
		 * @private
		 */
		signup : function(_callbackID)
		{
			var request = arel.ClientInterface.protocol + this.junaioTerm + "/signup/?callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		},
		
		/** login command for the user<br /><br />
		 * e.g. <br />arel://junaio/login/?callbackid=123156186463513<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with an object for user and md5 password to come back<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, { "user": "Stefan", "passwordMD5" : "3434590refg90dug094e9u509dsj" });
		 * @private
		 */
		login : function(_callbackID)
		{
			var request = arel.ClientInterface.protocol + this.junaioTerm + "/login/?callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		},
		
		/** logout command the user<br /><br />
		 * e.g. <br />arel://junaio/authenticate/?callbackid=123156186463513<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with a boolean confirming the logout (or not)<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, true);
		 * @private
		 */
		logout : function(_callbackID)
		{
			var request = arel.ClientInterface.protocol + this.junaioTerm + "/logout/?callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		},
		
		/** get the users history<br /><br />
		 * e.g. <br />arel://junaio/getHistory/?callbackid=123156186463513<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with an array of channel IDs<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, [4796, 7769, 102569, 112589]);
		 * @private
		 */
		getHistory : function(_callbackID)
		{
			var request = arel.ClientInterface.protocol + this.junaioTerm + "/getHistory/?callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		},
		
		/** get the users history<br /><br />
		 * e.g. <br />arel://junaio/manageFavorites/?action=add&id=12354<br />
		 * arel://junaio/manageFavorites/?action=remove&id=12354<br /><br />
		 * @private
		 */
		manageFavorites : function(_params)
		{
			var request = arel.ClientInterface.protocol + this.junaioTerm + "/manageFavorites/" + _params;
			return arel.ClientInterface.out(request);
		},
		
		/** get the users history<br /><br />
		 * e.g. <br />arel://junaio/getFavorites/?callbackid=123156186463513<br /><br />
		 * 
		 * This expects to make a call to the CallbackInterface with an array of channel IDs<br />
		 * e.g. arel.CallbackInterface.callCallbackFunction(123156186463513, [4796, 7769, 102569, 112589]);
		 * @private
		 */
		getFavorites : function(_callbackID)
		{
			var request = arel.ClientInterface.protocol + this.junaioTerm + "/getFavorites/?callbackid=" + _callbackID;
			return arel.ClientInterface.out(request);
		}
	},	
	
	/** 
	 * arel is completely loaded
	 * @private */
	arelReady: function()
	{
		var request = arel.ClientInterface.protocol + "arelReady/?apilevel=" + arel.ClientInterface.apilevel;
		return arel.ClientInterface.out(request);		
	},

	/**
	 * For objects, it needs to be decided, whether to queue the command as long as the model is not arel.Config.OBJECT_STATE_READY or if it can be passed already
	 * @private
	 */
	handleObjectRequest : function(id, _request, handler)
	{
		//if this object is ready already, just send it out (queue and let the client know there is something waiting)
		if(arel.ObjectCache.getObject(id).getState() === arel.Config.OBJECT_STATE_READY)
		{
			//special case for adjust the movie, texture and model of objects. The state needs to be set back
			if(handler && (handler == "Movie" || handler == "Texture" || handler == "Model"))
			{
				arel.ObjectCache.getObject(id).setState(arel.Config.OBJECT_STATE_LOADING);
			}
			
			return arel.ClientInterface.out(_request);	
		}
		else //the object is not ready yet, cache the command
		{
			if(arel.commandCachePerObject[id] === undefined)
			{
				arel.commandCachePerObject[id] = [_request];
			}
			else
			{
				arel.commandCachePerObject[id].push(_request);
			}
			
			return "Command stacked for " + id;
		}
	},
	
	/**
	 * With each arel.Events.Object.ONREADY we will check if there are any commands for an object cached and queue them if necessary
	 * @private
	 */
	queueCachedObjectRequests : function(id)
	{
		if(arel.commandCachePerObject[id] !== undefined)
		{
			for(var i in arel.commandCachePerObject[id])
			{
				if (typeof(arel.commandCachePerObject[id][i]) !== "function")
				{
					return arel.ClientInterface.out(arel.commandCachePerObject[id][i]);
				}
			}
			
			delete arel.commandCachePerObject[id];
		}						
	},
	
	/** 
	 * Queue all the commands and let the client know that something is queued up
	 * @private */
	out: function(_request)
	{
		if(arel.Debug.activeBrowser)
		{
			console.debug(_request);
		}			
		else if(arelTEST)
		{
			return _request;
		}
		else 
		{
			arel.commandQueue.push(_request);
			
			//one default request, so the client knows he can get something
			window.location = "arel://requestsPending";			
		}
	}	
};
		
		//additional
/** Parser 
 * @private */

function urldecode(str) {
   return decodeURIComponent((str+'').replace(/\+/g, '%20'));
}
arel.Parser =
{
	/** @private */
	parseLocation : function(_location)
	{
		var lla = new arel.LLA();
		
		if(_location.lat !== undefined)
		{
			if(this.validateLatitude(_location.lat))
			{
				lla.setLatitude(_location.lat);
			}
			else
			{
				return arel.Error.write("Invalid Location");
			}
		}
		
		if(_location.lng !== undefined)
		{
			if(this.validateLongitude(_location.lng))
			{
				lla.setLongitude(_location.lng);
			}
			else
			{
				return arel.Error.write("Invalid Location");
			}
		}
		
		if(_location.lng !== undefined)
		{
			lla.setAltitude(_location.alt);
		} else {
			lla.setAltitude(0);
		}
		
		if(_location.acc !== undefined)
		{
			lla.setAccuracy(_location.acc);
		}
		
		return lla;
	},
	/** @private */
	parseRotation : function(_rotation)
	{
		return new arel.Rotation(_rotation.q1, _rotation.q2, _rotation.q3, _rotation.q4);
		/*var rotation = new arel.Rotation();
		
		if(_rotation.type !== undefined && _rotation.type !== undefined)
		{
			rotation.setRotationType(_rotation.type);
		} else {
			rotation.setRotationType(new arel.Rotation().RADIANS);
		}
		
		if(_rotation.hook !== undefined && _rotation.hook !== undefined && (rotation.getRotationType() === arel.Config.ROTATION_TYPE_POINTTO || rotation.getRotationType() === arel.Config.ROTATION_TYPE_GRAVITY))
		{
			rotation.setRotationValues(_rotation.hook);
		}
		else if(_rotation.hook !== undefined)
		{
			return arel.Error.write("Rotation hook is only allowed with arel.Rotation.GRAVITY OR arel.Rotation.POINTTO");
			return false;
		}
		
		if(_rotation.x !== undefined && _rotation.y !== undefined && _rotation.z !== undefined && (rotation.getRotationType() === arel.Config.ROTATION_TYPE_DEGREE || rotation.getRotationType() === arel.Config.ROTATION_TYPE_RADIANS))
		{
			rotation.setRotationValues(new arel.Vector3D(_rotation.x, _rotation.y, _rotation.z));
		}
		else if(_rotation.x === undefined || _rotation.y === undefined || _rotation.z === undefined)
		{
			return arel.Error.write("Invalid rotation given");
			return false;
		}
				
		return rotation;*/
	},
	/** @private */
	parseScale : function(_scale)
	{
		var scale = new arel.Vector3D();
		
		if(_scale.x !== undefined && _scale.y !== undefined && _scale.z !== undefined)
		{
			scale = new arel.Vector3D(_scale.x, _scale.y, _scale.z);
		}
		else 
		{
			return arel.Error.write("Invalid scale given");
		}
		
		return scale;
	},
	/** @private */
	parseTranslation : function(_translation)
	{
		var translation = new arel.Vector3D();
		
		if(_translation.x !== undefined && _translation.y !== undefined && _translation.z !== undefined)
		{
			translation = new arel.Vector3D(_translation.x, _translation.y, _translation.z);
		}
		else 
		{
			return arel.Error.write("Invalid translation given");
		}
		
		return translation;
	},
	/** @private */
	parseOnScreen : function(_onScreen)
	{
		var onScreen = new arel.Vector2D();
		
		if(_onScreen.x !== undefined && _onScreen.y !== undefined)
		{
			onScreen = new arel.Vector3D(_onScreen.x, _onScreen.y, _onScreen.z);
		}
		else 
		{
			return arel.Error.write("Invalid onScreen given");
		}
		
		return onScreen;
	},
	
	/** @private */
	parsePopUp : function(_popup, _location)
	{
		var description = undefined;
		var aButtons = [];
		
		if(_popup.description)
		{
			description = urldecode(_popup.description);
		}
		
		if(_popup.buttons && _popup.buttons.length > 0)
		{		
			for(var i in _popup.buttons)
			{
				if(typeof(_popup.buttons[i]) !== "function")	
				{
					aButtons[aButtons.length] = new arel.PopupButton(urldecode(_popup.buttons[i][0]), urldecode(_popup.buttons[i][1]), urldecode(_popup.buttons[i][2]));
				}
			}					
		}

        return new arel.Popup(
            {
                buttons:aButtons,
                description:description
            });
	},
	
	/** @private */
	parseParameters : function(_parmaters)
	{
		var decodedParameters = {};
		
		if(_parmaters)
		{
			for(var i in _parmaters)
			{
				if(typeof(_parmaters[i]) !== "function")	
				{
					decodedParameters[urldecode(i)] = urldecode(_parmaters[i]);
				}
			}
		}
		
		return decodedParameters;
	},
	/** @private */
	parseVector3d : function(_vector3d)
	{
		var ret = new arel.Vector3D();
		
		if(_vector3d.x !== undefined && _vector3d.y !== undefined && _vector3d.z !== undefined)
		{
			ret = new arel.Vector3D(_vector3d.x, _vector3d.y, _vector3d.z);
		}
		else 
		{
			return arel.Error.write("Invalid Vector3d given");
		}
		
		return ret;
	},
	/** @private */
	validateLatitude : function(_lat)
	{
		return !(_lat < -90 || _lat > 90);
	},
	/** @private */
	validateLongitude : function(_lon)
	{
		return !(_lon < -180 || _lon > 180);
	}	
};/** @author metaio GmbH
 *  @class Utility class for arel. Some extra methods that might come in handy 
 *  
 */

arel.Util =  
{
	/** @private */
	toParameter : function(aParams, succeedingParameters)
	{
		var paramString = "";
		var count = 0;
		
		for(var i in aParams)
		{
			//make sure no prototype functions are being passed
			if(typeof(aParams[i]) !== "function" && aParams[i] !== undefined) 
			{
				if(count === 0 && !succeedingParameters)
				{
					paramString += "?" + i + "=" + encodeURIComponent(aParams[i]);
				}
				else
				{
					paramString += "&" + i + "=" + encodeURIComponent(aParams[i]);
				}
				
				count++;
			}
		}
		
		return paramString;
	},
	
	/** @private */
	clamp : function(value, low, high)
	{
		return Math.min(Math.max(value, low), high);
	},
	
	/** @private */
	vec3DToDeg : function(vec3D)
	{
		var x = vec3D.getX() * 180 / Math.PI;
		var y = vec3D.getY() * 180 / Math.PI;
		var z = vec3D.getZ() * 180 / Math.PI;
		
		return new arel.Vector3D(x, y, z);
	},
	
	/** @private */
	vec3DToRad : function(vec3D)
	{
		var x = vec3D.getX() * Math.PI / 180;
		var y = vec3D.getY() * Math.PI / 180;
		var z = vec3D.getZ() * Math.PI / 180;
		
		return new arel.Vector3D(x, y, z);
	},
		
	/** @private */
	numberOfArelObjects : function(array)
	{
		var amount = 0;
		
		for(var i in array)
		{
			if(array[i] instanceof arel.Object)
			{
				amount++;
			}				
		}	
		
		return amount;	
	},
	
	/**
	 * Calculate the distance between two geo positions in meter
	 * @param {arel.LLA} lla1 LLA coordinate of start position
	 * @param {arel.LLA} lla2 LLA coordinate of ending position 
	 */
	getDistanceBetweenLocationsInMeter : function(lla1, lla2)
	{
		if(!(lla1 instanceof arel.LLA) || !(lla2 instanceof arel.LLA))
		{
			return arel.Error.write("lla1 and lla2 must be of type arel.LLA");
		}
		
		var latitude1 = lla1.getLatitude();
		var longitude1 = lla1.getLongitude();
		var latitude2 = lla2.getLatitude();
		var longitude2 = lla2.getLongitude();
		
		var deg2RadNumber = Math.PI / 180;
		var earthRadius = 6371009; 

		var latitudeDistance = (latitude1 - latitude2) * deg2RadNumber;
        var longitudeDistance = (longitude1 - longitude2) * deg2RadNumber;                                      
        var a = Math.pow(Math.sin(latitudeDistance / 2.0), 2) +  Math.cos(latitude1 * deg2RadNumber) * Math.cos(latitude2 * deg2RadNumber) * Math.pow(Math.sin(longitudeDistance / 2.0), 2);
		var c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));                                               
				
		return earthRadius * c;
	}
};		
		//include more files:
/** @author metaio GmbH
 *  @class The abstract interface for Objects to be used with junaio. This interface may not be instantiated. Use {@link arel.Object.Model3D} and {@link arel.Object.POI}
 */
arel.Object = function()
{
	this.CATEGORY = arel.Config.OBJECT_INTERFACE_CATEGORY;
	
	//params
	/** @private */ this.id = undefined;
	/** @private */ this.dynamicLightingEnabled = undefined;
	/** @private */ this.llaLimitsEnabled = undefined;
	/** @private */ this.title = undefined;
	/** @private */ this.popup = undefined;
	/** @private */ this.location = undefined;
	/** @private */ this.iconPath = undefined;
	/** @private */ this.thumbnailPath = undefined;
	/** @private */ this.minaccuracy = undefined;
	/** @private */ this.maxdistance = undefined;
	/** @private */ this.mindistance = undefined;
	/** @private */ this.state = undefined;
	/** @private */ this.parameters = undefined;
	/** @private */ this.visibility = undefined;
    /** @private */ this.shadermaterial = undefined;
    /** @private */ this.parentobject = undefined;


		
	//setters and getters
	/**
	 * Set Object ID.
	 * @param {string} objectID alphanummeric string defining the Object ID.
	 */
	this.setID = function(_id) {this.id = _id;};
	/**
	 * Get Object ID.
	 * @return {string} ID of the Object
	 */
	this.getID = function() {return this.id;};

	/**
	 * Determine whether dynamic lighting affects this geometry
	 * @return {bool} True if lighting enabled for this geometry, else false
	 */
	this.isDynamicLightingEnabled = function()
	{
		return this.dynamicLightingEnabled;
	};
	
	/**
	 * Set whether this geometry is affected by dynamic lights
	 * @param {bool} _enable Whether to enable or disable lighting
	 */
	this.setDynamicLightingEnabled = function(_enable)
	{
		_enable = !!_enable; // force to boolean
		this.dynamicLightingEnabled = _enable;

		return arel.Scene.updateObject(this.id, "DynamicLightingEnabled", _enable, arel.Util.toParameter({"value": _enable}, true));
	};

	/**
	 * Set whether this geometry will be moved into distance range of LLAlimits
	 * @param {bool} _enable Whether to enable or disable lighting
     * @requires API level 14
	 */
	this.setLLALimitsEnabled = function(_enable)
	{
		_enable = !!_enable; // force to boolean
		this.llaLimitsEnabled = _enable;

		return arel.Scene.updateObject(this.id, "LLALimitsEnabled", _enable, arel.Util.toParameter({"value": _enable}, true));
	};

	
	/**
	 * Set Object Title.
	 * @param {string} title Title of the Object
	 */
	this.setTitle = function(_title) {
		
		this.title = _title;
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "Title", _title, arel.Util.toParameter({"value": _title}, true));
		
	};
	/**
	 * Get Object Title.
	 * @param {string} Title of the Object
	 */
	this.getTitle = function() {return this.title;};
	
	/**
	 * Set Object Popup information.
	 * @param {arel.Popup} popup information for the Object information box
	 */
	this.setPopup = function(_popup) {
		
		this.popup = _popup;
		
		var ppParams = this.popup.toParameterObject();					
		return arel.Scene.updateObject(this.id, "Popup", this.popup, arel.Util.toParameter(ppParams, true));
		
	};
	/**
	 * Get Object Popup information.
	 * @return {arel.Popup} information for the Object information box 
	 */
	this.getPopup = function() {return this.popup;};
	
	/**
	 * Set Object Location information (location-based Scenes only).
	 * @param {arel.LLA} location coordination of the Object as latitude, longitude, altitude
	 */
	this.setLocation = function(_location) {
		
		if(!(_location instanceof arel.LLA))
		{
			return arel.Error.write("_location must be of type arel.LLA");
		}
		
		this.location = _location;
		
		//update the information in the scene if the Object exists in the scene
		var lParams = this.location.toParameterObject();					
		return arel.Scene.updateObject(this.id, "Location", _location, arel.Util.toParameter(lParams, true));
	};
	/**
	 * Get Object Location information (location-based Scenes only).
	 * @return {arel.LLA} coordination of the Object as latitude, longitude, altitude
	 */
	this.getLocation = function() {return this.location; };
	
	/**
	 * Set Object icon path for the image as being displayed in the MapView (location-based Scenes only).
	 * @param {string} iconPath path where to retrieve the map icon from
	 */
	this.setIcon = function(_iconPath) {
		
		this.iconPath = _iconPath;
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "Icon", _iconPath, arel.Util.toParameter({"value": _iconPath}, true));
	};
	/**
	 * Get Object icon path for the image as being displayed in the MapView (location-based Scenes only).
	 * @return {string} path where to retrieve the map icon from
	 */
	this.getIcon = function() {return this.iconPath;};
	
	/**
	 * Set Object thumbnail path for the image as being displayed in the ListView (location-based Scenes only).
	 * @param {string} thumbnailPath path where to retrieve the list thumb from
	 */
	this.setThumbnail = function(_thumbnailPath) {
		
		this.thumbnailPath = _thumbnailPath;
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "Thumbnail", _thumbnailPath, arel.Util.toParameter({"value": _thumbnailPath}, true));
	};
	/**
	 * Get Object thumbnail path for the image as being displayed in the ListView (location-based Scenes only).
	 * @return {string} path where to retrieve the list thumb from
	 */
	this.getThumbnail = function() {return this.thumbnailPath;};


    /**
     * Set the shader material of an object.
     * For this to work, you also have to define global shader materials
     * @requires API level 13
     * @param _shaderMaterial Shader material name as loaded through AREL XML or arel.Scene.loadShaderMaterials
     * @see arel.Scene.loadShaderMaterials
     */
    this.setShaderMaterial = function(_shaderMaterial)
    {
        this.shadermaterial = _shaderMaterial;
        return arel.Scene.updateObject(this.id, "ShaderMaterial", _shaderMaterial, arel.Util.toParameter({"value": _shaderMaterial}, true));
    };

    /**
     * Returns the currently assigned shader material name
     * @requires API level 13
     * @returns the currently assigned shader material name
     */
    this.getShaderMaterial = function () { return this.shadermaterial; };


    /**
     * Define a parent for the current object
     * @param _parent the parent object
     * @requires API level 13
     */
    this.setParent = function ( _parent)
    {
       this.parentobject = _parent;
       return arel.Scene.updateObject(this.id, "Parent", _parent, arel.Util.toParameter({"value": _parent}, true));
    };

    /** Returns the currently defined parent
     * @requires API level 13
     * @returns the currently defined parent
     */
    this.getParent = function ( ) { return this.parentobject; };


	/**
	 * Set the minimum accuracy of the sensors to display the Object (location-based Scenes only).
	 * @param {int} minaccuracy Value in m (set 1 for displaying an Object only if a LLA Marker is scanned)  
	 */
	this.setMinAccuracy = function(_minaccuracy) {
		
		this.minaccuracy = _minaccuracy;
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "MinAccuracy", _minaccuracy, arel.Util.toParameter({"value": _minaccuracy}, true));	
	};
	/**
	 * Get the minimum accuracy of the sensors to display the Object (location-based Scenes only).
	 * @return {int} Value in m (will be 1 for displaying an Object only if a LLA Marker is scanned)  
	 */
	this.getMinAccuracy = function() {return this.minaccuracy;};
	
	/**
	 * Set the maximum distance to the Object to display it (location-based Scenes only).
	 * @param {int} maxdistance Value in m  
	 */
	this.setMaxDistance = function(_maxdistance) {
		
		this.maxdistance = _maxdistance;
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "MaxDistance", _maxdistance, arel.Util.toParameter({"value": _maxdistance}, true));		
	};
	/**
	 * Get the maximum distance to the Object to display it (location-based Scenes only).
	 * @return {int} maxdistance Value in m  
	 */
	this.getMaxDistance = function() {return this.maxdistance;};
	
	/**
	 * Set the minimum distance to the Object to display it (location-based Scenes only).
	 * @param {int} _mindistance mindistance Value in m  
	 */
	this.setMinDistance = function(_mindistance) {
		
		this.mindistance = _mindistance;
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "MinDistance", _mindistance, arel.Util.toParameter({"value": _mindistance}, true));			
	};
	/**
	 * Get the minimum distance to the Object to display it (location-based Scenes only).
	 * @return {int} mindistance Value in m  
	 */
	this.getMinDistance = function() {return this.mindistance;};
	
	/**
	 * Set the state of the model (arel.Config.OBJECT_STATE_LOADING | arel.config.OBJECT_STATE_READY)
	 * @param {string} _state state the model is in - loading or ready  
	 * @private
	 */
	this.setState = function(_state) {this.state = _state;};
	/**
	 * Get the state of the model (arel.Config.OBJECT_STATE_LOADING | arel.config.OBJECT_STATE_READY)
	 * @return {string} state the model is in - loading or ready  
	 * 
	 */
	this.getState = function() {return this.state;};
	
	/**
	 * use this method to determine whether an object is visible or not in liveview/maplist/radar
	 * @return {object} object which fields are liveview, maplist and radar and each contains a bolean which specifies if it is visible or not
	 */
	this.getVisibility = function() {return this.visibility;};
	
	/**
	 * Set the visibility for an Object for MapView, ListView, LiveView and Radar. For GLUE, only LiveView is supported.
	 * @param {boolean} _liveview set true if the Object should be shown in Live View, false if hidden, undefined is unchanged
	 * @param {boolean} _maplist set true if the Object should be shown on the Map and in the List, false if hidden, undefined is unchanged
	 * @param {boolean} _radar set true if the Object should be shown on the radar, false if hidden, undefined is unchanged
	 */
	this.setVisibility = function(_liveview, _maplist, _radar)
	{
		var params = [];
		
		if(_liveview !== undefined)
		{
			this.visibility.liveview = _liveview;
			
			if(_liveview)
			{
				params.liveview = "true";				
			}
			else
			{
				params.liveview = "false";
			}
		}
		
		if(_maplist !== undefined)
		{
			this.visibility.maplist = _maplist;
			
			if(_maplist)
			{
				params.maplist = "true";
			}
			else
			{
				params.maplist = "false";
			}
		}	
		
		if(_radar !== undefined)
		{
			this.visibility.radar = _radar;
			
			if(_radar)
			{
				params.radar = "true";
			}
			else
			{
				params.radar = "false";
			}
		}	
		
		//call undefined, otherwise the object is incorrectly reset
		return arel.Scene.updateObject(this.id, "Visibility", undefined, arel.Util.toParameter(params, true));
			
	};
	
	/** Get all parameters for the object
	 * @return {Object} object with KEY => VALUE 
	 */
	
	this.getParameters = function()
	{
		return this.parameters;
	};
	
	/** Get a certain parameter for the object
	 * @param {String} key the value belonging to the key 
	 * @return {String} value
	 */
	this.getParameter = function(key)
	{
        if( this.parameters === undefined )
        {
            return "";
        }
		return this.parameters[key.toLowerCase()];
	};
	
	/**
	 * Use this method to set parameters for an object
	 * @param {Object} _parameters parameters of an object e.g. {"test" : 1, "url": "www.junaio.com"}
	 */
	this.setParameters = function(_parameters) {
		
		this.parameters = _parameters;
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "Parameters", _parameters, arel.Util.toParameter(_parameters, true));
	};
	
	/**
	 * Use this method to set a specific parameter for an object
	 *  @param {String} key the value belonging to the key 
	 *  @param {String} value to be set
	 *  @param {Boolean} override true if overriding a parameter is allowed, false otherwise. default: false
	 *  @return {Boolean | String} returns false, if the parameter already exists and override is set to false
	 */
	this.setParameter = function(_key, _value, _override) {
		
		var override = false;
		
		if(_override)
			override = _override;
		
		if(this.parameters)
		{
			//do not override the parameter
			if(this.parameters[_key.toLowerCase()] && !override)
				return false;
			
			//set the parameter
			this.parameters[_key.toLowerCase()] = _value;
		}
		else //create the array first
		{
			this.parameters = [];
			this.parameters[_key.toLowerCase()] = _value;			
		}
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "Parameters", this.parameters, arel.Util.toParameter(this.parameters, true));
	};
	
	/**
	 * Check if this Object is currently in the view of the user. Only if the Object is rendered, it can be considered to be in the current field of view.
	 * @param {function} _callback a callback function receiving the value as Boolean value
	 * @param {Object} caller the object this shall be referenced to in the callback function -> optional
	 */
	this.isRendered = function(_callback, caller) {
		
		//register the callback
		var callbackID = arel.CallbackInterface.addCallbackFunction(_callback, caller);
				
		if(!callbackID) {
			return arel.Error.write("invalid callback given.");
		}
		
		//make the call to the client
		return arel.ClientInterface.object.getIsRendered(arel.Util.toParameter({"id" : this.id, "callbackid" : callbackID}));
	};
	
	/** Create/update object properties based on the given object's properties
	 * @private */
	this.applyProperties = function(_object)
	{
		if(_object.hasOwnProperty('id'))
		{
			this.id = _object.id;
		}

		if(_object.hasOwnProperty('dynamicLightingEnabled'))
		{
			this.dynamicLightingEnabled = _object.dynamicLightingEnabled;
		}
		
		if(_object.hasOwnProperty('llaLimitsEnabled'))
		{
			this.llaLimitsEnabled = _object.llaLimitsEnabled;
		}
				
		if(_object.hasOwnProperty('title'))
		{
			this.title = urldecode(_object.title);
		}
				
		if(_object.hasOwnProperty('location'))
		{
			this.location = arel.Parser.parseLocation(_object.location);
		}
		
		if(_object.hasOwnProperty('iconPath'))
		{
			this.iconPath = _object.iconPath;
		}
		
		if(_object.hasOwnProperty('thumbnailPath'))
		{
			this.thumbnailPath = _object.thumbnailPath;
		}
			
		if(_object.hasOwnProperty('minaccuracy'))
		{
			this.minaccuracy = _object.minaccuracy;
		}
			
		if(_object.hasOwnProperty('maxdistance'))
		{
			this.maxdistance = _object.maxdistance;
		}
		
		if(_object.hasOwnProperty('mindistance'))
		{
			this.mindistance = _object.mindistance;
		}
		
		if(_object.hasOwnProperty('popup'))
		{
			this.popup = arel.Parser.parsePopUp(_object.popup, this.location);
		}
		
		if(_object.hasOwnProperty('parameters'))
		{
			this.parameters = arel.Parser.parseParameters(_object.parameters);
		}
		
		if(_object.hasOwnProperty('visibility'))
		{
			this.visibility = _object.visibility;			
		}


        if(_object.hasOwnProperty('shadermaterial'))
        {
            this.shadermaterial = _object.shadermaterial;
        }

        if(_object.hasOwnProperty('parentobject'))
        {
            this.parentobject = _object.parentobject;
        }



        //this is available for 3D Models only! (and some of those for lights as well)
		if(_object.type !== arel.Config.OBJECT_POI) 
		{
			if(_object.hasOwnProperty('billboard'))
			{
				this.billboard = _object.billboard;
			}
			
			if(_object.hasOwnProperty('onscreen'))
			{
				this.onscreen = arel.Parser.parseOnScreen(_object.onscreen);
			}
			
			if(_object.hasOwnProperty('rotation'))
			{
				this.rotation = arel.Parser.parseRotation(_object.rotation);
			}
			
			if(_object.hasOwnProperty('translation'))
			{
				this.translation = arel.Parser.parseTranslation(_object.translation);
			}
						
			if(_object.hasOwnProperty('scale'))
			{
				this.scale = arel.Parser.parseScale(_object.scale);
			}
			
			if(_object.hasOwnProperty('occlusion'))
			{
				this.occlusion = _object.occlusion;
			}
			
			if(_object.hasOwnProperty('coordinateSystemID'))
			{
				this.coordinateSystemID = _object.coordinateSystemID;
			}
			
			if(_object.hasOwnProperty('model'))
			{
				this.model = _object.model;
			}
			
			if(_object.hasOwnProperty('texture'))
			{
				this.texture = _object.texture;
			}
			
			if(_object.hasOwnProperty('movie'))
			{
				this.movie = _object.movie;
			}
			
			if(_object.hasOwnProperty('transparency'))
			{
				this.transparency = _object.transparency;
			}
			
			if(_object.hasOwnProperty('renderorderposition'))
			{
				this.renderorderposition = _object.renderorderposition;
			}
			
			if(_object.hasOwnProperty('screenanchor'))
			{
				this.screenanchor = _object.screenanchor;
			}

            if(_object.hasOwnProperty('screenanchorflags'))
            {
                this.screenanchorflags = _object.screenanchorflags;
            }
			
			if(_object.hasOwnProperty('pickable'))
			{
				this.pickable = _object.pickable;
			}

		}

		// Light-specific properties
		if(_object.type === arel.Config.OBJECT_LIGHT)
		{
			if(_object.hasOwnProperty('ambientColor'))
				this.ambientColor = arel.Parser.parseVector3d(_object.ambientColor);
			if(_object.hasOwnProperty('attenuation'))
				this.attenuation = arel.Parser.parseVector3d(_object.attenuation);
			if(_object.hasOwnProperty('diffuseColor'))
				this.diffuseColor = arel.Parser.parseVector3d(_object.diffuseColor);
			if(_object.hasOwnProperty('direction'))
				this.direction = arel.Parser.parseVector3d(_object.direction);
			if(_object.hasOwnProperty('enabled'))
				this.enabled = _object.enabled;
			if(_object.hasOwnProperty('radius'))
				this.radius = _object.radius;
			if(_object.hasOwnProperty('lightType'))
				this.lightType = _object.lightType;
		}
	};
	
	/** Get Parameters to be passed to the arel.ClientInterface 
	 * @private */
	this.toParameter = function()
	{
		var aParams = [];
		var key = undefined;
		
		if(this.TYPE)
		{
			aParams.type = this.TYPE ;
		}
			
		if(this.id)
		{
			aParams.id = this.id;
		}

		if(this.dynamicLightingEnabled !== undefined)
		{
			aParams.dynamicLightingEnabled = this.dynamicLightingEnabled;
		}
		
		if(this.llaLimitsEnabled !== undefined)
		{
			aParams.llaLimitsEnabled = this.llaLimitsEnabled;
		}
		
		if(this.title)
		{
			aParams.title = this.title;
		}
		
		if(this.location)
		{
			var lParams = this.location.toParameterObject();
			for(key in lParams)
			{
				if(typeof(lParams[key]) !== "function" && lParams[key] !== undefined) {
					aParams[key] = lParams[key];
				}
			}
		}
		
		if(this.iconPath)
		{
			aParams.iconPath = this.iconPath;
		}
			
		if(this.thumbnailPath)
		{
			aParams.thumbnailPath = this.thumbnailPath;
		}
			
		if(this.maxdistance)
		{
			aParams.maxdistance = this.maxdistance;
		}
		
		if(this.mindistance)
		{
			aParams.mindistance = this.mindistance;
		}	
			
		if(this.minaccuracy)
		{
			aParams.minaccuracy = this.minaccuracy;
		}		
			
		if(this.popup)
		{
			var ppParams = this.popup.toParameterObject();
			for(key in ppParams)
			{
				if(typeof(ppParams[key]) !== "function" && ppParams[key] !== undefined) {
					aParams[key] = ppParams[key];
				}
			}
		}
		
		if(this.parameters !== undefined)
		{
			for(var j in this.parameters)
			{
				if (typeof(this.parameters[j]) !== "function")
				{
					aParams['parameter_' + j] = this.parameters[j];
				}
			}
		}
		
		//check if visibility is empty or not
		var visibilityEmpty = true;
		for(var prop in this.visibility) {
	        if(this.visibility.hasOwnProperty(prop))
	        {
	        	visibilityEmpty = false;
	            break;
			}
	    }

		if(!visibilityEmpty)
		{
			for(var j in this.visibility)
			{
				if (typeof(this.visibility[j]) !== "function")
				{
					aParams['visibility_' + j] = this.visibility[j];
				}
			}
		}
		
		//only consider this parameters if it is a 3D object, otherwise, save the time
		if(this.TYPE !== arel.Config.OBJECT_POI)
		{
			if(this.billboard !== undefined)
			{
				aParams.billboard = this.billboard;
			}
			
			if(this.onscreen)
			{
				var osParams = this.onscreen.toParameterObject("onScreen");
				for(key in osParams)
				{
					if(typeof(osParams[key]) !== "function" && osParams[key] !== undefined) {
						aParams[key] = osParams[key];
					}
				}
			}
				
			if(this.translation && !this.translation.isNULL())
			{
				var tParams = this.translation.toParameterObject("trans");
				for(key in tParams)
				{
					if(typeof(tParams[key]) !== "function" && tParams[key] !== undefined) {
						aParams[key] = tParams[key];
					}
				}
			}
				
			if(this.rotation && !this.rotation.isNULL())
			{
				var rParams = this.rotation.toParameterObject("rot");
				for(key in rParams)
				{
					if(typeof(rParams[key]) !== "function" && rParams[key] !== undefined) {
						aParams[key] = rParams[key];
					}
				}
			}
				
			if(this.scale)
			{
				var sParams = this.scale.toParameterObject("scale");
				for(key in sParams)
				{
					if(typeof(sParams[key]) !== "function" && sParams[key] !== undefined) {
						aParams[key] = sParams[key];
					}
				}
			}
			
			if(this.occlusion !== undefined && this.occlusion)
			{
				aParams.occlusion = this.occlusion;
			}
			
			if(this.coordinateSystemID !== undefined)
			{
				aParams.coordinateSystemID = this.coordinateSystemID;
			}
			
			if(this.model)
			{
				aParams.model = this.model;
			}
			
			if(this.texture)
			{
				aParams.texture = this.texture;
			}
			
			if(this.movie)
			{
				aParams.movie = this.movie;
			}	
			
			if(this.transparency !== undefined && this.transparency > 0)
			{
				aParams.transparency = this.transparency;
			}
			
			if(this.renderorderposition !== undefined)
			{
				aParams.renderorderposition = this.renderorderposition;
			}
			
			if(this.screenanchor !== undefined)
			{
				aParams.screenanchor = this.screenanchor;
			}

            if(this.screenanchorflags !== undefined )
            {
                aParams.screenanchorflags = this.screenanchorflags;
            }
			
			if(this.pickable !== undefined && !this.pickable)
			{
				aParams.pickable = this.pickable;
			}

            if( this.shadermaterial !== undefined )
            {
                aParams.shadermaterial = this.shadermaterial;
            }

            if( this.parentobject !== undefined )
            {
               aParams.parentobject = this.parentobject;
            }
		}

		// Light-specific parameters
		if(this.TYPE == arel.Config.OBJECT_LIGHT)
		{
			if(this.ambientColor && !this.ambientColor.isNULL())
			{
				var tParams = this.ambientColor.toParameterObject("ambientcolor");
				for(key in tParams)
				{
					if(typeof(tParams[key]) !== "function" && tParams[key] !== undefined) {
						aParams[key] = tParams[key];
					}
				}
			}
			if(this.attenuation && !this.attenuation.isNULL())
			{
				var tParams = this.attenuation.toParameterObject("attenuation");
				for(key in tParams)
				{
					if(typeof(tParams[key]) !== "function" && tParams[key] !== undefined) {
						aParams[key] = tParams[key];
					}
				}
			}
			if(this.diffuseColor && !this.diffuseColor.isNULL())
			{
				var tParams = this.diffuseColor.toParameterObject("diffusecolor");
				for(key in tParams)
				{
					if(typeof(tParams[key]) !== "function" && tParams[key] !== undefined) {
						aParams[key] = tParams[key];
					}
				}
			}
			if(this.direction && !this.direction.isNULL())
			{
				var tParams = this.direction.toParameterObject("direction");
				for(key in tParams)
				{
					if(typeof(tParams[key]) !== "function" && tParams[key] !== undefined) {
						aParams[key] = tParams[key];
					}
				}
			}

			if(this.lightType !== undefined)
				aParams.lighttype = this.lightType;
			if(this.enabled !== undefined)
				aParams.enabled = this.enabled;
			if(this.radius !== undefined)
				aParams.radius = this.radius;
		}

		return arel.Util.toParameter(aParams);
	};
	
	/** calls toParameter 
	 * @private */
	this.toString = function()
	{
		return this.toParameter();
	};
};


arel.ObjectEvents =
{
    /** @private */
    CATEGORY: arel.Config.OBJECT_EVENT_CATEGORY
};/** @author metaio GmbH
 *  @class Creates the Pop up (information box) for an object 

 *  @param {arel.popUpAttribute} attributes defined attributes of the pop up
 */
arel.Popup = function(popupAttributes)
{
	/** @private */this.aButtons = [];
	/** @private */this.text = undefined;	
	
	//this.setters and this.getters
	/**
	 * Set available buttons for the popup
	 * @param {array} ButtonArray Array with arel.PopUpButtons definition 
	 */
	this.setButtons = function(_buttons) { this.aButtons = _buttons; };
	/**
	 * Get available buttons for the popup
	 * @return {array} Array with arel.PopUpButtons definition 
	 */ 
	this.getButtons = function() { return this.aButtons; };
	
	/**
	 * Set text to be displayed on the pop up
	 * @param {string} text description text 
	 */
	this.setDescription = function(_text) { this.text = _text; }; 
	/**
	 * Get text to be displayed on the pop up
	 * @return {string} description text 
	 */
	this.getDescription = function() { return this.text; };
		
	/**
	 * Add one button to the pop up
	 * @param {arel.PopUpButton} _button Button to be displayed in the pop up
	 */
	this.addButton = function(_button)
	{
		this.aButtons[this.aButtons.length] = _button;
	};
	
	/** @private */
	this.init = function()
	{
		if(popupAttributes.buttons)
		{
			for(var i in popupAttributes.buttons)
			{
				if(popupAttributes.buttons[i] instanceof arel.PopupButton)
				{
					this.addButton(popupAttributes.buttons[i]);
				}
				else if(popupAttributes.buttons[i].length === 3)
				{
					this.addButton(new arel.PopupButton(popupAttributes.buttons[i][0], popupAttributes.buttons[i][1], popupAttributes.buttons[i][2]));
				}									
			}
		}
		
		if(popupAttributes.description)
		{
			this.setDescription(popupAttributes.description);
		}	
	};
	
	this.toParameterObject = function()
	{
		var aParams = {};
				
		if(this.text)
		{
			aParams.popupDescription = this.text;
		}
			
		var aButtons = this.getButtons();	
		
		if(aButtons !== undefined && aButtons.length > 0)
		{
			for(var i in aButtons)
			{
				if(aButtons[i] instanceof arel.PopupButton)
				{
					aParams['popupButtonName' + i] = aButtons[i].name;
					aParams['popupButtonId' + i] = aButtons[i].id;
					aParams['popupButtonValue' + i] = aButtons[i].value;						
				}	
			}
		}
		
		return aParams;
	}; 
		
	this.init();
};/** @author metaio GmbH
 *  @class Creates a Popup Button
 *
 *  @param {string} _name name of the button to be displayed
 *  @param {string} _id Button id
 *  @param {string} _value path to the media file or url
 */
arel.PopupButton = function (_name, _id, _value)
{
	/** @private */this.name = undefined;
	/** @private */this.id = undefined;
	/** @private */this.value = undefined;
	
	/** @private */
	this.init = function()
	{
		this.name = _name;
		
		this.id = _id;
		
		this.value = _value;
	};
		
	this.init();
};/**
 *	
 *  @author metaio GmbH
 * 
 *  @class Define the attributes of the popup
 *	
 */ 
arel.PopupAttributes =
{
	/**
	 * array of {@link arel.PopUpButton}s	
	 * @type Array
	 */
	buttons : undefined,
	
	/**
	 * text to be displayed on the pop up
	 * @type String
	 */
	description : undefined
	
};/* users need to be able to instantiate arel.scene without clearing the ObjectCache */

/** @author metaio GmbH
 *  @constructor Initates a new Scene
 *  @class The arel scene holds the information about the scenes Objects and options.
 *  If you want to get the Object information from you scene, add, remove or edit any Objects, it will be done via the instance of this class.
 *  Also, for switching the tracking or switching the scene, this is your starting Point.
 */ 
	  
arel.Scene =
{	
	/** @private */
	CATEGORY: arel.Config.SCENE_CATEGORY,
	
	/** @private */
	//options: arel.SceneOptions,

    /** @private */
    methodImplementations : {},

    /** @private */
    applyMethodImplementations: function( objectID )
    {
        var object = this.getObject(objectID);
        if( object != false )
        {
            var objectMethods = this.methodImplementations[objectID];
            for (var methodName in objectMethods )
            {
                object[methodName] = objectMethods [methodName];
            };
        }
    },

    /**
	 * Get the tracking values of the currently tracked coordinateSystem.
	 * @param {int} cameraTypeOptional	Camera type for which to return the hand-eye
	 *									calibration - one of {arel.CameraType.RENDERING},
	 *									{arel.CameraType.RENDERING_LEFT} or
	 *									{arel.CameraType.RENDERING_RIGHT} (defaults to
	 *									RENDERING) -> optional
	 * @param {function} callback		A callback function receiving the translation as
	 *									{arel.Vector3D} and rotation as {arel.Rotation}
	 * @param {Object} caller			"this" object when triggering the callback -> optional
	 * @requires API level 16
	 */
	getHandEyeCalibration: function(cameraTypeOptional, callback, caller)
	{
		if (typeof cameraTypeOptional === "function")
		{
			// "cameraTypeOptional" parameter not given
			caller = callback;
			callback = cameraTypeOptional;
			cameraTypeOptional = undefined;
		}

		var callbackID = arel.CallbackInterface.addCallbackFunction(callback, caller);
		if (!callbackID)
		{
			return arel.Error.write("Invalid callback given");
		}

		return arel.ClientInterface.scene.getHandEyeCalibration(cameraTypeOptional, callbackID);
	},

	/**
	 * Returns all objects of the scene
	 * @return {Array} arObjectArray Array with arel.Object children
	 */
	getObjects: function()
	{
		return arel.ObjectCache.getObjects();
	},
	
	/**
	 * Returns all objects of the scene belonging to a coordinate system
	 * @param {Number} coordinateSystemID ID of the Coordinatesystem to retrieve objects for
	 * @return {Array} arObjectArray Array with arel.Object children
	 */
	getObjectsFromCoordinateSystem: function(coordinateSystemID)
	{
		var allObjects = arel.ObjectCache.getObjects();
		var aObjectsOfCoordinateSystem = [];
		
		for(var i in allObjects)
		{
			if(typeof(allObjects[i] !== "function"))
			{
                if( allObjects[i].hasOwnProperty("getCoordinateSystemID") )
                {
				    if(allObjects[i].getCoordinateSystemID() == coordinateSystemID)
                    {
					    aObjectsOfCoordinateSystem.push(allObjects[i]);
                    }
                }
			}
		}
		
		return aObjectsOfCoordinateSystem;
	},
	
	/**
	 * Get the ID of this scene	 * 
	 */
	getID: function()
	{
		return arel.SceneCache.id;		
	},
	
	/**
	 * Get the API Level that is supported by the application running this script
	 * @requires API level 8
	 */
	getAppAPILevel: function()
	{
		return arel.SceneCache.appAPILevel;		
	},
	
	/**
	 * Get the ID of this scene	for 
	 * @private
	 */
	getIDFromClient: function()
	{
		//register the callback
		var callbackID = arel.CallbackInterface.addCallbackFunction(_callback, caller);
		
		if(!callbackID) {
			return arel.Error.write("invalid callback given.");
		}
		
		//make the call to the client
		return arel.ClientInterface.scene.getID(callbackID);
	},

	/**
	 * Sets padding to add between bottom of viewport and bottom row of annotations
	 *
	 * This is helpful if you want to add user interface elements to the bottom of the viewport.
	 *
	 * @param value Absolute padding in pixels
	 * @requires API level 16
	 */
	setAnnotationsBottomPadding: function(value)
	{
		return arel.ClientInterface.scene.setAnnotationsBottomPadding(value);
	},

	/**
	 * Substitute all existing Objects in the scene with the ones being passed.
	 * @param {Array} _aObjects with arel.Object children
	 */
	setObjects: function(_aObjects)
	{
		//remove all POIs first
		this.removeObjects();
		
		//add the Object internally
		arel.ObjectCache.setObjects(_aObjects);
		
		//get the objects again to avoid double IDs send to the client
		_aObjects = arel.ObjectCache.getObjects();
		
		//TODO: send interface to client (one by one or all together?)
		//currently, I try one by one -> cannot return this information for testing, so we gotta trust it works
		for(var i in _aObjects)
		{
			if(_aObjects[i] instanceof arel.Object)
			{
				arel.ClientInterface.scene.addObject(_aObjects[i]);
			}
		}				
	},
	
	/**
	 * Remove all Objects from this scene
	 */
	removeObjects: function()
	{
		arel.ObjectCache.removeObjects();
		
		//remove all objects from the client
		return arel.ClientInterface.scene.removeObjects();		
	},
	
	/**
	 * Add a single Object to the scene and leave the other ones untouched (unless the POI has the same ID, than one is being updated)
	 * @param {arel.Object} _object an Object
	 */
	addObject: function(_object)
	{
		//add the Object internally
		if(arel.ObjectCache.addObject(_object))
		{
			//add the Object to the renderer
			return arel.ClientInterface.scene.addObject(_object);
		}
		else
		{
			//something is wrong -> most likely missing ID
			return arel.Error.write("Object could not be added to the scene.");
		}					
	},
	
	/**
	 * Get a Single Object from the Scene
	 * @param {String} _objectID Object ID of the Object being retrieved
	 * @return {arel.Object} arObject returns the Object with the ID or false if the object does not exist
	 */
	getObject: function(_objectID)
	{
		return arel.ObjectCache.getObject(_objectID);
	},
	
	/**
	 * Remove a single Object from the scene
	 * @param {String|arel.Object} _objectOrId Object ID or Object to be removed
	 */
	removeObject: function(_objectOrId)
	{
		var id = undefined;
		
		if(_objectOrId instanceof arel.Object)
		{
			id = _objectOrId.getID();
		}
		else
		{
			id = _objectOrId;
		}		
		
		if(id !== undefined)
		{
			//remove the Object internally
			arel.ObjectCache.removeObject(id);
			
			//remove the Object at the renderer
			return arel.ClientInterface.scene.removeObject(id);
		}
		else
		{	
			return false;
		}
								
	},
	/**
	 * Returns the number of Objects currently existing in the scene
	 * @return {int} numberOfObjects Number of Objects
	 */	
	getNumberOfObjects: function()
	{
		return arel.Util.numberOfArelObjects(arel.ObjectCache.getObjects());
	},
	
	/**
	 * Switches the Scene
	 * @param {int} _sceneID ID of the Scene to switch to
	 * @param {Object} aParams Parameter to be given to the switch (e.g. {filer_poissearch: "hallo", someothervalue: "1"})
	 */
	switchChannel: function(_sceneID, aParams)
	{
		var params = "";
		if(aParams !== undefined)
		{
			params = arel.Util.toParameter(aParams, true);
		}
					
		return arel.ClientInterface.scene.switchChannel(_sceneID, params);
	},

	/**
	 * Sets the global ambient color
	 *
	 * Defaults to black.
	 *
	 * @param {arel.Vector3D} _ambientColor Global ambient illumination value added to all lighting
	 *                                      calculations (RGB color in range [0;1])
	 */
	setAmbientLight: function(_ambientColor)
	{
		if(!(_ambientColor instanceof arel.Vector3D))
		{
			return arel.Error.write("_ambientColor must be of type arel.Vector3D");
		}

		return arel.ClientInterface.scene.setAmbientLight(_ambientColor);
	},

	/**
	 * Changes the tracking of a Scene
	 * @param {String} _tracking Can be a path to a trackingXML or arel.Tracking.GPS (for LB Scenes), arel.Tracking.TRACKING_LLA (for LLA Markers), arel.Tracking.BARCODE_QR (for Barcode/QR Code)
     * @param {boolean} _readFromFile if set to false, the _tracking parameter will be interpreted as a tracking-configuration that is set directly
	 */
	setTrackingConfiguration: function(_tracking, _readFromFile)
	{
		//can be a path or GPS, LLA, BarQR
		//check it
		if(_tracking !== arel.Tracking.MARKERLESS_3D && _tracking !== arel.Tracking.MARKERLESS_2D && _tracking !== arel.Tracking.MARKER && _tracking !== arel.Tracking.STATE_TRACKING && _tracking !== arel.Tracking.STATE_NOTTRACKING)
		{
			return arel.ClientInterface.scene.setTrackingConfiguration(_tracking, _readFromFile);
		}
		
		//invalid tracking type given	
		return arel.Error.write("invalid tracking type given.");
	},
	
	/**
	 * Set the near and far clipping planes of the renderer.
	 *
	 * The clipping plane limits must be greater than 0 and far clipping plane
	 * limit must be greater than near clipping plane limit (unit=millimeter).
     *
	 * @requires API level 14
	 */
	setClippingPlaneLimits : function(_near,_far)
	{
		//debug stream
		arel.Debug.logStream("Set clipping plane limits to: " + _near + " / " + _far);
		var request = arel.ClientInterface.protocol + "scene/setClippingPlaneLimits/?near=" + _near + "&far=" + _far;
		return arel.ClientInterface.out(request);
	},
	
	/** 
	 * Set the rendering limits for geometries with LLA coordinates.
	 *
	 * The near limit will ensure that all geometries closer than this limit are pushed back to the near limit.
	 * The far limit will ensure that all geometries farther away than this limit are pulled forward to the far limit.
	 * Set both limits to 0 to disable this feature (unit=meter).
	 *
	 * This is especially helpful for billboards.
     * @requires API level 14
	 */
	setLLAObjectRenderingLimits : function(_near,_far)
	{
		//debug stream
		arel.Debug.logStream("Set LLAObjectRenderingLimits to: " + _near + " / " + _far);
		var request = arel.ClientInterface.protocol + "scene/setLLAObjectRenderingLimits/?near=" + _near + "&far=" + _far;
		return arel.ClientInterface.out(request);
	},

    /**
     * Load a shaderMaterials file into the SDK
     * This enables 3D objects to use custom shaders
     * @param url URL to the shader materials XML file
     * @param optionalCallback	Optional callback function that is called when shader materials are
     *							successfully loaded or failed to load. It receives a single boolean
     *							parameter that defines whether loading succeeded.
     * @requires API Level 13 (or 16 for the callback parameters)
     */
    loadShaderMaterials: function(url, optionalCallback, caller)
	{
		var callbackID = undefined;

		if (optionalCallback !== undefined)
		{
			callbackID = arel.CallbackInterface.addCallbackFunction(optionalCallback, caller);
			
			if (!callbackID)
			{
				return arel.Error.write("Invalid callback given");
			}
    	}

        return arel.ClientInterface.scene.loadShaderMaterials(url, callbackID);
    },


    /**
     * Load an environment map
     * This enables 3D objects to use reflection maps to improve rendering quality
     * @param _url URL to the environment map file
     * @requires API Level 13
     */
    loadEnvironmentMap: function(_url)
    {
        return arel.ClientInterface.scene.loadEnvironmentMap(_url);
    },


    /**
	 * Starts the camera
	 *
	 * @param {int/arel.Camera} cameraIndexOrCamera Either an {arel.Camera} object or the index of
	 *                          the camera that should be started. 0 for the default or first
	 *                          camera (back facing camera on mobile devices), 1 for second or front
	 *                          camera, etc. If you pass an {arel.Camera} object, only the second
	 *                          and third argument (callback/caller, both optional) are considered.
	 * @param {int} widthOrCallback The desired width of the camera frame (default=320) -> optional
	 * @param {int} heightOrCaller The desired height of the camera frame (default=240) -> optional
	 * @param {int} downsample Only used on Android. Downsampling factor for the tracking image
	 *              (default=1), e.g. 2 or 3. -> optional
	 * @param {Boolean} enableYUVpipeline Whether to capture camera frames in YUV color space (if
	 *                  that is faster) -> optional
     *
     * @requires API level 11 (or level 15 for the signature with {arel.Camera} and callback/caller
     *           parameter)
	 */
	startCamera: function(cameraIndexOrCamera, widthOrCallback, heightOrCaller, downsample, enableYUVpipeline)
	{
		if (cameraIndexOrCamera instanceof arel.Camera)
		{
			var callbackID = null;

			if (widthOrCallback)
			{
				// Register the callback
				callbackID = arel.CallbackInterface.addCallbackFunction(function(param) {
					// "param" is as received from native side and contains [0]=bool result of
					// startCamera call, [1]=JSON representation of actual Camera parameters.
					// Make sure we pass on the caller (in this scope it's "this"!).
					widthOrCallback.call(this, param[0], arel.Camera.fromJSONObject(param[1]));

				}, heightOrCaller);

				if(!callbackID)
				{
					return arel.Error.write("Invalid callback given");
				}
			}

    		return arel.ClientInterface.scene.startCamera(cameraIndexOrCamera, callbackID);
		}
		else
		{
			// Old signature
			if(typeof(cameraIndexOrCamera) === 'undefined')
				cameraIndexOrCamera = 0;
			if(typeof(widthOrCallback) === 'undefined')
				widthOrCallback = 320;
			if(typeof(heightOrCaller) === 'undefined')
				heightOrCaller = 240;
			if(typeof(downsample) === 'undefined')
				downsample = 1;
			if(typeof(enableYUVpipeline) === 'undefined')
				enableYUVpipeline = true;

			return arel.ClientInterface.scene.startCamera(cameraIndexOrCamera, widthOrCallback, heightOrCaller, downsample, enableYUVpipeline);
		}
	},

	/**
	 * Stops the camera
	 */
	stopCamera: function()
	{
		return arel.ClientInterface.scene.stopCamera();
	},
	
	/**
	 * Starts the torch
	 */
	startTorch: function()
	{
		return arel.ClientInterface.scene.startTorch();
	},
	
	/**
	 * Stops the torch
	 */
	stopTorch: function()
	{
		return arel.ClientInterface.scene.stopTorch();
	},


    /**
     * Freezes or unfreezes the tracking
     * @param _freeze true to freeze, false to unfreeze
     * @return {*}
     */
    setFreezeTracking : function(_freeze)
    {
        return arel.ClientInterface.scene.setFreezeTracking(_freeze);
    },
	
	/**
	 * Triggers a new pois/search or pois/visualsearch (if camera image is included) request on your server
	 * @param {Boolean} refresh If this parameter is set to true, all Objects currently in the Scene will be removed
	 * @param {Object} params Parameter to be passed to your server. All parameters will have to start with "filter_", otherwise they are disregarded (e.g. {"filter_search": "hotel"})
	 * @param {Boolean} includeCameraImage if true, a current camera image is sent as well, otherwise not. If the camera image is included, a pois/visualsearch call will be made
	 */
	triggerServerCall: function(refresh, params, includeCameraImage)
	{
        if(refresh)
		{
			this.removeObjects();
		}
		
		for(var key in params)
		{
			if(key.indexOf("filter_") === -1)
			{
				delete params[key];
			}
		}
		
		if(includeCameraImage === true)
		{
			params.sendScreenshot = "true";
		}
		
		return arel.ClientInterface.scene.triggerServerCall(arel.Util.toParameter(params));
	},
	
	/**
	 * Override the coordinates on the device. This is valid for LB Scenes only
	 * @param {arel.LLA} _lla the coordinates to be set (accuracy is not being considered can can be left undefined)
     * @see resetLocation for resetting the override
	 */
	setLocation: function(_lla)
	{
		//make the call to the client
		return arel.ClientInterface.scene.setLocation(arel.Util.toParameter(_lla.toParameterObject()));		
	},

    /**
     * Reset the coordinate override on the device.
     * @see setLocation
     * @requires API level 12
     */
    resetLocation: function()
    {
        var request = arel.ClientInterface.protocol + "scene/resetLocation";
        return arel.ClientInterface.out(request);
    },
	
	/**
	 * Get the current geo location of the device. This is valid for LB Scenes only
	 * @param {function} _callback a callback function receiving the value as arel.LLA
	 * @param {Object} caller the object this shall be referenced to in the callback function -> optional
	 */
	getLocation: function(_callback, caller)
	{
		//register the callback
		var callbackID = arel.CallbackInterface.addCallbackFunction(_callback, caller);
		
		if(!callbackID) {
			return arel.Error.write("invalid callback given.");
		}
		
		//make the call to the client
		return arel.ClientInterface.scene.getLocation(callbackID);		
	},
	
	/**
	 * Get the current rotation set by the compass of the device. 
	 * @param {function} _callback a callback function receiving the value as number
	 * @param {Object} caller the object this shall be referenced to in the callback function -> optional
	 */
	getCompassRotation: function(_callback, caller)
	{
		//register the callback
		var callbackID = arel.CallbackInterface.addCallbackFunction(_callback, caller);
		
		if(!callbackID) {
			return arel.Error.write("invalid callback given.");
		}
		
		//make the call to the client
		return arel.ClientInterface.scene.getCompassRotation(callbackID);
	},
	
	/**
	 * Get the tracking values of the currently tracked coordinateSystem.
	 * @param {Boolean} rotateOptional	Defines whether to rotate the tracking values according to
	 *									screen rotation -> optional
	 * @param {function} callback		A callback function receiving the value as {arel.TrackingValues}
	 * @param {Object} caller			The object this shall be referenced to in the callback
	 *									function -> optional
	 */
	getTrackingValues: function(rotateOptional, callback, caller)
	{
		if (typeof rotateOptional === "function")
		{
			// "rotate" parameter not given
			caller = callback;
			callback = rotateOptional;
			rotateOptional = false;
		}

		//register the callback
		var callbackID = arel.CallbackInterface.addCallbackFunction(callback, caller);
		
		if(!callbackID) {
			return arel.Error.write("invalid callback given.");
		}
		
		return arel.ClientInterface.scene.getTrackingValues(rotateOptional, callbackID);
	},
	
	/**
	 * Get IDs of all/many objects that were hit at a certain viewport coordinate.
	 * @param {Vector2D} coord Coordinate of the screen where for an object shall be checked.
	 *                         Coordinates are given between (0,0) upper left and (1,1) lower right
	 *                         corner.
	 * @param {Boolean} useTriangleTest If true, all triangles are tested which is more accurate but
	 *                                  slower. If set to false, bounding boxes are used instead.
	 * @param {int} maxGeometriesToReturn Maximum number of geometries to find. If you know that
	 *                                    many geometries could be positioned along the ray, but you
	 *                                    only want the frontmost N geometries, set this value to N.
	 *                                    With a value of 0, all matching objects are returned.
	 * @param {function} callback A callback function receiving the result as array. Each item in
	 *                            the array contains the keys "cosCoordinates", "objectCoordinates"
	 *                            (both Vector3D), and objectID which refers to the hit object and
	 *                            can be passed to {arel.Scene.getObject} if you want to find the
	 *                            actual object. Note that "cosCoordinates" and "objectCoordinates"
	 *                            are only available with useTriangleTest=true.
	 * @param {Object} caller the object this shall be referenced to in the callback function -> optional
	 * @requires API level 16
	 */
	getAllObjectsFromViewportCoordinates: function(coord, useTriangleTest, maxGeometriesToReturn, callback, caller)
	{
		if (coord === undefined || !(coord instanceof arel.Vector2D))
		{
			return arel.Error.write("No viewport coordinates given or viewport coordinates of wrong type");
		}

		if (coord.getX() < -0.1 || coord.getX() > 1.1 || coord.getY() < -0.1 || coord.getY() > 1.1)
		{
			arel.Debug.logStream("Viewport coordinates for getAllObjectsFromViewportCoordinates call seem invalid, must be in range [0,1)");
		}

		if (useTriangleTest === undefined)
		{
			useTriangleTest = false;
		}

		if (maxGeometriesToReturn === undefined)
		{
			maxGeometriesToReturn = 0;
		}

		// We want to pass arel.Vector3D instances instead of raw JSON response for the keys
		// "cosCoordinates"/"objectCoordinates". Note however that the "objectID" is not converted
		// to an object, developers can decide for each object ID whether they need the
		// full object.
		var wrappedCallback = function(param) {
			// Directly modify the input
			for (var i = 0; i < param.length; ++i)
			{
				var coords = param[i].cosCoordinates;
				param[i].cosCoordinates = new arel.Vector3D(coords.x, coords.y, coords.z);
				coords = param[i].objectCoordinates;
				param[i].objectCoordinates = new arel.Vector3D(coords.x, coords.y, coords.z);
			}

			return callback.call(this, param);
		}

		var callbackID = arel.CallbackInterface.addCallbackFunction(wrappedCallback, caller);

		if (!callbackID)
		{
			return arel.Error.write("Invalid callback given");
		}

		return arel.ClientInterface.scene.getAllObjectsFromViewportCoordinates(coord, useTriangleTest, maxGeometriesToReturn, callbackID);
	},

	/**
	 * Get an the ID of the object that was hit at a certain viewport coordinate.
	 * @param {Vector2D} _coord Coordinate of the screen where for an object shall be checked. Coordinates are given between (0,0) upper left and (1,1) lower right corner
	 * @param {function} _callback a callback function receiving the value as arel.Object
	 * @param {Object} caller the object this shall be referenced to in the callback function -> optional
	 * @deprecated Please use arel.Scene.getObjectFromViewportCoordinates instead
	 */
	getObjectFromScreenCoordinates: function(_coord, _callback, caller)
	{
		if (arel.SceneCache.appAPILevel !== undefined && arel.SceneCache.appAPILevel >= 16)
		{
			arel.Debug.logStream("arel.Scene.getObjectFromScreenCoordinates is deprecated, please use new name arel.Scene.getObjectFromViewportCoordinates instead");
		}

		return arel.Scene.getObjectFromViewportCoordinates.apply(this, arguments);
	},

	/**
	 * Get an the ID of the object that was hit at a certain viewport coordinate.
	 * @param {Vector2D} _coord Coordinate of the screen where for an object shall be checked. Coordinates are given between (0,0) upper left and (1,1) lower right corner
	 * @param {function} _callback a callback function receiving the value as arel.Object
	 * @param {Object} caller the object this shall be referenced to in the callback function -> optional
	 */
	getObjectFromViewportCoordinates: function(_coord, _callback, caller)
	{
		if(_coord === undefined || !(_coord instanceof arel.Vector2D)) {
			return arel.Error.write("No viewport coordinates given or viewport coordinates of wrong type");
		}
		
		var callbackID = arel.CallbackInterface.addCallbackFunction(_callback, caller);
		
		if(!callbackID) {
			return arel.Error.write("invalid callback given.");
		}
		//make the call to the client
		return arel.ClientInterface.scene.getObjectFromViewportCoordinates(arel.Util.toParameter(_coord), callbackID);
	},
	
	/**
	 * Get the 3D coordinates from 2D viewport coordinates. The 3D coordinate is taken where the ray through the screen hits the CoordinateSystem's xy plane 
	 * @param {Vector2D} _coord Coordinate of the screen where you want to calculate the intersection with the CoordinateSystem's xy plane. Coordinates are given between (0,0) upper left and (1,1) lower right corner
	 * @param {int} _coordinateSystemID Id of the CoordinateSystem to be checked
	 * @param {function} _callback a callback function receiving the value as arel.Vector3D
     * @param {Object} _caller the object this shall be referenced to in the callback function -> optional
     * @deprecated Please use arel.Scene.get3DPositionFromViewportCoordinates instead
	 */
	get3DPositionFromScreenCoordinates: function(_coord, _coordinateSystemID, _callback, _caller)
	{
		if (arel.SceneCache.appAPILevel !== undefined && arel.SceneCache.appAPILevel >= 16)
		{
			arel.Debug.logStream("arel.Scene.get3DPositionFromScreenCoordinates is deprecated, please use new name arel.Scene.get3DPositionFromViewportCoordinates instead");
		}

		return arel.Scene.get3DPositionFromViewportCoordinates.apply(this, arguments);
	},

	/**
	 * Get the 3D coordinates from 2D viewport coordinates. The 3D coordinate is taken where the ray through the screen hits the CoordinateSystem's xy plane 
	 * @param {Vector2D} _coord Coordinate of the screen where you want to calculate the intersection with the CoordinateSystem's xy plane. Coordinates are given between (0,0) upper left and (1,1) lower right corner
	 * @param {int} _coordinateSystemID Id of the CoordinateSystem to be checked
	 * @param {function} _callback a callback function receiving the value as arel.Vector3D
     * @param {Object} _caller the object this shall be referenced to in the callback function -> optional
	 */
	get3DPositionFromViewportCoordinates: function(_coord, _coordinateSystemID, _callback, _caller)
	{
		if(_coord === undefined || !(_coord instanceof arel.Vector2D)) {
			return arel.Error.write("No viewport coordinates given or viewport coordinates of wrong type");
		}
		
		var callbackID = arel.CallbackInterface.addCallbackFunction(_callback, _caller);
		
		if(!callbackID) {
			return arel.Error.write("invalid callback given.");
		}
		
		//make the call to the client
		return arel.ClientInterface.scene.get3DPositionFromViewportCoordinates(arel.Util.toParameter(_coord), _coordinateSystemID, callbackID);
	},
	
	/**
	 * Get the 2D coordinates from a 3D coordinate. 
	 * @param {Vector3D} _coord Coordinate on the screen of a 3D point based on a given coordinateSystem's ID
	 * @param {int} _coordinateSystemID Id of the CoordinateSystem to be checked
	 * @param {function} _callback a callback function receiving the value as arel.Vector2D
     * @param {Object} _caller the object this shall be referenced to in the callback function -> optional
     * @deprecated Please use arel.Scene.getViewportCoordinatesFrom3DPosition instead
	 */
	getScreenCoordinatesFrom3DPosition: function(_coord, _coordinateSystemID, _callback, _caller)
	{
		if (arel.SceneCache.appAPILevel !== undefined && arel.SceneCache.appAPILevel >= 16)
		{
			arel.Debug.logStream("arel.Scene.getScreenCoordinatesFrom3DPosition is deprecated, please use new name arel.Scene.getViewportCoordinatesFrom3DPosition instead");
		}

		return arel.Scene.getViewportCoordinatesFrom3DPosition.apply(this, arguments);
	},

	/**
	 * Get the 2D coordinates from a 3D coordinate. 
	 * @param {Vector3D} _coord Coordinate on the screen of a 3D point based on a given coordinateSystem's ID
	 * @param {int} _coordinateSystemID Id of the CoordinateSystem to be checked
	 * @param {function} _callback a callback function receiving the value as arel.Vector2D
     * @param {Object} _caller the object this shall be referenced to in the callback function -> optional
	 */
	getViewportCoordinatesFrom3DPosition: function(_coord, _coordinateSystemID, _callback, _caller)
	{
		if(_coord === undefined || !(_coord instanceof arel.Vector3D)) {
			return arel.Error.write("No 3d coordinates given or not of type arel.Vector3D");
		}
		
		var callbackID = arel.CallbackInterface.addCallbackFunction(_callback, _caller);
		
		if(!callbackID) {
			return arel.Error.write("invalid callback given.");
		}
		
		return arel.ClientInterface.scene.getViewportCoordinatesFrom3DPosition(arel.Util.toParameter(_coord), _coordinateSystemID, callbackID);
	},
	
	/**
	 * checks if the object exists in the scene (ID) and updates if necessary (objectCache and client)
	 * @param {string} objectID objectID
	 * @param {string} handler defines the to be updated element / area (e.g. setScale/getScale -> _elementHandler = Scale)
	 * @param param the parameter to update the Object in the cache with
	 * @param {string} paramstopass the parameter to update the according handler with, however correctly parameter encoded so it can be passed on to the client/renderer
	 * @private
	 */
	updateObject: function(objectID, handler, param, paramstopass)
	{
		if(objectID !== undefined)
		{
			if(arel.ObjectCache.objectExists(objectID))
			{
				var obj = this.getObject(objectID);
				
				//!!In order to avoid a never ending loop, the object needs temp a different ID. This ID may not be part of the scene!!
				obj.setID(new Date().valueOf() + "_" + arel.objectIdIterator);
				
				//get the state to reset the state
				var state = obj.getState();
				
				//iterate the arel object iterator
				arel.objectIdIterator++	;
				
				//adjust the parameter
				obj["set" + handler](param);
				
				//go back to the real id
				obj.setID(objectID);
				
				//go directly via the cache, otherwise a call to the renderer would be made
				arel.ObjectCache.addObject(obj, true);
				
				//set the state back to ready
				arel.ObjectCache.setObjectState(objectID, state);
				
				//edit the object in the renderer
				return arel.ClientInterface.object.edit(objectID, handler, paramstopass);
			}
		}
	},	
	
	/**
	 * Get a screenshot of the current Scene.
	 * @param {function} _callback a callback function receiving the value as arel.Image
	 * @param {Boolean} _includeRender if true, the openGL Rendering is included in the screenshot, false if only the camera image shall be taken
	 * @param {arel.Vector2D} _maxBBox set a bounding box for the image to fit into. So the image will be scaled in aspect ratio, so it fits the bbox
	 * @param {Object} caller the object this shall be referenced to in the callback function -> optional
	 */
	getScreenshot: function(_callback, _includeRender, _maxBBox, caller)
	{
		//register the callback
		var callbackID = arel.CallbackInterface.addCallbackFunction(_callback, caller);
		
		if(!callbackID) {
			return arel.Error.write("invalid callback given.");
		}
		
		var aParams = {};
		aParams.callbackid = callbackID;
		aParams.includeRender = _includeRender;
		aParams.bboxX = _maxBBox.getX();
		aParams.bboxY = _maxBBox.getY();
				
		//make the call to the client
		return arel.ClientInterface.scene.getScreenshot(arel.Util.toParameter(aParams));		
	},


    /**
     * Execute a sensor command
     * @param _command the command to execute
     * @param _parameter optional parameter
     * @param _callback the callback function receiving the result of the sensor command
     */
    sensorCommand: function( _command, _parameter, _callback)
    {
        //register the callback
        var callbackID = arel.CallbackInterface.addCallbackFunction(_callback);

        if(!callbackID) {
            return arel.Error.write("invalid callback given.");
        }

        var aParams = {};
        aParams.callbackid = callbackID;
        aParams.command = _command;
        aParams.parameter = _parameter;

        return arel.ClientInterface.scene.sensorCommand(arel.Util.toParameter(aParams));
    },



	/**
	 * Check if an object exists
	 * @param {string|arel.Object} _objectOrId Object ID or Object to be removed
	 * @return {Boolean} true if the object exists, false otherwise 
	 */
	objectExists: function(_objectOrId)
	{
		var objectID = _objectOrId;
		
		if(_objectOrId instanceof arel.Object)
		{
			objectID = _objectOrId.getID();	
		}
		
		return arel.ObjectCache.objectExists(objectID);
	},
	
	/**
	 * Start the instant tracking - an experience without pre-defined tracking pattern. Please make sure that between calling this method and considering the frame, a small delay might 
	 * apply due to starting possibly needed sensors. 
	 * You can enable the preview by setting the optional parameter preview=true. To start the tracking, simpliy call startInstantTracking without this paramter.
	 * @requires API level 8
	 * @param {string} _type This can be arel.Tracking.INSTANT2D, arel.Tracking.INSTANT3D, arel.Tracking.INSTANT2DG, arel.Tracking.INSTANT2DGE
	 * @param {Boolean} _preview Optional paramter, if the visualization of a preview should be enabled
	 */
	startInstantTracking: function(_type, _preview)
	{
		var params = {};
		params.value = _type;
		params.preview = _preview;
		return arel.ClientInterface.scene.startInstantTracking(arel.Util.toParameter(params));	
	},
	
	
	/**
	 * Triggers the application to take a screenshot and open the sharing screen
     * @param {string} _onlySaveToGallery Set to true if you only want to save the screenshot to the gallery (not displaying the sharing screen)
	 */
	shareScreenshot : function ( _onlySaveToGallery )
	{
        if( _onlySaveToGallery !== undefined )
        {
            return arel.ClientInterface.scene.shareScreenshot(_onlySaveToGallery);
        }

		return arel.ClientInterface.scene.shareScreenshot(false);
	},

    /** Triggers a continuous visual search request
     *
     * @requires API level 9 (11 for _returnFullTrackingConfig , 15 for _visualSearchServer)
     * @param {String} _databaseName the name of the database you want to query;
     * @param {Boolean} _returnFullTrackingConfig true, if the search should respond with a full tracking configuration.
     * @param {String} _visualSearchServer optional - in case you need to specify a custom cvs server or want to go through a proxy. ( e.g http://cvs.junaio.com/vs )
     *
     * This request will provide you with a arel.Scene callback with type ONVISUALSEARCHRESULT. The callback will deliver all matched
     * image names of your database.
     * If you have set _returnFullTrackingConfig to true, you can specify the resulting identifier as a tracking configuration.
     * e.g. arel.Scene.setTrackingConfiguration(param[0].identifier);
     *
     * If _returnFullTrackingConfig is set to false, you will just receive the resulting identifier
     */
    requestVisualSearch : function ( _databaseName, _returnFullTrackingConfig, _visualSearchServer )
    {
        var returnFullTrackingConfig = _returnFullTrackingConfig;
        if( _returnFullTrackingConfig === undefined )
        {
            returnFullTrackingConfig = true;
        }

        return arel.ClientInterface.scene.requestVisualSearch(_databaseName, returnFullTrackingConfig, _visualSearchServer);
    },

	/**
	 * Set hand-eye calibration
	 *
	 * @param {arel.Vector3D} translation	Translation component of the transform
	 * @param {arel.Rotation} rotation		Rotation component of the transform
	 * @param {int} cameraType				Camera type for which to set the hand-eye
	 *										calibration - one of {arel.CameraType.RENDERING},
	 *										{arel.CameraType.RENDERING_LEFT} or
	 *										{arel.CameraType.RENDERING_RIGHT} (defaults to
	 *										RENDERING) -> optional
	 * @requires API level 16
	 */
	setHandEyeCalibration: function(translation, rotation, cameraType)
	{
		return arel.ClientInterface.scene.setHandEyeCalibration(translation, rotation, cameraType);
	},

	/** Sets whether a sound should be played when picking an object or not
     * @param enabled if the sound should be enabled or disabled
     */
    setPickingSoundEnabled : function( enabled )
    {
        return arel.ClientInterface.scene.setPickingSoundEnabled(enabled);
    },
	
	/** Puts the scene into see through mode. This means the camera image is not rendered anymore and a solid color is drawn instead.
	 * @param {Boolean} _enabled Set the see through mode to on (true) or off (false). By default it is off.
	 * @requires API level 15
	 */
	setSeeThrough: function(_enabled)
	{
		if(typeof(_enabled) === 'undefined')
			_enabled = true;

		return arel.ClientInterface.scene.setSeeThrough(_enabled);
	},
	
	/**
	 * Sets the see through color
	 *
	 * Defaults to black.
	 *
	 * @param {arel.Vector4D} _seeThroughColor Color for the see through part. (RGBA color in range [0;1])
	 * @requires API level 15
	 */
	setSeeThroughColor: function(_seeThroughColor)
	{
		if(!(_seeThroughColor instanceof arel.Vector4D))
		{
			return arel.Error.write("_seeThroughColor must be of type arel.Vector4D");
		}
		return arel.ClientInterface.scene.setSeeThroughColor(_seeThroughColor);
	},
	
	/** Puts the scene into stereo rendering mode.
	 * @param {Boolean} stereoRendering Enable/Disable stereo rendering mode. By default it is disabled.
	 * @requires API level 15
	 */
	setStereoRendering: function(stereoRendering)
	{
		if (stereoRendering === undefined)
		{
			stereoRendering = true;
		}

		return arel.ClientInterface.scene.setStereoRendering(stereoRendering);
	},

	/**
	 * Enable or disable the advanced rendering features. If this option is
	 * enabled the advanced rendering effects are run on every device. This
	 * should not be enabled on older devices. These effects are extremely
	 * performance intensive and require an iPhone 5, similar or newer device
	 * to run at a decent speed.
	 *
	 * @param {Boolean} _enable If set to true the features are enabled, default is false
	 * @requires API level 15
	 */
	setAdvancedRenderingFeatures : function(_enabled)
	{
		if(typeof(_enabled) === 'undefined')
			_enable = true;

		return arel.ClientInterface.scene.setAdvancedRenderingFeatures(_enabled);
	},
	
	/**
	 * This is a convenience method for setAdvancedRenderingFeatures
	 * It checks if isAdvancedRenderingSupported() returns true or false
	 * and enables advanced rendering accordingly.
	 *
	 * @param {function} _callback a callback function receiving if the rendering was enabled or not
	 * @requires API level 15
	 */
	autoEnableAdvancedRenderingFeatures : function(_callback, _caller)
	{
		var callbackID = arel.CallbackInterface.addCallbackFunction(_callback, _caller);
		if(!callbackID) {
			return arel.Error.write("invalid callback given.");
		}
		return arel.ClientInterface.scene.autoEnableAdvancedRenderingFeatures(callbackID);
	},
	
	/**
	 * Check if the used device supports advanced rendering
	 * @param {function} callback	Callback function receiving whether device supports advanced rendering
	 * @param {Object} caller		"this" object when triggering the callback -> optional
	 * @requires API level 15
	 */
	isAdvancedRenderingSupported : function(callback, caller)
	{
		var callbackID = arel.CallbackInterface.addCallbackFunction(callback, caller);
		if(!callbackID)
		{
			return arel.Error.write("Invalid callback given");
		}
		return arel.ClientInterface.scene.isAdvancedRenderingSupported(callbackID);
	},
	
	/**
	 * Sets the parameters for the Depth of Field (DoF) effect
	 *
	 * @param {Number} _focalLength The focal length (default 0.1)
	 * @param {Number}  _focalDistance The folcal distance, the distance wher the object is 
	 * focused. This is in range [0,1] where 1 is at the far clipping plane
	 * and 0 at the near clipping plane. Keep in mind that DoF currently is only
	 * rendered in between the focal plane and the near clipping plane. (default 0.6)
	 * @param {Number} _aperture Size of the aperture (default 0.2)
	 * @requires API level 15
	 */
	setDepthOfFieldParameters : function(_focalLength,  _focalDistance,  _aperture)
	{
		if(typeof(_focalLength) === 'undefined')
			_focalLength = 0.1;
		if(typeof(_focalDistance) === 'undefined')
			_focalDistance = 0.6;
		if(typeof(_aperture) === 'undefined')
			_aperture = 0.2;
		

		return arel.ClientInterface.scene.setDepthOfFieldParameters(_focalLength,  _focalDistance,  _aperture);
	},
	
	/**
	 * Sets the intensity of the motion blur applied to the rendering.
	 * Default value is 1.0. The length of the motion vector is multiplied
	 * by this value.
	 * @param {Number} _intensity The intensity of the motion blur
	 * @requires API level 15
	 */
	setMotionBlurIntensity : function(_intensity)
	{
		if(typeof(_intensity) === 'undefined')
			_intensity = true;

		return arel.ClientInterface.scene.setMotionBlurIntensity(_intensity);
	}
};

/**
 *
 * @class  Interface for manipulating the GestureHandler object
 */
arel.GestureHandler =
{
    /** @private */
    CATEGORY: arel.Config.GESTUREHANDLER_CATEGORY,

		/**
		 * Add a Single Object to the Gesture Handler
		 * @param {String} _objectID Object ID of the Object to be added
         * @param {int} _group id of the group
		 */
		addObject: function(_objectID, _group)
		{
			return arel.ClientInterface.scene.gestureHandlerAddObject(_objectID, _group);
		},
		
		/**
		 * Remove a Single Object from the Gesture Handler
		 * @param {String} _objectID Object ID of the Object to be removed
		 */
		removeObject: function(_objectID)
		{
			return arel.ClientInterface.scene.gestureHandlerRemoveObject(_objectID);
		},
		
		/**
		 * Remove all objects from the Gesture Handler
		 */
		removeObjects: function()
		{
			return arel.ClientInterface.scene.gestureHandlerRemoveAllObjects();
		},
		
		/** 
		 * Returns the currently setup gestures from Gesture Handler
		 * @param {function} _callback a callback function receiving the value as arel.Constant.GESTURE_DRAG, etc.
		 * @param {Object} caller the object this shall be referenced to in the callback function -> optional		 * 
		 */
		getGestures: function(_callback, caller)
		{
			//register the callback
			var callbackID = arel.CallbackInterface.addCallbackFunction(_callback, caller);
			
			if(!callbackID) {
				return arel.Error.write("invalid callback given.");
			}
			
			//make the call to the client
			return arel.ClientInterface.scene.gestureHandlerGetGestures(callbackID);
		},
		
		/** 
		 * Enable/Disable certain gestures (defined by a bitmask)
		 * @param {String} gesture one of the following gestures arel.Constants.GESTURE_DRAG, arel.Constants.GESTURE_PINCH, arel.Constants.GESTURE_ROTATE, arel.Constants.GESTURE_PINCHROTATE, etc
		 */
		enableGestures: function(_gesture)
		{
			return arel.ClientInterface.scene.gestureHandlerEnableGestures(_gesture);
		}
};
		//arel.include("js/SceneOptions.js");
		//arel.include("js/CoordinateSystem.js");
/**
 *	
 *  @author metaio GmbH
 * 
 *  @class "Static Class" to register Events with junaio
 *	
 */ 
arel.Events = 
{
	/**@private*/
	DELIMITER: "::",
	
	/**@private*/
	REGEX_MEDIA_REMOVE_SPECIAL_CHARACTERS: /[^a-zA-Z0-9_]+/g,
	
	//event types
	/**
	 * Object keeping scene event identifier
	 * @class Defines possible Scene Events
	 */
	Scene : 
	{
		/** Scene onload event type.<br />
		 *  Event Callback Parameter: {id: ChannelID}
		 *
		 *  @constant
		 */
		ONLOAD : "onload",
	
		/** Scene onready event type <br />
		 *  Event Callback Parameter: {id: ChannelID}, {apilevel: the API level of the client}
		 * 
		 * @constant
		 */
		ONREADY : "onready",
	
		/** if any change in tracking, for Barcode, QR Code, or any of the tracking techniques occurs,
		 * this event will be triggered. <br />
		 * Event Callback Parameter: Array with arel.TrackingValues
		 *
		 * @constant
		 */
		ONTRACKING : "ontracking",
		
		/** if the user moves a certain distance, the event is triggered to provide the update. Location Based Channels only.
		 * Event Callback Parameter: Array with arel.LLA
		 *
		 * @constant
		 */
		ONLOCATIONUPDATE : "onlocationupdate",		
			
			
		/** If the user requested a continuous visual search this event will be triggered <br />
         * <br />
		 * Event Callback Parameter: array of VisualSearchResults or empty array if not successful
         *
		 * If there are any errors during the communication, you will receive it through the debug output.
         * @example
         * function getCVSResult(type,resultArray)
         * {
         *      // scene callback function
         *      if(type == arel.Events.Scene.ONVISUALSEARCHRESULT )
         *      {
         *         if(resultArray.length > 0)
         *         {
         *            // the visual search has provided us with results
         *            // resultArray[0] will contain the identifier that has been found.
         *            // based on this parameter, you can decide what to do
         *            if( resultArray[0] === "myImage" )
         *            {
         *                // e.g. Add a specific new arel object
         *
         *            }
         *            else
         *            {
         *                // e.g. Open a website that resides in a specific folder
         *                arel.Media.openWebsite("http://yourserver/" + resultArray[0]);
         *            }
         *
         *           // if we want to track the current pattern, we can just call setTrackingConfiguration with the identifier that was returned
         *           arel.Scene.setTrackingConfiguration(resultArray[0]);
         *         }
         *      }
         * }
		 * @constant
         *
         * @see arel.Scene.requestVisualSearch()
		 */
		ONVISUALSEARCHRESULT : "onvisualsearchresult"
	},
	
	/**
	 * Object keeping Object event identifier
	 * @class Defines possible Object Events
	 */
	Object :
	{
		/** arObject on click event type <br />
		 * 
		 * Event Callback Parameter: Emtpy
		 *
		 * @constant
		 */
	 	ONTOUCHSTARTED : "ontouchstart",
		/** arObject on release event type 
		 * <br />
		 * 
		 * Event Callback Parameter: Emtpy
		 *
		 * @constant
		 */
		ONTOUCHENDED : "ontouchend",
		
		/** arObject on load event type 
		 * <br />
		 * 
		 * Event Callback Parameter: AR Object settings
		 *
		 * @constant
		 */
		ONLOAD: "onload",
		
		/** arObject on ready loading event type
		 * <br />
		 * 
		 * Event Callback Parameter: Emtpy
		 *
		 * @constant
		 */
		ONREADY: "onready",
		
		/** arObject on animation end event type 
		 * 
		 * 
		 * Event Callback Parameter: {"animationname": NAME_OF_THE_ANIMATON}
		 *
		 * @constant*/
		ONANIMATIONENDED: "onanimationend",
		
		/** arObject on movie end event type (only for model3D with movie a.k.a. movie texture) 
		 * 
		 * 
		 * Event Callback Parameter: Empty
		 *
		 * @constant*/
		ONMOVIEENDED: "onmovieend",

        /** arObject on translated type
         *
         *
         * Event Callback Parameter: {"translation": the new translation of the object}
         *
         * @constant*/
        ONTRANSLATED : "ontranslated",


        /** arObject on scaled type
         *
         *
         * Event Callback Parameter: {"scale": the new scale of the object}
         *
         * @constant*/
        ONSCALED : "onscaled",


        /** arObject on rotated type
         *
         *
         * Event Callback Parameter: {"rotation": the new rotation of the object}
         *
         * @constant*/
        ONROTATED : "onrotated",

        /**
         * Object became visible
         *
         * Note that a geometry's bounding box may be used to check visibility, so "visible" means that
         * the object will be rendered and may or may not occupy pixels on the screen, depending on its
         * shape, position and transparency.
         *
         * @constant
         * @requires API level 13
         */
        ONVISIBLE: "ONVISIBLE",

        /**
         * Object became invisible
         *
         * @constant
         * @requires API level 13
         */
        ONINVISIBLE: "ONINVISIBLE"
	},
	
	/**
	 * Object keeping Media event identifier
	 * @class Defines possible Media Events
	 */
	Media:
	{
		/** media on close event type
		 * @constant
		 * @deprecated Use arel.Media.Scene Callback instead ( WEBSITE_CLOSED, VIDEO_CLOSED )
		 */	
		ONCLOSED : "onclose",
			
		
		/** Event when sound playback is complete
		 * @constant
		 * @deprecated Use arel.Media.Scene Callback instead ( SOUND_COMPLETE )
		 */		
		ONSOUNDPLAYBACKCOMPLETE: "SOUND_COMPLETE",
			
		/** Event when a website is closed
		 * @constant
		 */
		WEBSITE_CLOSED : "WEBSITE_CLOSED",
		
		/** Event when a fullscreen video is closed
		 * @constant
		 */
		VIDEO_CLOSED: "VIDEO_CLOSED",
		
		
		/** Event when sound playback is complete
		 * @constant
		 */
		SOUND_COMPLETE: "SOUND_COMPLETE",


        /** Event when creating a calendar event is done
         * @constant
         * @requires API level 13
         */
        CALENDAREVENT_DONE: "CALENDAREVENT_DONE"

	},

    /**
     * Object keeping GestureHandler event identifiers
     * @class Defines possible Gesture Handler Events
      */
    GestureHandler:
    {
        /** Event when translating an object has started
         * @constant
         */
        TRANSLATING_START : "translating_start",

        /** Event when translating of an object has ended
         * @constant
         */
        TRANSLATING_END : "translating_end",

         /** Event when scaling an object has started
         * @constant
         */
        SCALING_START : "scaling_start",

        /** Event when scaling an object has ended
         * @constant
         */
        SCALING_END : "scaling_end",


         /** Event when rotating an object has started
         * @constant
         */
         ROTATING_START : "rotating_start",

        /** Event when rotating an object has ended
         * @constant
         */
         ROTATING_END : "rotating_end"
    },


	//default scene events to get the scene options onload
	/** @private */
	sceneEvents :	{"scene_onload" : function(){ return arel.Scene.setOptions();}},
	
	/** @private */
	objectEvents:	{},
	/** @private */
	mediaEvents:	{},
	/** @private */
	gestureHandlerEvents:	{},

	/**
	 * Adds a listener to an ARObject, Scene or Media Element.<br /><br />
	 * The callback method receives different parameter based on the element type:<br />
	 * <i>Object: </i> function(arel.Object, eventType, parameter)<br />
	 * <i>Scene: </i> function(eventType, parameter)<br />
	 * <i>Media: </i> function(eventType, mediaURL)
	 * @param {arel.Object|arel.Scene|arel.Media|String} element arObject, Scene, Media or the string to the media file the event should be listening to
	 * @param {function} callback function to be called once the event was triggered
	 * @param {Object} caller the object this shall be referenced to in the callback function -> optional
	 * @return {String} event id
	 */
	setListener : function(element, callback, caller)
	{
		//define an ID
		//unless it is a media file
		var id = undefined;
		if(typeof(element) !== "string")
		{
			id = element.CATEGORY;
		}
		else if(this.getMediaType(element))
		{
			id = this.getMediaType(element);
		}
		
		//"overriding" the method
		//object event
		if(element instanceof arel.Object)
		{
			//debug stream
			arel.Debug.logStream("Setting object listener");
		
			//check if the element has an ID set
			if(element.getID() === undefined)
			{
				return arel.Error.write("Object ID unknown.");
			}
			
			id += this.DELIMITER + element.getID();
			
			//check whether the callback really is a function
			if(typeof(callback) !== "function")
			{
				return arel.Error.write("callback must be a function, but is " + typeof(callback));
			}
			
			//add the event
			this.objectEvents[id] = [callback, caller];						
		}
		//scene event
        else if(element.CATEGORY === arel.Config.SCENE_CATEGORY)
        {
            //debug stream
            arel.Debug.logStream("Setting scene listener");

            //add the event
            //check whether the callback really is a function
            if(typeof(callback) !== "function")
            {
                return arel.Error.write("callback must be a function, but is " + typeof(callback));
            }

            //add the event
            this.sceneEvents[id] = [callback, caller];
        }
        //object events
        else if(element.CATEGORY === arel.Config.OBJECT_EVENT_CATEGORY)
        {
            //debug stream
            arel.Debug.logStream("Setting global object listener");

            //add the event
            //check whether the callback really is a function
            if(typeof(callback) !== "function")
            {
                return arel.Error.write("callback must be a function, but is " + typeof(callback));
            }

            //add the event
            this.objectEvents[id] = [callback, caller];
        }
        //gesturehandler event
        else if(element.CATEGORY === arel.Config.GESTUREHANDLER_CATEGORY)
        {
            //debug stream
            arel.Debug.logStream("Setting gesture handler listener");

            //add the event
            //check whether the callback really is a function
            if(typeof(callback) !== "function")
            {
                return arel.Error.write("callback must be a function, but is " + typeof(callback));
            }

            //add the event
            this.gestureHandlerEvents[id] = [callback, caller];
        }
		//media event
		else if(element.CATEGORY === arel.Config.MEDIA_CATEGORY)
		{	
			//debug stream
			arel.Debug.logStream("Setting Media listener");
		
			//add the event
			//check whether the callback really is a function
			if(typeof(callback) !== "function")
			{
				return arel.Error.write("callback must be a function, but is " + typeof(callback));
			}
			
			//add the event
			this.mediaEvents[id] = [callback, caller];											
		}
		// old media events
		else if(this.getMediaType(element))
		{
			//debug stream
			arel.Debug.logStream("Setting media listener");
		
			//var mediaType = this.getMediaType(element);
			
			id += this.DELIMITER + element.replace(this.REGEX_MEDIA_REMOVE_SPECIAL_CHARACTERS,'');
			
			//make the id lower case
			id = id.toLowerCase();
			
			//check whether the callback really is a function
			if(typeof(callback) !== "function")
			{
				return arel.Error.write("callback must be a function, but is " + typeof(callback));				
			}
			
			//add the event
			this.mediaEvents[id] = [callback, caller];			
		}		
		else //unknown element
		{
			return arel.Error.write("Unknown Element type: " + element );
		}
				
		return id;
		
	},	
	
	/**
	 * Remove a listener from an arObject, scene or media type (url, sound, image, video) based on the event ID or element
	 * @param {arel.Object|arel.Scene|String} idORElement arObject, scene or media URL the event should be removed from or the eventID
	 */
	removeListener: function(idORElement)
	{
		//if idORElement is a string, it is an event id, otherwise it is an object
		var id = undefined;
		
		if(idORElement instanceof arel.Object) //object
		{
			id = idORElement.CATEGORY + this.DELIMITER + idORElement.getID();
		}
		else if(idORElement.CATEGORY === arel.Config.SCENE_CATEGORY) //scene
		{
			id = idORElement.CATEGORY;
		}
        else if(idORElement.CATEGORY === arel.Config.OBJECT_EVENT_CATEGORY ) // object
        {
            id = idORElement.CATEGORY;
        }
		else if(idORElement.CATEGORY === arel.Config.MEDIA_CATEGORY) //media
		{
			id = idORElement.CATEGORY;
		}
        else if(idORElement.CATEGORY === arel.Config.GESTUREHANDLER_CATEGORY) // gesture handler
        {
            id = idORElement.CATEGORY;
        }
		else if(this.getMediaType(idORElement)) //media
		{
			id = this.getMediaType(idORElement) + this.DELIMITER + idORElement.replace(this.REGEX_MEDIA_REMOVE_SPECIAL_CHARACTERS,'');
		}
		else if(typeof(idORElement) === "string") //id
		{
			id = idORElement;
		}
		else
		{
			return arel.Error.write("no valid event ID or element given");
		}	
		
		//id is element_type_{id} //id only for object
		var aIDComponents = id.split(this.DELIMITER);
		
		//get the type of event (scene, object, url, sound, image, video)
		try
		{
			var idType = aIDComponents[0];
		}
		catch(e)
		{
			return arel.Error.write("An incorrect event ID was passed.");
		}
		
		//remove listener
		if(idType !== undefined && idType === arel.Config.OBJECT_INTERFACE_CATEGORY)
		{
			//debug stream
			arel.Debug.logStream("Removing object listener");
			
			//check if this event exists
			if(this.objectEvents[id] === undefined)
			{
				//those errors are rather annoying
				//return arel.Error.write("Object Event Listener not specified.");
				return false;
			}
			//remove the event
			delete(this.objectEvents[id]);
		}	
		else if(idType !== undefined && idType === arel.Config.SCENE_CATEGORY)
		{	
			//debug stream
			arel.Debug.logStream("Removing scene listener");
			
			//check if this event exists
			if(this.sceneEvents[id] === undefined)
			{
				//those errors are rather annoying
				//return arel.Error.write("Scene Event Listener not specified.");
				return false;
			}
			
			//remove the event
			delete(this.sceneEvents[id]);						
		}
        else if(idType !== undefined && idType === arel.Config.OBJECT_EVENT_CATEGORY)
        {
            //debug stream
            arel.Debug.logStream("Removing object listener");

            //check if this event exists
            if(this.objectEvents[id] === undefined)
            {
                //those errors are rather annoying
                return false;
            }

            //remove the event
            delete(this.objectEvents[id]);
        }
		else if(idType !== undefined && this.validateMediaType(idType))
		{
			//debug stream
			arel.Debug.logStream("Removing media listener");
			
			//make the id lower case
			id = id.toLowerCase();	
		
			//check if this event exists
			if(this.mediaEvents[id] === undefined)
			{
				//those errors are rather annoying
				//return arel.Error.write("Media Event Listener not specified.");
				return false;
			}
			
			//remove the event
			delete(this.mediaEvents[id]);
		}
        else if( idType !== undefined && idType === arel.Config.GESTUREHANDLER_CATEGORY)
        {
            //debug stream
            arel.Debug.logStream("Removing gesture handler listener");

            //check if this event exists
            if(this.gestureHandlerEvents[id] === undefined)
            {
                //those errors are rather annoying
                //return arel.Error.write("Scene Event Listener not specified.");
                return false;
            }

            delete(this.gestureHandlerEvents[id])
        }
		else
		{
			return false;
		}
		
		return true;
	},

	/**
	 * Check if this is a valid media type
	 * @private
	 */
	validateMediaType : function(mediatype)
	{
		return mediatype === arel.Media.URL || mediatype === arel.Media.SOUND || mediatype === arel.Media.VIDEO;
	},
	
	/**@private */
	getMediaType : function(filePath)
	{
		if(typeof(filePath) === "string" )
		{
			var path = filePath.toLowerCase();
			
			if(path.indexOf(".mp4") !== -1 || path.indexOf(".3g2") !== -1 || path.indexOf(".3gp") !== -1) //a video
			{
				return arel.Media.VIDEO;
			}
			else if(path.indexOf(".mp3") !== -1) //a sound
			{
				return arel.Media.SOUND;
			}
			else if(path.indexOf(".png") !== -1 || path.indexOf(".jpg") !== -1 || path.indexOf(".jpeg") !== -1 || path.indexOf(".gif") !== -1) //the image
			{
				return arel.Media.WEBSITE;
			}
			else if(path.indexOf("http://") !== -1 || path.indexOf("https://") !== -1 || path.indexOf("html") !== -1 || path.indexOf("php") !== -1 || path.indexOf("htm") !== -1) //a website
			{
				return arel.Media.WEBSITE;
			}
			else
			{ 
				return false;
			}
		}
		else
		{
			return false;
		}
	},
	
	/**
	 * Makes the actual call for scene event and media event. The callbackInformation consists of [0] the callback function and [1] the caller (meaning the object, <i>this</i> shall be referring to). If the caller is undefined, we define 
	 * 	<i>this</i> in global scope
	 * @private
	 */
	call : function(callbackInformation, type, paramsORurl)
	{
		//call the eventhandler and pass a scene element
		if(callbackInformation === undefined)
		{
			return false;
		}
	
		if(callbackInformation[0] === undefined || typeof(callbackInformation[0]) !== "function")
		{
			return arel.Error.write("Event callback function undefined or not a function.");
		}
			
		if(callbackInformation[1] !== undefined)
		{			
			callbackInformation[0].call(callbackInformation[1], type, paramsORurl);
		}
		else
		{
			callbackInformation[0](type, paramsORurl);
		}
		
		return true;
	},
			
	/** 
	 * e.g.<br />
	 * arel.Events.callSceneEvent(arel.Events.Scene.ONLOAD, {id: 123456});<br />
	 * arel.Events.callSceneEvent(arel.Events.Scene.ONTRACKING, [arel.TrackingValues(...), arel.TrackingValues(...)]);
	 * arel.Events.callSceneEvent(arel.Events.Scene.ONVISUALSEARCHRESULT, ["test123.xml_enc"]);
	 * @private*/
	callSceneEvent : function(type, params)
	{
		//set the channel ID in the sceneCache
		if(type === arel.Events.Scene.ONREADY || type === arel.Events.Scene.ONLOAD)
		{
			if(params !== undefined)
			{
				if(params.id !== undefined)
				{
					arel.SceneCache.id = params.id;
				}
				
				if(params.apilevel !== undefined)
				{
					arel.SceneCache.appAPILevel = params.apilevel;
				}
			}
			
			//send the scene is ready callback on default
			if(type === arel.Events.Scene.ONREADY)
			{
				arel.sceneIsReadyForExecution();
			}
		}


        // forward onTracking events to the objects on that cos
        if(type === arel.Events.Scene.ONTRACKING )
        {
            // iterate through all tracking values
            for( var index in params)
            {
                var objects = arel.Scene.getObjectsFromCoordinateSystem(params[index].getCoordinateSystemID());
                for (var objectIndex in objects )
                {
                    if( objects[objectIndex] && objects[objectIndex].onTrackingEvent )
                    {
                        objects[objectIndex].onTrackingEvent(params[index]);
                    }
                }
            }
        }


		//debug stream
		//we plaec it here, so that this is already communicated to the client
		//+ "\nParams: " + JSON.stringify(params)
		arel.Debug.logStream("Scene event received. Type: " + type);
		
		//get the event ID
		var eventId = arel.Config.SCENE_CATEGORY;

		//get the callback information and make the call
		return arel.Events.call(this.sceneEvents[eventId], type, params);		
	},


    /**
     * e.g.<br />
     * arel.Events.callGestureEvent(arel.Events.GestureHandler.TRANSLATING_START, 10, ["apoi3", "apoi4"]);<br />
     * arel.Events.callGestureEvent(arel.Events.GestureHandler.SCALING_END, 10, ["apoi"]);<br />
     * @private*/
    callGestureEvent : function ( type, groupID, objects)
    {
        arel.Debug.logStream("Gesture event received. Type: " + type);

        // create an array of objects
        var finalObjects = new Array();
        for( var theObject in objects )
        {
            var theArelObject = arel.Scene.getObject(objects[theObject]);
            if( theArelObject )
            {
                finalObjects.push(theArelObject);
            }
        }

        var theEvent = this.gestureHandlerEvents[arel.Config.GESTUREHANDLER_CATEGORY];
        if( theEvent !== undefined )
        {
           theEvent[0].call(theEvent[1], type, groupID, finalObjects);
           return true;
        }
       return false;
    },


	/**
	 * e.g. <br />
	 * arel.Events.callGlobalMediaEvent(arel.Events.Media.WEBSITE_CLOSED , "http://www.junaio.com");<br />
	 * arel.Events.callGlobalMediaEvent(arel.Events.Media.SOUND_COMPLETE, "/resources/audio.mp3");<br />
	 * @private*/
	callGlobalMediaEvent : function(type, itemID)
	{
		arel.Debug.logStream("Media event received. Type: " + type);
		
		var eventId = arel.Config.MEDIA_CATEGORY;
		
		//get the callback information and make the call
		return arel.Events.call(this.mediaEvents[eventId], type, itemID);			
	},
	
	
	//params e.g. holds the name of the animation just ended, started or other information<br /><br />
	/** 
	 * e.g.<br />
	 * arel.Events.callObjectEvent("2", arel.Events.Object.ONTOUCHENDED);<br />
	 * arel.Events.callObjectEvent("poiTest", arel.Events.Object.ONANIMATIONENDED, {"animationend" :"frame"});<br />	 * 
	 * 
	 * @private*/
	callObjectEvent : function(id, type, params)
	{		
		//debug stream
		//"\nParams: " + JSON.stringify(params)
		arel.Debug.logStream("Object event received for object " + id + ". Type: " + type);
				
		var eventId = arel.Config.OBJECT_INTERFACE_CATEGORY + this.DELIMITER + id;
		
		//first check, if we ad this Object to the Objectcache
		if(type === arel.Events.Object.ONLOAD && params !== undefined)
		{
            if(!arel.ObjectCache.objectExists(id))
            {
    			//the object should be in the parameters
    			arel.ObjectCache.addObject(params);
            }
			else
			{
				// Update object with properties coming from SDK. This will replace "undefined"
				// properties (i.e. those which were not set explicitly) by their values from the
				// native side.
				arel.ObjectCache.getObject(id).applyProperties(params);
			}
		}
		//second, check if the object is ready -> if so, change the state to ready and check if there is anything that needs to be flushed to the client
		else if(type === arel.Events.Object.ONREADY)
		{
			if(arel.ObjectCache.objectExists(id))
			{
               // apply methods to the object if it exists
                arel.Scene.applyMethodImplementations(id);

                //set the cached Object state to ready
				arel.ObjectCache.setObjectStateToReady(id);
				
				//check if there are any cached requests for this object to be flushed
				arel.ClientInterface.queueCachedObjectRequests(id);


                var object = arel.Scene.getObject(id);
                if( object && object.onReady )
                {
                    object.onReady();
                }
			}
		}
        else if ( type === arel.Events.Object.ONTOUCHSTARTED )
        {
            var object = arel.Scene.getObject(id);
            if( object && object.onTouchStarted)
            {
                object.onTouchStarted();
            }
        }
        else if ( type === arel.Events.Object.ONTOUCHENDED )
        {
            var object = arel.Scene.getObject(id);
            if( object && object.onTouchEnded)
            {
                object.onTouchEnded();
            }
        }
        else if ( type === arel.Events.Object.ONTRANSLATED )
        {
           var object = arel.Scene.getObject(id);
           if( object )
           {
              object.setTranslation(params.translation);
               if( object.onTranslated )
               {
                   object.onTranslated(params.translation);
               }
           }
        }
        else if ( type === arel.Events.Object.ONSCALED)
        {
           var object = arel.Scene.getObject(id);
           if( object )
           {
              object.setScale(params.scale);
               if( object.onScaled )
               {
                   object.onScaled(params.scale);
               }
           }
        }
	    else if ( type === arel.Events.Object.ONROTATED )
        {
           var object = arel.Scene.getObject(id);
           if( object )
           {
              object.setRotation(params.rotation);
               if( object.onRotated )
               {
                   object.onRotated(params.rotation);
               }
           }
        }
        else if ( type === arel.Events.Object.ONANIMATIONENDED )
        {
            var object = arel.Scene.getObject(id);
            if( object && object.onAnimationEnded )
            {
               object.onAnimationEnded(params.animationname);
            }
        }
        else if ( type === arel.Events.Object.ONMOVIEENDED )
        {
            var object = arel.Scene.getObject(id);
            if( object && object.onMovieEnded )
            {
                object.onMovieEnded(params.moviename);
            }
        }
        else if ( type === arel.Events.Object.ONVISIBLE )
        {
            var object = arel.Scene.getObject(id);
            if( object && object.onVisible )
            {
                object.onVisible();
            }
        }
        else if ( type === arel.Events.Object.ONINVISIBLE )
        {
            var object = arel.Scene.getObject(id);
            if( object && object.onInvisible )
            {
                object.onInvisible();
            }
        }


        // send event to global object category
        var globalObjEventHandler = this.objectEvents[arel.Config.OBJECT_EVENT_CATEGORY];
        if( (globalObjEventHandler !== undefined ) && (globalObjEventHandler[0] !== undefined )  && typeof(globalObjEventHandler[0] === "function") )
        {
            globalObjEventHandler[0]( arel.Scene.getObject(id), type, params);
        }


        //get the callback information and make the call
		var callbackInformation = this.objectEvents[eventId];	
		
		//call the eventhandler and pass a scene element
		if(callbackInformation === undefined)
		{
			return false;
		}
	
		if(callbackInformation[0] === undefined || typeof(callbackInformation[0]) !== "function")
		{
			return arel.Error.write("Event callback function undefined or not a function.");
		}
			
		if(callbackInformation[1] !== undefined)
		{			
			callbackInformation[0].call(callbackInformation[1], arel.Scene.getObject(id), type, params);
		}
		else
		{
			callbackInformation[0](arel.Scene.getObject(id), type, params);
		}
		
		return true;		
	},
	
	
	
	/** 
	 * e.g. <br />
	 * arel.Events.callMediaEvent("http://www.junaio.com", arel.Events.Media.ONCLOSED);<br />
	 * arel.Events.callMediaEvent(""http://www.junaio.com/resources/audio.mp3", arel.Events.Media.ONSOUNDPLAYBACKCOMPLETE);<br />
	 * @private*/
	callMediaEvent : function(url, type)
	{
		//debug stream
		//"\nParams: " + JSON.stringify(params)
		arel.Debug.logStream("Media event received. Type: " + type);
		
		var eventId = this.getMediaType(url) + this.DELIMITER + url.replace(this.REGEX_MEDIA_REMOVE_SPECIAL_CHARACTERS,'');
		
		//make the id lower case
		eventId = eventId.toLowerCase();
		
		//get the callback information and make the call
		return arel.Events.call(this.mediaEvents[eventId], type, url);			
	},
	
	/**
	 * Triggers an event previously specified
	 * @param {arel.Object|arel.Scene|string|arel.Media} idORElement arObject, scene or media url (path to image, sound, video or website) the event should be removed from or the eventID
	 * @param {string} type Type of the event to be removed (only necessary if no event id is passed, but an arObject, MediaURL or Scene)
	 * @param {object} params You can set additional parameter if you like which can be checked for in the callback
	 * 
	 */
	trigger : function(idORElement, type, params)
	{
		var eventID = undefined;
		if(idORElement instanceof arel.Object && type !== undefined)
		{
			eventID = idORElement.CATEGORY  + this.DELIMITER + idORElement.getID();
		}
		else if(idORElement.CATEGORY === arel.Config.SCENE_CATEGORY && type !== undefined)
		{
			eventID = idORElement.CATEGORY;
		}
		else if(idORElement.CATEGORY === arel.Config.MEDIA_CATEGORY && type !== undefined)
		{
			eventID = idORElement.CATEGORY;
		}
		else if(this.getMediaType(idORElement) && type !== undefined) //media
		{
			eventID = this.getMediaType(idORElement) + this.DELIMITER + idORElement.replace(this.REGEX_MEDIA_REMOVE_SPECIAL_CHARACTERS,'');
		}
		else if(type !== undefined)
		{
			eventID = idORElement;
		}
		else
		{
			return arel.Error.write("no valid event ID or element given");
		}
				
				
		var aIDComponents = eventID.split(this.DELIMITER);
		
		try
		{
			var idType = aIDComponents[0];
		}
		catch(e)
		{
			return arel.Error.write("An incorrect event listener ID was passed.");
		}
		
		//remove listener
		if(idType !== undefined && idType === arel.Config.OBJECT_INTERFACE_CATEGORY)
		{
			return this.callObjectEvent(aIDComponents[1], type, params);
		}
		else if(idType !== undefined && idType === arel.Config.SCENE_CATEGORY)
		{
			return this.callSceneEvent(type, params);
		}
		else if(idType !== undefined && this.validateMediaType(idType))
		{
			return this.callMediaEvent(aIDComponents[1], type, params);
		}
		else
		{
			return arel.Error.write("IdType is unknown - " + idType);
		}		
	}	
};
/**
 * @class Camera
 * The Camera struct contains parameters for the physical camera.
 *
 *  @param {float} _tx Translation along x
 *  @param {float} _ty Translation along y
 *  @param {float} _tz Translation along z
 *  @param {float} _q1 Quaternion value 1
 *  @param {float} _q2 Quaternion value 2
 *  @param {float} _q3 Quaternion value 3
 *  @param {float} _q4 Quaternion value 4
 *  @param {float} _qual Quality value of the tracking
 *  @param {int} _coordinateSystemID ID of the coordinateSystem being tracked
 *  @param {String} _type -> tracking type -> see arel.Tracking
 *  @param {String} _state either arel.Tracking.STATE_TRACKING, arel.Tracking.STATE_EXTRAPOLATED or arel.Tracking.STATE_NOTTRACKING
 *  @param {String | arel.LLA} _content textual content in a tracking reference, used for BARCODE and QRCODE
 *  @param {String} _coordinateSystemName Name of the coordinate system
 *  @see arel.Scene.getTrackingValues
 *  @see arel.Events.Scene
 */
arel.Camera = function()
{
	/** @private */this.index = -1;
	/** @private */this.friendlyName = "";
	/** @private */this.resolution = new arel.Vector2D(320, 240);
	/** @private */this.fps = new arel.Vector2D(0, 0);
	/** @private */this.downsample = 1;
	/** @private */this.yuvPipeline = true;
	/** @private */this.facing = arel.Camera.FACE_UNDEFINED;
	/** @private */this.flip = arel.Camera.FLIP_NONE;

	/**
	 * Returns the camera index
	 * @return {int} Zero-based camera index
	 */
	this.getIndex = function() { return this.index; }
	/**
	 * Sets the camera index
	 * @param {int} _index Zero-based camera index
	 */
	this.setIndex = function(_index) { this.index = _index; }

	/**
	 * Returns the friendly name
	 * @return {String} Friendly name
	 */
	this.getFriendlyName = function() { return this.friendlyName; }
	/**
	 * Sets the friendly name
	 * @param {String} _friendlyName Friendly name
	 */
	this.setFriendlyName = function(_friendlyName) { this.friendlyName = _friendlyName; }

	/**
	 * Returns the camera image resolution
	 * @return {arel.Vector2D} Camera image resolution
	 */
	this.getResolution = function() { return this.resolution; }
	/**
	 * Sets the camera image resolution
	 * @param {arel.Vector2D} _resolution Camera image resolution
	 */
	this.setResolution = function(_resolution) { this.resolution = _resolution; }

	/**
	 * Returns the FPS range
	 * @return {arel.Vector2D} Minimum and maximum FPS
	 */
	this.getFps = function() { return this.fps; }
	/**
	 * Sets FPS range (min/max)
	 * @return {arel.Vector2D} _fps Minimum and maximum FPS
	 */
	this.setFps = function(_fps) { this.fps = _fps; }

	/**
	 * Returns the downsample factor
	 * @return {int} Downsample factor
	 */
	this.getDownsample = function() { return this.downsample; }
	/**
	 * Sets the downsample factor
	 * @param {int} _downsample Downsample factor
	 */
	this.setDownsample = function(_downsample) { this.downsample = _downsample; }

	/**
	 * Returns whether YUV pipeline is / should be used
	 * @return {Boolean} True if YUV pipeline, otherwise RGB-based pipeline
	 */
	this.isYuvPipeline = function() { return this.yuvPipeline; }
	/**
	 * Sets whether YUV pipeline is / should be used
	 * @param {Boolean} _enable True if YUV pipeline, otherwise RGB-based pipeline
	 */
	this.setYuvPipeline = function(_enable) { this.yuvPipeline = _enable; }

	/**
	 * Returns the camera facing
	 * @return {int} One of arel.Camera.FACE_UNDEFINED, arel.Camera.FACE_BACK,
	 *               arel.Camera.FACE_FRONT
	 */
	this.getFacing = function() { return this.facing; }
	/**
	 * Sets the camera facing
	 * @param {int} _facing One of arel.Camera.FACE_UNDEFINED, arel.Camera.FACE_BACK,
	 *                      arel.Camera.FACE_FRONT
	 */
	this.setFacing = function(_facing) { this.facing = _facing; }

	/**
	 * Returns the flip setting
	 * @return {int} One of arel.Camera.FLIP_NONE, arel.Camera.FLIP_HORIZONTAL,
	 *               arel.Camera.FLIP_VERTICAL, arel.Camera.FLIP_BOTH
	 */
	this.getFlip = function() { return this.flip; }
	/**
	 * Sets the camera image flip
	 * @param {int} _flip One of arel.Camera.FLIP_NONE, arel.Camera.FLIP_HORIZONTAL,
	 *                    arel.Camera.FLIP_VERTICAL, arel.Camera.FLIP_BOTH
	 */
	this.setFlip = function(_flip) { this.flip = _flip; }

	/**
	 * Get JSON representation for sending to AREL engine
	 * @private
	 * @return {String} JSON representation
	 */
	this.toJSON = function()
	{
		// Only serialize used attributes
		return JSON.stringify({
			index: this.index,
			friendlyName: this.friendlyName,
			resolution: this.resolution.toJSONObject(),
			fps: this.fps.toJSONObject(),
			downsample: this.downsample,
			yuvPipeline: this.yuvPipeline,
			facing: this.facing,
			flip: this.flip
		});
	}
};

/**
 * Parses JSON representation of camera
 *
 * @private
 */
arel.Camera.fromJSONObject = function(jsonObject)
{
	if (!jsonObject.hasOwnProperty("index"))
	{
		arel.Error.write("Invalid JSON structure");
		return null;
	}

	var obj = new arel.Camera();

	// These attributes can be applied directly
	var keys = ["index", "friendlyName", "yuvPipeline", "facing", "flip"];
	for (var i = 0; i < keys.length; ++i)
	{
		obj[keys[i]] = jsonObject[keys[i]];
	}

	obj.fps = new arel.Vector2D(jsonObject.fps.x, jsonObject.fps.y);
	obj.resolution = new arel.Vector2D(jsonObject.resolution.x, jsonObject.resolution.y);
	alert("jsonObject="+JSON.stringify(jsonObject,null,"  ")+" obj="+JSON.stringify(obj, null, "  "));
	return obj;
};

/** Facing undefined */
arel.Camera.FACE_UNDEFINED = 0;
/** Facing to the back */
arel.Camera.FACE_BACK = 1;
/** Facing to the front */
arel.Camera.FACE_FRONT = 2;
/** No flip */
arel.Camera.FLIP_NONE = 0;
/** Vertical flip */
arel.Camera.FLIP_VERTICAL = 1;
/** Horizontal flip */
arel.Camera.FLIP_HORIZONTAL = 2;
/** Both vertical and horizontal flips (180 degrees rotation) */
arel.Camera.FLIP_BOTH = 3;

/** @author metaio GmbH
 *  @class
 *  The Vector3D is used for Translation, Scale and partly Rotation Values
 *  <br /><br />
 *  x Translation along x axis in approx. mm (positive x is from the center to the right for GLUE and towards East for location-based Scenes)<br />
 *  y Translation along y axis in approx. mm (positive y is from the center to the top for GLUE and towards North for location-based Scenes)<br /> 
 * 	z Translation along z axis in approx. mm (positive z is from the center "out of the coordinateSystem image" for GLUE and towards bottom for location-based Scenes)<br /><br /> 
 * 
 *  x Scale along x axis<br /> 
 *  y Scale along y axis<br /> 
 * 	z Scale along z axis<br /><br /> 
 *
 * x Rotation around x axis (Euler angle) - unit depends on the rotation type<br /> 
 * y Rotation around y axis (Euler angle) - unit depends on the rotation type<br /> 
 * z Rotation around z axis (Euler angle) - unit depends on the rotation type<br />
 * 
 * @param {float} _x x Value
 * @param {float} _y y Value
 * @param {float} _z z Value 
 */
arel.Vector3D = function(_x, _y, _z)
{
	/** @private */ this.x = _x;
	/** @private */ this.y = _y;
	/** @private */ this.z = _z;
	
	/**
	 * @private
	 */
	this.toString = function()
	{
		return this.x + "," + this.y + "," + this.z;
	};
	
	/**
	*  Returns the length (magnitude) of the vector
	*  @return {Number} length
	*/
	this.getLength = function() 
	{
		return Math.sqrt(Math.pow(this.x,2) + Math.pow(this.y,2) + Math.pow(this.z,2));
	};
	
	/**
	*	Returns normalized vector(with the same direction and a magnitude of 1).
	*	Note that the current vector is unchanged and a new normalized vector is returned. 
	*   @return {arel.Vector3D} normalized vector
	*/
	this.normalized = function()
	{
		var length = this.getLength();
		if (length == 0) return this;
		return new arel.Vector3D(this.x / length, this.y / length, this.z / length);
	};
	
	this.setX = function(_x){this.x = _x;};
	this.setY = function(_y){this.y = _y;};
	this.setZ = function(_z){this.z = _z;};
	
	this.getX = function(){return this.x;};
	this.getY = function(){return this.y;};
	this.getZ = function(){return this.z;};
	
	/** @private */
	this.toParameterObject = function(prefix)
	{
		if(prefix === undefined) {
			prefix = "";
		}
		
		var aParams = {};
		aParams[prefix + "X"] = this.getX();
		aParams[prefix + "Y"] = this.getY();
		aParams[prefix + "Z"] = this.getZ();
		
		return aParams;
	};
	/** @private */
	this.isNULL = function()
	{
		if(!this.getX() && !this.getY() && !this.getZ())
		{
			return true;
		}
			
		if(this.getX() === 0 && this.getY() === 0 && this.getZ() === 0)
		{
			return true;
		}
	};
};

/**
 * Add vector2 to vector 1
 * @param {arel.Vector3D} vec3D1 3D Vector
 * @param {arel.Vector3D} vec3D2 3D Vector
 * @return {arel.Vector3D} 3D Vector
 */
arel.Vector3D.add = function(vec3D1, vec3D2)
{
	var vec = new arel.Vector3D();
	
	vec.setX(vec3D1.getX() + vec3D2.getX());
	vec.setY(vec3D1.getY() + vec3D2.getY());
	vec.setZ(vec3D1.getZ() + vec3D2.getZ());
	
	return vec;
};
  
 /**
 * subtract vector2 from vector 1
 * @param {arel.Vector3D} vec3D1 3D Vector
 * @param {arel.Vector3D} vec3D2 3D Vector
 * @return {arel.Vector3D} 3D Vector
 */
arel.Vector3D.subtract = function(vec3D1, vec3D2)
{
	var vec = new arel.Vector3D();
	
	vec.setX(vec3D1.getX() - vec3D2.getX());
	vec.setY(vec3D1.getY() - vec3D2.getY());
	vec.setZ(vec3D1.getZ() - vec3D2.getZ());
	
	return vec;
};

 /**
 * Compute scalar product of two vectors
 * @param {arel.Vector3D} vector1 3D Vector
 * @param {arel.Vector3D} vector2 3D Vector
 * @return {arel.Vector3D} 3D Vector
 */
arel.Vector3D.scalarProduct = function(vector1, vector2)
{
	return vector1.getX() * vector2.getX() + vector1.getY() * vector2.getY() + vector1.getZ() * vector2.getZ();
};

/**
 * Compute angle in radians between two vectors.
 * Return always smallest angle, i.e. this angle is never more than 180 degrees.
 * @param {arel.Vector3D} vector1 3D Vector
 * @param {arel.Vector3D} vector2 3D Vector
 * @return {Number} angle 
 */
arel.Vector3D.getAngleBetweenVectors = function(vector1, vector2) 
{
    var cos = arel.Vector3D.scalarProduct(vector1, vector2) / ( vector1.getLength() * vector2.getLength());
	// workaround to avoid NaN value because of imprecise calculations
	cos = cos > 1   && cos < 1.0000001 ?  1 : cos;
	cos = cos < -1  && cos > 1.0000001 ? -1 : cos;
	return Math.acos(cos);
};

/**
 * Compute cross product of two vectors
 * @param {arel.Vector3D} vector1 3D Vector
 * @param {arel.Vector3D} vector2 3D Vector
 * @return {arel.Vector3D} cross product 
 */
arel.Vector3D.crossProduct = function(vector1, vector2) 
{
	var vec = new arel.Vector3D();
	vec.setX(vector1.getY() * vector2.getZ() - vector1.getZ() * vector2.getY());
	vec.setY(vector1.getZ() * vector2.getX() - vector1.getX() * vector2.getZ());
	vec.setZ(vector1.getX() * vector2.getY() - vector1.getY() * vector2.getX());
	return vec;
};

/** @author metaio GmbH
 *  @version 2.0
 *  @class Rotation Object. Internal storage format is Quaternions. Can be initialized in with quaternions
 *
 * @param {Number} q1 Quaternion value 1 
 * @param {Number} q2 Quaternion value 2
 * @param {Number} q3 Quaternion value 3
 * @param {Number} q4 Quaternion value 4
 */
arel.Rotation = function(q1, q2, q3, q4)
{	
	/** @private */
	this.init = function(q1, q2, q3, q4)
	{
		if(q1 !== undefined) {
			this.setX(q1);
		}
		
		if(q2 !== undefined) {
			this.setY(q2);
		}
		
		if(q3 !== undefined) {
			this.setZ(q3);
		}
		
		if(q4 !== undefined) {
			this.setW(q4);
		}		
	};

	/**
	 * Returns the Rotation in Axis Angle representation
	 * @return {Object} Object with axis and angle information e.g. {axis: arel.Vetor3D, angle: angleRad}
	 */
	this.getAxisAngle = function()
	{
		//normalize w
		if(this.getW() > 1)
		{
			var magnitude = Math.sqrt(Math.pow(this.getX(), 2) + Math.pow(this.getY(), 2) + Math.pow(this.getZ(), 2) + Math.pow(this.getW(), 2));
			this.setX(this.getX() / magnitude);
			this.setY(this.getY() / magnitude);
			this.setZ(this.getZ() / magnitude);
			this.setW(this.getW() / magnitude);
		}
		
		//the angle
		var angle = 2.0 * Math.acos(this.getW());
		var scale = Math.sqrt(1 - Math.pow(this.getW(), 2));
		var vector3D = new arel.Vector3D();
		
		if(scale < 0.001)
		{
			//scale can be ignored and avoid devision by 0
			vector3D = new arel.Vector3D(this.getX(), this.getY(), this.getZ());
		}
		else
		{
			vector3D = new arel.Vector3D(this.getX() / scale, this.getY() / scale, this.getZ() / scale);
		}
		
		return {"axis": vector3D, "angle": angle};
		
	};
	
	/**
	 * Creates the Rotation from Axis Angle representation
	 * @param {arel.Vector3D} axis the axis
	 * @param {Number} angle in radians	 * 
	 */
	this.setFromAxisAngle = function(axis, angle)
	{
		var scale = Math.sin(angle / 2);
		this.init(axis.getX() * scale, axis.getY() * scale, axis.getZ() * scale, Math.cos(angle / 2));
	};
	
	/**
	 * Returns the Rotation in Euler representation
	 * @return {arel.Vector3D} Euler rotation values in degrees
	 */
	this.getEulerAngleDegrees = function()
	{
		return arel.Util.vec3DToDeg(this.getEulerAngleRadians());			
	};
	
	/**
	 * Returns the Rotation in Euler representation
	 * @return {arel.Vector3D} Euler rotation values in radians
	 */
	this.getEulerAngleRadians = function()
	{
		var sqw = Math.pow(this.getW(), 2);
		var sqx = Math.pow(this.getX(), 2);
		var sqy = Math.pow(this.getY(), 2);
		var sqz = Math.pow(this.getZ(), 2);
		
		var euler = new arel.Vector3D();
		// heading = rotation about z-axis
		euler.setZ(Math.atan2(2.0 * (this.getX() * this.getY() + this.getZ() * this.getW()) , (sqx - sqy - sqz + sqw)));
	
		// bank = rotation about x-axis
		euler.setX(Math.atan2(2.0 * (this.getY() * this.getZ() + this.getX() * this.getW()), (-sqx - sqy + sqz + sqw)));
	
		// attitude = rotation about y-axis
		euler.setY(Math.asin(arel.Util.clamp(-2.0 * (this.getX() * this.getZ() - this.getY() * this.getW()), -1.0, 1.0)));
		
		return euler;		
	};
	
	/**
	 * Creates the Rotation from Euler representation in Radians (order: x-y-z)
	 * @param {arel.Vector3D} vec3D Euler rotation values in radians
	 */
	this.setFromEulerAngleRadians = function(vec3D)
	{
		var angle;
			
		angle = vec3D.getX() * 0.5;
		var sr = Math.sin(angle);
		var cr = Math.cos(angle);
	
		angle = vec3D.getY() * 0.5;
		var sp = Math.sin(angle);
		var cp = Math.cos(angle);
	
		angle = vec3D.getZ() * 0.5;
		var sy = Math.sin(angle);
		var cy = Math.cos(angle);
	
		var cpcy = cp * cy;
		var spcy = sp * cy;
		var cpsy = cp * sy;
		var spsy = sp * sy;
	
		this.setX(sr * cpcy - cr * spsy);
		this.setY(cr * spcy + sr * cpsy);
		this.setZ(cr * cpsy - sr * spcy);
		this.setW(cr * cpcy + sr * spsy);
		
		//normalize
		if(this.getW() > 1)
		{
			var magnitude = Math.sqrt(Math.pow(this.getX(), 2) + Math.pow(this.getY(), 2) + Math.pow(this.getZ(), 2) + Math.pow(this.getW(), 2));
			this.setX(this.getX() / magnitude);
			this.setY(this.getY() / magnitude);
			this.setZ(this.getZ() / magnitude);
			this.setW(this.getW() / magnitude);
		}		
	};
	
	/**
	 * Creates the Rotation from Euler representation in degree (order: x-y-z)
	 * @param {arel.Vector3D} vec3D Euler rotation values in degree
	 */
	this.setFromEulerAngleDegrees = function(vec3D)
	{
		this.setFromEulerAngleRadians(arel.Util.vec3DToRad(vec3D));
	};
	
	/**
	 * Returns the Rotation in Matrix representation
	 * @return {Array} 3x3 rotationMatrix in row-major order
	 */
	this.getMatrix = function()
	{
		var rotationMatrix = [];
		
		var sqw = Math.pow(this.getW(), 2);
		var sqx = Math.pow(this.getX(), 2);
		var sqy = Math.pow(this.getY(), 2);
		var sqz = Math.pow(this.getZ(), 2);
		
		if(Math.abs(sqx + sqy + sqz + sqw - 1.0) > 0.001)
		{
			return arel.Error.write("Quaternion does not have the length == 1");
		}
		
		rotationMatrix[0] = 1.0 - 2.0 * sqy - 2.0 * sqz;
		rotationMatrix[1] = 2.0 * (this.getX() * this.getY() - this.getZ() * this.getW());
		rotationMatrix[2] = 2.0 * (this.getX() * this.getZ() + this.getY() * this.getW());

		rotationMatrix[3] = 2.0 * (this.getX() * this.getY() + this.getZ() * this.getW());
		rotationMatrix[4] = 1.0 - 2.0 * sqx - 2.0 * sqz;
		rotationMatrix[5] = 2.0 * (this.getY() * this.getZ() - this.getX() * this.getW());

		rotationMatrix[6] = 2.0 * (this.getX() * this.getZ() - this.getY() * this.getW());
		rotationMatrix[7] = 2.0 * (this.getX() * this.getW() + this.getY() * this.getZ());
		rotationMatrix[8] = 1.0 - 2.0 * sqx - 2.0 * sqy;	
		
		return rotationMatrix;
	};
	
	/**
	 * Creates an arel.Rotation Object from Matrix (3x3) representation (row major order)
	 * @param {Array} rotationMatrix 3x3 rotationMatrix in row-major order	  
	 */
	this.setFromMatrix = function(rotationMatrix)
	{
		var quaternion = {};
		var trace = 1.0 + rotationMatrix[0] + rotationMatrix[4] + rotationMatrix[8];
		var	qw = undefined;
		var	normalizeFactor = undefined;
	
		if (trace > 0.0001)
		{
			qw = Math.sqrt(trace) * 2.0;
			normalizeFactor = 1.0 / qw;
			quaternion.x = (rotationMatrix[7] - rotationMatrix[5]) * normalizeFactor;
			quaternion.y = (rotationMatrix[2] - rotationMatrix[6]) * normalizeFactor;
			quaternion.z = (rotationMatrix[3] - rotationMatrix[1]) * normalizeFactor;
			quaternion.w = qw * 0.25;
		}
		//If the trace of the matrix is equal to zero, then identify which major diagonal element has the greatest value
		else if ( (rotationMatrix[0] > rotationMatrix[4]) && (rotationMatrix[0] > rotationMatrix[8]) )  
		{
			qw = Math.sqrt(1.0 + rotationMatrix[0] - rotationMatrix[4] - rotationMatrix[8]) * 2.0;
			normalizeFactor = 1.0 / qw;
			quaternion.x = qw * 0.25;
			quaternion.y = (rotationMatrix[1] + rotationMatrix[3]) * normalizeFactor;
			quaternion.z = (rotationMatrix[2] + rotationMatrix[6]) * normalizeFactor;
			quaternion.w = (rotationMatrix[7] - rotationMatrix[5]) * normalizeFactor;
		}
		else if ( rotationMatrix[4] > rotationMatrix[8] )
		{
			qw = Math.sqrt(1.0 + rotationMatrix[4] - rotationMatrix[0] - rotationMatrix[8]) * 2.0;
			normalizeFactor = 1.0 / qw;
			quaternion.x = (rotationMatrix[1] + rotationMatrix[3]) * normalizeFactor;
			quaternion.y = qw * 0.25;
			quaternion.z = (rotationMatrix[5] + rotationMatrix[7]) * normalizeFactor;
			quaternion.w = (rotationMatrix[2] - rotationMatrix[6]) * normalizeFactor;
		}
		else
		{
			qw = Math.sqrt(1.0 + rotationMatrix[8] - rotationMatrix[0] - rotationMatrix[4]) * 2.0;
			normalizeFactor = 1.0 / qw;
			quaternion.x = (rotationMatrix[2] + rotationMatrix[6]) * normalizeFactor;
			quaternion.y = (rotationMatrix[5] + rotationMatrix[7]) * normalizeFactor;
			quaternion.z = qw * 0.25;
			quaternion.w = (rotationMatrix[3] - rotationMatrix[1]) * normalizeFactor;
		}
	
		//normalize quaternion
		normalizeFactor = 1.0 / Math.sqrt(quaternion.x*quaternion.x + quaternion.y*quaternion.y + quaternion.z*quaternion.z + quaternion.w*quaternion.w);
		this.setX(quaternion.x * normalizeFactor);
		this.setY(quaternion.y * normalizeFactor);
		this.setZ(quaternion.z * normalizeFactor);
		this.setW(quaternion.w * normalizeFactor);
	};
	
	/**
	* Returns an inverted copy of this rotation. This inverse corresponds to a rotation in the opposite direction
	*		rotation*rotation.inverse() == no Rotation
	*
	* @return {arel.Rotation} The inverse of the rotation
	*/
	this.inverse = function()
	{
		var rotationAsMatrix = this.getMatrix();
		var invRotationmatrix = [];
		
		invRotationmatrix[0] = rotationAsMatrix[0];
		invRotationmatrix[1] = rotationAsMatrix[3];
		invRotationmatrix[2] = rotationAsMatrix[6];
		invRotationmatrix[3] = rotationAsMatrix[1];
		invRotationmatrix[4] = rotationAsMatrix[4];
		invRotationmatrix[5] = rotationAsMatrix[7];
		invRotationmatrix[6] = rotationAsMatrix[2];
		invRotationmatrix[7] = rotationAsMatrix[5];
		invRotationmatrix[8] = rotationAsMatrix[8];	
		
		var rotation = new arel.Rotation();
		rotation.setFromMatrix(invRotationmatrix);	
		return rotation;
	};
	/**
	* Returns quaternion product of this rotation and the given parameter rotation.
	* Note it doesn't change this rotation object and instead create new one.
	* NOTE: multiplication of quaternions is not commutative. In general rotation1.multiply(rotation2) isn't equal to rotation2.multiply(rotation1)
	* @param {arel.Rotation} - rotation
	* @return {arel.Rotation} - product of two rotations
	*/
	this.multiply = function (rotation)
	{
		var result = new arel.Rotation();
		result.setW(this.getW() * rotation.getW() - this.getX() * rotation.getX() -  this.getY() * rotation.getY() - this.getZ() * rotation.getZ());
		result.setX(this.getW() * rotation.getX() + this.getX() * rotation.getW() -  this.getY() * rotation.getZ() + this.getZ() * rotation.getY());
		result.setY(this.getW() * rotation.getY() + this.getX() * rotation.getZ() +  this.getY() * rotation.getW() - this.getZ() * rotation.getX());
		result.setZ(this.getW() * rotation.getZ() - this.getX() * rotation.getY() +  this.getY() * rotation.getX() + this.getZ() * rotation.getW());
		return result;
	};
	
	/** @private */
	this.toParameterObject = function()
	{
		var aParams = {};
		aParams.q1 = this.getX();
		aParams.q2 = this.getY();
		aParams.q3 = this.getZ();
		aParams.q4 = this.getW();
		
		return aParams;
	};
	
	/**
	 * @constructor
	 */
	this.init(q1, q2, q3, q4);
};


/**
* Rotates the point with specified rotation. Returns result of the rotation.
* @param {arel.Rotation} - rotation
* @param {arel.Vector3D} - point
* @return {arel.Vector3D} - resulting point after rotation
*/
arel.Rotation.rotate = function (rotation,point)
{
	var result = new arel.Vector3D();
	var q = rotation.toParameterObject();
    var xy = q.q1 * q.q2;
	var xx = q.q1 * q.q1;
	var yy = q.q2 * q.q2;
	var zz = q.q3 * q.q3;
    var xz = q.q1 * q.q3;
    var yz = q.q2 * q.q3;
    var ww = q.q4 * q.q4;
    var wx = q.q4 * q.q1;
    var wy = q.q4 * q.q2;
    var wz = q.q4 * q.q3;
    result.setX(point.getX()*(2*(xx + ww) - 1 ) + point.getY() * 2 * (xy - wz) + point.getZ() * 2 * (wy + xz));
    result.setY(point.getX() * 2 * (xy + wz) + point.getY()* ( 2*(yy + ww) - 1 ) + point.getZ() * 2 * (yz - wx));
    result.setZ(point.getX() * 2 * (xz - wy) +  point.getY() * 2 * (wx + yz) +  point.getZ() * ( 2*(zz + ww) - 1 ));
    return result;
};


/** @author metaio GmbH
 *  @version 2.0
 *  @class The Vector4D is used representing rotations as quaternions
 *  <br /><br />
 *  see <a href="http://en.wikipedia.org/wiki/Quaternion">Quaternion Wikipedia article</a>
 *
 * @param {float} _x x Value
 * @param {float} _y y Value
 * @param {float} _z z Value
 * @param {float} _w w Value
 */
arel.Vector4D = function(_x, _y, _z, _w)
{
	/** @private */ this.x = _x;
	/** @private */ this.y = _y;
	/** @private */ this.z = _z;
	/** @private */ this.w = _w;
	
	/**
	 * @private
	 */
	this.toString = function()
	{
		return this.x + "," + this.y + "," + this.z + "," + this.w;
	};
	
	/** @private */
	this.toParameterObject = function(prefix)
	{
		if(prefix === undefined) {
			prefix = "";
		}
		
		var aParams = {};
		aParams[prefix + "X"] = this.getX();
		aParams[prefix + "Y"] = this.getY();
		aParams[prefix + "Z"] = this.getZ();
		aParams[prefix + "W"] = this.getW();
				
		return aParams;
	};
	
	/** @private */
	this.isNULL = function()
	{
		if(!this.getX() && !this.getY() && !this.getZ() && !this.getW())
		{
			return true;
		}
			
		if(this.getX() === 0 && this.getY() === 0 && this.getZ() === 0)
		{
			return true;
		}
	};

    /**
     * Set X coordinate
     * @param {float} _x x Coordinate
     */
    this.setX = function(_x){this.x = _x;};
    /**
     * Set Y coordinate
     * @param {float} _y y Coordinate
     */
    this.setY = function(_y){this.y = _y;};
    /**
     * Set Z coordinate
     * @param {float} _z z Coordinate
     */
    this.setZ = function(_z){this.z = _z;};
    /**
     * Set W coordinate
     * @param {float} _w w Coordinate
     */
    this.setW = function(_w){this.w = _w;};

    /** Get X coordinate
     *
     * @returns {float} x
     */
	this.getX = function(){return this.x;};
    /** Get Y coordinate
     *
     * @returns {float} y
     */
	this.getY = function(){return this.y;};
    /** Get Z coordinate
     *
     * @returns {float} z
     */
	this.getZ = function(){return this.z;};
    /** Get W coordinate
     *
     * @returns {float} w
     */
	this.getW = function(){return this.w;};
};

/** @author metaio GmbH
 *  @version 2.0
 *  @class An LLA Object represents a geolocation position (latitude, longitude, altitude, horizontal accuracy)
 *
 *  @param {Number} _lat Latitude Value (e.g. 48.11223)
 *  @param {Number} _lng Longitude Value (e.g. 11.45456)
 * 	@param {Number} _alt Altitude value in m
 *  @param {Number} _acc Accuracy value of the current location sensor in m
 */
arel.LLA = function(_lat, _lng, _alt, _acc)
{
	/** @private */this.accuracy = undefined;
	/** @private */
	this.init = function(_lat, _lng, _alt, _acc)
	{
		if(_lat !== undefined) {
			this.setLatitude(_lat);
		}
		
		if(_lng !== undefined) {
			this.setLongitude(_lng);
		}
		
		if(_alt !== undefined) {
			this.setAltitude(_alt);
		}
		
		if(_acc !== undefined) {
			this.accuracy = _acc;
		}		
	};
	/**
	 * Set latitude value
	 * @param {Number} _lat Latitude Value (e.g. 48.11223)
	 */
	this.setLatitude = function(_lat) {this.setX(_lat);};
	/**
	 * Get latitude value
	 * @return {Number} Latitude Value (e.g. 48.11223)
	 */
	this.getLatitude = function() {return  this.getX();};
	
	/**
	 * Set longitude value
	 * @param {Number} _lng Longitude Value (e.g. 11.45456)
	 */
	this.setLongitude = function(_lng) {this.setY(_lng);};
	/**
	 * Get longitude value
	 * @return {Number} Longitude Value (e.g. 11.45456)
	 */
	this.getLongitude = function() {return this.getY();};
	
	/**
	 * Set altitude value
	 * @param {Number} _alt Altitude value in m
	 */
	this.setAltitude = function(_alt) {this.setZ(_alt);};
	/**
	 * Get altitude value
	 * @return {Number} Altitude value in m
	 */
	this.getAltitude = function() {return this.getZ();};
	
	/**
	 * Get the accuracy value
	 * @return {Number} Accuracy value of the current location sensor in m
	 */
	this.getAccuracy = function() {return this.accuracy;};	
	
	/**
	 * Set the accuracy value
	 * @return {Number} _acc Accuracy value of the current location sensor in m
	 * @private
	 */
	this.setAccuracy = function(_acc) {this.accuracy = _acc;};	
	
	/** @private */
	this.toParameterObject = function()
	{
		var aParams = {};
		aParams.lat = this.getLatitude();
		aParams.lng = this.getLongitude();
		aParams.alt = this.getAltitude();
		
		return aParams;
	};
	
	/**
	 * @constructor
	 */
	this.init(_lat, _lng, _alt, _acc);
};

/** @author metaio GmbH
 *  @requires API level 11
 *  @class
 *  The MovieTextureStatus Object defines the current status of the playback of a movie-texture.
 *
 *  @constructor
 *  @param {arel.Constants} _status One of arel.Constants.PLAYBACK_STATUS_*
 *  @param {Number} _positionInSeconds Playback position in seconds
 *  @see arel.Object.Model3D#getMovieTexturePlaybackStatus
 */
arel.MovieTextureStatus = function(_status, _positionInSeconds)
{
	/** @private */
	this.init = function(_status, _positionInSeconds)
	{
		this.status = _status;
		this.positionInSeconds = _positionInSeconds;
	};

	/**
	 * Get playback status
	 * @return {int} One of arel.Constants.PLAYBACK_STATUS_ERROR,
	 *               arel.Constants.PLAYBACK_STATUS_PLAYING, arel.Constants.PLAYBACK_STATUS_PAUSED
	 *               or arel.Constants.PLAYBACK_STATUS_STOPPED
	 */
	this.getStatus = function() { return this.status; };

	/**
	 * Get playback position in seconds
	 * @return {Number} Position in seconds
	 */
	this.getPositionInSeconds = function() { return this.positionInSeconds; };

	/**
	 * @constructor
	 */
	this.init(_status, _positionInSeconds);
};

/** @author metaio GmbH
 *  @version 2.0
 *  @class TrackingValues Object
 * The TrackingValues object contains all necessary information for the current state of the tracking system.
 *
 *  @param {float} _tx Translation along x
 *  @param {float} _ty Translation along y
 *  @param {float} _tz Translation along z
 *  @param {float} _q1 Quaternion value 1
 *  @param {float} _q2 Quaternion value 2
 *  @param {float} _q3 Quaternion value 3
 *  @param {float} _q4 Quaternion value 4
 *  @param {float} _qual Quality value of the tracking
 *  @param {int} _coordinateSystemID ID of the coordinateSystem being tracked
 *  @param {String} _type -> tracking type -> see arel.Tracking
 *  @param {String} _state either arel.Tracking.STATE_TRACKING, arel.Tracking.STATE_EXTRAPOLATED or arel.Tracking.STATE_NOTTRACKING
 *  @param {String | arel.LLA} _content textual content in a tracking reference, used for BARCODE and QRCODE
 *  @param {String} _coordinateSystemName Name of the coordinate system
 *  @see arel.Scene.getTrackingValues
 *  @see arel.Events.Scene
 */
arel.TrackingValues = function(_tx, _ty, _tz, _q1, _q2, _q3, _q4, _qual, _coordinateSystemID, _type, _state, _content, _coordinateSystemName)
{
	this.translation = new arel.Vector3D(_tx, _ty, _tz);
	this.rotation = new arel.Rotation(_q1, _q2, _q3, _q4);
	
	/** @private */this.coordinateSystemID = _coordinateSystemID;
	
	/** @private */this.quality = _qual;
	
	/** @private */this.type = _type;
	
	/** @private */this.state = _state;
	
	/** @private */this.content = _content;
	
	/** @private */this.coordinateSystemName = _coordinateSystemName;
	
	/**
	 * Get the state of the tracking (arel.Tracking.STATE_TRACKING or arel.Tracking.STATE_NOTTRACKING)
	 * @return {String} is the tracking found (arel.Tracking.STATE_TRACKING) or lost (arel.Tracking.STATE_NOTTRACKING)
	 */
	this.getState = function() {return this.state;};	
	
	/**
	 * Set translation value
	 * @param {arel.Vector3D} _vec3D Translation Parameter
	 */
	this.setTranslation = function(_vec3D) 
	{
		this.translation = new arel.Vector3D(_vec3D.getX(), _vec3D.getY(), _vec3D.getZ());
	};
	
	/**
	 * Set rotation value
	 * @param {arel.Rotation} _rot arel.Rotation
	 */
	this.setRotation = function(_rot) 
	{
		this.rotation = _rot;		
	};
	/**
	 * Get translation value
	 * @return {arel.Vector3D} Translation parameter
	 */
	this.getTranslation = function() 
	{
		return this.translation;
	};
	
	/**
	 * Get rotation value
	 * @return {arel.Rotation} Rotation value
	 */
	this.getRotation = function() 
	{
		return this.rotation;
	};
	
	/**
	 * Get the quality value
	 * @return {float} Quality value of the tracking
	 */
	this.getQuality = function() {return this.quality;};
	
	/**
	 * Get the ID of the coordinateSystem currently tracked
	 * @return {int} ID of the coordinateSystem
	 */
	this.getCoordinateSystemID = function() {return this.coordinateSystemID;};	
	
	/**
	 * Get the Name of the coordinateSystem
	 * @return {String} Name of the coordinateSystem
	 */
	this.getCoordinateSystemName = function() {return this.coordinateSystemName;};
	
	/**
	 * Get the type of the tracking
	 * @return {String} the tracking type
	 * @see arel.Tracking
	 */
	this.getType = function() {return this.type;};
	
	/**
	 * Get the content of the detected reference. This is only valid for type arel.Tracking.BARCODE_QR or arel.Tracking.LLA_MARKER
	 * @return {String} the content of the barcode, QR code or lla marker
	 */
	this.getContent = function() {return this.content;};
	
};


/** @author metaio GmbH
 *  @requires API level 13
 *  @class
 *  VisualSearchResult is returned when the continuous visual search delivers results<br /><br />
 *
 *  @param {String} _identifier the identifier of the result
 *  @param {json} _metadata metadata in JSON notation of the result
 */
arel.VisualSearchResult = function(_identifier, _metadata)
{
    /** @private */ this.identifier = _identifier;
    /** @private */ this.metadata = _metadata;

    /** Get the string representation
     *
     * @returns {*}
     */
    this.toString = function() { return this.identifier;};

    this.getMetadata = function() { return this.metadata; };
}


/** @author metaio GmbH
 *  @version 2.0
 *  @class
 *  Vector2D is e.g. used for Screencoordinates<br /><br />
 *  x Coordinate on short side of the screen (0 being left on short side of the screen, 1 being right)<br /> 
 *  y Coordinate on long side of the screen (0 being bottom on long side of the screen, 1 being top)
 * 
 *  @param {float} _x x Coordinate
 *  @param {float} _y y Coordinate
 */
arel.Vector2D = function(_x, _y)
{
	/** @private */this.x = _x;
	/** @private */this.y = _y;
		
	/**
	 * Set X coordinate
	 * @param {float} _x x Coordinate
	 */	
	this.setX = function(_x) {this.x = _x;};
	/**
	 * Get X coordinate 
	 * @return {float} x Coordinate 
	 */	
	this.getX = function() {return this.x;};
	
	/**
	 * Set Y coordinate
	 *  @param {float} _y y Coordinate
	 */
	this.setY = function(_y) {this.y = _y;};
	/**
	 * Get Y coordinate
	 *  @return {float} y Coordinate
	 */
	this.getY = function() {return this.y;};
	
	/** @private */
	this.toJSONObject = function()
	{
		return {x: this.x, y: this.y};
	};	

	/** @private */
	this.toString = function()
	{
		return this.x + "," + this.y;
	};	
	
	/** @private */
	this.toParameterObject = function(prefix)
	{
		if(prefix === undefined) {
			prefix = "";
		}
		
		var aParams = {};
		aParams[prefix + "X"] = this.getX();
		aParams[prefix + "Y"] = this.getY();
				
		return aParams;
	};
	
	/** @private */
	this.isNULL = function()
	{
		if(!this.getX() && !this.getY())
		{
			return true;
		}

		if(this.getX() === 0 && this.getY() === 0)
		{
			return true;
		}
	};	
};


/** Create a new ImageBuffer object
 *
 * @author metaio GmbH
 *  @version 2.0
 *  @class Image Object
 *  @constructor
 *  @param {string} _imagebuffer base64 encoded jpeg of the image
 *  @param {int} _width Width of the image
 * 	@param {int} _height Height of the image
 *  @param {Boolean} _originUpperLeft true if the origin is upper left corner, false if lower left
 */

arel.Image = function(_imagebuffer, _width, _height, _originUpperLeft)
{
	/** @private */this.imagebuffer = undefined;
	/** @private */this.width = undefined;
	/** @private */this.height = undefined;
	/** @private */this.originUpperLeft = undefined;
	
	/** @private */
	this.init = function(imagebuffer, width, height, originUpperLeft)
	{
		if(imagebuffer !== undefined) {
			this.imagebuffer = imagebuffer;
		}
		
		if(width !== undefined) {
			this.width = width;
		}
		
		if(height !== undefined) {
			this.height = height;
		}
		
		if(originUpperLeft !== undefined) {
			this.originUpperLeft = originUpperLeft;
		}		
	};
	/**
	 * Set the image as a base64 encoded jpeg
	 * @param {String} _imagebuffer base64 encoded jpeg of the image
	 * @private
	 */
	this.setImageBuffer = function(_imagebuffer) {this.imagebuffer = _imagebuffer;};
	/**
	 * Get the image as a base64 encoded jpeg
	 * @return {String} base64 encoded jpeg of the image
	 */
	this.getImageBuffer = function() {return this.imagebuffer;};
	
	/**
	 * Set the image width value
	 * @param {int} _width Width of the image
	 * @private
	 */
	this.setWidth = function(_width) {this.width = _width;};
	/**
	 * Get longitude value
	 * @return {int} Width of the image
	 */
	this.getWidth = function() {return this.width;};
	
	/**
	 * Set height of the image
	 * @param {int}  _height Height of the image
	 * @private
	 */
	this.setHeight = function(_height) {this.height = _height;};
	/**
	 * Get altitude value
	 * @return {int}  Height of the image
	 */
	this.getHeight = function() {return this.height;};
	
	/**
	 * Set, whether the origin is in the upper left (true) or bottom left (false)
	 * @param {Boolean} _originUpperLeft true if the origin is upper left corner, false if lower left
	 * @private
	 */
	this.setOriginUpperLeft = function(_originUpperLeft) {this.originUpperLeft = _originUpperLeft;};
	
	/**
	 * Get, whether the origin is in the upper left (true) or bottom left (false)
	 * @return {Boolean} true if the origin is upper left corner, false if lower left
	 */
	this.isOriginUpperLeft = function() {return this.originUpperLeft;};	
	
	/**
	 * @constructor
	 */
	this.init(_imagebuffer, _width, _height, _originUpperLeft);
};

//arel.LLA.arelInheritFrom(arel.Vector3D);
//arel.Rotation.arelInheritFrom(arel.Vector4D);

arel.LLA.prototype = new arel.Vector3D;
arel.LLA.prototype.constructor = arel.LLA;
arel.LLA.prototype.parent = arel.Vector3D.prototype;

arel.Rotation.prototype = new arel.Vector4D;
arel.Rotation.prototype.constructor = arel.Rotation;
arel.Rotation.prototype.parent = arel.Vector4D.prototype;
		
		//different Object types
/** @author metaio GmbH
 *  @version 2.0
 *  @class Creates a Default Object to be used with junaio Location Based Channels only! 
 *  @extends arel.Object
 *  @constructor
 */
arel.Object.POI = function()
{
	/**@private*/ this.TYPE = arel.Config.OBJECT_POI;
	
	/**
	 * Get the Object category constant (text)
	 */
	this.getType = function(){return this.TYPE; };

    /** @private */
	this.init = function()
	{
		this.visibility = {};	
	};
	
	this.init();
};

//arel.Object.POI.arelInheritFrom(arel.Object);

arel.Object.POI.prototype = new arel.Object;
arel.Object.POI.prototype.constructor = arel.Object.POI;
arel.Object.POI.prototype.parent = arel.Object.prototype;
/** @author metaio GmbH
 *  @version 2.0
 *  @class Creates a 3D Object to be used with junaio GLUE or junaio Location Based Channels 
 *  @extends arel.Object
 * 
 * @param {String} _id object id
 * @param {String} _modelPath path to the model's texture
 * @param {String} _texturePath path to the model's texture
 */

arel.Object.Model3D = function(_id, _modelPath, _texturePath)
{
	/** @private */ this.TYPE = arel.Config.OBJECT_MODEL3D;
	
	/** @private */ this.onscreen = undefined;
	/** @private */ this.translation = new arel.Vector3D(0,0,0);
	/** @private */ this.rotation = new arel.Rotation(0,0,0);
	/** @private */ this.scale = new arel.Vector3D(1,1,1);
	/** @private */ this.occlusion = false;
	/** @private */ this.model = undefined;
	/** @private */ this.texture = undefined;
	/** @private */ this.movie = undefined;
	/** @private */ this.coordinateSystemID = undefined;
	/** @private */ this.transparency = 0;
	/** @private */ this.renderorderposition = undefined;
	/** @private */ this.screenanchor = undefined;
    /** @private */ this.screenanchorflags = undefined;
	/** @private */ this.pickable = true;
	/** @private */ this.animationSpeed = 25;

    /** @private */
	this.init = function(_id, _modelPath, _texturePath)
	{
		if(_id !== undefined)
		{
			this.id = _id;
		}
		
		if(_modelPath !== undefined)
		{
			this.model = _modelPath;
		}
		
		if(_texturePath !== undefined)
		{
			this.texture = _texturePath;
		}
		
		this.visibility = {};		
	};

	/**
	 * Set the Objects relative to screen coordinates (Only if Translation and Location is not set)
	 * @param {arel.Vector2D} _onscreen Position of the 3D Object on the Screen
     * @see arel.Object.Model3D#getScreenCoordinates
	 */
	this.setScreenCoordinates = function(_onscreen) {

		this.onscreen = _onscreen; 
		
		//update the information in the scene if the Object exists in the scene
		var params = this.onscreen.toParameterObject("onScreen");
		return arel.Scene.updateObject(this.id, "ScreenCoordinates", _onscreen, arel.Util.toParameter(params, true));	
		
	}; 
	/**
	 * Get the Objects relative to screen coordinates (Only if Translation and Location is not set)
	 * @return {arel.Vector2D} Position of the 3D Object on the Screen
     * @see arel.Object.Model3D#setScreenCoordinates
	 */
	this.getScreenCoordinates = function() { return this.onscreen; }; 
	
	/**
	 * Sets the Objects translation from the point of origin (Only if OnScreen is not set). For location-based Channels the point of origin is at the position of the user. For GLUE Channels i is in the center of the pattern.
	 * @param {arel.Vector3D} translationValues Position of the 3D Object from the point of origin
	 */
	this.setTranslation = function(_translation) { 
		
		if(!(_translation instanceof arel.Vector3D))
		{
			return arel.Error.write("_translation must be of type arel.Vector3D");				
		}
		
		this.translation = _translation; 
		
		//update the information in the scene if the Object exists in the scene
		var params = this.translation.toParameterObject("trans");
		return arel.Scene.updateObject(this.id, "Translation", _translation, arel.Util.toParameter(params, true));
	};
	/**
	 * Get the Objects translation from the point of origin (Only if OnScreen is not set). For location-based Channels the point of origin is at the position of the user. For GLUE Channels i is in the center of the pattern.
	 * @return {arel.Vector3D} Position of the 3D Object from the point of origin
	 */ 
	this.getTranslation = function() { return this.translation; }; 
	
	/**
	 * Set the Objects rotation from the point of origin. Rotation values unit depend on the type given.
	 * @return {arel.Rotation} rotationValue Rotation of the 3D Object.
	 */ 
	this.setRotation = function(_rotation) { 
		
		if(!(_rotation instanceof arel.Rotation))
		{
			return arel.Error.write("_rotation must be of type arel.Rotation");
		}
		
		this.rotation = _rotation; 
		
		//update the information in the scene if the Object exists in the scene
		var params = this.rotation.toParameterObject("rot");
		return arel.Scene.updateObject(this.id, "Rotation", _rotation, arel.Util.toParameter(params, true));
		
	}; 
	/**
	 * Get the Objects rotation from the point of origin. Rotation values unit depend on the type given.
	 * @return {arel.Rotation} Rotation of the 3D Object.
	 */
	this.getRotation = function() { return this.rotation; }; 
	
	/**
	 * Set the Objects scale values along all axis.
	 * @param {arel.Vector3D} scaleValue Scale of the 3D Object along all axis. To scale in "aspect ratio" use the same value for all axis.
     * @see arel.Object.Model3D#getScale
	 */ 
	this.setScale = function(_scale) { 
		
		if(!(_scale instanceof arel.Vector3D))
		{
			return arel.Error.write("_scale must be of type arel.Vector3D");
		}
		
		this.scale = _scale; 
		
		//update the information in the scene if the Object exists in the scene
		var params = this.scale.toParameterObject("scale");
		return arel.Scene.updateObject(this.id, "Scale", _scale, arel.Util.toParameter(params, true));
	};
	/**
	 * Get the Objects scale values along all axis.
	 * @return {arel.Vector3D} Scale of the 3D Object along all axis. To scale in "aspect ratio" use the same value for all axis.
     * @see arel.Object.Model3D#setScale
	 */  
	this.getScale = function() { return this.scale; }; 
	
	/**
	 * Set the Objects to be an occlusion Object
	 * @param {boolean} enableOcclusion true if Object is supposed to be an occlusion model
	 */ 
	this.setOccluding = function(_occlusion) { 
		
		this.occlusion = _occlusion; 
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "Occluding", _occlusion, arel.Util.toParameter({"value": _occlusion}, true));	
	};
	
	/**
	 * Get whether the Object is an occlusion Object
	 * @return {boolean} true if Object is an occlusion model
	 */  
	this.isOccluding = function() { return this.occlusion; }; 
	
	/**
	 * Get the path to the model file
	 *  @see arel.Object.Model3D#getMovie()
	 *  @see arel.Object.Model3D#getTexture()
	 * @return {String} model path
	 */  
	this.getModel = function() { return this.model; }; 
	
	/**
	 * Set the path to the model file
	 * @param {String} _modelPath path to the model resource
     * @see arel.Object.Model3D#setMovie()
     * @see arel.Object.Model3D#setTexture()
	 */ 
	this.setModel = function(_modelPath) { 
		
		this.model = _modelPath;
		
		//!! this causes the object to go back to state ready !! Handled in the arel.Clientinterface.handleObjectRequest
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "Model", _modelPath, arel.Util.toParameter({"value": _modelPath}, true));	
	};
	/**
	 * Get the path to the texture file (jpg/png) which is mapped on the model - can be undefined if zipped obj or md2/fbx used or movie is set
	 * @see arel.Object.Model3D#getModel()
	 * @see arel.Object.Model3D#getMovie()
	 * @return {String} texture path
	 */  
	this.getTexture = function() { return this.texture; }; 
	
	/**
	 * Set the path to the texture file (jpg/png) which is mapped on the model - not required if zipped obj or md2/fbx used or movie is set
	 * @see arel.Object.Model3D#setModel()
	 * @see arel.Object.Model3D#setTexture()
	 * @param {String} _texturePath path to the model's texture
	 */ 
	this.setTexture = function(_texturePath) { 
		
		this.texture = _texturePath; 
		
		//!! this causes the object to go back to state ready !! Handled in the arel.Clientinterface.handleObjectRequest
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "Texture", _texturePath, arel.Util.toParameter({"value": _texturePath}, true));	
	};
	/**
	 * Get the path to the movie file(3g2) mapped on the 3D model - can be undefined if zipped obj or md2/fbx used or texture is set
	 * @see arel.Object.Model3D#getModel()
	 * @see arel.Object.Model3D#getTexture()
	 * @return {String} movie path
	 */  
	this.getMovie = function() { return this.movie; }; 
	
	/**
	 * Set the path to the movie file (3g2) to be mapped on the model
	 * @see arel.Object.Model3D#setModel()
	 * @see arel.Object.Model3D#setTexture()
	 * @see arel.Object.Model3D.createFromMovie()
	 * @param {String} _moviePath path to a movie that shall be mapped on the 3D model 
	 */ 
	this.setMovie = function(_moviePath) { 
		
		this.movie = _moviePath; 
		
		//!! this causes the object to go back to state ready !! Handled in the arel.Clientinterface.handleObjectRequest
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "Movie", _moviePath, arel.Util.toParameter({"value": _moviePath}, true));	
	};
	/**
	 * Get the ID of the coordinateSystem the object is currently attached to (only valid feedback for GLUE channels/obejcts)
	 * @return {int} the coordinateSystem ID the object is bound to
     * @see arel.Object.Model3D#setCoordinateSystemID
	 */  
	this.getCoordinateSystemID = function() { return this.coordinateSystemID; }; 
	
	/**
	 * Set the ID of the coordinateSystem the object is currently attached to (only valid feedback for GLUE channels/obejcts)
	 * @param {int} coordinateSystemID the coordinateSystem ID the object is bound to
     * @see arel.Object.Model3D#getCoordinateSystemID
	 */ 
	this.setCoordinateSystemID = function(_coordinateSystemID) { 
		
		this.coordinateSystemID = _coordinateSystemID; 
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "CoordinateSystemID", _coordinateSystemID, arel.Util.toParameter({"value": _coordinateSystemID}, true));	
	};
		
	/**
	 * Start an 3D model's animation (only valid for md2/fbx models)
	 * @param {string} animationName Name of the animation to be started
	 * @param {boolean} loop true if the animation shall be looped, false otherwise
	 */
	this.startAnimation = function(animationName, loop)
	{
		var params = {"id": this.id, "animationname":animationName, "loop":loop};
		return arel.ClientInterface.object.startAnimation(this.id, arel.Util.toParameter(params));
	};
	
	/**
	 * Pause the currently playing animation of the 3D model (only valid for md2/fbx models)	 * 
	 */
	this.pauseAnimation = function()
	{
		var params = {"id": this.id};
		return arel.ClientInterface.object.pauseAnimation(this.id, arel.Util.toParameter(params));
	};
	
	/**
	 * Stop a 3D model's animation (only valid for md2/fbx models). 
	 */
	this.stopAnimation = function()
	{
		var params = {"id": this.id};
		return arel.ClientInterface.object.stopAnimation(this.id, arel.Util.toParameter(params));
	};
	
	
	/** 
	 * Defines the animation speed of an object (only valid for md2/fbx models).
	 * @param {int} _speed The speed of the animation in fps. Default is 25fps.
	 * @requires API level 8
	 */
	this.setAnimationSpeed = function (_speed)
	{
		this.animationSpeed = _speed; 
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "AnimationSpeed", _speed, arel.Util.toParameter({"value": _speed}, true));	
	};
	
	/** 
	 * Defines the animation speed of an object (only valid for md2/fbx models).
	 * @requires API level 8
	 * @return {int} The speed of the animation in fps. Default is 25fps.
	 */
	this.getAnimationSpeed = function ()
	{
		return this.animationSpeed;
	};
	
	/**
	 * If an object has a movie texture applied, you can start it with this call
	 * @param {boolean} loop true if the animation shall be looped, false otherwise, default: false
     * @see arel.Object.Model3D#stopMovieTexture
     * @see arel.Object.Model3D#pauseMovieTexture
     * @see arel.Object.Model3D#getMovieTextureStatus
	 */
	this.startMovieTexture = function(loop)
	{
		if(loop === undefined)
			loop = false;
			
		var params = {"id": this.id, "loop": loop};
		return arel.ClientInterface.object.startMovieTexture(this.id, arel.Util.toParameter(params));
	};
	
	/**
	 * If an object has a movie texture applied, you can pause it with this call
     * @see arel.Object.Model3D#startMovieTexture
     * @see arel.Object.Model3D#stopMovieTexture
     * @see arel.Object.Model3D#getMovieTextureStatus
	 */
	this.pauseMovieTexture = function()
	{
		var params = {"id": this.id};
		return arel.ClientInterface.object.pauseMovieTexture(this.id, arel.Util.toParameter(params));
	};

	/**
	 * If an object has a movie texture applied, this method retrieves the current status (playing,
	 * paused, stopped, etc.) and position in seconds.
	 * @param {function} callback a callback function resetAnimationSpeedceiving playback information as
	 *                   arel.MovieTextureStatus object
	 * @param {Object} caller the "this" object for the callback function call -> optional
     * @see arel.MovieTextureStatus
     * @see arel.Object.Model3D#startMovieTexture
     * @see arel.Object.Model3D#pauseMovieTexture
     * @see arel.Object.Model3D#stopMovieTexture
	 */
	this.getMovieTextureStatus = function(callback, caller)
	{
		//register the callback
		var callbackID = arel.CallbackInterface.addCallbackFunction(callback, caller);

		if(!callbackID)
			return arel.Error.write("invalid callback given");

		//make the call to the client
		return arel.ClientInterface.object.getMovieTextureStatus(arel.Util.toParameter({"id" : this.id, "callbackid" : callbackID}));
	};

	/**
	 * If an object has a movie texture applied, you can stop it with this call
     * @see arel.Object.Model3D#startMovieTexture
     * @see arel.Object.Model3D#pauseMovieTexture
     * @see arel.Object.Model3D#getMovieTextureStatus
	 */
	this.stopMovieTexture = function()
	{
		var params = {"id": this.id};
		return arel.ClientInterface.object.stopMovieTexture(this.id, arel.Util.toParameter(params));
	};
	
	/**
	 * Set the transparency of the 3D model.
	 * @param {float} transparency The transparency value, where 1 corresponds to an invisible model and 0 corresponds to a fully opaque model).
     * @see arel.Object.Model3D#getTransparency
	 */
	this.setTransparency = function(_transparency) {
		
		this.transparency = _transparency;
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "Transparency", _transparency, arel.Util.toParameter({"value": _transparency}, true));
		
	};
	/**
	 * Get the transparency of the 3D model.
	 * @return {float} The transparency value, where 1 corresponds to an invisible model and 0 corresponds to a fully opaque model).
     * @see arel.Object.Model3D#setTransparency
	 */
	this.getTransparency = function() {return this.transparency;};
	
	/**
	 * Set the position where the object will be rendered. The z-Buffer will be ignored. The smaller the number, the earlier it will be drawn (further back in the scene)

	 * @param {int} _renderorderposition set the z-Buffer position of where the object shall be rendered. The "calculated" z-Buffer will be ignored.
     * @param {bool} _disableDepth true to disable depth  (default false)
     * @param {bool} _clearDepth true to clear depth test (default false)
     * @requires API level 13 for _disableDepthTest and _clearDepth
	 */
	this.setRenderOrderPosition = function(_renderorderposition, _disableDepth, _clearDepth) {
		
		this.renderorderposition = _renderorderposition;

        _disableDepth = typeof _disableDepth !== 'undefined' ? _disableDepth : false;
        _clearDepth = typeof _clearDepth !== 'undefined' ? _clearDepth : false;


		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "RenderOrderPosition", _renderorderposition, arel.Util.toParameter({"value": _renderorderposition, "disabledepth" : _disableDepth, "cleardepth" : _clearDepth}, true));
	};
	
	/**
	 * Get the position where the object will be rendered. The z-Buffer will be ignored. The smaller the number, the earlier it will be drawn (further back in the scene)

	 * @return {int} Get the z-Buffer position of where the object shall be rendered. The "calculated" z-Buffer will be ignored.
     * @see arel.Object.Model3D#setRenderOrderPosition
	 */
	this.getRenderOrderPosition = function() {return this.renderorderposition;};
	
	
	
	/**
	 * Set the screenanchor of the object.
	 * @param {int} _screenanchor integer created through bitmask:
     * <br />
     * <table>
     * <tr><td> ANCHOR_NONE </td><td>	No anchor, i.e. not relative-to-screen </td></tr>
     * <tr><td> ANCHOR_LEFT </td><td>	Anchor to the left edge</td></tr>
     * <tr><td>	ANCHOR_RIGHT </td><td>	Anchor to the right edge</td></tr>
     * <tr><td>	ANCHOR_BOTTOM </td><td>	Anchor to the bottom edge</td></tr>
     * <tr><td>	ANCHOR_TOP </td><td>	Anchor to the top edge</td></tr>
     * <tr><td>	ANCHOR_CENTER_H </td><td>	Anchor to the horizontal center</td></tr>
     * <tr><td>	ANCHOR_CENTER_V </td><td>	Anchor to the vertical center</td></tr>
     * <tr><td><br />
     * <tr><td>	ANCHOR_TL </td><td>	Anchor to the Top-Left</td></tr>
     * <tr><td> ANCHOR_TC </td><td>	Anchor to the Top-Center</td></tr>
     * <tr><td> ANCHOR_TR </td><td>	Anchor to the Top-Right</td></tr>
     * <tr><td> ANCHOR_CL </td><td>	Anchor to the Center-Left</td></tr>
     * <tr><td> ANCHOR_CC </td><td>	Anchor to the Center</td></tr>
     * <tr><td> ANCHOR_CR </td><td>	Anchor to the Center-Right</td></tr>
     * <tr><td> ANCHOR_BL </td><td>	Anchor to the Bottom-Left</td></tr>
     * <tr><td> ANCHOR_BC </td><td>	Anchor to the Bottom-Center</td></tr>
     * <tr><td> ANCHOR_BR </td><td>	Anchor to the Bottom-Right</td></tr>
     * </table>
     * <br />
     * @param {int} _screenanchorflags integer created through bitmask:
     * <br />
     * <table>
     *  <tr><td>FLAG_NONE </td><td>	No flag, all geometric transforms are considered</td></tr>
     *  <tr><td>FLAG_IGNORE_ROTATION </td><td>	ignore rotation of the geometry</td></tr>
     *  <tr><td>FLAG_IGNORE_ANIMATIONS </td><td>	ignore animations of the geometry</td></tr>
     *  <tr><td>FLAG_IGNORE_SCREEN_RESOLUTION</td><td> same as FLAG_MATCH_DISPLAY</td></tr>
     *  <tr><td>FLAG_MATCH_DISPLAY</td><td> 	scale model to be same physical size on all displays</td></tr>
     *  <tr><td>FLAG_AUTOSCALE </td><td>	Autoscale geometries according to the screen resolution and/or display density.</td></tr>
     * </table>
	 */
	this.setScreenAnchor = function(_screenanchor, _screenanchorflags)
    {
		this.screenanchor = _screenanchor;
        if( _screenanchorflags === undefined )
        {
            this.screenanchorflags = arel.Constants.FLAG_IGNORE_SCREEN_RESOLUTION;
        }
        else
        {
            this.screenanchorflags = _screenanchorflags;
        }

        if( arel.ObjectCache.objectExists(this.id) )
        {
            //edit the object in the renderer
            return arel.ClientInterface.object.edit(this.id, "ScreenAnchor", arel.Util.toParameter({"value":this.screenanchor, "flags":this.screenanchorflags}, true));
        }
       return false;
};
	
	/**
	 * Get the current screen anchor

	 * @return {int} _screenanchor integer created through bitmask:
	 *
     * <br />
     * <table>
     * <tr><td> ANCHOR_NONE </td><td>	No anchor, i.e. not relative-to-screen </td></tr>
     * <tr><td> ANCHOR_LEFT </td><td>	Anchor to the left edge</td></tr>
     * <tr><td>	ANCHOR_RIGHT </td><td>	Anchor to the right edge</td></tr>
     * <tr><td>	ANCHOR_BOTTOM </td><td>	Anchor to the bottom edge</td></tr>
     * <tr><td>	ANCHOR_TOP </td><td>	Anchor to the top edge</td></tr>
     * <tr><td>	ANCHOR_CENTER_H </td><td>	Anchor to the horizontal center</td></tr>
     * <tr><td>	ANCHOR_CENTER_V </td><td>	Anchor to the vertical center</td></tr>
     * <tr><td><br />
     * <tr><td>	ANCHOR_TL </td><td>	Anchor to the Top-Left</td></tr>
     * <tr><td> ANCHOR_TC </td><td>	Anchor to the Top-Center</td></tr>
     * <tr><td> ANCHOR_TR </td><td>	Anchor to the Top-Right</td></tr>
     * <tr><td> ANCHOR_CL </td><td>	Anchor to the Center-Left</td></tr>
     * <tr><td> ANCHOR_CC </td><td>	Anchor to the Center</td></tr>
     * <tr><td> ANCHOR_CR </td><td>	Anchor to the Center-Right</td></tr>
     * <tr><td> ANCHOR_BL </td><td>	Anchor to the Bottom-Left</td></tr>
     * <tr><td> ANCHOR_BC </td><td>	Anchor to the Bottom-Center</td></tr>
     * <tr><td> ANCHOR_BR </td><td>	Anchor to the Bottom-Right</td></tr>
     * </table>
     */
	this.getScreenAnchor = function() {return this.screenanchor;};


    /**
     * Get the current screen anchor flags
     * @return {int} the current screenanchor flags
     * <br />
     * <br />
     * <table>
     *  <tr><td>FLAG_NONE </td><td>	No flag, all geometric transforms are considered</td></tr>
     *  <tr><td>FLAG_IGNORE_ROTATION </td><td>	ignore rotation of the geometry</td></tr>
     *  <tr><td>FLAG_IGNORE_ANIMATIONS </td><td>	ignore animations of the geometry</td></tr>
     *  <tr><td>FLAG_IGNORE_SCREEN_RESOLUTION</td><td> same as FLAG_MATCH_DISPLAY</td></tr>
     *  <tr><td>FLAG_MATCH_DISPLAY</td><td> 	scale model to be same physical size on all displays</td></tr>
     *  <tr><td>FLAG_AUTOSCALE </td><td>	Autoscale geometries according to the screen resolution and/or display density.</td></tr>
     * </table>
     */
    this.getScreenAnchorFlags = function() { return this.screenanchorflags;};
	
	
	/**
	 * use this method to declare whether an object can be picked or not (clicked)
	 * @param {boolean} _pickable true to enable picking of this model, false to disable it 
	 */
	this.setPickingEnabled = function(_pickable) {
		
		this.pickable = _pickable;
		
		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "PickingEnabled", _pickable, arel.Util.toParameter({"value": _pickable}, true));
	};
	/**
	 * use this method to determine whether an object can be picked or not (clicked)
	 * @return {boolean} true if picking is enabled, false otherwise
	 */
	this.isPickingEnabled = function() {return this.pickable;};
	
	/**
	 * Get the Object type constant (3d)
	 */
	this.getType = function(){return this.TYPE; };
	
	/**
	 * Set the Object type constant
	 * @private
	 */
	this.setType = function(_type){this.TYPE = _type; };
	
	//call the constructor
	this.init(_id, _modelPath, _texturePath);
};

/** @private */
arel.Object.Model3D.prototype = new arel.Object;
arel.Object.Model3D.prototype.constructor = arel.Object.Model3D;
arel.Object.Model3D.prototype.parent = arel.Object.prototype;
//arel.Object.Model3D.arelInheritFrom(arel.Object);

/**
 * Create an 3D Model based on model and texture (can also only have modelPath if the model is a zipped obj or md2/fbx including the texture) 
 * @param {String} _id object id
 * @param {String} _modelPath path to the model's texture
 * @param {String} _texturePath path to the model's texture
 * @static
 */

arel.Object.Model3D.create = function(_id, _modelPath, _texturePath)
{
	return new arel.Object.Model3D(_id, _modelPath, _texturePath);
};

/**
 * Create an Image 3D Model based on an image provided.
 * @param {String} _id object id
 * @param {String} _imagePath path to the image that shall be rendered
 * @static
 */

arel.Object.Model3D.createFromImage = function(_id, _imagePath)
{
	var imageModel3D = new arel.Object.Model3D(_id, undefined, _imagePath);
	imageModel3D.setType(arel.Config.OBJECT_IMAGE3D);
	
	return imageModel3D;
};

/**
 * Create a Movie 3D Model based on an the movie file provided.
 * @param {String} _id object id
 * @param {String} _moviePath path to the image that shall be rendered
 * @static
 */

arel.Object.Model3D.createFromMovie = function(_id, _moviePath)
{
	var movieModel3D = new arel.Object.Model3D(_id);
	movieModel3D.setType(arel.Config.OBJECT_MOVIE3D);
	movieModel3D.setMovie(_moviePath);
	
	return movieModel3D;
};/** @author metaio GmbH
 *  @class Creates a light object
 *  @requires API Level 13
 *  @extends arel.Object
 *
 * @param {String} _id object id
 */
arel.Object.Light = function(_id)
{
	/** @private */ this.TYPE = arel.Config.OBJECT_LIGHT;

	/** @private */ this.ambientColor = undefined;
	/** @private */ this.attenuation = undefined;
	/** @private */ this.coordinateSystemID = 0; // default for lights in SDK, see comment in native code (initMembers method)
	/** @private */ this.diffuseColor = undefined;
	/** @private */ this.direction = undefined;
	/** @private */ this.enabled = undefined;
	/** @private */ this.radius = undefined;
	/** @private */ this.translation = undefined;
	/** @private */ this.lightType = undefined;

	/** @private */
	this.init = function(_id)
	{
		if(_id !== undefined)
		{
			this.id = _id;
		}

		this.visibility = {};
	};


	/**
	 * Get the ambient color
	 * @return {arel.Vector3D} Ambient color (RGB values in range [0;1])
     * @requires API Level 13
	 */
	this.getAmbientColor = function() { return this.ambientColor; };
	/**
	 * Set the ambient color
	 * @param {arel.Vector3D} _ambientColor Ambient color (RGB values in range [0;1])
     * @requires API Level 13
	 */
	this.setAmbientColor = function(_ambientColor)
	{

		if(!(_ambientColor instanceof arel.Vector3D))
		{
			return arel.Error.write("_ambientColor must be of type arel.Vector3D");
		}

		this.ambientColor = _ambientColor;

		var params = this.ambientColor.toParameterObject("ambientcolor");
		return arel.Scene.updateObject(this.id, "AmbientColor", _ambientColor, arel.Util.toParameter(params, true));
	};


	/**
	 * Get the attenuation values
	 * @return {arel.Vector3D} Attenuation (constant, linear, quadratic stored in XYZ)
     * @requires API Level 13
	 */
	this.getAttenuation = function() { return this.attenuation; };
	/**
	 * Set the attenuation values
	 * @param {arel.Vector3D} _attenuation Attenuation (constant, linear, quadratic stored in XYZ)
     * @requires API Level 13
	 */
	this.setAttenuation = function(_attenuation)
	{

		if(!(_attenuation instanceof arel.Vector3D))
		{
			return arel.Error.write("_attenuation must be of type arel.Vector3D");
		}

		this.attenuation = _attenuation;

		var params = this.attenuation.toParameterObject("attenuation");
		return arel.Scene.updateObject(this.id, "Attenuation", _attenuation, arel.Util.toParameter(params, true));
	};


	/**
	 * Get the ID of the coordinateSystem the object is currently attached to (only valid feedback for GLUE channels/obejcts)
	 * @return {int} the coordinateSystem ID the object is bound to
	 * @see arel.Object.Light#setCoordinateSystemID
	 */
	this.getCoordinateSystemID = function() { return this.coordinateSystemID; };

	/**
	 * Set the ID of the coordinateSystem the object is currently attached to (only valid feedback for GLUE channels/obejcts)
	 * @param {int} _coordinateSystemID the coordinateSystem ID the object is bound to
	 * @see arel.Object.Light#getCoordinateSystemID
	 */
	this.setCoordinateSystemID = function(_coordinateSystemID)
	{
		this.coordinateSystemID = _coordinateSystemID;

		//update the information in the scene if the Object exists in the scene
		return arel.Scene.updateObject(this.id, "CoordinateSystemID", _coordinateSystemID, arel.Util.toParameter({"value": _coordinateSystemID}, true));
	};


	/**
	 * Get the diffuse color
	 * @return {arel.Vector3D} Diffuse color (RGB values in range [0;1])
     * @requires API Level 13
	 */
	this.getDiffuseColor = function() { return this.diffuseColor; };
	/**
	 * Set the diffuse color
	 * @param {arel.Vector3D} _diffuseColor Diffuse color (RGB values in range [0;1])
     * @requires API Level 13
	 */
	this.setDiffuseColor = function(_diffuseColor)
	{
		if(!(_diffuseColor instanceof arel.Vector3D))
		{
			return arel.Error.write("_diffuseColor must be of type arel.Vector3D");
		}

		this.diffuseColor = _diffuseColor;

		var params = this.diffuseColor.toParameterObject("diffusecolor");
		return arel.Scene.updateObject(this.id, "DiffuseColor", _diffuseColor, arel.Util.toParameter(params, true));
	};


	/**
	 * Get the direction vector
	 * @return {arel.Vector3D} Direction vector
     * @requires API Level 13
	 */
	this.getDirection = function() { return this.direction; };
	/**
	 * Set the direction vector
	 * @param {arel.Vector3D} _direction Direction vector
     * @requires API Level 13
	 */
	this.setDirection = function(_direction)
	{
		if(!(_direction instanceof arel.Vector3D))
		{
			return arel.Error.write("_direction must be of type arel.Vector3D");
		}

		this.direction = _direction;

		var params = this.direction.toParameterObject("direction");
		return arel.Scene.updateObject(this.id, "Direction", _direction, arel.Util.toParameter(params, true));
	};


	/**
	 * Determine if the light is enabled
	 * @return {bool} Whether light is enabled
     * @requires API Level 13
	 */
	this.isEnabled = function()
	{
		return this.enabled;
	};
	/**
	 * Enable or disable the light
	 * @param {bool} _enable Whether to enable or disable the light
     * @requires API Level 13
	 */
	this.setEnabled = function(_enabled)
	{
		_enabled = !!_enabled; // force to boolean type
		this.enabled = _enabled;

		return arel.Scene.updateObject(this.id, "Enabled", _enabled, arel.Util.toParameter({"value": _enabled}, true));
	};


	/**
	 * Get the light type
	 * @return {int} Type of the light (one of the constants in arel.Light)
	 * @see arel.Object.Light#setLightType
	 * @see arel.Light#LIGHT_TYPE_DIRECTIONAL
	 * @see arel.Light#LIGHT_TYPE_POINT
	 * @see arel.Light#LIGHT_TYPE_SPOT
     * @requires API Level 13
	 */
	this.getLightType = function()
	{
		return this.lightType;
	};
	/**
	 * Set the light type
	 * @param {arel.Vector2D} _lightType Type of the light (one of the constants in arel.Light)
	 * @see arel.Object.Light#getLightType
	 * @see arel.Light#LIGHT_TYPE_DIRECTIONAL
	 * @see arel.Light#LIGHT_TYPE_POINT
	 * @see arel.Light#LIGHT_TYPE_SPOT
     * @requires API Level 13
	 */
	this.setLightType = function(_lightType)
	{
		if (_lightType != arel.Light.LIGHT_TYPE_DIRECTIONAL &&
			_lightType != arel.Light.LIGHT_TYPE_POINT &&
			_lightType != arel.Light.LIGHT_TYPE_SPOT)
		{
			return arel.Error.write("Invalid enum value for _lightType");
		}

		this.lightType = _lightType;

		return arel.Scene.updateObject(this.id, "LightType", _lightType, arel.Util.toParameter({"value": _lightType}, true));
	};


	/**
	 * Get the light radius
	 * @return {float} Light radius in radians
     * @requires API Level 13
	 */
	this.getRadius = function()
	{
		return this.radius;
	};
	/**
	 * Set the light radius
	 * @param {float} _radius Light radius in degrees
     * @requires API Level 13
	 */
	this.setRadiusDegrees = function(_radius)
	{
		this.radius = _radius * Math.PI / 180.0;

		return arel.Scene.updateObject(this.id, "Radius", _radius, arel.Util.toParameter({"value": _radius}, true));
	};
	/**
	 * Set the light radius
	 * @param {float} _radius Light radius in radians
     * @requires API Level 13
	 */
	this.setRadiusRadians = function(_radius)
	{
		this.radius = _radius;

		return arel.Scene.updateObject(this.id, "Radius", _radius, arel.Util.toParameter({"value": _radius}, true));
	};


	/**
	 * Get the translation from the origin
	 * @return {arel.Vector3D} Position of the light from the origin
	 */
	this.getTranslation = function() { return this.translation; };
	/**
	 * Set the light translation from the origin
	 * @param {arel.Vector3D} _translation Position of the light from the origin
	 */
	this.setTranslation = function(_translation)
	{
		if(!(_translation instanceof arel.Vector3D))
		{
			return arel.Error.write("_translation must be of type arel.Vector3D");
		}

		this.translation = _translation;

		var params = this.translation.toParameterObject("trans");
		return arel.Scene.updateObject(this.id, "Translation", _translation, arel.Util.toParameter(params, true));
	};


	/**
	 * Get the Object type constant (light)
	 */
	this.getType = function() { return this.TYPE; };

	/**
	 * Set the Object type constant
	 * @private
	 */
	this.setType = function(_type)
	{
		if (_type == arel.Light.LIGHT_TYPE_DIRECTIONAL ||
			_type == arel.Light.LIGHT_TYPE_POINT ||
			_type == arel.Light.LIGHT_TYPE_SPOT)
		{
			return arel.Error.write("Use setLightType, not setType!");
		}

		this.TYPE = _type;
	};


	// call the constructor
	this.init(_id);
};

/** @private */
arel.Object.Light.prototype = new arel.Object;
arel.Object.Light.prototype.constructor = arel.Object.Light;
arel.Object.Light.prototype.parent = arel.Object.prototype;

/**
 * Create a light
 *
 * After creating the light object, you should set desired properties, e.g. the light type, diffuse
 * color, etc. Note that different light types use different properties.
 *
 * @param {String} _id object id
 * @see arel.Light#LIGHT_TYPE_DIRECTIONAL
 * @see arel.Light#LIGHT_TYPE_POINT
 * @see arel.Light#LIGHT_TYPE_SPOT
 * @static
 */
arel.Object.Light.createLight = function(_id)
{
	return new arel.Object.Light(_id);
};
		//arel.include("js/objects/ObjectMovie.js");
		//arel.include("js/objects/ObjectImage.js");
		
		//interaction helper
/** @author metaio GmbH
 *  @class The arel.Media class is the interface towards display of images, play back of sound and video and opening websites.
 *  @see arel.Events.Media
 */ 
arel.Media = 
{
	/** @private */
	CATEGORY: arel.Config.MEDIA_CATEGORY,
		
	/** Type URL
	 * @constant
	 */
	WEBSITE: "website",
	
	/** Type sound
	 * @constant
	 */
	SOUND: "sound",
	/** Type Video
	 * @constant
	 */
	VIDEO: "video",
		
	/**
	 * Action type. Define to open website, image or video.
	 * @private
	 * @constant
	 */
	ACTION_OPEN: "open",
	/**
	 * Action type. Define to play sound
	 * @private
	 * @constant
	 */
	ACTION_PLAY: "play",
	/**
	 * Action type. Define to close sound
	 * @private
	 * @constant
	 */
	ACTION_CLOSE: "stop",
	
	/**
	 * Action type. Define to pause a sound.
	 * @private
	 * @constant
	 */
	ACTION_PAUSE: "pause",
	
	/**
	 * Open a website in the web view
	 * @param {String} _url The url to be opened
	 * @param {Boolean|String} _external If set to true, the external browser will be opened, otherwise the internal.
     * @see arel.Events.Media.WEBSITE_CLOSED, arel.Events.setListener
     */
	openWebsite: function(_url, _external)
	{
		if(!_external || _external === "false")
		{
			_external = "false";
		}
		else
		{
			_external = "true";
		}
			
		return this.handleMedia(this.WEBSITE, _url, this.ACTION_OPEN, _external);
	},

	/**
	 * Speak out text via text-to-speech, using the current locale/language
	 *
	 * @param {String} text Text to speak
	 * @requires API level 16
	 * @requires (Android) TTS to be installed
	 * @requires (iOS) iOS 7 or newer
	 */
	speak: function(text) {
		return arel.ClientInterface.media.speak(text);
	},

	/**
	 * Start a sound to be played. Allowed filetyps are mp3
	 * @param {String} _soundFilePath File path to the mp3 to be played back
     * @see arel.Events.Media.SOUND_COMPLETE, arel.Events.setListener
	 */
	startSound: function(_soundFilePath)
	{
		return this.handleMedia(this.SOUND, _soundFilePath, this.ACTION_PLAY, undefined);
	},
	
	/**
	 * Pauses the sound.
	 * @param {String} _soundFilePath File path to the mp3 to be paused
	 */
	pauseSound: function(_soundFilePath)
	{
		return this.handleMedia(this.SOUND, _soundFilePath, this.ACTION_PAUSE, undefined);
	},
	
	/**
	 * Stop the sound.
	 * @param {String} _soundFilePath File path to the mp3 to be stopped
	 */
	stopSound: function(_soundFilePath)
	{
		return this.handleMedia(this.SOUND, _soundFilePath, this.ACTION_CLOSE, undefined);
	},
	
	/**
	 * Start a video to be played. Allowed filetyps are mp4. the video will be streamed in the fullscreen player.
	 * @param {String} _videoFilePath File path to the mp4 to be played back.
     * @see arel.Events.Media.VIDEO_CLOSED, arel.Events.setListener
	 */
	startVideo: function(_videoFilePath)
	{
		return this.handleMedia(this.VIDEO, _videoFilePath, this.ACTION_PLAY);
	},
	
	/**
	 * Triggers a vibration alert
	 */
	triggerVibration: function()
	{
		return arel.ClientInterface.media.vibrate();
	},


    /**
     * Plays the detection alert sound
     */
    playAlert: function()
    {
        return arel.ClientInterface.media.playAlert();
    },


    /**
     * Create a calendar entry in the device calendar
     *
     * @param {Date} _startDate the start date of the event
     * @param {Date} _endDate the end date of the event
     * @param {String} _subject subject of the event
     * @param {String} _description description of the event
     * @param {String} _location location of the event
     * @requires API level 11
     */
    createCalendarEvent: function( _startDate, _endDate, _subject, _description, _location )
    {
        return arel.ClientInterface.media.createCalendarEvent( _startDate.getTime()/1000, _endDate.getTime()/1000, encodeURIComponent(_subject), encodeURIComponent(_description), encodeURIComponent(_location));
    },


	/**
	 * 
	 * Method all the helper methods refer to to send the request to the arel.ClientInterface 
	 * @private
	 */
	handleMedia: function (_type, _url, _action, _external)
	{
		var params = [];
		
		if(_url)
		{
			params.url = _url;
		}
		
		if(_external)
		{
			params.external = _external;
		}
					
		if(_action)
		{
			params.action = _action;
		}
			
		if(_type === this.WEBSITE)
		{
			return arel.ClientInterface.media.website(arel.Util.toParameter(params));
		}
		else if(_type === this.VIDEO)
		{
			return arel.ClientInterface.media.video(arel.Util.toParameter(params));
		}
		else if(_type === this.IMAGE)
		{
			return arel.ClientInterface.media.image(arel.Util.toParameter(params));
		}
		else if(_type === this.SOUND)
		{
			return arel.ClientInterface.media.sound(arel.Util.toParameter(params));
		}
		else
		{
			return arel.Error.write("Invalid media type");
		}
	}
};/** @author metaio GmbH
 *  @class The arel.navigation class is the interface to navigate users based on user interaction
 *  @requires API level 12
 */ 
arel.Navigation = 
{
	/**
	 * Route the user to a GPS position specified in an object that is known to the scene.
	 * @param {string|arel.Object} arObjectOrID Object (arel.Object.Object3d or arel.POI) or the id of the object to get the route to via Google Maps
     * @requires API level 12
	 */
	routeToObjectOnMap: function(objectOrId)
	{
		var params = []; 
		
		if(objectOrId instanceof arel.Object)
		{
			params.id = objectOrId.getID();
		}
		else
		{
			params.id = objectOrId;
		}
			
		//check if this Object is registered in the Scene
		if(arel.ObjectCache.objectExists(params.id))
		{
			return arel.ClientInterface.navigate.routeOnMap(arel.Util.toParameter(params));
		}
		else
		{
			return arel.Error.write("Invalid location given");
		}
		
	},
	
	/**
	 * Route the user to a GPS position specified with latitude, longitude + a name of the location
	 * @param {float} latitude latitude of the coordinate to route to
	 * @param {float} longitude longitude of the coordinate to route to
     * @requires API level 12
	 */
	routeToLocationOnMap: function(lat, lng)
	{
		var params = []; 
		
		if(arel.Parser.validateLatitude(lat) && arel.Parser.validateLongitude(lng))
		{	
			params.lat = lat;
            params.lng = lng;

			return arel.ClientInterface.navigate.routeOnMap(arel.Util.toParameter(params));
		}
		else
		{
			return arel.Error.write("Invalid location given");
		}		
	}
};		
		//callback interface
/**
 *	
 *  @author metaio GmbH
 * 
 *  @class "Static Class" to handle callbacks. The client will only get a callback ID and the callback method behind will be stored here
 *  @private 
 *	
 */ 
arel.CallbackInterface = 
{
	//array to store the callbacks
	/** @private */
	callbackHandler:	{},
	
	/**
	 * Stores a callback function
	 * @private 
	 * @param {function} callback function to be called upon return of information from the client
	 * @param {Object} caller the object this shall be referenced to in the callback function -> optional
	 * @return {string} callback ID
	 */
	addCallbackFunction : function(callback, caller)
	{
		if(callback && typeof(callback) === "function")
		{
			//define an ID
			//the id is simply the current time (unixtime based) plus an iterator (the iterator will not be set back, but always goes up)
			//time retrieval from http://www.perturb.org/display/786_Javascript_Unixtime.html
			
			//length of the array is not valid, since due to the "_", an Object is used (no longer an array) and objects do not have a length
			var id = String(new Date().valueOf()) + "_" + arel.callbackMethodIterator;
			arel.callbackMethodIterator++;
					
			this.callbackHandler[id] = [callback, caller];	
			return id;		
		}		
		else //the callback is not a function
		{
			return arel.Error.write("callback needs to be specified.");
		}
	},	
	
	/**
	 * Remove a callback function from the object
	 * @private 
	 * @param {int} callbackID Id of the callback to be removed
	 * @return {Boolean} true if removed, false if not
	 */
	removeCallbackFunction: function(callbackID)
	{
		//check if this callback exists
		if(this.callbackHandler[callbackID] === undefined)
		{
			return arel.Error.write("callback id not specified.");
		}
		
		//remove the event
		delete(this.callbackHandler[callbackID]);
				
		return true;
	},
			
	/** 
	 * e.g.<br />
	 * arel.Events.callCallbackFunction(135312156849, new arel.Vector3D(23.5,11.9,0)); <br/>
	 * arel.Events.callCallbackFunction(135312156849, "first arg", "second arg"); <br/>
	 * @private
	 * @param {int} callbackID id of the callback function to be called
	 * @param {Object} oneOrMoreParams One or more objects passed as arguments to the callback
	 */
	callCallbackFunction : function(callbackID, oneOrMoreParams)
	{
		//get the callback function
		try
		{
			var callbackInformation = this.callbackHandler[callbackID];
			
			//call the eventhandler and pass a scene element
			if(callbackInformation === undefined)
			{
				return arel.Error.write("Callbackinformation not found.");
			}
		
			if(callbackInformation[0] === undefined || typeof(callbackInformation[0]) !== "function")
			{
				return arel.Error.write("Callback function undefined or not a function.");
			}

			// "arguments" may not have "slice" method, it's only an 'array-like' object
			var args = [];
			for (var i = 1; i < arguments.length; ++i)
			{
				args.push(arguments[i]);
			}

			if(callbackInformation[1] !== undefined)
			{			
				callbackInformation[0].apply(callbackInformation[1], args);
			}
			else
			{
				callbackInformation[0].apply(null, args);
			}
			
			//debug stream
			arel.Debug.logStream("Incoming callback information from renderer.");
		
			//remove the callback function again
			this.removeCallbackFunction(callbackID);
		} 
		catch(e) 
		{
			return arel.Error.write("Error calling callback." + e);
		}
			
		return true;
	}	
};		
		//junaio specific
		//arel.include("js/Junaio.js");
		
		//check if arel is ready to start
		//taken from jQuery
		// Cleanup functions for the document ready method
		if(!arelTEST)
		{
			if ( document.addEventListener ) {
				/**
				 * @private 
				 */
				DOMContentLoaded = function() {
					document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );
					arel.readyforexecution();
				};
			
			} else if ( document.attachEvent ) {
				/**
				 * @private 
				 */
				DOMContentLoaded = function() {
					// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
					if ( document.readyState === "complete" ) {
						document.detachEvent( "onreadystatechange", DOMContentLoaded );
						arel.readyforexecution();
					}
				};
			}
			
			// Mozilla, Opera and webkit nightlies currently support this event
			if ( document.addEventListener ) {
				// Use the handy event callback
				document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );
				
				// A fallback to window.onload, that will always work
				window.addEventListener( "load", arel.readyforexecution, false );
	
			// If IE event model is used
			} else if ( document.attachEvent ) {
				// ensure firing before onload,
				// maybe late but safe also for iframes
				document.attachEvent("onreadystatechange", DOMContentLoaded);
				
				// A fallback to window.onload, that will always work
				window.attachEvent( "onload", arel.readyforexecution );
			}
		}
		else
		{
			arel.readyforexecution();
		}		
//	}
//)(window)
