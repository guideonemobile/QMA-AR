
#import "QMACyclopsVC.h"
#import <WikitudeSDK/WTArchitectView.h>


@interface QMACyclopsVC ()

@property (nonatomic, weak) IBOutlet WTArchitectView *architectView;

@end


@implementation QMACyclopsVC

#pragma mark - View Controller Lifecycle

- (void)viewDidLoad {
    [super viewDidLoad];
    [self setupWTArchitectView];
}

- (void)viewWillAppear:(BOOL)animated {
    
    [super viewWillAppear:animated];
    
    //Register to be notified when application enters background
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(appDidEnterBackground:)
                                                 name:UIApplicationDidEnterBackgroundNotification
                                               object:[UIApplication sharedApplication]];
    
    //Register to be notified when application becomes active
    //(app is launched or when the device is unlocked)
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(appHasBecomeActive:)
                                                 name:UIApplicationDidBecomeActiveNotification
                                               object:[UIApplication sharedApplication]];
    
    [self.architectView start]; //Start camera
}

- (void)viewWillDisappear:(BOOL)animated {
    [super viewWillDisappear:animated];
    [[NSNotificationCenter defaultCenter] removeObserver:self];
    [self.architectView stop]; //Stop camera
}

#pragma mark - WTArchitectView Setup

- (void)setupWTArchitectView {
    
    if ([WTArchitectView isDeviceSupportedForARMode:WTARMode_Geo]) {
        //This method allows us to pass a string containing the license key and a CMMotionManager instance.
        //If the application has already initialized a CMMotionManager, that instance should be used here.
        //Otherwise, the motionManager parameter should be nil
        [self.architectView initializeWithKey:nil motionManager:nil];
        
    } else {
        NSLog(@"This device does not support ARchitect Worlds. Please see WTArchitectView's class reference for a list of requirements.");
    }
}

#pragma mark - UIApplication Notifications

- (void)appDidEnterBackground:(UIApplication *)application {
    [self.architectView stop];
}

- (void)appHasBecomeActive:(UIApplication *)application {
    [self.architectView start];
}





@end
