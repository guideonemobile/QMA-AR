
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
    
    self.museumLocation = [[CLLocation alloc] initWithLatitude:qmaLat longitude:qmaLon];
    
    self.locationManager = [[CLLocationManager alloc] init];
    self.locationManager.delegate = self;
    self.locationManager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters;
    [self.locationManager startUpdatingLocation];
}

#pragma mark - CLLocationManagerDelegate

- (void)locationManager:(CLLocationManager *)manager
    didUpdateToLocation:(CLLocation *)newLocation
           fromLocation:(CLLocation *)oldLocation {
    
    [self.locationManager stopUpdatingLocation];
    
    CLLocationDistance distanceFromMuseum = [newLocation distanceFromLocation:self.museumLocation];
    [self loadDestinationViewController:distanceFromMuseum];
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error {
    UIStoryboard *storyboard = [UIStoryboard storyboardWithName:@"Main_iPhone" bundle:nil];
    UIViewController *vc = [storyboard instantiateViewControllerWithIdentifier:@"OffSiteViewController"];
    [self loadDatabaseAndMoveOn:vc];
}

#pragma mark - Load Destination View Controller

- (void)loadDestinationViewController:(CLLocationDistance)distanceFromMuseum {
    
    self.navigationController.viewControllers = @[[self.navigationController.viewControllers firstObject]];
    
    UIStoryboard *storyboard = [UIStoryboard storyboardWithName:@"Main_iPhone" bundle:nil];
    UIViewController *vc;
    
    if (YES || distanceFromMuseum < maxDistanceFromMuseum) {
        vc = [storyboard instantiateViewControllerWithIdentifier:@"OnSiteViewController"];
    } else {
        vc = [storyboard instantiateViewControllerWithIdentifier:@"OffSiteViewController"];
    }
    
    [self loadDatabaseAndMoveOn:vc];
}

#pragma mark - Load Database and Segue

- (void)loadDatabaseAndMoveOn:(UIViewController *)destinationVC {
    [SharedManagedDocument managedDocumentWithBlock:^(UIManagedDocument *managedDocument) {
        if ([destinationVC respondsToSelector:@selector(setManagedDocument:)]) {
            [(id)destinationVC setManagedDocument:managedDocument];
        }
        [self.navigationController pushViewController:destinationVC animated:NO];
    }];
}

@end
