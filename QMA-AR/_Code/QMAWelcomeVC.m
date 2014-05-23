
#import "QMAWelcomeVC.h"
#import <CoreLocation/CoreLocation.h>
#import "SharedManagedDocument.h"
#import "QMAOnSiteVC.h"


@interface QMAWelcomeVC () <CLLocationManagerDelegate>

@property (nonatomic, strong) CLLocation *museumLocation;
@property (nonatomic, strong) CLLocationManager *locationManager;

@end


static const CLLocationDegrees qmaLat =  40.746154;
static const CLLocationDegrees qmaLon = -73.846539;
static const NSUInteger maxDistanceFromMuseum = 320; //In meters (this is equivalent to 0.2 miles). If user is farther away from the museum, we consider her to he off-site


@implementation QMAWelcomeVC

#pragma mark - View Controller Lifecycle

- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    //In the application's property list (InfoPlist.string), the UIApplicationExitsOnSuspend key is set to
    //YES. This forces the app termination on exit (we want the application to always start from the
    //beginning so we can check the user's location and direct him accordingly every time the app is launched).
    //That being the case, we clean all old VCs that are sitting in the navigation controller's stack on
    //every new launch
    [self.navigationController popToRootViewControllerAnimated:NO];
    
    self.museumLocation = [[CLLocation alloc] initWithLatitude:qmaLat longitude:qmaLon];
    
    self.locationManager = [[CLLocationManager alloc] init];
    self.locationManager.delegate = self;
    self.locationManager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters;
    self.locationManager.distanceFilter = 100; //Without setting this property, the locationManager:didUpdateToLocation:fromLocation: delegate method gets called twice, even though we call stopUpdatingLocation in it
    
    [self.locationManager startUpdatingLocation];
}

#pragma mark - CLLocationManagerDelegate

- (void)locationManager:(CLLocationManager *)manager
    didUpdateToLocation:(CLLocation *)newLocation
           fromLocation:(CLLocation *)oldLocation {
    
    [self.locationManager stopUpdatingLocation];
    
    CLLocationDistance distanceFromMuseum = [newLocation distanceFromLocation:self.museumLocation];
    
    UIStoryboard *storyboard = [UIStoryboard storyboardWithName:@"Main_iPhone" bundle:nil];
    UIViewController *vc;
    if (YES || distanceFromMuseum < maxDistanceFromMuseum) {
        vc = [storyboard instantiateViewControllerWithIdentifier:@"OnSiteViewController"];
    } else {
        vc = [storyboard instantiateViewControllerWithIdentifier:@"OffSiteViewController"];
    }
    [self loadDatabaseAndMoveOn:vc];
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error {
    UIStoryboard *storyboard = [UIStoryboard storyboardWithName:@"Main_iPhone" bundle:nil];
    UIViewController *vc = [storyboard instantiateViewControllerWithIdentifier:@"OffSiteViewController"];
    [self loadDatabaseAndMoveOn:vc];
}

#pragma mark - Load Database and Segue

static NSString *const error = @"Error in DatabasePreLoadData.plist file: the topmost object in the property list should be 'Root', the second topmost object should be 'Targets', and they both should to be of type dictionary.";

- (void)loadDatabaseAndMoveOn:(UIViewController *)destinationVC {
    
    [SharedManagedDocument managedDocumentWithBlock:^(UIManagedDocument *managedDocument) {
        
        //If this is the first time the app is being used, pre-load database with information
        //from property list
        NSString *path = [[NSBundle mainBundle] pathForResource:@"DatabasePreLoadData" ofType:@"plist"];
        NSDictionary *model = [[NSDictionary alloc] initWithContentsOfFile:path][@"Targets"];
        if (!model || ![model isKindOfClass:[NSDictionary class]]) {
            QMALog(@"%@", error);
        } else {
            for (id key in model) {
                if ([model[key] isKindOfClass:[NSDictionary class]]) {
                    //NSDictionary *target = model[key];
                    QMALog(@"Target: %@", key);
                } else {
                    QMALog(@"Error in DatabasePreLoadData.plist file: targets should be dictionaries");
                }
            }
        }        

        [managedDocument saveToURL:managedDocument.fileURL
                  forSaveOperation:UIDocumentSaveForOverwriting
                 completionHandler:^(BOOL success) {
                     
                     if ([destinationVC respondsToSelector:@selector(setManagedDocument:)]) {
                         [(id)destinationVC setManagedDocument:managedDocument];
                     }
                     [self.navigationController pushViewController:destinationVC animated:NO];
                 }
         ];
    }];
}

@end
