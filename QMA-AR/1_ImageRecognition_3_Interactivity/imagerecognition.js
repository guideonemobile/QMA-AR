var World = {
	
    loaded: false,

	init: function initFn() {
		//Disable all sensors in "Image Recognition only" Worlds to save performance.
        //If the property is set to true, any geo-related components (such as GeoObjects and ActionRanges) will be active.
        //If the property is set to false, any geo-related components will not be visible on the screen, and triggers will not fire.
		AR.context.services.sensors = false;
		this.createOverlays();
	},

	createOverlays: function createOverlaysFn() {
		
        // Initialize Tracker
		// Important: If you replace the tracker file with your own, make sure to change the target name accordingly.
		// e.g. replace "pageOne" used for creating the AR.Trackeable2DOBject below, with the name of one of your new target images.
		this.tracker = new AR.Tracker("assets/magazine.wtc", {});

		//Button image
		this.imgButton = new AR.ImageResource("assets/wwwButton.jpg"); //The image to overlay the target

		//Target 1
		var imgOne = new AR.ImageResource("assets/imageOne.png");
		var overlayOne = new AR.ImageDrawable(imgOne, 1, {
			offsetX: -0.15,
			offsetY: 0
		});
		var pageOneButton = this.createWwwButton("http://www.guideonemobile.com/", 0.1, {
			offsetX: -0.25,
			offsetY: -0.25,
			zOrder: 1
		});
		var pageOne = new AR.Trackable2DObject(this.tracker, "pageOne", {
			drawables: {
				cam: [overlayOne, pageOneButton]
			}
		});

		//Target 2
		var imgTwo = new AR.ImageResource("assets/imageTwo.png"); //The image to overlay the target
		var overlayTwo = new AR.ImageDrawable(imgTwo, 0.5, {
			offsetX: 0.12,
			offsetY: -0.01
		});
		var pageTwoButton = this.createWwwButton("http://www.guideonemobile.com/", 0.15, {
			offsetX: 0,
			offsetY: -0.25,
			zOrder: 1
		});
		var pageTwo = new AR.Trackable2DObject(this.tracker, "pageTwo", {
			drawables: {
				cam: [overlayTwo, pageTwoButton]
			}
		});
	},

	createWwwButton: function createWwwButtonFn(url, size, options) {
		options.onClick = function() {
			AR.context.openInBrowser(url);
		};
		return new AR.ImageDrawable(this.imgButton, size, options);
	}
};

World.init();
