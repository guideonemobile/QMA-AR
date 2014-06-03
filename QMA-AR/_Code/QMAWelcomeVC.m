
#import "QMAWelcomeVC.h"
#import <CoreLocation/CoreLocation.h>
#import "SharedManagedDocument.h"
#import "QMAOnSiteVC.h"
#import "QMATarget+Create.h"
#import "QMAPoi+Create.h"


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

static NSString *const error1 = @"Error in DatabasePreLoadData.plist file: the topmost object in the property list should be 'Root', the second topmost object should be 'Targets', and they both should to be of type dictionary";

static NSString *const error2 = @"Error in DatabasePreLoadData.plist file: each target should have a 'POIs' entry of type array listing its points of interest";

static NSString *const error3 = @"Each POI (point of interest) should be of type dictionary and have the following keys: 'Name', 'Color', 'Image', 'Audio'";

- (void)loadDatabaseAndMoveOn:(UIViewController *)destinationVC {
    
    [SharedManagedDocument managedDocumentWithBlock:^(UIManagedDocument *managedDocument) {
        
        //Load Target and POI information from property list
        
        NSManagedObjectContext *moc = managedDocument.managedObjectContext;
        
        NSString *path = [[NSBundle mainBundle] pathForResource:@"DatabasePreLoadData" ofType:@"plist"];
        NSDictionary *model = [[NSDictionary alloc] initWithContentsOfFile:path][@"Targets"];
        if (!model || ![model isKindOfClass:[NSDictionary class]]) {
            QMALog(@"%@", error1);
        } else {
            for (id key in model) {
                if ([model[key] isKindOfClass:[NSDictionary class]]) {
                    
                    QMATarget *target = [QMATarget targetWithLabel:key
                                            inManagedObjectContext:moc];
                    
                    if ([model[key][@"POIs"] isKindOfClass:[NSArray class]]) {
                        NSArray *poiList = model[key][@"POIs"];
                        for (uint i = 0; i < [poiList count]; i++) {
                            if ([poiList[i] isKindOfClass:[NSDictionary class]]) {
                                NSDictionary *poi = poiList[i];
                                if (poi[@"Name"] && poi[@"Color"] && poi[@"Image"] && poi[@"Audio"]) {
                                    
                                    QMAPoi *p = [QMAPoi poiWithLabel:poi[@"Name"]
                                                      andColorNumber:poi[@"Color"]
                                                        andImageName:poi[@"Image"]
                                                        andAudioName:poi[@"Audio"]
                                                           forTarget:target
                                              inManagedObjectContext:moc];
                                    
                                    if (![p.target.label isEqualToString:target.label]) {
                                        [target addPointsOfInterestObject:p];
                                    }
                                    
                                } else {
                                    QMALog(@"%@", error3);
                                }
                            } else {
                                QMALog(@"%@", error3);
                            }
                        }
                    } else {
                        QMALog(@"%@", error2);
                    }
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
